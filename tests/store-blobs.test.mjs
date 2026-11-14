import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync, crc32 } from 'node:zlib';
import { randomBytes } from 'node:crypto';
import { Store } from '../core/store.mjs';

// PNG de verdade com ruído, grande o bastante para virar arquivo (como uma arte gerada).
function noisePng(size=48){
  const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);const td=Buffer.concat([Buffer.from(type),data]);const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(td));return Buffer.concat([len,td,crc]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
  const raw=Buffer.concat(Array.from({length:size},()=>Buffer.concat([Buffer.from([0]),randomBytes(size*4)])));
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
const dataUrl=bytes=>`data:image/png;base64,${bytes.toString('base64')}`;
async function library(t){const root=await mkdtemp(join(tmpdir(),'carrossell-blobs-'));t.after(()=>rm(root,{recursive:true,force:true}));return root;}
const slides=[{id:'a',role:'Capa',title:'T',body:'',emphasis:'',visual:'',prompt:''},{id:'b',role:'CTA',title:'F',body:'',emphasis:'',visual:'',prompt:''}];

test('images are saved as files and come back identical when the library opens again',async t=>{
  const root=await library(t),store=await new Store(root).init(),png=noisePng();
  const p=await store.createProject({title:'x',brief:'b'});await store.saveProject({id:p.id,slides});
  await store.addImage(p.id,'a',png);await store.addCoverOption(p.id,png);
  const raw=await readFile(join(root,'state.json'),'utf8');
  assert.doesNotMatch(raw,/data:image\/png;base64,/);assert.match(raw,/carrossell-imagem:\/\/[a-f0-9]{40}\.png/);
  assert.equal((await readdir(join(root,'blobs'))).length,1,'a mesma imagem no card e na opção de capa vira um arquivo só');
  const reopened=await new Store(root).init(),q=reopened.get(p.id);
  assert.equal(q.slides[0].image,dataUrl(png));assert.equal(q.coverOptions[0].image,dataUrl(png));
});

test('an old library with base64 inside state.json opens and is converted on the next save',async t=>{
  const root=await library(t),png=noisePng();
  await writeFile(join(root,'state.json'),JSON.stringify({profile:null,projects:[{id:'11111111-1111-4111-8111-111111111111',title:'Antigo',brief:'b',format:'carrossel',style:'ia',slides:[{id:'a',title:'T',image:dataUrl(png),state:'complete'}],messages:[]}]}));
  const store=await new Store(root).init();
  assert.equal(store.get('11111111-1111-4111-8111-111111111111').slides[0].image,dataUrl(png));
  assert.doesNotMatch(await readFile(join(root,'state.json'),'utf8'),/base64,/);
  assert.equal((await readdir(join(root,'blobs'))).length,1);
});

test('a missing image file leaves an empty field instead of breaking the library, and orphan files are removed',async t=>{
  const root=await library(t),store=await new Store(root).init(),png=noisePng();
  const p=await store.createProject({title:'x',brief:'b'});await store.saveProject({id:p.id,slides});await store.addImage(p.id,'a',png);
  const [kept]=await readdir(join(root,'blobs'));
  await writeFile(join(root,'blobs','0'.repeat(40)+'.png'),png);// sobra de uma gravação interrompida
  let reopened=await new Store(root).init();
  assert.deepEqual(await readdir(join(root,'blobs')),[kept]);assert.equal(reopened.get(p.id).slides[0].image,dataUrl(png));
  await rm(join(root,'blobs',kept));
  reopened=await new Store(root).init();assert.equal(reopened.get(p.id).slides[0].image,'');assert.equal(reopened.get(p.id).title,'x');
});

test('a library bigger than the JavaScript string limit still saves (the "Invalid string length" bug)',async t=>{
  const root=await library(t),store=await new Store(root).init();
  const p=await store.createProject({title:'x',brief:'b'});
  // 7 cards com a mesma arte de ~90 milhões de caracteres: inline seriam ~630 milhões, acima do limite.
  const big='data:image/png;base64,'+'A'.repeat(90e6);
  store.data.projects[0].slides=Array.from({length:7},(_,i)=>({id:`s${i}`,title:'T',image:big}));
  await store.update(p.id,{title:'Ainda grava'});
  const raw=await readFile(join(root,'state.json'),'utf8');assert.ok(raw.length<100000,`state.json com ${raw.length} caracteres`);
  assert.equal(JSON.parse(raw).projects[0].title,'Ainda grava');
});
