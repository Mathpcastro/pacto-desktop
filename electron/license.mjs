import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  LICENSE_API_URL, TERMS_VERSION, graceUntilFor, maskLicenseEmail, needsRevalidation, parseLicenseTokenPayload,
  normalizeLicenseEmail, parseLicenseStatus, validLicenseAcceptance,
} from '../core/license.mjs';

const initialState = () => ({ activated: false, expiresAt: null, graceUntil: null,
  termsVersion: null, acceptedAt: null, emailMasked: null, code: 'not_activated' });

function localApiOverride(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' && url.hostname === '127.0.0.1' && /^\d+$/.test(url.port)
      && !url.username && !url.password && (url.pathname === '/' || url.pathname === '')) return url.origin;
  } catch { /* use the placeholder default */ }
  return null;
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export class LicenseService {
  constructor({ store, userData, fetchImpl = globalThis.fetch, now = () => Date.now(), appVersion = 'unknown', apiUrl = process.env.PACTO_LICENSE_URL } = {}) {
    if (!store || typeof store.installId !== 'function' || typeof store.getLicense !== 'function') throw new TypeError('Cofre de licença inválido.');
    this.store = store;
    this.stateFile = join(userData, 'license-state.json');
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.appVersion = appVersion;
    this.apiBase = localApiOverride(apiUrl) || LICENSE_API_URL;
    this.state = null;
    this.deviceHash = sha256(store.installId());
    this.revalidationTask = null;
    this.stateSaveTask = Promise.resolve();
  }

  async #readState() {
    if (this.state) return this.state;
    try {
      const value = JSON.parse(await readFile(this.stateFile, 'utf8'));
      this.state = { ...initialState(), ...value, activated: value?.activated === true };
    } catch {
      this.state = initialState();
    }
    return this.state;
  }

  async #saveState(patch) {
    const operation = this.stateSaveTask.then(async () => {
      const current = await this.#readState();
      const next = { ...current, ...patch };
      await mkdir(join(this.stateFile, '..'), { recursive: true });
      const temp = `${this.stateFile}.${process.pid}.tmp`;
      await writeFile(temp, JSON.stringify(next, null, 2), 'utf8');
      await rename(temp, this.stateFile);
      this.state = next;
      return next;
    });
    this.stateSaveTask = operation.catch(() => {});
    return operation;
  }

  async #publicStatus() {
    const state = await this.#readState();
    return parseLicenseStatus(state, this.now());
  }

  async #call(path, payload) {
    if (this.apiBase.endsWith('.invalid')) throw new Error('API de licença ainda não configurada.');
    const response = await this.fetchImpl(`${this.apiBase}${path}`, {
      method: 'post'.toUpperCase(), headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    let body = null;
    try { body = await response.json(); } catch { /* resposta inválida é tratada como falha uniforme */ }
    return { response, body };
  }

  async #acceptToken(body, { email = null, acceptedAt = null, oldState = null } = {}) {
    // HMAC is server-only. The main process adopts claims only from the configured API response,
    // checks them against this install and persists the opaque token in safeStorage.
    const claims = parseLicenseTokenPayload(body?.token);
    if (!body?.ok || !claims || !Number.isInteger(claims.exp)
      || claims.device_hash !== this.deviceHash || !/^[a-f0-9]{64}$/.test(claims.email_hash || '')
      || claims.exp * 1000 <= this.now() || typeof claims.terms_version !== 'string'
      || typeof claims.accepted_at !== 'string') return false;
    if (email && claims.email_hash !== sha256(email)) return false;
    if (acceptedAt && (claims.terms_version !== TERMS_VERSION || Date.parse(claims.accepted_at) !== Date.parse(acceptedAt))) return false;
    const expiresAt = new Date(claims.exp * 1000).toISOString();
    if (body.expires_at && Date.parse(body.expires_at) !== Date.parse(expiresAt)) return false;
    await this.store.setLicense(body.token);
    await this.#saveState({ activated: true, expiresAt, graceUntil: graceUntilFor(expiresAt),
      termsVersion: claims.terms_version, acceptedAt: acceptedAt || claims.accepted_at,
      emailMasked: email ? maskLicenseEmail(email) : oldState?.emailMasked || null,
      code: body.code || 'activated' });
    return true;
  }

  async status() {
    const state = await this.#readState();
    const token = await this.store.getLicense();
    if (token && needsRevalidation(this.now(), state.expiresAt)) await this.revalidateLicense();
    return this.#publicStatus();
  }

  async activateLicense({ email, accepted, termsVersion, acceptedAt } = {}) {
    const normalized = normalizeLicenseEmail(email);
    if (!normalized || !validLicenseAcceptance(accepted, termsVersion, acceptedAt)) {
      await this.#saveState({ code: 'activation_failed' });
      return this.#publicStatus();
    }
    try {
      const { response, body } = await this.#call('/license/activate', {
        email: normalized, device_hash: this.deviceHash, app_version: this.appVersion,
        accepted: true, terms_version: TERMS_VERSION, accepted_at: acceptedAt,
      });
      if (!response.ok) {
        await this.#saveState({ code: body?.code || 'activation_failed' });
      } else if (!await this.#acceptToken(body, { email: normalized, acceptedAt })) {
        await this.#saveState({ code: 'activation_failed' });
      }
    } catch {
      await this.#saveState({ code: 'offline' });
    }
    return this.#publicStatus();
  }

  async revalidateLicense() {
    if (this.revalidationTask) return this.revalidationTask;
    this.revalidationTask = this.#performRevalidation();
    try { return await this.revalidationTask; }
    finally { this.revalidationTask = null; }
  }

  async #performRevalidation() {
    const oldState = await this.#readState();
    const token = await this.store.getLicense();
    if (!token) {
      await this.#saveState({ code: 'not_activated' });
      return this.#publicStatus();
    }
    try {
      const { response, body } = await this.#call('/license/revalidate', {
        token, device_hash: this.deviceHash, app_version: this.appVersion,
      });
      if (!response.ok) {
        await this.#saveState({ code: body?.code || 'revalidation_failed' });
      } else if (!await this.#acceptToken(body, { oldState })) {
        await this.#saveState({ code: 'revalidation_failed' });
      }
    } catch {
      await this.#saveState({ code: 'offline' });
    }
    return this.#publicStatus();
  }
}

export function licenseApiBase(value) {
  return localApiOverride(value) || LICENSE_API_URL;
}
