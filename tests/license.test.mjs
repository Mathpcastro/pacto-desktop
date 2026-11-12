import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LICENSE_API_URL, LICENSE_MIGRATION_START, LICENSE_MIGRATION_UNTIL, TERMS_VERSION,
  inGrace, isInMigration, maskLicenseEmail, needsRevalidation, normalizeLicenseEmail,
  parseLicenseStatus, parseLicenseTokenPayload, sha256DeviceId, validLicenseAcceptance,
  warningMessageKind,
} from '../core/license.mjs';
import { LicenseService, licenseApiBase } from '../electron/license.mjs';
import { createSecretStore } from '../core/secrets-store.mjs';

const projectDirectory = dirname(fileURLToPath(import.meta.url));
const makeToken = (claims) => {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(claims)}.test-signature`;
};

test('migration date covers 60 days and ends on 11 January 2027 BRT', () => {
  assert.equal(LICENSE_MIGRATION_START, '2026-11-12T00:00:00-03:00');
  assert.equal(LICENSE_MIGRATION_UNTIL, '2027-01-11T00:00:00-03:00');
  assert.equal(Date.parse(LICENSE_MIGRATION_UNTIL) - Date.parse(LICENSE_MIGRATION_START), 60 * 24 * 60 * 60 * 1000);
  assert.equal(isInMigration(LICENSE_MIGRATION_START), true);
  assert.equal(isInMigration(LICENSE_MIGRATION_UNTIL), false);
});

test('revalidation and 14-day grace boundaries are deterministic', () => {
  const expires = '2026-12-12T15:00:00.000Z';
  const graceUntil = '2026-12-26T15:00:00.000Z';
  assert.equal(needsRevalidation('2026-12-12T14:59:59.999Z', expires), false);
  assert.equal(needsRevalidation(expires, expires), true);
  assert.equal(inGrace(expires, expires, graceUntil), false);
  assert.equal(inGrace('2026-12-12T15:00:00.001Z', expires, graceUntil), true);
  assert.equal(inGrace(graceUntil, expires, graceUntil), true);
  assert.equal(inGrace('2026-12-26T15:00:00.001Z', expires, graceUntil), false);
});

test('aceite obrigatório valida checkbox, versão e timestamp ISO', () => {
  assert.equal(validLicenseAcceptance(true, TERMS_VERSION, '2026-11-12T15:00:00Z'), true);
  assert.equal(validLicenseAcceptance(false, TERMS_VERSION, '2026-11-12T15:00:00Z'), false);
  assert.equal(validLicenseAcceptance(true, 'versao-antiga', '2026-11-12T15:00:00Z'), false);
  assert.equal(validLicenseAcceptance(true, TERMS_VERSION, 'ontem'), false);
  assert.equal(validLicenseAcceptance(true, TERMS_VERSION, '2026-02-30T12:00:00Z'), false);
});

test('hash do installId é SHA-256 hex e e-mail fica normalizado/mascarado', async () => {
  const expected = createHash('sha256').update('install-id-test', 'utf8').digest('hex');
  assert.equal(await sha256DeviceId('install-id-test'), expected);
  assert.match(expected, /^[a-f0-9]{64}$/);
  assert.equal(normalizeLicenseEmail(' Buyer@Example.com '), 'buyer@example.com');
  assert.equal(maskLicenseEmail('Buyer@Example.com'), 'b***r@example.com');
  assert.equal(normalizeLicenseEmail('not-an-email'), null);
});

test('parse de status retorna somente campos públicos e escolhe avisos locais', () => {
  const state = parseLicenseStatus({ activated: true, expiresAt: '2026-12-12T15:00:00Z',
    graceUntil: '2026-12-26T15:00:00Z', termsVersion: TERMS_VERSION, acceptedAt: '2026-11-12T15:00:00Z',
    emailMasked: 'b***r@example.com', token: 'não deve sair do main' }, '2026-12-13T00:00:00Z');
  assert.deepEqual(state, {
    activated: true, expiresAt: '2026-12-12T15:00:00Z', graceUntil: '2026-12-26T15:00:00Z',
    termsVersion: TERMS_VERSION, acceptedAt: '2026-11-12T15:00:00Z', emailMasked: 'b***r@example.com',
    code: null, migration: true,
  });
  assert.equal(warningMessageKind(state, '2026-12-13T00:00:00Z'), 'grace');
  assert.equal(warningMessageKind({ activated: false, code: 'device_limit' }, '2026-11-12T15:00:00Z'), 'device_limit');
  assert.equal(warningMessageKind({ activated: false }, '2027-02-01T00:00:00Z'), 'not_activated');
  assert.equal('token' in state, false);
});

test('parse do token exige formato esperado e claims vinculáveis ao device', async () => {
  const deviceHash = await sha256DeviceId('install-id-test');
  const claims = { email_hash: 'a'.repeat(64), device_hash: deviceHash, exp: 1_797_000_000,
    terms_version: TERMS_VERSION, accepted_at: '2026-11-12T15:00:00Z' };
  assert.deepEqual(parseLicenseTokenPayload(makeToken(claims)), claims);
  assert.equal(parseLicenseTokenPayload('token inválido'), null);
  assert.equal(parseLicenseTokenPayload(makeToken({ ...claims, device_hash: 'bad' })), null);
});

test('API aponta para o Worker e só aceita override HTTP em loopback', () => {
  assert.equal(LICENSE_API_URL, 'https://carrossell-license.carrossell-matheus.workers.dev');
  assert.equal(licenseApiBase(undefined), LICENSE_API_URL);
  assert.equal(licenseApiBase('https://attacker.example'), LICENSE_API_URL);
  assert.equal(licenseApiBase('http://192.168.1.4:8787'), LICENSE_API_URL);
  assert.equal(licenseApiBase('http://127.0.0.1:8787'), 'http://127.0.0.1:8787');
});

test('LicenseService guarda token fora do status público e aciona cliente sem rede real', async () => {
  const directory = await mkdtemp(join(projectDirectory, '.license-service-test-'));
  const now = Date.parse('2026-11-12T15:00:00Z');
  const installId = 'service-install-id';
  const deviceHash = await sha256DeviceId(installId);
  const emailHash = createHash('sha256').update('buyer@example.com', 'utf8').digest('hex');
  const claims = { email_hash: emailHash, device_hash: deviceHash, exp: Math.floor(now / 1000) + 30 * 86400,
    terms_version: TERMS_VERSION, accepted_at: '2026-11-12T15:00:00Z', iat: Math.floor(now / 1000) };
  const token = makeToken(claims);
  const calls = [];
  const store = { installId: () => installId, getLicense: async () => store.token || '', setLicense: async (value) => { store.token = value; } };
  const service = new LicenseService({ store, userData: directory, appVersion: '1.12.0', now: () => now,
    apiUrl: 'http://127.0.0.1:8787', fetchImpl: async (url, options) => {
      calls.push({ url, payload: JSON.parse(options.body) });
      return new Response(JSON.stringify({ ok: true, code: 'activated', token,
        expires_at: new Date(claims.exp * 1000).toISOString() }), { status: 200 });
    } });
  try {
    const status = await service.activateLicense({ email: ' Buyer@example.com ', accepted: true,
      termsVersion: TERMS_VERSION, acceptedAt: '2026-11-12T15:00:00Z' });
    assert.equal(status.activated, true);
    assert.equal(status.emailMasked, 'b***r@example.com');
    assert.equal(store.token, token);
    assert.equal(calls[0].url, 'http://127.0.0.1:8787/license/activate');
    assert.equal(calls[0].payload.device_hash, deviceHash);
    assert.equal('token' in status, false);
    const storedState = await readFile(join(directory, 'license-state.json'), 'utf8');
    assert.equal(storedState.includes(token), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('LicenseService sem aceite não chama o servidor e offline permanece não bloqueante', async () => {
  const directory = await mkdtemp(join(projectDirectory, '.license-offline-test-'));
  let calls = 0;
  const store = { installId: () => 'offline-install', getLicense: async () => '', setLicense: async () => {} };
  const service = new LicenseService({ store, userData: directory, now: () => Date.parse('2026-11-12T15:00:00Z'),
    apiUrl: 'http://127.0.0.1:8787', fetchImpl: async () => { calls += 1; throw new Error('network unavailable'); } });
  try {
    const refused = await service.activateLicense({ email: 'buyer@example.com', accepted: false,
      termsVersion: TERMS_VERSION, acceptedAt: '2026-11-12T15:00:00Z' });
    assert.equal(refused.activated, false);
    assert.equal(calls, 0);
    const offline = await service.activateLicense({ email: 'buyer@example.com', accepted: true,
      termsVersion: TERMS_VERSION, acceptedAt: '2026-11-12T15:00:00Z' });
    assert.equal(offline.activated, false);
    assert.equal(offline.code, 'offline');
    assert.equal(calls, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('store de safeStorage separa licença e Composio sem apagar campos existentes', async () => {
  const directory = await mkdtemp(join(projectDirectory, '.license-store-test-'));
  const encryption = { isEncryptionAvailable: () => true, encryptString: (value) => Buffer.from(value),
    decryptString: (value) => value.toString('utf8') };
  try {
    const store = createSecretStore(directory, encryption);
    await store.setKey('composio-test-key');
    await store.setLicense('opaque-license-token');
    await store.saveAccounts([{ id: 'account-1' }]);
    assert.equal(store.getKey(), 'composio-test-key');
    assert.equal(store.getLicense(), 'opaque-license-token');
    await store.clearLicense();
    assert.equal(store.getLicense(), '');
    assert.equal(store.getKey(), 'composio-test-key');
    assert.deepEqual(store.accounts(), [{ id: 'account-1' }]);
    const json = JSON.parse(await readFile(join(directory, 'integrations.json'), 'utf8'));
    assert.equal(json.installId, store.installId());
    assert.equal('license' in json, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('todas as strings de licença da interface têm tradução em espanhol', async () => {
  const catalog = JSON.parse(await readFile(new URL('../core/i18n-es.json', import.meta.url), 'utf8'));
  const visible = [
    'A migração para o novo sistema de licenças vai até 11/01/2027. Ative sua compra quando puder; o app continua disponível.',
    'Ative sua licença com o e-mail da compra. O Carrossell continua funcionando enquanto isso.',
    'Não foi possível conectar à licença. Se esta for a primeira ativação, conecte-se à internet; o app continua utilizável.',
    'Esta licença já está ativa em 3 dispositivos. Fale com o suporte para trocar um dispositivo.',
    'Muitas tentativas. Aguarde um pouco e tente novamente.',
    'Não foi possível revalidar. Você está no período de graça e o app continua funcionando.',
    'A licença precisa de nova validação. Conecte-se à internet quando puder; o app continua funcionando.',
    'Não foi possível revalidar agora. Tente novamente com a internet disponível; o app continua funcionando.',
    'Ativar licença', 'Informe o e-mail usado na compra. A primeira ativação precisa de internet.', 'E-mail da compra',
    'Li e aceito os Termos de Uso e o Aviso de Privacidade', 'Termos de Uso', 'Aviso de Privacidade',
    'Abrir ativação', 'Tentar novamente', 'Ativando…', 'Ativar', 'Fechar',
  ];
  for (const phrase of visible) assert.equal(typeof catalog[phrase], 'string', `Falta tradução: ${phrase}`);
});

test('cliente e Worker renovam no vencimento e preservam licença offline após a graça', async (t) => {
  let createLicenseWorker;
  try {
    ({ createLicenseWorker } = await import('../../carrossell-license/src/worker.mjs'));
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND') {
      t.skip('Worker irmão ausente neste checkout');
      return;
    }
    throw error;
  }
  const directory = await mkdtemp(join(projectDirectory, '.license-contract-test-'));
  let now = Date.parse('2026-11-12T15:00:00Z');
  let offline = false;
  const worker = createLicenseWorker({ now: () => now });
  const values = new Map();
  const env = { LICENSE: { get: async (key) => values.get(key) ?? null,
    put: async (key, value) => { values.set(key, value); } },
    LICENSE_SIGNING_SECRET: 'synthetic-test-signing-key-00000000000000',
    SUPPORT_KEY: 'synthetic-test-support-key-00000000000000' };
  const store = { installId: () => 'contract-install', token: '', getLicense: async () => store.token,
    setLicense: async (value) => { store.token = value; } };
  const service = new LicenseService({ store, userData: directory, appVersion: '1.12.0', now: () => now,
    apiUrl: 'http://127.0.0.1:8787', fetchImpl: async (url, options) => {
      if (offline) throw new Error('synthetic offline');
      return worker.fetch(new Request(url, { ...options, headers: { ...options.headers, 'CF-Connecting-IP': '203.0.113.1' } }), env);
    } });
  try {
    await worker.fetch(new Request('https://license.test/internal/purchases/upsert', { method: 'POST',
      headers: { authorization: `Bearer ${env.SUPPORT_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'buyer@example.com', status: 'paid' }) }), env);
    const active = await service.activateLicense({ email: 'buyer@example.com', accepted: true,
      termsVersion: TERMS_VERSION, acceptedAt: new Date(now).toISOString() });
    assert.equal(active.activated, true);
    now = Date.parse(active.expiresAt);
    const renewed = await service.status();
    assert.equal(renewed.code, 'revalidated');
    assert.equal(Date.parse(renewed.expiresAt), now + 30 * 86400_000);
    const token = store.token;
    offline = true;
    now = Date.parse(renewed.graceUntil) + 1;
    const unavailable = await service.status();
    assert.equal(unavailable.activated, true);
    assert.equal(unavailable.code, 'offline');
    assert.equal(store.token, token);
    assert.equal(unavailable.expiresAt, renewed.expiresAt);
    offline = false;
    assert.equal((await service.status()).code, 'revalidated');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('gravações concorrentes do estado não falham nem deixam estado parcial', async () => {
  const directory = await mkdtemp(join(projectDirectory, '.license-concurrent-test-'));
  const store = { installId: () => 'concurrent-install', getLicense: async () => '', setLicense: async () => {} };
  const service = new LicenseService({ store, userData: directory });
  try {
    await Promise.all(Array.from({ length: 15 }, () => service.activateLicense({ accepted: false })));
    const persisted = JSON.parse(await readFile(join(directory, 'license-state.json'), 'utf8'));
    assert.equal(persisted.activated, false);
    assert.equal(persisted.code, 'activation_failed');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
