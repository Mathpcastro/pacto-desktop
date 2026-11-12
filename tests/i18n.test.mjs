import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from '../core/store.mjs';
import { Runtime } from '../core/runtime.mjs';
import { slideHtml } from '../core/templates.mjs';
import { setupPrompt } from '../core/setup.mjs';
import { prepareCarousel } from '../core/knowledge.mjs';
import { threadInstructions } from '../core/codex.mjs';
import { normalizeLocale, translateUi, localizePrompt, templateCopy, intlLocale } from '../core/i18n.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const catalog = JSON.parse(await readFile(join(root, 'core/i18n-es.json'), 'utf8'));
const knowledge = { method: 'Método P.A.C.T.O.', lessons: [], prompts: [{ id: 'N02-prompt-01', text: 'PROMPT MARCA' }, { id: 'N02-prompt-03', text: 'PROMPT RADAR' }, { id: 'N05-prompt-01', text: 'PROMPT DESIGN' }, { id: 'N07-prompt-02', text: 'PROMPT CTA' }, { id: 'N08-prompt-01', text: '' }], pages: [], data: { architectures: [], rules: [] } };

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'carrossell-i18n-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return new Store(dir).init();
}

test('the language defaults to pt-BR and only pt-BR or es can be saved', async (t) => {
  const store = await fixture(t);
  assert.equal(store.state().settings.language, 'pt-BR');
  assert.equal(normalizeLocale(undefined), 'pt-BR');
  assert.equal(normalizeLocale('en'), 'pt-BR');
  assert.equal(normalizeLocale('es-MX'), 'es');
  await store.saveSettings({ language: 'es' });
  assert.equal(store.state().settings.language, 'es');
  const again = await new Store(store.root).init();
  assert.equal(again.state().settings.language, 'es');
  await assert.rejects(store.saveSettings({ language: 'en' }), /Idioma/);
  await store.saveSettings({ language: 'pt-BR' });
  assert.equal(store.state().settings.language, 'pt-BR');
});

test('pt-BR prompts stay in Portuguese and es prompts ask for Latin American Spanish', async (t) => {
  const store = await fixture(t);
  const runtime = new Runtime({ store, knowledge, codex: { status: { account: { connected: false } }, run: async () => ({}) } });
  const project = await store.createProject({ title: 'Pauta', brief: 'Ensinar um passo do negócio.' });
  const portuguese = runtime.planPrompt(project.id);
  assert.doesNotMatch(portuguese, /IDIOMA DE SALIDA/);
  assert.match(portuguese, /Arrasta para o lado/);
  assert.match(portuguese, /Comenta CHECKLIST que eu te mando/);
  assert.equal(localizePrompt(portuguese, 'pt-BR'), portuguese);

  await store.saveSettings({ language: 'es' });
  const spanish = runtime.planPrompt(project.id);
  const sent = localizePrompt(spanish, 'es');
  assert.match(sent, /IDIOMA DE SALIDA/);
  assert.match(sent, /español latinoamericano neutro/);
  assert.match(sent, /como "Desliza"/);
  assert.match(sent, /Comenta GUÍA y te la envío/);
  assert.doesNotMatch(sent, /como "Arrasta para o lado"/);
  assert.doesNotMatch(sent, /\("Comenta CHECKLIST que eu te mando"\)/);
  assert.match(sent, /Nunca "Arrasta para o lado"/);
  assert.match(sent, /Lista Útil, Tutorial, Framework/);
  assert.match(runtime.ctaPrompt(store.get(project.id)) && localizePrompt(runtime.ctaPrompt(store.get(project.id)), 'es'), /Español latinoamericano neutro, lenguaje corto y natural/);
  assert.match(localizePrompt(runtime.storiesPrompt(store.get(project.id)), 'es'), /Español latinoamericano neutro/);
  assert.match(localizePrompt(runtime.interviewPrompt('brand', store.interview('brand')), 'es'), /Responde en español latinoamericano neutro y devuelve JSON/);
  assert.doesNotMatch(localizePrompt(runtime.interviewPrompt('brand', store.interview('brand')), 'es'), /Responda em português do Brasil/);
  const copied = setupPrompt('agenda online', { locale: 'es' });
  assert.match(copied, /español latinoamericano neutro/);
  assert.match(copied, /=== NOME DA MARCA ===/);
  assert.match(setupPrompt('agenda online'), /Responda em português do Brasil/);
  assert.equal(store.get(project.id).title, 'Pauta');
  const fresh = await store.createProject({ title: '', brief: 'Outra pauta.' });
  assert.equal(fresh.title, 'Nuevo carrusel');
});

test('the es generation path sends the Spanish prompt and Spanish tool instructions', async (t) => {
  const store = await fixture(t);
  await store.saveProfile({ brand: 'Agenda', product: 'Agenda online', audience: 'Clínicas', brandContext: 'Contexto '.repeat(40), designKit: 'Kit '.repeat(30) });
  const calls = [];
  const runtime = new Runtime({
    store,
    knowledge,
    codex: { status: { account: { connected: true } }, run: async (options) => { calls.push(options); return { text: JSON.stringify({ analysis: 'Territórios', ideas: [{ theme: 'Tema', hook: 'Gancho claro', why: 'Porque para', deliverable: 'Um passo', connection: 'O produto', architecture: 'Lista Útil', group: 'Radar', top: true, reason: 'Útil' }] }) }; } },
  });
  await runtime.request('radar', { focus: 'confirmação' });
  assert.equal(calls[0].locale, 'pt-BR');
  assert.match(calls[0].prompt, /Responda em português do Brasil, em JSON conforme o esquema/);
  assert.doesNotMatch(calls[0].prompt, /IDIOMA DE SALIDA/);
  calls.length = 0;
  await store.saveSettings({ language: 'es' });
  await runtime.request('radar', { focus: 'confirmación' });
  assert.equal(calls[0].locale, 'es');
  assert.match(calls[0].prompt, /IDIOMA DE SALIDA/);
  assert.match(calls[0].prompt, /Responde en español latinoamericano neutro, en JSON según el esquema/);
  assert.doesNotMatch(calls[0].prompt, /Responda em português do Brasil/);
  const instructions = threadInstructions({ locale: 'es' });
  assert.match(instructions.developerInstructions, /español latinoamericano neutro/);
  assert.doesNotMatch(instructions.developerInstructions, /Conteúdo e imagens em português do Brasil/);
  const same = threadInstructions();
  assert.match(same.baseInstructions, /^Você é o estúdio P\.A\.C\.T\.O\./);
  assert.match(same.developerInstructions, /^Conteúdo e imagens em português do Brasil\./);
  assert.doesNotMatch(same.baseInstructions, /IDIOMA/);
  const prepared = prepareCarousel(knowledge, { brand: 'Agenda' }, 'Evitar faltas', undefined, 'es');
  assert.match(prepared.instructions, /IDIOMA DE SALIDA/);
  assert.match(prepareCarousel(knowledge, { brand: 'Agenda' }, 'Evitar faltas').instructions, /Responda em português brasileiro\./);
  assert.doesNotMatch(prepareCarousel(knowledge, { brand: 'Agenda' }, 'Evitar faltas').instructions, /IDIOMA DE SALIDA/);
});

test('template labels and the interface dictionary follow the language', () => {
  const slide = { title: 'Pare o scroll', body: 'Um passo concreto.', emphasis: '' };
  const brand = { name: '', handle: '', verified: true, palette: { accent: '#ff5a36', ink: '#191919', paper: '#ffffff', soft: '#f4f1ec' } };
  const portuguese = slideHtml({ style: 'fundo', slide, index: 0, brand, media: {}, fonts: {} });
  const spanish = slideHtml({ style: 'fundo', slide, index: 0, brand, media: {}, fonts: {}, locale: 'es' });
  assert.match(portuguese, /arrasta pro lado/);
  assert.match(portuguese, /lang="pt-BR"/);
  assert.match(portuguese, /Sua foto/);
  assert.match(spanish, /desliza ›/);
  assert.match(spanish, /lang="es"/);
  assert.match(spanish, /Tu foto/);
  assert.doesNotMatch(spanish, /arrasta pro lado/);
  assert.equal(templateCopy('pt-BR').brand, 'Sua marca');
  assert.equal(templateCopy('es').learn, '→ Desliza para aprender');
  assert.equal(translateUi('pt-BR', 'Início'), 'Início');
  assert.equal(translateUi('es', 'Início'), 'Inicio');
  assert.equal(translateUi('es', '  Conteúdos'), '  Contenidos');
  assert.equal(translateUi('es', '3 cards'), '3 tarjetas');
  assert.equal(translateUi('es', '1 card'), '1 tarjeta');
  assert.equal(translateUi('es', 'Ações para Minha marca'), 'Acciones para Minha marca');
  assert.equal(translateUi('es', 'Opcional · 8 aulas'), 'Opcional · 8 clases');
  assert.match(translateUi('es', '“Confirmação” foi publicado há alguns dias. Registre comentários, salvamentos e vendas para saber se ele venceu.'), /Confirmação/);
  assert.match(translateUi('es', '“Confirmação” foi publicado há alguns dias. Registre comentários, salvamentos e vendas para saber se ele venceu.'), /se publicó/);
  assert.equal(translateUi('es', 'Conecte sua conta ChatGPT para gerar.'), catalog['Conecte sua conta ChatGPT para gerar.']);
  assert.equal(intlLocale('pt-BR'), 'pt-BR');
  assert.equal(intlLocale('es'), 'es-419');
  assert.equal(translateUi('es', 'Português'), 'Português');
  assert.equal(translateUi('es', 'Español'), 'Español');
});

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'data' || name === 'node_modules' || name === 'i18n.js') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, acc);
    else if (/\.(jsx|js|mjs)$/.test(name)) acc.push(path);
  }
  return acc;
}
function quoted(code) {
  const strings = [];
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    if (c === '/' && code[i + 1] === '/') { const n = code.indexOf('\n', i); i = n < 0 ? code.length : n + 1; continue; }
    if (c === '/' && code[i + 1] === '*') { const n = code.indexOf('*/', i + 2); i = n < 0 ? code.length : n + 2; continue; }
    if (c === '"' || c === "'") {
      const q = c; let j = i + 1, s = '';
      while (j < code.length) {
        if (code[j] === '\\') { const n = code[j + 1]; s += n === 'n' ? '\n' : n; j += 2; continue; }
        if (code[j] === q || code[j] === '\n') break;
        s += code[j]; j++;
      }
      if (code[j] === q) strings.push(s);
      i = j + 1; continue;
    }
    if (c === '`') {
      let j = i + 1, depth = 0;
      while (j < code.length) {
        if (code[j] === '\\') { j += 2; continue; }
        if (depth === 0 && code[j] === '`') break;
        if (code[j] === '$' && code[j + 1] === '{') { depth++; j += 2; continue; }
        if (depth && code[j] === '{') depth++;
        if (depth && code[j] === '}') { depth--; j++; continue; }
        j++;
      }
      i = j + 1; continue;
    }
    i++;
  }
  return strings;
}
function userFacing(value) {
  if (!value || value.length < 2 || value.length > 420) return false;
  if (/[\n{}<>]|=>|\bfunction\b|\bconst\b|\bimport\b|https?:|npm |Mozilla|rotate\(|repeat\(|className/.test(value)) return false;
  if (/^[a-z0-9_.:+/#@?-]+$/.test(value)) return false;
  if (/^[a-z0-9-]+(?: [a-z0-9-]+)+$/.test(value)) return false;
  if (/[áéíóúãõçâêôàÁÉÍÓÚÃÕÇ]/.test(value)) return true;
  if (/\s/.test(value) && /[A-Za-zÀ-ÿ]{3,}/.test(value)) return true;
  if (/^[A-ZÁÉÍÓÚÃÕÂÊÔ][\p{L}]+$/u.test(value) && value.length > 2) return true;
  if (/[?!…]$/.test(value)) return true;
  return false;
}

test('every user-facing interface string has a Spanish translation', () => {
  const missing = [];
  for (const file of [...walk(join(root, 'src')), ...walk(join(root, 'electron'))]) {
    for (const value of quoted(readFileSync(file, 'utf8'))) if (userFacing(value) && !(value in catalog)) missing.push(value);
  }
  assert.deepEqual(missing, []);
  for (const [key, value] of Object.entries(catalog)) assert.equal(typeof value, 'string');
  assert.equal(catalog['Novo carrossel'], 'Nuevo carrusel');
  assert.doesNotMatch(Object.values(catalog).join('\n'), /—|vosotros/);
});
