import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../core/store.mjs';
import { Runtime } from '../core/runtime.mjs';
import { loadKnowledge } from '../core/knowledge.mjs';
import { suggestArtDirection, validArtDirection, resolveArtDirection, cardLayout, artDirectionPrompt } from '../core/art-direction.mjs';

test('the automatic art direction follows the kind of business',()=>{
  assert.deepEqual(suggestArtDirection('Devocional infantil para mães cristãs ensinarem a Bíblia às crianças'),{illustration:'gouache',type:'rounded'});
  assert.deepEqual(suggestArtDirection('SaaS de agendamento com IA para clínicas'),{illustration:'clay3d',type:'geometric'});
  assert.deepEqual(suggestArtDirection('Estúdio de maquiagem e beleza para noivas'),{illustration:'photo',type:'serif'});
  assert.deepEqual(suggestArtDirection('Clínica de fisioterapia e saúde da coluna'),{illustration:'editorial',type:'humanist'});
  assert.deepEqual(suggestArtDirection(''),{illustration:'editorial',type:'geometric'});
});
test('a fixed choice wins over the suggestion and invalid values are refused',()=>{
  assert.deepEqual(validArtDirection({illustration:'collage',type:'auto'}),{illustration:'collage'});
  assert.throws(()=>validArtDirection({illustration:'aquarela-neon'}),/inválida/);
  const r=resolveArtDirection({type:'serif'},'escola infantil');
  assert.equal(r.illustration,'gouache');assert.equal(r.type,'serif');assert.equal(r.fixedType,true);assert.equal(r.fixedIllustration,false);
  assert.match(artDirectionPrompt(r,{layout:'cover'}),/Tipografia \(escolhido pelo usuário: obrigatório\): títulos em serifa/);
  assert.match(artDirectionPrompt(r,{layout:'cover'}),/Estilo da ilustração \(escolhido para este negócio: siga-o; só troque se o Design Kit nomear/);
});
test('each card position gets its own layout',()=>{
  assert.equal(cardLayout(0,7),'cover');assert.equal(cardLayout(6,7),'cta');
  assert.equal(cardLayout(2,7,{title:'Antes e depois da rotina'}),'compare');
  assert.equal(cardLayout(2,7,{title:'Leia antes de observar'}),'illustration-bottom','"antes de" não é comparação');
  assert.equal(cardLayout(3,7,{title:'Lembrete errado vs certo'}),'compare');assert.equal(cardLayout(3,7,{title:'O jeito errado',body:'e o certo'}),'compare');
  assert.equal(cardLayout(1,7,{title:'Leia junto'}),'illustration-top');assert.equal(cardLayout(2,7,{title:'Observe'}),'illustration-bottom');
});
test('the image request carries the art direction, the card layout and the subtitle',async t=>{
  const root=await mkdtemp(join(tmpdir(),'carrossell-art-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const store=await new Store(root).init();
  await store.saveProfile({brand:'Brotinhos',brandContext:'Devocional infantil para mães cristãs ensinarem a Bíblia às crianças em casa.',designKit:'Verde e creme.'});
  const runtime=new Runtime({store,knowledge:loadKnowledge(),codex:{status:{account:{connected:true}},run:async()=>({text:'{}',images:[]}),cancel:async()=>{}},dialogs:{}});
  const p=await store.createProject({title:'Gênesis',brief:'b'});
  await store.saveProject({id:p.id,slides:[{id:'c',role:'Capa',title:'Uma planta ensina Gênesis',body:'Para fazer com seu filho',emphasis:'',visual:'mãe e filho com uma planta',prompt:''},{id:'m',role:'Passo',title:'Leia antes',body:'Leia junto',emphasis:'',visual:'',prompt:''},{id:'f',role:'CTA',title:'Salve',body:'Comenta PLANTA',emphasis:'PLANTA',visual:'',prompt:''}]});
  const slides=store.get(p.id).slides;
  const cover=runtime.imagePrompt({id:p.id},{...slides[0],index:1},{references:[]});
  assert.match(cover,/DIREÇÃO DE ARTE/);assert.match(cover,/guache e aquarela/);assert.match(cover,/sans arredondada/);assert.match(cover,/LAYOUT DE CAPA/);
  assert.match(cover,/Subtítulo: Para fazer com seu filho/);assert.match(cover,/Proibido na ilustração: ícones genéricos, fluxogramas/);
  assert.match(runtime.imagePrompt({id:p.id},{...slides[2],index:3},{references:[]}),/LAYOUT DE FECHAMENTO/);
  await runtime.request('saveSettings',{artDirection:{illustration:'collage'}});
  assert.match(runtime.imagePrompt({id:p.id},{...slides[1],index:2},{references:[]}),/colagem editorial[\s\S]*escolhido pelo usuário|escolhido pelo usuário: obrigatório\): colagem/);
  assert.equal(runtime.state().artDirection.illustration,'collage');assert.equal(runtime.state().artStyles.type.length,8);
  await assert.rejects(runtime.request('saveSettings',{artDirection:{type:'comic-sans'}}),/inválida/);
  assert.match(runtime.planPrompt(p.id),/NA ARTE COM IA[\s\S]*SUBTÍTULO do card, até 18 palavras/);
  const plain=await store.createProject({title:'x',brief:'b',style:'texto'});assert.doesNotMatch(runtime.planPrompt(plain.id),/NA ARTE COM IA/);
});
