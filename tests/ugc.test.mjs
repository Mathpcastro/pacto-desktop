import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { anchorPrompt, scenePrompt } from '../core/ugc.mjs';
import { Runtime } from '../core/runtime.mjs';
import { slideHtml } from "../core/templates.mjs";
import { Store } from '../core/store.mjs';
import { productUrl } from "../core/ugc-product.mjs";
import { captureMobileFold } from "../electron/page.mjs";
import { strFromU8, unzipSync } from "fflate";

const fields={nome:'Lia Tavares',idade:28,genero:'mulher',etnia:'parda',cabelo:'cacheado',olhos:'castanhos',marcaFixa:'sardas',porte:'mediano',estilo:'camiseta verde',cenario:'café de bairro',nicho:'educação'};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=','base64');
const dataUrl=bytes=>'data:image/png;base64,'+bytes.toString('base64');
function checkNegatives(prompt){
  for(const term of ['pele plástica','cerosa','brilho de IA','retouch','luz de estúdio','grade de cinema','bokeh cremoso','Sem texto legível','logo',"marca d'água",'meio-sorriso repetido','fora do centro','corte acidental'])
    assert.ok(prompt.includes(term),term);
  assert.doesNotMatch(prompt,/escreva|desenhe o gancho|\{\w+\}/i);
}

test('prompt de âncora preenche a persona e pede selfie sem texto',()=>{
  const prompt=anchorPrompt(fields);
  for(const value of Object.values(fields))assert.ok(prompt.includes(String(value)),String(value));
  assert.match(prompt,/Selfie casual.*iPhone/);
  assert.match(prompt,/Luz de janela/);
  checkNegatives(prompt);
});

test('prompts de cena mantêm a identidade e variam entre flash, ambiente e POV',()=>{
  for(const [luz,detail] of [['flash','Flash frontal duro'],['ambiente','Só luz ambiente'],['pov','over-the-shoulder']]){
    const prompt=scenePrompt(fields,{luz,acao:'pega a bolsa',cenario:'na saída'});
    for(const fragment of ['MANTER','âncora ORIGINAL','nunca a última foto gerada','pega a bolsa','na saída',detail])
      assert.ok(prompt.includes(fragment),fragment);
    checkNegatives(prompt);
  }
});

test('geração de cenas envia sempre os bytes da âncora original',async t=>{
  const root=await mkdtemp(join(tmpdir(),'carrossell-ugc-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const store=await new Store(root).init();
  const calls=[],normalizations=[];
  const codex={status:{account:{connected:true}},async run(params){calls.push(params);return {images:[calls.length===1?png:Buffer.concat([png,Buffer.from([calls.length])])]};}};
  const runtime=new Runtime({store,codex,knowledge:{lessons:[]},dialogs:{anchorHash:()=> 'abcdef1234567890',normalizeUgcPhoto:bytes=>{normalizations.push(bytes);return bytes;}}});
  const {persona}=await runtime.request('savePersona',{persona:fields,use:true});
  const state=await runtime.request('generatePersonaAnchor',{personaId:persona.id});
  assert.equal(state.personas[0].anchor,dataUrl(png));
  const {id}=await store.createProject({title:'UGC',brief:'Roteiro',style:'ugc'});
  await store.saveProject({id,slides:[{id:'one',title:'Gancho',visual:'Sai de casa'},{id:'two',title:'Corpo',visual:'Chega ao café'}]});
  const first=await runtime.request('generateUgcScene',{projectId:id,slideId:'one'});
  const second=await runtime.request('generateUgcScene',{projectId:id,slideId:'two'});
  assert.notEqual(first.slides[0].photo,dataUrl(png));
  assert.notEqual(second.slides[1].photo,first.slides[0].photo);
  assert.equal(normalizations.length,3);
  assert.deepEqual(calls.map(c=>c.references),[[],[dataUrl(png)],[dataUrl(png)]]);
  assert.ok(calls.slice(1).every(c=>c.prompt.includes('MANTER')&&!c.prompt.includes('Gancho')));
  codex.status.account.connected=false;
  await runtime.request('generatePersonaAnchor',{personaId:persona.id});
  await assert.rejects(runtime.request('generateUgcScene',{projectId:id,slideId:'one'}),/Conecte sua conta ChatGPT/);
  assert.equal(calls.length,3);
});

test('slide UGC renderiza a foto de capa e sobrepõe o gancho escapado sem cabeçalho',()=>{
  const html=slideHtml({style:'ugc',slide:{title:'Eu achei <um jeito>',body:'Texto fora da capa',photo:dataUrl(png)},index:0,total:4});
  assert.match(html,/ugc-bg"><img class="photo"/);
  assert.ok(html.includes(dataUrl(png)));
  assert.match(html,/ugc-hook"><h1>Eu achei &lt;um jeito&gt;<\/h1>/);
  assert.doesNotMatch(html,/Sua marca|@seuperfil|Texto fora da capa/);
});

test('cards UGC internos escolhem a moldura pela proporção do produto e preservam os outros layouts',()=>{
  const render=(index,slide)=>slideHtml({style:'ugc',index,total:5,slide:{title:'Um título',body:'Meu texto',...slide}});
  const portrait='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAYAAAANCAIAAAAFaYjcAAAAFUlEQVR42mP8//8/AypgYsAAw04IAOnBAxfdh7RSAAAAAElFTkSuQmCC';
  const landscape='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAJCAIAAAC0SDtlAAAAF0lEQVR42mP8//8/AymAiYFEMKqBJhoAMWADDxRJg8oAAAAASUVORK5CYII=';
  const webp='data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoQAAkAAUAmJaQAA3AA/vz0AAA=';
  const phone=render(1,{asset:portrait});
  assert.match(phone,/<h1>Um título<\/h1><img class="ugc-product ugc-phone"[^>]+><p class="body">Meu texto<\/p>/);
  assert.match(phone,/\.ugc-phone\{height:945px;aspect-ratio:9 \/ 19\.5;[^}]+object-fit:cover;object-position:top/);
  for (const assetImage of [landscape, webp]) {
    assert.match(render(1,{assetImage}),/<img class="ugc-product ugc-screen"/);
  }
  assert.doesNotMatch(render(2,{}),/ugc-bg">/);
  assert.match(render(2,{}),/Meu texto/);
  assert.match(render(3,{photo:dataUrl(png)}),/ugc-shade"><\/div>/);
  assert.match(render(4,{}),/ugc-cta"><h1>/);
});

test('moldura segue a orientação exibida de JPEGs com EXIF', () => {
  const jpeg = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAAJABABAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/AL+A/9k=';
  const bytes = Buffer.from(jpeg, 'base64');
  const exif = Buffer.from('ffe100224578696600004d4d002a00000008000101120003000000010006000000000000', 'hex');
  const rotated = Buffer.concat([bytes.subarray(0, 2), exif, bytes.subarray(2)]).toString('base64');
  const render = data => slideHtml({ style: 'ugc', index: 1, total: 3, slide: { assetImage: 'data:image/jpeg;base64,' + data } });
  assert.match(render(jpeg), /<img class="ugc-product ugc-screen"/);
  assert.match(render(rotated), /<img class="ugc-product ugc-phone"/);
});

test('montagem UGC offline exige foto na capa e usa fundo liso nos outros cards',async t=>{
  const root=await mkdtemp(join(tmpdir(),'carrossell-ugc-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const store=await new Store(root).init(),rendered=[];
  const runtime=new Runtime({store,knowledge:{lessons:[]},
    dialogs:{render:{fonts:{},png:async html=>{rendered.push(html);return png;}}},
    codex:{status:{account:{connected:false}},run:()=>assert.fail('Geração chamada sem conta')}});
  const project=await runtime.request('createProject',{title:'UGC',brief:'Pauta',style:'ugc',productAsset:dataUrl(png)});
  const slides=[{id:'hook',title:'Eu comecei assim'},{id:'product',title:'A tela',product:true},{id:'cta',title:'Teste hoje'}];
  await store.saveProject({id:project.id,slides});
  await runtime.request('approveText',{id:project.id});
  await assert.rejects(runtime.request('generateCovers',{id:project.id,count:1}),/campo foto no plano ou --foto/);
  await store.saveProject({id:project.id,slides:[{...slides[0],photo:dataUrl(png)},...slides.slice(1)]});
  const complete=await runtime.request('generateSlides',{id:project.id});
  assert.equal(complete.status,'complete');
  assert.match(rendered[1],/ugc-product ugc-phone" src=/);
  assert.doesNotMatch(rendered[2],/ugc-bg">/);
  assert.match(runtime.planPrompt(project.id),/primeira pessoa.*12 palavras/);
  assert.match(runtime.planPrompt(project.id),/acao, cenario e luz/);
});

test('link de produto aceita somente HTTP e HTTPS sem credenciais',()=>{
  assert.equal(productUrl(' https://exemplo.test/app '),'https://exemplo.test/app');
  assert.equal(productUrl('http://exemplo.test'),'http://exemplo.test/');
  for(const link of ['exemplo.test','file:///tmp/x','javascript:alert(1)','ftp://exemplo.test','https://a:b@exemplo.test','https://'])
    assert.throws(()=>productUrl(link),/HTTP ou HTTPS/);
});

test('captura do produto carrega como celular sem emulação por debugger e captura só a primeira dobra sem barras', async () => {
  const calls = [];
  const url = 'https://exemplo.test/';
  const win = {
    async loadURL(target, options) {
      calls.push(['load', target, options]);
      await Promise.resolve();
      calls.push(['loaded']);
    },
    webContents: {
      debugger: {
        attach() { assert.fail('o debugger derruba o Electron 44 no Linux'); },
        async sendCommand() { assert.fail('o debugger derruba o Electron 44 no Linux'); },
      },
      async capturePage(rect) {
        calls.push(['capture', rect]);
        return {
          isEmpty: () => false,
          toDataURL(options) {
            calls.push(['encode', options]);
            return dataUrl(png);
          },
        };
      },
      getURL: () => url,
      async insertCSS(css, options) { calls.push(['css', css, options]); },
      async executeJavaScript(script) { calls.push(['script', script]); },
    },
  };
  assert.deepEqual(await captureMobileFold(win, url), { url, screenshot: dataUrl(png) });
  const [load, loaded, css, script, shot, encode] = calls;
  assert.equal(load[1], url);
  assert.match(load[2].userAgent, /Android.*Mobile/);
  assert.deepEqual(loaded, ['loaded']);
  assert.match(css[1], /::-webkit-scrollbar\{display:none.*html,body\{scrollbar-width:none/);
  assert.deepEqual(css[2], { cssOrigin: 'user' });
  assert.match(script[1], /scrollTo\(\{top:0,left:0/);
  assert.deepEqual(shot, ['capture', { x: 0, y: 0, width: 390, height: 844 }]);
  assert.deepEqual(encode, ['encode', { scaleFactor: 3 }]);
});

test('captura do produto usa o mesmo prazo para carregamento, espera e captura', async () => {
  const win = {
    loadURL: async () => {},
    webContents: {
      debugger: { attach() {}, sendCommand: async () => {} },
      insertCSS: () => assert.fail('preparação depois do prazo'),
    },
  };
  await assert.rejects(captureMobileFold(win, 'https://exemplo.test/', 10), /Não foi possível capturar/);
});

test('projeto UGC captura e guarda a imagem do produto e exporta a legenda para TikTok',async t=>{
  const root=await mkdtemp(join(tmpdir(),'carrossell-ugc-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const store=await new Store(root).init(),captures=[];
  const runtime=new Runtime({store,knowledge:{lessons:[]},codex:{status:{account:{connected:false}}},
    dialogs:{captureProductPage:async url=>{captures.push(url);return dataUrl(png);},
      export:async(_project,zip)=>unzipSync(zip)}});
  const persona=await store.savePersona(fields,{use:true});
  const args={title:'UGC',brief:'Pauta',style:'ugc'};
  await assert.rejects(runtime.request('createProject',{...args,productLink:'file:///tmp/x'}),/HTTP ou HTTPS/);
  await assert.rejects(runtime.request('createProject',{...args,productLink:'https://exemplo.test',productAsset:dataUrl(png)}),/link ou uma imagem/);
  assert.deepEqual(captures,[]);
  const project=await runtime.request('createProject',{...args,productLink:'https://exemplo.test'});
  assert.deepEqual(captures,['https://exemplo.test/']);
  assert.equal(project.persona,persona.id);
  assert.equal(project.productAsset,dataUrl(png));
  const caption='Veja o passo a passo #dica! Mais detalhes amanhã. #educação #dica';
  await store.saveProject({id:project.id,caption,slides:[{id:'one',title:'Gancho',photo:dataUrl(png)}]});
  await store.addImage(project.id,'one',png);
  const files=await runtime.request('export',{id:project.id,tiktok:true});
  assert.deepEqual(Object.keys(files),['01.png','legenda.txt','tiktok.txt']);
  assert.equal(strFromU8(files['legenda.txt']),caption);
  assert.equal(strFromU8(files['tiktok.txt']),'Veja o passo a passo!\n\n#dica #educação');
});

test('exportação TikTok corta a legenda e deriva hashtags do nicho da persona do projeto e do título', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'carrossell-tiktok-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = await new Store(root).init();
  const persona = await store.savePersona({ ...fields, nicho: 'Educação financeira' });
  await store.savePersona({ ...fields, nome: 'Outra persona', nicho: 'Culinária' }, { use: true });
  const project = await store.createProject({
    title: 'Orçamento e poupança para iniciantes', brief: '', style: 'ugc', persona: persona.id,
  });
  const caption = '💡 ' + 'Organize suas despesas com calma '.repeat(6) + 'hoje. Segunda frase.';
  await store.saveProject({ id: project.id, caption, slides: [{ id: 'one', title: 'Gancho' }] });
  await store.addImage(project.id, 'one', png);
  const files = store.exportFiles(project.id, { tiktok: true });
  const [short, tags] = strFromU8(files['tiktok.txt']).split('\n\n');
  assert.ok(short.length <= 150);
  assert.match(short, /^💡 Organize suas despesas.*…$/u);
  assert.equal(tags, '#educacao #financeira #orcamento #poupanca #iniciantes');
  assert.equal(strFromU8(files['legenda.txt']), caption);
  await store.deletePersona(persona.id);
  await store.saveProject({ id: project.id, title: 'IA', caption: 'Uma ideia funciona. A segunda frase fica de fora.' });
  const fallback = strFromU8(store.exportFiles(project.id, { tiktok: true })['tiktok.txt']);
  assert.equal(fallback, 'Uma ideia funciona.\n\n#dicas #carrossel #conteudo');
});

test('refazer foto de um card preserva a âncora e remonta apenas esse card',async t=>{
  const root=await mkdtemp(join(tmpdir(),'carrossell-ugc-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const store=await new Store(root).init(),renders=[],calls=[];
  const runtime=new Runtime({store,knowledge:{lessons:[]},
    codex:{status:{account:{connected:true}},run:async args=>{calls.push(args);return {images:[png]};}},
    dialogs:{render:{fonts:{},png:async html=>{renders.push(html);return png;}}}});
  const anchor='data:image/jpeg;base64,/9j/AAH/2Q==';
  const {id:persona}=await store.savePersona({...fields,anchor,anchorHash:'0123456789abcdef'});
  const project=await runtime.request('createProject',{style:'ugc',title:'UGC',brief:'Pauta',persona});
  await store.saveProject({id:project.id,slides:[{id:'one',title:'Gancho',photo:anchor},{id:'two',title:'CTA',photo:anchor}]});
  await runtime.request('approveText',{id:project.id});
  await runtime.request('generateSlides',{id:project.id});
  await runtime.request('generateSlides',{id:project.id,slideId:'one',regeneratePhoto:true});
  const current=store.get(project.id);
  assert.equal(current.slides[0].photo,dataUrl(png));
  assert.equal(current.slides[1].photo,anchor);
  assert.equal(current.slides[1].versions.length,1);
  assert.deepEqual(calls.map(c=>c.references),[[anchor]]);
  assert.equal(renders.length,3);
});
