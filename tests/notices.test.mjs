import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Notices, parseNotices, compareVersions } from '../core/notices.mjs';

const now=new Date('2026-11-05T12:00:00Z').getTime();
const feed={notices:[
  {id:'estrategia',date:'2026-11-05',title:'Melhore a estratégia',body:'Novo botão na Marca.',important:true,action:{label:'Abrir',view:'brand:contexto'},minVersion:'0.8.0'},
  {id:'antigo',date:'2026-10-01',title:'Antigo',body:'Texto',until:'2026-10-30'},
  {id:'futuro',date:'2026-12-01',title:'Futuro',body:'Ainda não'},
  {id:'link',date:'2026-11-04',title:'Live',body:'Aula ao vivo',action:{label:'Ver',url:'https://youtube.com/@omatheusdaia'}},
  {id:'ruim',date:'2026-11-04',title:'Link perigoso',body:'x',action:{label:'Abrir',url:'javascript:alert(1)'}},
  {id:'Maiúsculo inválido',date:'2026-11-04',title:'x',body:'x'},
  {id:'velho',date:'2026-11-03',title:'Só para versões antigas',body:'Atualize',maxVersion:'0.7.9'},
  {id:'html',date:'2026-11-02',title:'<b>Oi</b>\u0007',body:'texto'},
]};

test('notices keep only valid, current entries for this version, without unsafe actions',()=>{
  assert.equal(compareVersions('0.10.0','0.9.9'),1);assert.equal(compareVersions('0.8.0','0.8.0'),0);
  const list=parseNotices(feed,{version:'0.8.0',now});
  assert.deepEqual(list.map(n=>n.id),['estrategia','link','ruim','html']);
  assert.deepEqual(list[0].action,{label:'Abrir',view:'brand:contexto'});assert.equal(list[0].important,true);
  assert.equal(list[1].action.url,'https://youtube.com/@omatheusdaia');
  assert.equal(list[2].action,undefined,'link que não é https não vira botão');
  assert.equal(list[3].title,'<b>Oi</b>','texto puro, sem caracteres de controle; a tela não interpreta HTML');
  assert.deepEqual(parseNotices(feed,{version:'0.7.9',now}).map(n=>n.id),['link','ruim','velho','html']);
  assert.equal(parseNotices({notices:[{id:'x',date:'2026-11-01',title:'t',body:'b',action:{label:'Abrir',view:'../../etc'}}]},{now})[0].action,undefined);
  assert.deepEqual(parseNotices('lixo',{now}),[]);
});

test('notices are fetched, cached, marked read and announced once; offline keeps the cache',async t=>{
  const root=await mkdtemp(join(tmpdir(),'carrossell-notices-'));t.after(()=>rm(root,{recursive:true,force:true}));
  let online=true;const urls=[];
  const fetcher=async url=>{urls.push(url);if(!online)throw new Error('offline');return {ok:true,text:async()=>JSON.stringify(feed)};};
  const notices=await new Notices({root,version:'0.8.0',fetch:fetcher,url:'https://example.test/notices.json',now:()=>now}).init();
  assert.equal(await notices.refresh(),true);assert.match(urls[0],/^https:\/\/example\.test\/notices\.json\?t=\d+$/);
  assert.equal(notices.summary().unread,4);
  assert.deepEqual((await notices.takeNew()).map(n=>n.id),['estrategia','link','ruim','html']);
  assert.deepEqual(await notices.takeNew(),[],'cada aviso vira notificação do sistema uma vez só');
  await notices.markRead('estrategia');assert.equal(notices.summary().unread,3);
  assert.equal(notices.link('link'),'https://youtube.com/@omatheusdaia');assert.throws(()=>notices.link('estrategia'),/link/);
  await assert.rejects(notices.markRead('../x'),/inválido/);
  online=false;assert.equal(await notices.refresh(),false);
  await notices.save();
  const reopened=await new Notices({root,version:'0.8.0',fetch:fetcher,now:()=>now}).init();
  assert.equal(reopened.summary().items.length,4);assert.equal(reopened.summary().unread,3);
  await reopened.markAllRead();assert.equal(reopened.summary().unread,0);
  assert.ok(JSON.parse(await readFile(join(root,'notices.json'),'utf8')).read.includes('html'));
});

test('runtime exposes notices in the state and opens only the feed link',async t=>{
  const root=await mkdtemp(join(tmpdir(),'carrossell-notices-rt-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const {Store}=await import('../core/store.mjs');const {Runtime}=await import('../core/runtime.mjs');
  const store=await new Store(join(root,'store')).init(),opened=[];
  const runtime=new Runtime({store,knowledge:{method:'',lessons:[],prompts:[]},codex:{status:{account:{connected:false}},run:async()=>({})},dialogs:{openNotice:async url=>opened.push(url)}});
  runtime.notices=await new Notices({root,version:'0.8.0',fetch:async()=>({ok:true,text:async()=>JSON.stringify(feed)}),now:()=>now}).init();
  await runtime.notices.refresh();
  let state=await runtime.request('bootstrap');assert.equal(state.notices.unread,4);
  state=await runtime.request('openNoticeLink',{id:'link'});assert.deepEqual(opened,['https://youtube.com/@omatheusdaia']);assert.equal(state.notices.unread,3);
  await assert.rejects(runtime.request('openNoticeLink',{id:'estrategia'}),/link/);
  state=await runtime.request('readNotice',{id:'estrategia'});assert.equal(state.notices.unread,2);
});
