import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../core/store.mjs';
import { Runtime } from '../core/runtime.mjs';
import { loadKnowledge } from '../core/knowledge.mjs';
import { localizePrompt, normalizeContentLanguage, templateCopy } from '../core/i18n.mjs';
import { threadInstructions } from '../core/codex.mjs';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=','base64');
const render={fonts:{},png:async()=>png,pdf:async()=>Buffer.from('%PDF-1.7')};
async function fixture(t,run){
  const root=await mkdtemp(join(tmpdir(),'carrossell-language-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const store=await new Store(root).init(),calls=[];
  const runtime=new Runtime({store,knowledge:loadKnowledge(),dialogs:{render},codex:{status:{account:{connected:true}},cancel:async()=>{},run:async args=>{calls.push(args);return run?run(args):{text:'{}',images:[]};}}});
  return {store,runtime,calls};
}

test('each carousel language rewrites the Portuguese language orders and adds its own output contract',()=>{
  const prompt='Crie o texto. Responda em português do Brasil e retorne JSON conforme o esquema. CTA como "Arrasta para o lado".';
  assert.equal(localizePrompt(prompt,'pt-BR'),prompt);
  const en=localizePrompt(prompt,'en');assert.match(en,/Answer in American English and return JSON matching the schema\./);assert.match(en,/OUTPUT LANGUAGE \(mandatory/);assert.match(en,/como "Swipe"/);
  const pt=localizePrompt(prompt,'pt-PT');assert.match(pt,/Responde em português de Portugal e devolve JSON/);assert.match(pt,/IDIOMA DE SAÍDA/);assert.match(pt,/estou a fazer/);assert.match(pt,/como "Desliza para o lado"/);
  const es=localizePrompt(prompt,'es');assert.match(es,/IDIOMA DE SALIDA/);
  assert.equal(localizePrompt(en,'en').split('OUTPUT LANGUAGE').length,2,'o contrato não se repete');
  assert.equal(templateCopy('en').swipe,'swipe ›');assert.equal(templateCopy('pt-PT').brand,'A tua marca');assert.equal(templateCopy('pt-BR').swipe,'arrasta pro lado ›');
  assert.equal(normalizeContentLanguage('desconhecido','es'),'es');assert.equal(normalizeContentLanguage('EN-us'),'en');
  assert.match(threadInstructions({locale:'en'}).developerInstructions,/Content and images in American English/);
  assert.match(threadInstructions({locale:'pt-PT'}).developerInstructions,/português de Portugal/);
  assert.match(threadInstructions({locale:'en',textOnly:true}).baseInstructions,/American English/);
});

test('the carousel keeps its own language and the last choice becomes the profile default',async t=>{
  const {store,runtime}=await fixture(t);
  const old=await store.createProject({title:'Antigo',brief:'b'});assert.equal(old.language,'pt-BR');
  const en=await runtime.request('createProject',{title:'English',brief:'b',language:'en'});
  assert.equal(en.language,'en');assert.equal(store.state().settings.contentLanguage,'en');
  const next=await store.createProject({title:'Rotina',brief:'b'});assert.equal(next.language,'en','rotina e Telegram usam o padrão do perfil');
  await assert.rejects(runtime.request('createProject',{title:'x',brief:'b',language:'fr'}),/Idioma do carrossel inválido/);
  await assert.rejects(store.saveSettings({contentLanguage:'fr'}),/Idioma do carrossel inválido/);
  const legacy={...old};delete legacy.language;assert.equal(runtime.contentLanguage(legacy),'pt-BR','projetos antigos seguem o idioma da tela');
  assert.match(runtime.pageMarkup({...en,format:'material',slides:[{id:'a',layout:'cover',title:'T',body:'',emphasis:''}]}),/lang="en"/);
});

test('content requests use the carousel language while app-level requests keep the screen language',async t=>{
  const plan={title:'Checklist',caption:'c',reply:'r',pages:[{id:'p1',layout:'cover',role:'Capa',title:'Checklist',body:'b',emphasis:''},{id:'p2',layout:'text',role:'Texto',title:'Passo',body:'b',emphasis:''}]};
  const {store,runtime,calls}=await fixture(t,()=>({text:JSON.stringify(plan),images:[]}));
  const carousel=await runtime.request('createProject',{title:'Carousel',brief:'b',language:'pt-PT'});
  const material=await runtime.request('createProject',{title:'Material',brief:'Checklist',format:'material',sourceId:carousel.id});
  assert.equal(material.language,'pt-PT','o material herda o idioma do carrossel');
  await runtime.request('generatePlan',{id:material.id});for(let i=0;i<200&&runtime.job;i++)await new Promise(r=>setTimeout(r,5));
  assert.equal(calls[0].locale,'pt-PT');assert.match(calls[0].prompt,/IDIOMA DE SAÍDA/);
  await runtime.model({prompt:'Documento da marca. Responda em português do Brasil.'});
  assert.equal(calls.at(-1).locale,'pt-BR');assert.doesNotMatch(calls.at(-1).prompt,/IDIOMA DE SAÍDA|OUTPUT LANGUAGE/);
  assert.equal(store.state().settings.contentLanguage,'pt-PT');
});
