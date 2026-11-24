import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { main } from '../cli/carrossell.mjs';
import { cliPersona, parseCommand, Usage } from '../cli/arguments.mjs';
import { loadKnowledge } from '../core/knowledge.mjs';
import { agentActions, lean, licenseControlActions } from '../core/control.mjs';
import { generationSkills } from '../core/generation-skills.mjs';
import { TERMS_URL, TERMS_VERSION, validLicenseAcceptance } from '../core/license.mjs';
import { Runtime, PLAN_SCHEMA } from '../core/runtime.mjs';
import { Store } from '../core/store.mjs';

const exec = promisify(execFile);
const launcher = new URL('../cli/bin/carrossell', import.meta.url);
const sample = JSON.parse(await readFile(new URL('../src/data/cli-plan.json', import.meta.url), 'utf8'));
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=', 'base64');

async function folder(t) {
  const root = await mkdtemp(join(tmpdir(), 'carrossell-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

async function setup(t, options = {}) {
  const root = await folder(t);
  const store = await new Store(root).init();
  const rendered = [], calls = [];
  const runtime = new Runtime({
    store, knowledge: loadKnowledge(), skills: options.skills,
    codex: options.codex || { status: { account: { connected: false } } },
    dialogs: { render: { fonts: {}, png: async (html, size) => { rendered.push({ html, size }); return png; } }, ...options.dialogs },
  });
  const actions = { ...agentActions(runtime), ...(options.license ? licenseControlActions(options.license) : {}) };
  const client = {
    call(action, args = {}) {
      calls.push(action);
      return actions[action] ? actions[action](args) : runtime.request(action, args);
    },
    async subscribe() {},
    close() {},
  };
  const run = async (...argv) => {
    const out = [], err = [];
    const stdout = process.stdout.write, stderr = process.stderr.write;
    process.stdout.write = value => (out.push(String(value)), true);
    process.stderr.write = value => (err.push(String(value)), true);
    try {
      const code = await main(argv, { userData: root, connectApp: async () => client });
      return { code, json: JSON.parse(out.join('')), err: err.join('') };
    } finally {
      process.stdout.write = stdout;
      process.stderr.write = stderr;
    }
  };
  const file = async (name, value) => {
    const path = join(root, name);
    await writeFile(path, typeof value === 'string' ? value : JSON.stringify(value));
    return path;
  };
  return { store, runtime, root, run, rendered, calls, file };
}

test('criar --slides uses the agent plan, approves, renders the requested options and exports', async t => {
  const { store, run, calls, root, rendered, file } = await setup(t);
  const plan = structuredClone(sample);
  plan.slides[1].body = 'Não é falta de lembrete, é horário ruim.';
  const path = await file('plano.json', '```json\n' + JSON.stringify(plan) + '\n```');
  const target = join(root, 'saida');
  const { json, err } = await run('criar', '--slides', path, '--titulo', 'Meu carrossel', '--quantas', '2', '--capa', '2', '--estilo', 'textopreto', '--agente', 'gemini', '--exportar', target);
  assert.deepEqual({ ...json, id: undefined, alertas: undefined }, { id: undefined, estilo: 'textopreto', cards: 3, capa: 2, arquivos: ['01.png', '02.png', '03.png', 'legenda.txt'].map(name => join(target, name)), alertas: undefined });
  assert.match(err, /Sinais de texto de IA.*card 2/);
  assert.equal(json.alertas[0].where, 'card 2 (texto)');
  assert.equal(await readFile(join(target, 'legenda.txt'), 'utf8'), plan.caption);
  assert.deepEqual(await readFile(join(target, '01.png')), png);
  const saved = store.get(json.id);
  assert.equal(saved.title, 'Meu carrossel');
  assert.equal(saved.brief, 'Meu carrossel');
  assert.equal(saved.madeBy, 'gemini');
  assert.equal(saved.textApproved, true);
  assert.equal(saved.styleVariant, 1);
  assert.equal(saved.coverOptions.length, 2);
  assert.equal(saved.status, 'complete');
  assert.equal(rendered.length, 4);
  assert.ok(!calls.includes('generatePlan'));
});

test('criar --slides defaults to texto, the first cover and an agent label', async t => {
  const { store, run, file } = await setup(t);
  const { json } = await run('criar', '--slides', await file('plano.json', sample));
  const saved = store.get(json.id);
  assert.equal(json.estilo, 'texto');
  assert.equal(json.capa, 1);
  assert.deepEqual(json.arquivos, []);
  assert.equal(saved.coverOptions.length, 1);
  assert.equal(saved.brief, sample.title);
  assert.equal(saved.madeBy, 'agente');
});

test('criar removes its own project if the plan, approval, rendering or first export fails', async t => {
  const { store, run, root, file } = await setup(t);
  const existing = await store.createProject({ title: 'Projeto existente', brief: 'Manter' });
  await assert.rejects(run('criar', '--pauta', 'Sem conta'), /Conecte sua conta ChatGPT.*Projeto .* apagado/);
  const bad = structuredClone(sample);
  bad.slides[0].body = 'Função: apresentar o problema';
  await assert.rejects(run('criar', '--slides', await file('bad.json', bad)), /instrução em body.*Projeto .* apagado/);
  bad.slides[0].body = '';
  bad.slides[0].title = '';
  await assert.rejects(run('criar', '--slides', await file('empty-title.json', bad)), /precisam de título.*Projeto .* apagado/);
  const plan = await file('plano.json', sample);
  await assert.rejects(run('criar', '--slides', plan, '--estilo', 'fundo'), /foto com o seu rosto.*Projeto .* apagado/);
  await assert.rejects(run('criar', '--slides', plan, '--exportar', join(root, 'plano.json')), /exportação.*Projeto .* apagado/);
  assert.deepEqual(store.state().projects.map(p => p.id), [existing.id]);
});

test('criar keeps the project and reports files after a partial export', async t => {
  const { store, run, root, file } = await setup(t);
  const target = join(root, 'saida');
  await mkdir(join(target, '02.png'), { recursive: true });
  const plan = await file('plano.json', sample);
  await assert.rejects(run('criar', '--slides', plan, '--exportar', target), error => {
    assert.match(error.message, /Projeto .* preservado/);
    assert.equal(store.get(error.details.id).status, 'complete');
    assert.deepEqual(error.details.arquivos.map(path => basename(path)), ['01.png']);
    return true;
  });
  assert.deepEqual(await readFile(join(target, '01.png')), png);
});

test('criar reports a failed generation and removes the empty draft', async t => {
  const codex = { status: { account: { connected: true } }, async run() { throw new Error('Falha no modelo'); } };
  const { store, run } = await setup(t, { codex });
  await assert.rejects(run('criar', '--pauta', 'Falha posterior'), /Falha no modelo.*Projeto .* apagado/);
  assert.deepEqual(store.state().projects, []);
});

test('criar discards a background project after asynchronous plan failure', async t => {
  const codex = { status: { account: { connected: true } }, async run() { throw new Error('Falha no modelo'); } };
  const { store, runtime, run } = await setup(t, { codex });
  const { json } = await run('criar', '--pauta', 'Falha posterior', '--sem-esperar');
  assert.equal(json.status, 'planning');
  await runtime.job?.done;
  assert.deepEqual(store.state().projects, []);
});

test('invalid usage and version do not connect to the app', async () => {
  const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  let connections = 0;
  const options = { connectApp: () => { connections++; throw new Error('Tentou conectar'); } };
  const stdout = process.stdout.write, lines = [];
  process.stdout.write = value => (lines.push(String(value)), true);
  try {
    for (const args of [['--version'], ['-v'], ['versao']]) assert.equal(await main(args, options), 0);
  } finally { process.stdout.write = stdout; }
  assert.deepEqual(lines.filter(line => line.startsWith('Carrossell ')), Array(3).fill(`Carrossell ${version}\n`));
  for (const args of [
    ['voar'], ['status', '--desconhecida'], ['texto', 'abc'], ['marca', 'outra'],
    ['capas', 'abc', '--quantas', '0'], ['editar', 'abc', '--json', 'x'],
    ['criar', '--slides', 'plano.json', '--estilo', 'ia'],
    ['criar', '--slides', 'plano.json', '--capa', '2'],
    ['licença', 'ativar', '--email', 'pessoa@example.com'],
  ]) {
    await assert.rejects(main(args, options), error => {
      assert.ok(error instanceof Usage);
      if (args[0] === 'licença') {
        assert.ok(error.message.includes(TERMS_VERSION));
        assert.ok(error.message.includes(TERMS_URL));
      }
      return true;
    });
  }
  await assert.rejects(main(['fundo-stories', 'projeto', 'azul'], options), {
    message: 'Use: carrossell fundo-stories <id> preto|branco',
  });
  await assert.rejects(main(['stories', 'projeto', '--fundo', 'azul'], options), {
    message: 'Use --fundo preto ou --fundo branco.',
  });
  assert.equal(connections, 0);
});

test('license socket actions use current terms and return only safe fields', async t => {
  const secret = 'valor-sintetico-de-teste';
  const raw = { activated: true, emailMasked: 'p****a@example.com', expiresAt: '2028-01-01T00:00:00Z', code: 'activated',
    token: secret, key: secret, signature: secret, nested: { secret } };
  const license = { status: async () => raw, activateLicense: async options => {
    assert.equal(options.email, 'pessoa@example.com');
    assert.equal(validLicenseAcceptance(options.accepted, options.termsVersion, options.acceptedAt), true);
    return raw;
  } };
  const { run } = await setup(t, { license });
  for (const args of [['licenca', 'status'], ['licença', 'ativar', '--email', 'pessoa@example.com', '--aceito']]) {
    const { json, code } = await run(...args);
    assert.equal(code, 0);
    assert.equal(JSON.stringify(json).includes(secret), false);
    assert.deepEqual(json, { activated: true, emailMasked: raw.emailMasked, expiresAt: '2028-01-01T00:00:00.000Z', graceUntil: null, code: 'activated' });
  }
  const actions = licenseControlActions(license);
  assert.deepEqual(Object.keys(actions), ['licenseStatus', 'activateLicense']);
  assert.equal(JSON.stringify(await actions.licenseStatus()).includes(secret), false);
  await assert.rejects(actions.activateLicense({ email: 'pessoa@example.com', accepted: true, termsVersion: 'antiga' }), /Aceite os termos/);
  const unrecognized = await licenseControlActions({ status: async () => ({ code: secret, emailMasked: 'pessoa@example.com' }) }).licenseStatus();
  assert.equal(unrecognized.code, 'erro_licenca');
  assert.equal(unrecognized.emailMasked, null);
});

test('skills extend the same prompt in model generation and tarefa texto', async t => {
  const root = await folder(t);
  const bundledDir = join(root, 'bundled');
  const userDir = join(root, 'skills');
  await mkdir(bundledDir);
  await mkdir(userDir);
  const skills = generationSkills({ bundledDir, userData: root });
  const received = [];
  const codex = { status: { account: { connected: true } }, async run(options) {
    received.push(options.prompt);
    return { text: JSON.stringify({ ...sample, slides: [], reply: 'Qual é o seu público?' }) };
  } };
  const { runtime, run, store } = await setup(t, { skills, codex });
  const p = await store.createProject({ title: sample.title, brief: 'Pauta', style: 'texto' });
  const original = runtime.planPrompt(p.id);
  assert.equal(skills.skillContext('plan'), '');
  assert.equal(runtime.agentTask(p.id, 'texto').prompt, original);
  assert.deepEqual((await run('skills')).json, [{
    id: 'hooks-slideshow', name: 'hooks-slideshow', title: 'Ganchos de slideshow',
    description: 'Categorias de gancho para a capa do carrossel.', applies_to: 'plan',
  }]);
  const content = (name, kind, body) => `---\nname: ${name}\ndescription: Modelo de teste\napplies_to: ${kind}\n---\n${body}\n`;
  await writeFile(join(bundledDir, 'a.md'), content('roteiro', 'plan', 'Original.'));
  await writeFile(join(userDir, 'override.md'), content('roteiro', 'plan', 'Abra com uma pergunta concreta.'));
  await writeFile(join(userDir, 'cover.md'), content('capa', 'cover', 'Somente para capa.'));
  await writeFile(join(userDir, 'invalid.md'), '# Arquivo sem frontmatter');
  await writeFile(join(userDir, 'collision.md'), content('hooks-slideshow', 'plan', 'Não deve repetir a skill embutida.'));
  const task = await run('tarefa', p.id, 'texto', '--pasta', root);
  const taskPrompt = await readFile(task.json.pedido, 'utf8');
  assert.equal(taskPrompt, original + '\n\nSKILL: roteiro (estilo do projeto: texto)\nAbra com uma pergunta concreta.');
  await runtime.request('generatePlan', { id: p.id });
  await runtime.job.done;
  assert.equal(received[0].split('SKILL:').at(-1), taskPrompt.split('SKILL:').at(-1));
  assert.deepEqual((await run('skills')).json.map(skill => skill.name), ['hooks-slideshow', 'roteiro', 'capa']);
});

test('provider persists per store and the guide example follows PLAN_SCHEMA', async t => {
  const root = await folder(t);
  const store = await new Store(root).init();
  await assert.rejects(store.saveSettings({ provider: 'outro' }), /Provedor/);
  await store.saveSettings({ provider: 'cli' });
  const reopened = await new Store(root).init();
  assert.equal(reopened.state().settings.provider, 'cli');
  assert.equal(reopened.state().profile, null);
  await reopened.saveSettings({ provider: 'chatgpt' });
  assert.equal((await new Store(root).init()).state().settings.provider, 'chatgpt');

  function validate(value, schema) {
    if (schema.type === 'object') {
      assert.deepEqual(Object.keys(value).sort(), [...schema.required].sort());
      for (const key of schema.required) validate(value[key], schema.properties[key]);
    } else if (schema.type === 'array') {
      assert.ok(Array.isArray(value));
      assert.ok(value.length >= (schema.minItems ?? 0));
      assert.ok(value.length <= (schema.maxItems ?? Infinity));
      for (const item of value) validate(item, schema.items);
    } else assert.equal(typeof value, schema.type);
  }
  validate(sample, PLAN_SCHEMA);
});

test('Linux launcher follows a symlink and picks the installed executable or a fallback', { skip: process.platform !== 'linux' }, async t => {
  const root = await folder(t);
  const bin = join(root, 'resources', 'bin');
  await mkdir(bin, { recursive: true });
  const script = join(bin, 'carrossell');
  const link = join(root, 'carrossell-cli');
  await writeFile(script, await readFile(launcher), { mode: 0o755 });
  await symlink('resources/bin/carrossell', link);
  for (const name of ['pacto-desktop', 'carrossell', 'Carrossell']) {
    const path = join(root, name);
    await writeFile(path, '#!/bin/sh\nprintf "%s\\n" "$ELECTRON_RUN_AS_NODE" "$1" "$2"\n', { mode: 0o755 });
    const { stdout } = await exec(link, ['--version']);
    assert.match(stdout, /^1\n.*app\.asar\/cli\/carrossell\.mjs\n--version\n$/);
    await rm(path);
  }
  await assert.rejects(exec(link, ['--version']), error => error.code === 127 && /Não encontrei o executável/.test(error.stderr));
});

const personaFlags=['--nome','Lia Costa','--idade','28','--genero','mulher','--etnia','parda','--estilo','casual','--cenario','rua','--nicho','educação','--instagram','@lia'];
const jpeg=Buffer.from([255,216,255,0,2,255,217]);
const dataUrl=(kind,bytes)=>`data:image/${kind};base64,${bytes.toString('base64')}`;
const ugcPlan=()=>({
  estilo:'ugc',title:'UGC',caption:'Veja como comecei. #dica #educação',
  slides:[{id:'gancho',role:'Capa',title:'Eu comecei de um jeito simples'},
    {id:'tela',role:'Produto',title:'A tela do produto',produto:true},
    {id:'cta',role:'CTA',title:'Teste no seu ritmo',scene:{acao:'fecha o caderno',luz:'flash'}}],
});

test('CLI valida comandos persona e opções UGC antes de conectar',async t=>{
  const root=await folder(t),fake=join(root,'falso.png'),big=join(root,'grande.png');
  await writeFile(fake,'arquivo de texto');
  await writeFile(big,png);await truncate(big,15*1024*1024+1);
  let connections=0;
  const options={connectApp:()=>{connections++;assert.fail('Abriu o app com argumentos inválidos');}};
  assert.equal(parseCommand(['persona','usar','Lia Costa','--perfil','Marca']).flags.perfil,'Marca');
  const create=['criar','--slides','plano.json','--estilo','ugc'];
  assert.deepEqual(parseCommand([...create,'--avatar','Lia Costa']),parseCommand([...create,'--persona','Lia Costa']));
  const list=parseCommand(['avatares','listar','--perfil','Marca']);
  assert.equal(list.flags.perfil,'Marca');
  assert.deepEqual(list.rest,['listar']);
  let help='';
  const stdout=t.mock.method(process.stdout,'write',chunk=>{help+=chunk;return true;});
  try{assert.equal(await main(['ajuda'],options),0);}
  finally{stdout.mock.restore();}
  assert.match(help,/avatares listar/);
  assert.match(help,/--avatar <id\|nome>/);
  for(const argv of [
    ['persona','criar','--nome','Lia'],
    ['persona','criar',...personaFlags.map(word=>word==='28'?'0':word),'--foto',fake],
    ['persona','criar',...personaFlags.map(word=>word==='@lia'?'lia':word),'--foto',fake],
    ['persona','foto','Lia','--foto',fake],['persona','foto','Lia','--foto',big],
    ['persona','prompt','Lia','--luz','flash'],
    ['persona','prompt','Lia','--cena','rua','--luz','estúdio'],
    ['criar','--slides','plano.json','--estilo','ugc','--produto-link','file:///tmp/pagina'],
    [...create,'--avatar','Lia','--persona','Outra'],
    ['criar','--slides','plano.json','--estilo','texto','--avatar','Lia'],
    ['criar','--slides','plano.json','--estilo','ugc','--produto-imagem',fake,'--produto-link','https://exemplo.test'],
    ['exportar','projeto','--pasta','saida','--tiktok','--so-stories'],
  ]) await assert.rejects(main(argv,options),Usage);
  assert.equal(connections,0);
});

test('CLI cria, lista, ativa, protege a âncora, imprime prompts e apaga persona',async t=>{
  const {root,run,store}=await setup(t,{dialogs:{anchorHash:()=> '0123456789abcdef'}});
  const anchor=join(root,'anchor.jpeg'),next=join(root,'nova.jpeg');
  await writeFile(anchor,jpeg);
  await writeFile(next,Buffer.from([255,216,255,0,3,255,217]));
  const created=(await run('persona','criar',...personaFlags,'--foto',anchor,'--usar')).json;
  assert.equal(created.persona.nome,'Lia Costa');
  assert.deepEqual(created.avisos,[]);
  assert.equal(created.activePersonaId,created.persona.id);
  const clone=(await run('persona','criar',...personaFlags.map(word=>word==='Lia Costa'?'Lia Dois':word),'--foto',anchor)).json;
  assert.match(clone.avisos[0].motivo,/rosto possivelmente igual/);
  assert.equal((await run('persona','usar','Lia','Dois')).json.activePersonaId,clone.persona.id);
  assert.equal((await run('persona','listar')).json.personas.length,2);
  await assert.rejects(run('persona','foto',created.persona.id,'--foto',next),/foto-âncora original.*salva/);
  assert.equal(store.persona('Lia Costa').anchor,dataUrl('jpeg',jpeg));
  const prompt=(await run('persona','prompt','Lia Costa')).json;
  assert.match(prompt.prompt,/selfie/i);
  assert.equal(prompt.avisos.length,1);
  assert.match((await run('persona','prompt','Lia Costa','--cena','pega café','--luz','pov')).json.prompt,/MANTER.*\n/);
  assert.deepEqual(lean({anchor:created.persona.anchor}),{anchor:'[imagem]'});
  await run('persona','apagar',clone.persona.id);
  assert.equal((await run('persona','listar')).json.activePersonaId,null);
});

test('CLI lista, renomeia, associa ao perfil e apaga avatares salvos',async t=>{
  const {root,run,store}=await setup(t,{dialogs:{anchorHash:()=> '0123456789abcdef'}});
  const path=join(root,'ancora.jpeg');
  await writeFile(path,jpeg);
  const fields=cliPersona(parseCommand(['persona','criar',...personaFlags,'--foto',path]).flags);
  const persona=await store.savePersona(fields);
  await run('persona','foto',persona.id,'--foto',path);
  await store.savePersona({...fields,nome:'Rascunho'});
  await run('avatares','renomear','Lia','Costa','--nome','Lia Tavares');
  await run('avatares','cara-do-perfil','Lia Tavares');
  const {json}=await run('avatares','listar');
  assert.equal(json.avatares.length,1);
  assert.equal(json.avatares[0].id,persona.id);
  assert.equal(json.avatares[0].nome,'Lia Tavares');
  assert.equal(json.avatares[0].anchor,'[imagem]');
  assert.equal(json.activePersonaId,persona.id);
  assert.equal(json.avatarPersonaId,persona.id);
  assert.equal(store.media().avatar,dataUrl('jpeg',jpeg));
  await run('avatares','apagar',persona.id);
  assert.deepEqual((await run('avatares','listar')).json,{avatares:[],activePersonaId:null,avatarPersonaId:null});
});

test('CLI importa fotos relativas ao plano UGC e exporta sem chamar geração offline',async t=>{
  const codex={status:{account:{connected:false}},run:()=>assert.fail('Chamou geração sem ChatGPT')};
  const {root,store,run,rendered,file}=await setup(t,{codex});
  const plan=ugcPlan();
  await mkdir(join(root,'fotos'));await writeFile(join(root,'fotos','capa.png'),png);await writeFile(join(root,'fotos','cta.jpeg'),jpeg);
  plan.slides[0].foto='fotos/capa.png';plan.slides[2].foto='fotos/cta.jpeg';
  const input=await file('plano.json',plan),output=join(root,'saida');
  const {json}=await run('criar','--slides',input,'--produto-imagem',join(root,'fotos','capa.png'),'--exportar',output,'--tiktok');
  assert.equal(json.estilo,'ugc');
  assert.deepEqual(json.arquivos.map(path=>basename(path)),['01.png','02.png','03.png','legenda.txt','tiktok.txt']);
  const p=store.get(json.id);
  assert.equal(p.slides[0].photo,dataUrl('png',png));
  assert.equal(p.slides[2].photo,dataUrl('jpeg',jpeg));
  assert.match(rendered[1].html,/ugc-product ugc-phone" src=/);
  assert.equal(await readFile(join(output,'tiktok.txt'),'utf8'),'Veja como comecei.\n\n#dica #educação');
  const second=await run('exportar',json.id,'--pasta',join(root,'tiktok'),'--tiktok');
  assert.ok(second.json.files.some(path=>path.endsWith('tiktok.txt')));
});

test('CLI usa âncora ativa offline e explica quando falta foto para o slide 1',async t=>{
  const codex={status:{account:{connected:false}},run:()=>assert.fail('Chamou geração sem ChatGPT')};
  const {store,run,root,file}=await setup(t,{codex,dialogs:{anchorHash:()=> '0123456789abcdef'}});
  const plan=await file('plano.json',ugcPlan());
  await assert.rejects(run('criar','--slides',plan),/slide 1.*foto.*foto-âncora/);
  const path=join(root,'ancora.jpeg');await writeFile(path,jpeg);
  await run('persona','criar',...personaFlags,'--foto',path,'--usar');
  const {json}=await run('criar','--slides',plan,'--estilo','ugc');
  assert.equal(store.get(json.id).slides[0].photo,dataUrl('jpeg',jpeg));
  assert.equal(store.get(json.id).slides[2].photo,'');
});

test('CLI gera cenas pendentes com a âncora selecionada por --avatar',async t=>{
  const references=[],captures=[];
  const codex={status:{account:{connected:true}},run:async options=>{references.push(options.references);return {images:[png]};}};
  const {root,run,store,file,rendered}=await setup(t,{codex,dialogs:{anchorHash:()=> '0123456789abcdef',
    captureProductPage:async url=>{captures.push(url);return dataUrl('png',png);}}});
  const path=join(root,'ancora.jpeg');await writeFile(path,jpeg);
  await run('persona','criar',...personaFlags,'--foto',path);
  const input=await file('plano.json',{...ugcPlan(),persona:'Outro avatar'});
  const {json}=await run('criar','--slides',input,'--avatar','Lia Costa','--produto-link','https://exemplo.test');
  assert.equal(store.get(json.id).status,'complete');
  assert.deepEqual(captures,['https://exemplo.test/']);
  assert.deepEqual(references,[[dataUrl('jpeg',jpeg)],[dataUrl('jpeg',jpeg)]]);
  assert.match(rendered[1].html,/ugc-product ugc-phone" src=/);
});
