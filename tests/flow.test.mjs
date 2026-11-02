import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { Store } from '../core/store.mjs';
import { Runtime } from '../core/runtime.mjs';
import { loadKnowledge } from '../core/knowledge.mjs';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=', 'base64');
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'pacto-flow-'));
  t.after(() => rm(root, {recursive:true,force:true}));
  return new Store(root).init();
}
const settle = async runtime => { for (let i = 0; i < 200 && runtime.job; i++) await new Promise(r => setTimeout(r, 5)); };

test('text must be approved, then a cover chosen among options, before the rest is generated', async t => {
  const store = await fixture(t); const p = await store.createProject({title:'A',brief:'B'});
  await store.saveProject({id:p.id,slides:[{id:'one',role:'Capa',title:'Capa forte',body:'',emphasis:'forte',visual:'Cena',prompt:''},{id:'two',role:'Item 1',title:'Item',body:'Texto final',emphasis:'',visual:'Cena',prompt:''}]});
  const calls = [];
  const runtime = new Runtime({store,knowledge:{method:'M',lessons:[]},codex:{status:{account:{connected:true}},cancel:async()=>{},run:async o=>{calls.push(o);return {images:[png]};}}});
  await assert.rejects(runtime.request('generateCovers',{id:p.id,count:3}),/Aprove o texto/);
  await assert.rejects(runtime.request('generateSlides',{id:p.id}),/Aprove o texto/);
  await runtime.request('approveText',{id:p.id});
  await assert.rejects(runtime.request('generateSlides',{id:p.id}),/Escolha a capa/);
  await runtime.request('generateCovers',{id:p.id,count:2}); await settle(runtime);
  let saved = store.get(p.id);
  assert.equal(saved.coverOptions.length,2); assert.equal(saved.slides[0].image,undefined);
  assert.match(calls[0].prompt,/OPÇÃO 1 DE 2/); assert.match(calls[1].prompt,/OPÇÃO 2 DE 2 — conceito obrigatório desta opção: uma METÁFORA/); assert.doesNotMatch(calls[1].prompt,/Cena e ilustração: Cena/);
  assert.match(calls[0].prompt,/Nunca empilhe uma palavra por linha/); assert.match(calls[0].prompt,/Não escreva a função do card \("Capa"\)/);
  await runtime.request('chooseCover',{id:p.id,optionId:saved.coverOptions[1].id});
  saved = store.get(p.id); assert.ok(saved.slides[0].image);
  await runtime.request('generateSlides',{id:p.id}); await settle(runtime);
  assert.equal(calls.length,3); assert.match(calls[2].prompt,/CARD 2 DE 2/);
  assert.equal(calls[2].references[0],saved.slides[0].image,'the chosen cover anchors the rest');
  await runtime.request('generateSlides',{id:p.id,slideId:'two',fix:{problems:['Texto vertical ou empilhado'],note:'título maior'}}); await settle(runtime);
  assert.match(calls[3].prompt,/CORREÇÃO VISUAL RÁPIDA/);
  await assert.rejects(runtime.request('generateSlides',{id:p.id,slideId:'two',fix:{problems:['inventado']}}),/inválido/);
});

test('correction prompt fills the official placeholder with the chosen problems', async t => {
  const store = await fixture(t); const p = await store.createProject({title:'A',brief:'B'});
  await store.saveProject({id:p.id,slides:[{id:'one',title:'Capa'},{id:'two',title:'Item'}]});
  for (const id of ['one','two']) await store.addImage(p.id,id,png);
  await store.update(p.id,{textApproved:true});
  const calls = [];
  const runtime = new Runtime({store,knowledge:loadKnowledge(),codex:{status:{account:{connected:true}},cancel:async()=>{},run:async o=>{calls.push(o);return {images:[png]};}}});
  await runtime.request('generateSlides',{id:p.id,slideId:'two',fix:{problems:['Título pequeno','Falta CTA'],note:''}}); await settle(runtime);
  assert.match(calls[0].prompt,/Corrija apenas os problemas indicados/); assert.match(calls[0].prompt,/Título pequeno \/ Falta CTA/);
});

test('plan uses official copy sources and rewrites cards that came back as instructions', async t => {
  const store = await fixture(t);
  const p = await store.createProject({title:'A',brief:'B',editorialLine:'Direto e bem-humorado'});
  const bad = {title:'T',architecture:'Lista Útil',editorialLine:'',visualConcept:'Mascote tigela',caption:'Comente X',reply:'Revisão',regenerateSlideIds:[],slides:[{id:'a',role:'Capa',title:'Capa',body:'Função: capa. Apresentar cinco erros.',emphasis:'',visual:'v',prompt:''},{id:'b',role:'CTA',title:'Fim',body:'Comente GUIA',emphasis:'',visual:'v',prompt:''}]};
  const good = {...bad,slides:[{...bad.slides[0],body:'Salve antes de começar.'},bad.slides[1]]};
  const edited = {...good,coverHooks:['Seu rótulo esconde isto','3 avisos antes da compra','Pare de errar na argila'],slides:[{...good.slides[0],title:'Capa melhor'},good.slides[1]]};
  const prompts = []; const replies = [bad,good,edited];
  const runtime = new Runtime({store,knowledge:loadKnowledge(),codex:{status:{account:{connected:true}},run:async o=>{prompts.push(o.prompt);return {text:JSON.stringify(replies.shift())};}}});
  await runtime.request('generatePlan',{id:p.id}); await settle(runtime);
  assert.equal(prompts.length,3); assert.match(prompts[2],/EDITOR-CHEFE DE COPY/);
  assert.match(prompts[0],/Copy Engine/); assert.match(prompts[0],/ANATOMIA DOS CARROSSÉIS VENCEDORES/); assert.match(prompts[0],/LINHA EDITORIAL DEFINIDA PELO USUÁRIO: Direto/);
  const saved = store.get(p.id);
  assert.equal(saved.slides[0].body,'Salve antes de começar.'); assert.equal(saved.slides[0].title,'Capa melhor'); assert.equal(saved.coverHooks.length,3); assert.equal(saved.slides[0].role,'Capa'); assert.equal(saved.textApproved,false);
  assert.equal(saved.editorialLine,'Direto e bem-humorado'); assert.equal(saved.visualConcept,'Mascote tigela');
});

test('radar, modelador and replicador store idea batches from the official prompts; CTA kit is exported', async t => {
  const store = await fixture(t);
  const idea = (n,extra={}) => ({theme:`Tema ${n}`,hook:'Hook',why:'w',deliverable:'d',connection:'c',architecture:'Tutorial',group:'Radar',top:n<10,reason:'r',...extra});
  const prompts = []; let reply;
  const runtime = new Runtime({store,knowledge:loadKnowledge(),codex:{status:{account:{connected:true}},cancel:async()=>{},run:async o=>{prompts.push(o);return {text:JSON.stringify(reply)};}}});
  reply = {analysis:'Territórios',ideas:Array.from({length:30},(_,i)=>idea(i))};
  let state = await runtime.request('radar',{focus:'iniciantes'});
  assert.match(prompts[0].prompt,/estrategista de pautas/); assert.equal(state.ideas[0].ideas.length,30);
  assert.equal(state.ideas[0].ideas.filter(i=>i.top).length,10); assert.equal(state.working,null);
  reply = {analysis:'Motivo real',ideas:Array.from({length:10},(_,i)=>idea(i,{architecture:'Inexistente'}))};
  await assert.rejects(runtime.request('modelReference',{}),/referência/);
  state = await runtime.request('modelReference',{text:'Post sobre 7 erros'});
  assert.match(prompts[1].prompt,/copie o motivo pelo qual funcionou/); assert.equal(state.ideas[0].source,'modelador'); assert.equal(state.ideas[0].ideas[0].architecture,'');
  const p = await store.createProject({title:'Vencedor',brief:'B'});
  await store.saveProject({id:p.id,slides:[{id:'one',title:'A',body:'B'},{id:'two',title:'C',body:'D'}]});
  state = await runtime.request('replicate',{id:p.id,comments:120,saves:300,sales:4});
  assert.match(prompts[2].prompt,/Salvamentos: 300/); assert.match(prompts[2].prompt,/3 variações próximas/); assert.equal(store.get(p.id).results.saves,300);
  await runtime.request('deleteIdeas',{batchId:state.ideas[0].id}); assert.equal(store.state().ideas.length,2);
  reply = {keywords:['GUIA'],firstCardCta:'Comente GUIA',lastCardCta:'Quer o guia? Comente GUIA',freebie:'Guia dos 5 erros',dm1:'Aqui está',dm2:'Se quiser ir além'};
  await runtime.request('ctaKit',{id:p.id});
  assert.match(prompts[3].prompt,/conversão por comentário e DM/); assert.equal(store.get(p.id).ctaKit.keywords[0],'GUIA');
  for (const s of store.get(p.id).slides) await store.addImage(p.id,s.id,png);
  const zip = unzipSync(await store.exportZip(p.id));
  assert.match(strFromU8(zip['cta-e-dm.txt']),/Comente GUIA/);
});

test('legacy projects with art count as approved text after upgrade', async t => {
  const store = await fixture(t); const p = await store.createProject({title:'A',brief:'B'});
  await store.saveProject({id:p.id,slides:[{id:'one',title:'A'}]}); await store.addImage(p.id,'one',png);
  const raw = store.data.projects[0]; delete raw.textApproved; delete raw.coverOptions; await store.persist();
  const again = await new Store(store.root).init();
  assert.equal(again.get(p.id).textApproved,true); assert.deepEqual(again.get(p.id).coverOptions,[]);
});

test('AI tells left after the editor pass get one targeted voice correction', async t => {
  const store = await fixture(t); const p = await store.createProject({title:'A',brief:'B'});
  const card = (id,title,body) => ({id,role:id,title,body,emphasis:'',visual:'v',prompt:''});
  const first = {title:'T',architecture:'Lista Útil',editorialLine:'',visualConcept:'',coverHooks:[],caption:'Comente X',reply:'R',regenerateSlideIds:[],slides:[card('a','Capa','Isso não é sorte, é método.'),card('b','Fim','Comente GUIA — eu te mando')]};
  const clean = {...first,slides:[card('a','Capa','Quem acerta repete o mesmo método.'),card('b','Fim','Comente GUIA e eu te mando')]};
  const prompts = []; const replies = [first,first,clean];
  const runtime = new Runtime({store,knowledge:loadKnowledge(),codex:{status:{account:{connected:true}},run:async o=>{prompts.push(o.prompt);return {text:JSON.stringify(replies.shift())};}}});
  await runtime.request('generatePlan',{id:p.id}); await settle(runtime);
  assert.equal(prompts.length,3); assert.match(prompts[0],/VOZ HUMANA/);
  assert.match(prompts[2],/CORREÇÃO DE VOZ/); assert.match(prompts[2],/card 1 \(texto\): contraste/); assert.match(prompts[2],/card 2 \(texto\): travessão/);
  assert.equal(store.get(p.id).slides[1].body,'Comente GUIA e eu te mando');
});
