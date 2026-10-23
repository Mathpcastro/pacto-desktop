import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
const modulePath = '../core/store.mjs';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=', 'base64');
async function fixture(t) {
  const { Store } = await import(modulePath);
  const root = await mkdtemp(join(tmpdir(), 'pacto-test-'));
  t.after(() => rm(root, {recursive:true,force:true}));
  const store = new Store(root); await store.init(); return {store, root, Store};
}
test('persists profile, drafts and edits across restart; duplicate is independent', async t => {
  const {store,root,Store}=await fixture(t);
  await store.saveProfile({brand:'Minha marca', colors:'#ef653c', references:[]});
  const p=await store.createProject({title:'Teste',brief:'Meu briefing'});
  await store.saveProject({id:p.id,caption:'Legenda',slides:[{id:'slide1',index:1,title:'Capa',body:'Texto',visual:'Foto',prompt:'Prompt'}]});
  const copy=await store.duplicate(p.id);
  await store.saveProject({id:copy.id,title:'Outro'});
  const again=new Store(root); await again.init();
  assert.equal(again.state().profile.brand,'Minha marca');
  assert.equal(again.get(p.id).caption,'Legenda');
  assert.equal(again.get(p.id).title,'Teste');
  await again.delete(copy.id); assert.equal(again.state().projects.length,1);
  assert.ok(JSON.parse(await readFile(join(root,'state.json'),'utf8')).projects.length);
});
test('rejects traversal, arbitrary file writes and invalid slides/profile',async t=>{
  const {store}=await fixture(t); const p=await store.createProject({title:'A',brief:'B'});
  assert.throws(()=>store.get('../outside'),/inválid|encontrado/);
  await assert.rejects(store.saveProject({id:p.id,status:'complete',threadId:'hack'}),/campo|permit/);
  await assert.rejects(store.saveProfile({brand:5}),/texto|string/);
  await assert.rejects(store.saveProfile({references:[{name:'x',dataUrl:'data:image/svg+xml;base64,PHN2Zz4='}]}),/imagem|referência/);
  await assert.rejects(store.saveProject({id:p.id,slides:[{id:'../oops',title:'a'}]}),/inválid/);
});
test('exports only complete genuine PNGs in order, preserving all image revisions',async t=>{
  const {store}=await fixture(t);const p=await store.createProject({title:'A',brief:'B'});
  await store.saveProject({id:p.id,caption:'Minha legenda',slides:[{id:'one',index:1,title:'Capa',body:'A',visual:'B',prompt:'C'},{id:'two',index:2,title:'Fim',body:'A',visual:'B',prompt:'C'}]});
  await assert.rejects(store.exportZip(p.id),/incompleto|imagens/);
  await assert.rejects(store.addImage(p.id,'one',Buffer.from('<svg/>')),/PNG/);
  await store.addImage(p.id,'one',png); await store.addImage(p.id,'one',png);
  await store.addImage(p.id,'two',png);
  assert.equal(store.get(p.id).slides[0].versions.length,2);
  const zip=unzipSync(await store.exportZip(p.id));
  assert.deepEqual(Object.keys(zip),['01.png','02.png','legenda.txt']);
  assert.deepEqual(Buffer.from(zip['01.png']),png);
  assert.equal(strFromU8(zip['legenda.txt']),'Minha legenda');
  const duplicate=await store.duplicate(p.id);await store.delete(p.id);
  assert.ok((await store.exportZip(duplicate.id)).length);
});
test('recover interrupted jobs as editable drafts after restart',async t=>{
  const {store,root,Store}=await fixture(t);const p=await store.createProject({title:'A',brief:'B'});
  await store.update(p.id,{status:'generating'});const again=new Store(root);await again.init();
  assert.equal(again.get(p.id).status,'draft'); assert.match(again.get(p.id).error,/interromp/);
});
test('Codex isolation removes inherited credentials and disables host executors',async()=>{
  const {isolatedEnvironment, codexOverrides}=await import('../core/codex.mjs');
  const env=isolatedEnvironment('C:/private',{PATH:'ok',OPENAI_API_KEY:'secret',CODEX_HOME:'global',CODEX_API_KEY:'secret'});
  assert.equal(env.OPENAI_API_KEY,undefined);assert.equal(env.CODEX_API_KEY,undefined);assert.equal(env.CODEX_HOME,'C:/private');
  assert.ok(codexOverrides.includes('features.image_generation=true'));
  assert.ok(codexOverrides.includes('features.shell_tool=false'));
  assert.ok(codexOverrides.includes('features.plugins=false'));
  assert.ok(codexOverrides.includes('features.code_mode_host=true'),'native image wrapper needs the sandboxed host while OS executors stay disabled');
});
test('native image handling accepts result bytes and rejects arbitrary output paths',async t=>{
  const {extractGeneratedImage}=await import('../core/codex.mjs');const {root}=await fixture(t);
  assert.deepEqual(await extractGeneratedImage({type:'imageGeneration',status:'completed',result:png.toString('base64')},root),png);
  await assert.rejects(extractGeneratedImage({type:'imageGeneration',status:'completed',result:'',savedPath:join(root,'..','outside.png')},root),/fora|permit/);
  await assert.rejects(extractGeneratedImage({type:'imageGeneration',status:'failed',result:''},root),/imagem/);
});
test('editing copy marks existing art stale and blocks export until regenerated',async t=>{
  const {store}=await fixture(t);const p=await store.createProject({title:'A',brief:'B'});
  await store.saveProject({id:p.id,slides:[{id:'one',title:'Original',body:'A',visual:'B',prompt:'C'}]});await store.addImage(p.id,'one',png);
  await store.saveProject({id:p.id,slides:[{...store.get(p.id).slides[0],title:'Alterado'}]});
  assert.equal(store.get(p.id).slides[0].state,'outdated');await assert.rejects(store.exportZip(p.id),/atualiz|incompleto/);
  await store.addImage(p.id,'one',png);assert.ok((await store.exportZip(p.id)).length);
});
test('cancel resets running slide indicators and preserves its real image',async t=>{
  const {Runtime}=await import('../core/runtime.mjs');const {store}=await fixture(t);const p=await store.createProject({title:'A',brief:'B'});
  await store.saveProject({id:p.id,slides:[{id:'one',title:'A',body:'B',visual:'C',prompt:'D'}]});await store.addImage(p.id,'one',png);
  await store.update(p.id,{status:'generating',slides:store.get(p.id).slides.map(s=>({...s,state:'generating'}))});
  const runtime=new Runtime({store,codex:{cancel:async()=>{},status:{account:{connected:true}}},knowledge:{lessons:[]}});runtime.job={id:p.id,cancelled:false};
  const result=await runtime.request('cancel',{id:p.id});assert.equal(result.slides[0].state,'complete');assert.ok(result.slides[0].image);assert.equal(result.status,'complete');
});
test('Codex ignores failures and completion from another thread or turn',async()=>{
  const {CodexClient}=await import('../core/codex.mjs');const client=new CodexClient({home:tmpdir(),workspace:tmpdir()});let done=0;
  client.active={threadId:'owned',turnId:'owned-turn',finish:()=>done++,text:[],images:[]};
  client.receive({method:'turn/completed',params:{threadId:'foreign',turn:{id:'owned-turn',status:'failed'}}});
  client.receive({method:'turn/completed',params:{threadId:'owned',turn:{id:'foreign-turn',status:'failed'}}});assert.equal(done,0);
  client.receive({method:'item/completed',params:{threadId:'foreign',turnId:'owned-turn',item:{type:'agentMessage',text:'foreign'}}});assert.equal(client.active.text.length,0);
  client.receive({method:'turn/completed',params:{threadId:'owned',turn:{id:'owned-turn',status:'completed'}}});assert.equal(done,1);
});
test('runtime never reports success when native image generation returns no pixels',async t=>{
  const {Runtime}=await import('../core/runtime.mjs');const {store}=await fixture(t);const p=await store.createProject({title:'A',brief:'B'});
  await store.saveProject({id:p.id,slides:[{id:'one',title:'A',body:'B',visual:'C',prompt:'D'}]});
  // Inference is external; this stub exercises the failed-capability boundary, not image generation.
  const runtime=new Runtime({store,codex:{status:{account:{connected:true}},run:async()=>({text:'indisponível',images:[]})},knowledge:{method:'Método',lessons:[]}});
  await store.update(p.id,{textApproved:true});const started=await runtime.request('generateSlides',{id:p.id,slideId:'one'});assert.equal(started.status,'generating');
  await assert.rejects(runtime.request('generatePlan',{id:p.id}),/andamento/);
  for(let i=0;i<50&&runtime.job;i++)await new Promise(r=>setTimeout(r,5));
  const saved=store.get(p.id);assert.equal(saved.status,'error');assert.match(saved.error,/não está disponível/);assert.equal(saved.slides[0].image,undefined);assert.notEqual(saved.slides[0].state,'generating');
});
test('conversational radar reply preserves approved slides and previous artwork',async t=>{
  const {Runtime,PLAN_SCHEMA}=await import('../core/runtime.mjs');const {store}=await fixture(t);const p=await store.createProject({title:'Plano aprovado',brief:'B'});
  await store.saveProject({id:p.id,caption:'Legenda aprovada',slides:[{id:'one',title:'A',body:'B',visual:'C',prompt:'D'},{id:'two',title:'E',body:'F',visual:'G',prompt:'H'}]});await store.addImage(p.id,'one',png);await store.addImage(p.id,'two',png);
  const original=store.get(p.id),reply='Aqui estão três pautas para explorar…';
  const runtime=new Runtime({store,codex:{status:{account:{connected:true}},run:async()=>({text:JSON.stringify({title:'',architecture:'',caption:'',reply,regenerateSlideIds:[],slides:[]}),images:[]})},knowledge:{method:'Método',lessons:[]}});
  await runtime.request('sendMessage',{id:p.id,text:'Quais pautas posso testar?'});for(let i=0;i<50&&runtime.job;i++)await new Promise(r=>setTimeout(r,5));
  const saved=store.get(p.id);assert.equal(PLAN_SCHEMA.properties.slides.minItems,0);assert.equal(saved.title,original.title);assert.equal(saved.caption,original.caption);assert.deepEqual(saved.slides,original.slides);assert.equal(saved.messages.at(-1).text,reply);assert.equal(saved.status,'complete');
});
test('missing-context conversation leaves a new project as an editable draft',async t=>{
  const {Runtime}=await import('../core/runtime.mjs');const {store}=await fixture(t);const p=await store.createProject({title:'Ideia',brief:'Quero vender'});
  const runtime=new Runtime({store,codex:{status:{account:{connected:true}},run:async()=>({text:JSON.stringify({title:'',architecture:'',caption:'',reply:'Para quem é o produto e o que ele entrega?',regenerateSlideIds:[],slides:[]})})},knowledge:{method:'Método',lessons:[]}});
  await runtime.request('generatePlan',{id:p.id});for(let i=0;i<50&&runtime.job;i++)await new Promise(r=>setTimeout(r,5));
  const saved=store.get(p.id);assert.equal(saved.status,'draft');assert.equal(saved.slides.length,0);assert.match(saved.messages.at(-1).text,/quem/);
});
test('generate remaining slides preserves completed art and only spends a call on missing images',async t=>{
  const {Runtime}=await import('../core/runtime.mjs');const {store}=await fixture(t);const p=await store.createProject({title:'A',brief:'B'});
  await store.saveProject({id:p.id,slides:[{id:'one',title:'Capa aprovada',body:'B',visual:'C',prompt:'D'},{id:'two',title:'Segundo',body:'B',visual:'C',prompt:'D'}]});await store.addImage(p.id,'one',png);const original=store.get(p.id).slides[0];const calls=[];
  const runtime=new Runtime({store,codex:{status:{account:{connected:true}},run:async options=>{calls.push(options);return {images:[png]};}},knowledge:{method:'Método',lessons:[]}});
  await store.update(p.id,{textApproved:true});await runtime.request('generateSlides',{id:p.id});for(let i=0;i<100&&runtime.job;i++)await new Promise(r=>setTimeout(r,5));
  assert.equal(calls.length,1);assert.match(calls[0].prompt,/Título: Segundo/);assert.deepEqual(store.get(p.id).slides[0],original);assert.equal(store.get(p.id).status,'complete');
});
test('cancel during pending per-slide save never starts a new native generation',async t=>{
  const {Runtime}=await import('../core/runtime.mjs');const {store}=await fixture(t);const p=await store.createProject({title:'A',brief:'B'});
  await store.saveProject({id:p.id,slides:[{id:'one',title:'A',body:'B',visual:'C',prompt:'D'}]});
  let calls=0,release,entered;const persisted=new Promise(r=>{entered=r;});const barrier=new Promise(r=>{release=r;});
  const runtime=new Runtime({store,codex:{status:{account:{connected:true}},cancel:async()=>{},run:async()=>{calls++;return {images:[png]};}},knowledge:{method:'Método',lessons:[]}});
  const update=runtime.update.bind(runtime);runtime.update=async(id,patch)=>{const result=await update(id,patch);if(patch.slides?.some(s=>s.state==='generating')){entered();await barrier;}return result;};
  await store.update(p.id,{textApproved:true});await runtime.request('generateSlides',{id:p.id,slideId:'one'});await persisted;await runtime.request('cancel',{id:p.id});release();
  for(let i=0;i<100&&runtime.job;i++)await new Promise(r=>setTimeout(r,5));
  assert.equal(calls,0);assert.equal(store.get(p.id).status,'ready');assert.notEqual(store.get(p.id).slides[0].state,'generating');
});
test('copy revision with no replacement caption preserves approved publication copy',async t=>{
  const {Runtime}=await import('../core/runtime.mjs');const {store}=await fixture(t);const p=await store.createProject({title:'A',brief:'B'});
  const slides=[{id:'one',title:'A',body:'B',visual:'C',prompt:'D'},{id:'two',title:'E',body:'F',visual:'G',prompt:'H'}];
  await store.saveProject({id:p.id,caption:'Legenda aprovada',slides});
  const runtime=new Runtime({store,codex:{status:{account:{connected:true}},run:async()=>({text:JSON.stringify({title:'A',architecture:'Sequência',caption:'',reply:'Texto revisado.',regenerateSlideIds:[],slides:slides.map(s=>({...s,body:s.body+' revisado'}))})})},knowledge:{method:'Método',lessons:[]}});
  await runtime.request('sendMessage',{id:p.id,text:'Revise apenas o texto dos cards.'});for(let i=0;i<100&&runtime.job;i++)await new Promise(r=>setTimeout(r,5));
  assert.equal(store.get(p.id).caption,'Legenda aprovada');assert.match(store.get(p.id).slides[0].body,/revisado/);
});
test('guided brand interview follows the official prompt in rounds and stores the reviewed document',async t=>{
  const {Runtime,INTERVIEW_SCHEMA}=await import('../core/runtime.mjs');const {loadKnowledge}=await import('../core/knowledge.mjs');const {store,root,Store}=await fixture(t);
  const knowledge=loadKnowledge();const prompts=[];const answers=[
    {reply:'1. O que você vende? (ex.: curso)',complete:false,brandName:'',document:''},
    {reply:'Revise o documento.',complete:true,brandName:'Ateliê Sol',document:'# CONTEXTO OFICIAL DA MARCA\n## 1. Negócio e oferta'}];
  const runtime=new Runtime({store,knowledge,codex:{status:{account:{connected:true}},run:async o=>{prompts.push(o);return {text:JSON.stringify(answers.shift())};}}});
  let state=await runtime.request('interview',{kind:'brand'});
  assert.equal(prompts[0].outputSchema,INTERVIEW_SCHEMA);assert.match(prompts[0].prompt,/Quero configurar o contexto-base/);assert.match(prompts[0].prompt,/12 perguntas/);
  assert.equal(state.onboarding.brand.messages.length,1);assert.equal(state.onboarding.brand.document,'');
  state=await runtime.request('interview',{kind:'brand',text:'Vendo aulas de cerâmica'});
  assert.match(prompts[1].prompt,/USUÁRIO: Vendo aulas de cerâmica/);assert.equal(state.onboarding.brand.brandName,'Ateliê Sol');assert.match(state.onboarding.brand.document,/CONTEXTO OFICIAL/);
  await runtime.request('saveInterview',{kind:'brand',document:'# Corrigido'});
  const again=new Store(root);await again.init();assert.equal(again.state().onboarding.brand.document,'# Corrigido');
  await assert.rejects(runtime.request('interview',{kind:'outra'}),/inválida/);
  await runtime.request('resetInterview',{kind:'brand'});assert.equal(store.state().onboarding.brand.messages.length,0);
});
test('design interview sends preset and references; plan uses chosen architecture, master prompt and documents',async t=>{
  const {Runtime}=await import('../core/runtime.mjs');const {loadKnowledge}=await import('../core/knowledge.mjs');const {store}=await fixture(t);
  const knowledge=loadKnowledge();const calls=[];const ref={name:'ref.png',dataUrl:`data:image/png;base64,${png.toString('base64')}`};
  const runtime=new Runtime({store,knowledge,codex:{status:{account:{connected:true}},run:async o=>{calls.push(o);return {text:JSON.stringify(o.outputSchema.required.includes('complete')?{reply:'Pergunta',complete:false,brandName:'',document:''}:{title:'T',architecture:'Tutorial',caption:'',reply:'Ok',regenerateSlideIds:[],slides:[]})};}}});
  await runtime.request('interview',{kind:'design',preset:'ilustrado',references:[ref]});
  assert.match(calls[0].prompt,/Gerador de Design Kit|Design Kit para carrosséis/);assert.match(calls[0].prompt,/preset "Ilustrado"/);assert.equal(calls[0].references.length,1);
  await assert.rejects(runtime.request('interview',{kind:'design',preset:'inexistente'}),/Preset/);
  await store.saveProfile({brand:'Sol',brandContext:'CONTEXTO XYZ',designKit:'KIT ABC',designPreset:'ilustrado',references:[]});
  await assert.rejects(runtime.request('createProject',{title:'A',brief:'B',architectureId:'nao-existe'}),/Arquitetura/);
  const p=await runtime.request('createProject',{title:'A',brief:'B',architectureId:'tutorial',goal:'Salvamentos'});
  assert.equal(p.architectureId,'tutorial');
  await runtime.request('generatePlan',{id:p.id});for(let i=0;i<50&&runtime.job;i++)await new Promise(r=>setTimeout(r,5));
  const prompt=calls.at(-1).prompt;
  assert.match(prompt,/Prompt Mestre/);assert.match(prompt,/CONTEXTO XYZ/);assert.match(prompt,/KIT ABC/);assert.match(prompt,/ARQUITETURA ESCOLHIDA PELO USUÁRIO: Tutorial/);assert.match(prompt,/OBJETIVO DESTE CARROSSEL: Salvamentos/);
  const state=runtime.state();assert.equal(state.architectures.length,5);assert.equal(state.designPresets.length,6);
});
test('interview reply reports the interview as finished',async t=>{
  const {Runtime}=await import('../core/runtime.mjs');const {store}=await fixture(t);
  const runtime=new Runtime({store,knowledge:{method:'M',lessons:[]},codex:{status:{account:{connected:true}},run:async()=>({text:JSON.stringify({reply:'1. Pergunta',complete:false,brandName:'',document:''})})}});
  const state=await runtime.request('interview',{kind:'brand'});assert.equal(state.interviewing,null);assert.equal(runtime.job,null);
});
