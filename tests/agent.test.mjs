import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { Store } from '../core/store.mjs';
import { Runtime } from '../core/runtime.mjs';
import { loadKnowledge } from '../core/knowledge.mjs';
import { startControl } from '../core/control.mjs';
import { main } from '../cli/carrossell.mjs';
import { postable } from '../core/instagram.mjs';

// Modo agente: Claude, Gemini ou outro agente escreve pela CLI e o app guarda, monta e exporta, sem a conta ChatGPT.
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=', 'base64');
async function setup(t, { codex } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'carrossell-agent-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = await new Store(join(root, 'lib')).init();
  const rendered = [];
  const runtime = new Runtime({ store, knowledge: loadKnowledge(),
    codex: codex || { status: { account: { connected: false } }, cancel: async () => {}, run: async () => { throw new Error('a conta ChatGPT não deve ser usada no modo agente'); } },
    dialogs: { normalizeFiles: async files => files, render: { fonts: {}, png: async (html, size) => { rendered.push({ html, size }); return png; } } } });
  const userData = join(root, 'data');
  const control = await startControl({ userData, runtime, allowed: ['bootstrap', 'profiles', 'createProject', 'approveText', 'generateCovers', 'chooseCover', 'generateSlides', 'saveProject', 'stories', 'ctaKit', 'storyTheme'], version: 't' });
  t.after(() => control.close());
  // Roda a CLI e devolve o JSON impresso; stderr é guardado para ver os avisos.
  const run = async (...argv) => {
    const out = [], err = [], write = process.stdout.write, ewrite = process.stderr.write;
    process.stdout.write = chunk => (out.push(String(chunk)), true); process.stderr.write = chunk => (err.push(String(chunk)), true);
    try { const code = await main(argv, { userData }); return { code, json: out.length ? JSON.parse(out.join('')) : null, err: err.join('') }; }
    finally { process.stdout.write = write; process.stderr.write = ewrite; }
  };
  const file = async (name, value) => { const path = join(root, name); await writeFile(path, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)); return path; };
  return { root, store, run, file, rendered, runtime };
}
const card = (id, role, title, body) => ({ id, role, title, body, emphasis: '', visual: 'v', prompt: '', asset: '' });

test('agent text is validated, saved with AI-tell warnings, and art comes from HTML or PNG', async t => {
  const { root, store, run, file, rendered } = await setup(t);
  let r = await run('marca', 'salvar', '--contexto', await file('c.md', '# Contexto\nAgenda para clínicas.'), '--design', await file('d.md', 'Design #3CC8A0 #1E2328 #FFFFFF'), '--nome', 'Agendei');
  assert.equal(r.json.profile.brand, 'Agendei');
  r = await run('criar', '--pauta', 'Faltas', '--cards', '4', '--agente', 'claude');
  const id = r.json.id; assert.equal(r.json.slides.length, 0); assert.match(r.err, /tarefa .* texto/); assert.equal(store.get(id).madeBy, 'claude');
  r = await run('tarefa', id, 'texto', '--pasta', join(root, 'tarefas'));
  const prompt = await readFile(r.json.pedido, 'utf8');
  assert.match(prompt, /Agenda para clínicas/); assert.match(prompt, /VOZ HUMANA/); assert.match(prompt, /exatamente 4 cards/);
  assert.ok(JSON.parse(await readFile(r.json.esquema, 'utf8')).required.includes('slides'));
  const plan = { title: 'Faltas', architecture: 'Lista Útil', editorialLine: '', visualConcept: '', coverHooks: [], caption: 'Comente CHECKLIST', reply: 'ok', regenerateSlideIds: [],
    slides: [card('a', 'Capa', '3 mensagens que reduzem faltas', 'Comente CHECKLIST'), card('b', 'Item', 'Confirme na véspera', 'Não é falta de lembrete, é horário ruim.'), card('c', 'CTA', 'Quer o modelo?', 'Comente CHECKLIST')] };
  await assert.rejects(run('texto', id, '--arquivo', await file('bad.json', { ...plan, slides: [card('a', 'Capa', 'X', 'Função: capa. Apresentar.'), ...plan.slides.slice(1)] })), /instrução em body/);
  r = await run('texto', id, '--arquivo', await file('plan.json', '```json\n' + JSON.stringify(plan) + '\n```'));
  assert.equal(r.json.project.slides.length, 3); assert.equal(r.json.project.textApproved, false);
  assert.match(r.err, /card 2 \(texto\): contraste/); assert.equal(store.get(id).caption, 'Comente CHECKLIST');

  await assert.rejects(run('tarefa', id, 'arte'), /Aprove o texto/);
  await run('aprovar', id);
  r = await run('tarefa', id, 'arte', '--pasta', join(root, 't'));
  const art = await readFile(r.json.pedido, 'utf8');
  assert.match(art, /1080×1350/); assert.match(art, /CARD 1 de 3/); assert.match(art, /#3CC8A0/); assert.equal(r.json.esquema, null);

  r = await run('card', id, '1', '--html', await file('c1.html', '<!doctype html><html><head><title>c</title></head><body><h1>3 mensagens</h1><script>alert(1)</script></body></html>'));
  assert.equal(rendered.length, 1); assert.deepEqual(rendered[0].size, { width: 1080, height: 1350 });
  assert.match(rendered[0].html, /<head><meta http-equiv="Content-Security-Policy" content="script-src 'none'/);
  r = await run('card', id, '2', '--html', await file('c2.html', '<div style="background:#1E2328">Confirme</div>'));
  assert.match(rendered[1].html, /^<!doctype html>.*script-src 'none'.*<div style/s);
  r = await run('card', id, '3', '--imagem', await file('c3.png', png));
  assert.equal(r.json.status, 'complete'); assert.ok(r.json.slides.every(s => s.image));
  await assert.rejects(run('card', id, '9', '--imagem', await file('c9.png', png)), /Card 9 não existe/);

  r = await run('cta', id, '--arquivo', await file('cta.json', { keywords: ['CHECKLIST'], firstCardCta: 'Comente CHECKLIST', lastCardCta: 'Quer? Comente CHECKLIST', freebie: 'Checklist', dm1: 'Aqui está — o checklist', dm2: 'Se quiser testar, me chama.' }));
  assert.match(r.err, /DM 1: travessão/); assert.equal(store.get(id).ctaKit.keywords[0], 'CHECKLIST');
  r = await run('tarefa', id, 'stories', '--pasta', join(root, 't'));
  assert.match(await readFile(r.json.pedido, 'utf8'), /comentar a palavra-chave CHECKLIST/);
  r = await run('stories', id, '--arquivo', await file('st.json', { stories: [{ type: 'Gancho', text: 'Você confirma no dia?', sticker: '', cta: '', visual: '' }, { type: 'CTA', text: 'Comente CHECKLIST no post', sticker: '', cta: 'Comentar', visual: '' }] }));
  assert.equal(r.json.stories.length, 2); assert.deepEqual(rendered.at(-1).size, { width: 1080, height: 1920 });

  const zip = unzipSync(await store.exportZip(id));
  assert.ok(zip['01.png'] && zip['03.png'] && zip['stories/02.png']); assert.match(strFromU8(zip['cta-e-dm.txt']), /CHECKLIST/);
});

test('template styles go from agent text to finished cards without the ChatGPT account', async t => {
  const { store, run, file, rendered } = await setup(t);
  const id = (await run('criar', '--pauta', 'Faltas', '--estilo', 'textopreto', '--agente')).json.id;
  await run('texto', id, '--arquivo', await file('p.json', { title: 'T', architecture: '', editorialLine: '', visualConcept: '', coverHooks: [], caption: 'c', reply: '', regenerateSlideIds: [], slides: [card('a', 'Capa', 'Capa', ''), card('b', 'Fim', 'Fim', 'Comente')] }));
  await run('aprovar', id);
  let r = await run('capas', id);
  assert.equal(store.get(id).coverOptions.length, 3);
  r = await run('escolher-capa', id, '1');
  r = await run('gerar', id);
  assert.equal(r.json.status, 'complete'); assert.equal(rendered.length, 4);
});

test('the CLI writes stories and the CTA kit with the ChatGPT account, switches the background and reviews the copy', async t => {
  const prompts = [];
  const replies = { stories: { stories: [{ type: 'Gancho', text: 'Você confirma no dia?', sticker: '', cta: '', visual: '' }, { type: 'CTA', text: 'Não é sorte, é método.\nComente CHECKLIST', sticker: '', cta: 'Comentar', visual: '' }] },
    cta: { keywords: ['CHECKLIST'], firstCardCta: 'Comente CHECKLIST', lastCardCta: 'Comente CHECKLIST', freebie: 'Checklist', dm1: 'Aqui está — o checklist', dm2: 'Me chama.' } };
  const codex = { status: { account: { connected: true } }, cancel: async () => {}, run: async o => { prompts.push(o.prompt); return { text: JSON.stringify(/STORIES|stories SÓ DE TEXTO/.test(o.prompt) ? replies.stories : replies.cta) }; } };
  const { root, store, run, file, rendered } = await setup(t, { codex });
  const id = (await run('criar', '--pauta', 'Faltas', '--estilo', 'texto', '--agente', 'claude')).json.id;
  await run('texto', id, '--arquivo', await file('p.json', { title: 'T', architecture: '', editorialLine: '', visualConcept: '', coverHooks: [], caption: 'Comente CHECKLIST', reply: '', regenerateSlideIds: [], slides: [card('a', 'Capa', '3 mensagens', 'Comente'), card('b', 'Fim', 'Quer o modelo?', 'Comente CHECKLIST')] }));

  let r = await run('cta', id);
  assert.match(prompts[0], /VOZ HUMANA/); assert.equal(r.json.ctaKit.keywords[0], 'CHECKLIST'); assert.match(r.err, /DM 1: travessão/);
  r = await run('stories', id, '--fundo', 'branco');
  assert.match(prompts[1], /SÓ DE TEXTO/); assert.match(prompts[1], /comentar a palavra-chave CHECKLIST/);
  assert.equal(r.json.storyTheme, 'branco'); assert.equal(r.json.stories.length, 2); assert.ok(r.json.stories.every(s => s.image && s.art === 'simples'));
  assert.match(rendered.at(-1).html, /background:#ffffff/); assert.match(r.err, /story 2: contraste/);
  r = await run('fundo-stories', id, 'preto');
  assert.equal(r.json.storyTheme, 'preto'); assert.match(rendered.at(-1).html, /background:#000000/);
  await assert.rejects(run('fundo-stories', id, 'azul'), /preto\|branco/);

  r = await run('revisar', id);
  assert.equal(r.json.ok, false); assert.deepEqual([...new Set(r.json.tells.map(x => x.where))].sort(), ['DM 1', 'story 2']);
  r = await run('revisar', '--arquivo', await file('solto.txt', 'Sua jornada começa aqui!!'));
  assert.deepEqual(r.json.tells.map(x => x.label), ['palavra de palestra', 'exclamações em série']);
  r = await run('exportar', id, '--pasta', join(root, 'so-stories'), '--so-stories');
  assert.deepEqual(r.json.files.map(f => f.slice(join(root, 'so-stories').length + 1).replaceAll('\\', '/')).sort(), ['stories.txt', 'stories/01.png', 'stories/02.png']);
  await assert.rejects(run('exportar', id, '--pasta', join(root, 'tudo')), /Carrossel incompleto/);
  r = await run('projeto', id);
  assert.equal(r.json.madeBy, 'claude'); assert.equal(r.json.stories.length, 2); assert.equal(r.json.ctaKit.dm2, 'Me chama.');
});

test('a carousel finished by an agent can be posted and scheduled like any other', async t => {
  const { store, run, file } = await setup(t);
  const id = (await run('criar', '--pauta', 'Faltas', '--agente', 'gemini')).json.id;
  await run('texto', id, '--arquivo', await file('p.json', { title: 'T', architecture: '', editorialLine: '', visualConcept: '', coverHooks: [], caption: 'Comente', reply: '', regenerateSlideIds: [], slides: [card('a', 'Capa', 'Capa', ''), card('b', 'Fim', 'Fim', 'Comente')] }));
  await run('aprovar', id);
  assert.throws(() => postable(store.get(id)), /Gere ou atualize/);
  for (const n of ['1', '2']) await run('card', id, n, '--imagem', await file(`c${n}.png`, png));
  assert.doesNotThrow(() => postable(store.get(id)));
  await assert.rejects(run('postar', id), /--confirmar/);
});
