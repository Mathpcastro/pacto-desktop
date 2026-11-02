import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpRequest } from 'node:http';
import { unzipSync, zipSync, strFromU8 } from 'fflate';
import { Store } from '../core/store.mjs';
import { Runtime } from '../core/runtime.mjs';
import { ShareServer, lanAddress } from '../core/share.mjs';
import { findDriveFolders, writeCarouselFolder } from '../core/drive.mjs';
import { normalizeExport } from '../core/export.mjs';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=', 'base64');
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'pacto-publish-'));
  t.after(() => rm(root, {recursive:true,force:true}));
  return {store: await new Store(join(root,'lib')).init(), root};
}
const settle = async runtime => { for (let i = 0; i < 200 && runtime.job; i++) await new Promise(r => setTimeout(r, 5)); };
async function ready(store) {
  const p = await store.createProject({title:'Meu: carrossel/teste',brief:'B'});
  await store.saveProject({id:p.id,caption:'Comente GUIA',slides:[{id:'one',title:'A',body:'B'},{id:'two',title:'C',body:'D'}]});
  for (const id of ['one','two']) await store.addImage(p.id,id,png);
  await store.update(p.id,{textApproved:true,ctaKit:{keywords:['GUIA'],firstCardCta:'a',lastCardCta:'b',freebie:'c',dm1:'d',dm2:'e'}});
  return store.get(p.id);
}
const get = (url, method = 'GET') => new Promise((resolve, reject) => {
  const req = httpRequest(url, {method}, res => { const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve({status:res.statusCode,type:res.headers['content-type'],body:Buffer.concat(chunks)})); });
  req.on('error', reject); req.end();
});
// nativeImage stand-in: reports a 4:5 or 9:16 size and returns a fixed PNG.
const fakeNative = {createFromBuffer: () => ({isEmpty:()=>false,getSize:()=>({width:1024,height:1280}),resize:()=>({toPNG:()=>{const b=Buffer.from(png);b.writeUInt32BE(1080,16);b.writeUInt32BE(1350,20);return b;}})})};

test('export with CTA kit and stories keeps the text files (regression: cta-e-dm.txt was rejected)', async t => {
  const {store} = await fixture(t); const p = await ready(store);
  await store.saveStories(p.id,[{type:'Caixa de perguntas',text:'Qual sua dúvida?',sticker:'Pergunte',cta:'Responda',visual:'v'},{type:'Oferta',text:'Conheça',sticker:'',cta:'Link',visual:'v'}]);
  const zip = unzipSync(normalizeExport(await store.exportZip(p.id),fakeNative));
  assert.deepEqual(Object.keys(zip).sort(),['01.png','02.png','cta-e-dm.txt','legenda.txt','stories.txt']);
  assert.match(strFromU8(zip['stories.txt']),/STORY 1 — Caixa de perguntas\nQual sua dúvida\?\nSticker: Pergunte/);
  assert.throws(() => normalizeExport(zipSync({'../x.png':png}),fakeNative),/não permitido/);
});

test('phone share serves only the carousel behind a random token and stops', async t => {
  const server = new ShareServer({host:'127.0.0.1',ttlMs:60000});
  t.after(() => server.stop());
  const shared = await server.start({title:'Carrossel <b>',caption:'Legenda',files:[{name:'01.png',bytes:png,type:'image/png'}]});
  assert.match(shared.url,/^http:\/\/127\.0\.0\.1:\d+\/[\w-]{32}\/$/); assert.match(shared.qr,/^data:image\/png;base64,/); assert.equal(shared.count,1);
  const page = await get(shared.url); assert.equal(page.status,200); assert.match(page.body.toString(),/Carrossel &lt;b&gt;/); assert.match(page.body.toString(),/Copiar legenda/);
  const file = await get(`${shared.url}f/0`); assert.equal(file.status,200); assert.equal(file.type,'image/png'); assert.deepEqual(file.body,png);
  const origin = new URL(shared.url).origin;
  assert.equal((await get(`${origin}/`)).status,404);
  assert.equal((await get(`${origin}/wrong-token/f/0`)).status,404);
  assert.equal((await get(`${shared.url}f/1`)).status,404);
  assert.equal((await get(`${shared.url}f/../../etc`)).status,404);
  assert.equal((await get(shared.url,'POST')).status,405);
  await server.stop();
  await assert.rejects(get(shared.url));
});

test('share link expires by itself', async t => {
  const server = new ShareServer({host:'127.0.0.1',ttlMs:80});
  const shared = await server.start({title:'A',caption:'',files:[{name:'01.png',bytes:png,type:'image/png'}]});
  await new Promise(r => setTimeout(r, 250));
  await assert.rejects(get(shared.url));
});

test('LAN address prefers private IPv4', () => {
  assert.equal(lanAddress({eth:[{family:'IPv6',address:'fe80::1',internal:false}],lo:[{family:'IPv4',address:'127.0.0.1',internal:true}],vpn:[{family:'IPv4',address:'100.64.0.2',internal:false}],wifi:[{family:'IPv4',address:'192.168.0.12',internal:false}]}),'192.168.0.12');
  assert.equal(lanAddress({}),null);
});

test('Google Drive folder detection and safe writing', async t => {
  const {root} = await fixture(t);
  const found = findDriveFolders({platform:'win32',env:{USERPROFILE:'C:\\Users\\X'},exists:p=>p==='G:\\Meu Drive'||p===join('C:\\Users\\X','Google Drive')});
  assert.deepEqual(found,['G:\\Meu Drive',join('C:\\Users\\X','Google Drive')]);
  // macOS: uma pasta por conta em ~/Library/CloudStorage.
  const cloud = join('/Users/x','Library','CloudStorage'), mine = join(cloud,'GoogleDrive-eu@gmail.com','Meu Drive');
  const mac = findDriveFolders({platform:'darwin',env:{HOME:'/Users/x'},list:p=>p===cloud?['GoogleDrive-eu@gmail.com','Dropbox']:[],exists:p=>p===mine});
  assert.deepEqual(mac,[mine]);
  const folder = await writeCarouselFolder(root,'Meu: carrossel/teste',{'01.png':png,'legenda.txt':Buffer.from('L'),'stories/01.png':png});
  assert.equal(folder,join(root,'PACTO','Meu carrosselteste'));
  assert.deepEqual((await readdir(folder)).sort(),['01.png','legenda.txt','stories']);
  await assert.rejects(writeCarouselFolder(root,'x',{'../fora.txt':Buffer.from('x')}),/fora da pasta/);
});

test('runtime shares, saves to Drive (asking for a folder when none is found) and builds stories', async t => {
  const {store,root} = await fixture(t); const p = await ready(store);
  const prompts = []; const shares = [];
  const runtime = new Runtime({store,knowledge:{method:'M',lessons:[{id:'bvDw6TPoU8I',text:'... use stories only to make offers ...'}],pages:[]},
    codex:{status:{account:{connected:true}},cancel:async()=>{},run:async o=>{prompts.push(o);return o.outputSchema?{text:JSON.stringify({stories:[{type:'Caixa de perguntas',text:'Dúvida?',sticker:'Pergunte',cta:'Responda',visual:'v'},{type:'Oferta',text:'Curso',sticker:'',cta:'Link',visual:'v'}]})}:{images:[png]};}},
    dialogs:{normalizeFiles:async files=>files,chooseFolder:async()=>join(root,'drive')},
    share:()=>({start:async input=>{shares.push(input);return {url:'http://x/',qr:'data:',count:input.files.length};},stop:async()=>{}}),
    drive:{find:()=>[],write:writeCarouselFolder}});
  const shared = await runtime.request('shareToPhone',{id:p.id}); assert.equal(shared.count,2); assert.equal(shares[0].caption,'Comente GUIA');
  assert.deepEqual(await runtime.request('saveToDrive',{id:p.id}),{needsFolder:true});
  await runtime.request('chooseDriveFolder',{});
  const saved = await runtime.request('saveToDrive',{id:p.id});
  assert.equal(saved.folder,join(root,'drive','PACTO','Meu carrosselteste'));
  assert.match(await readFile(join(saved.folder,'cta-e-dm.txt'),'utf8'),/GUIA/);
  await runtime.request('stories',{id:p.id}); await settle(runtime);
  assert.match(prompts[0].prompt,/SÓ DE TEXTO/); assert.match(prompts[0].prompt,/use stories only to make offers/);
  assert.match(prompts[0].prompt,/comentar a palavra-chave GUIA/); assert.match(prompts[0].prompt,/VOZ HUMANA/);
  const stories = store.get(p.id).stories; assert.equal(stories.length,2); assert.equal(stories[0].image,undefined);
  await runtime.request('generateStoryArt',{id:p.id,storyId:stories[0].id}); await settle(runtime);
  assert.match(prompts[1].prompt,/9:16/); assert.match(prompts[1].prompt,/NÃO desenhe o sticker/);
  assert.ok(store.get(p.id).stories[0].image); assert.equal(store.get(p.id).status,'complete');
  await assert.rejects(runtime.request('generateStoryArt',{id:p.id,storyId:'nope'}),/não encontrado/);
});

test('text-only stories render in black or white, re-render on edit and keep AI art', async t => {
  const {store} = await fixture(t); const p = await ready(store);
  const rendered = [];
  const reply = {stories:[{type:'Gancho',text:'Errei isso por 2 anos',sticker:'',cta:'',visual:''},{type:'Enquete',text:'E você?',sticker:'Já errou? | Sim | Não',cta:'Votar',visual:''}]};
  const runtime = new Runtime({store,knowledge:{method:'M',lessons:[],pages:[]},
    codex:{status:{account:{connected:true}},cancel:async()=>{},run:async o=>o.outputSchema?{text:JSON.stringify(reply)}:{images:[png]}},
    dialogs:{render:{fonts:{},png:async (html,size)=>{rendered.push({html,size});return png;}}}});
  await runtime.request('stories',{id:p.id}); await settle(runtime);
  let saved = store.get(p.id).stories;
  assert.equal(rendered.length,2); assert.deepEqual(rendered[0].size,{width:1080,height:1920});
  assert.match(rendered[0].html,/background:#000000/); assert.ok(saved.every(s=>s.image&&s.art==='simples'));
  assert.match(rendered[1].html,/flex-start/); // com sticker, o texto sobe
  await runtime.request('storyTheme',{id:p.id,theme:'branco'});
  assert.equal(store.get(p.id).storyTheme,'branco'); assert.equal(rendered.length,4); assert.match(rendered[3].html,/background:#ffffff/);
  await assert.rejects(runtime.request('storyTheme',{id:p.id,theme:'azul'}),/preto ou branco/);
  await runtime.request('saveStory',{id:p.id,storyId:saved[0].id,text:'Errei isso por 3 anos'});
  assert.equal(rendered.length,5); assert.match(rendered[4].html,/3 anos/); assert.equal(store.get(p.id).stories[0].text,'Errei isso por 3 anos');
  await runtime.request('generateStoryArt',{id:p.id,storyId:saved[1].id}); await settle(runtime);
  assert.equal(store.get(p.id).stories[1].art,'ia');
  await runtime.request('storyTheme',{id:p.id,theme:'preto'});
  assert.equal(rendered.length,6); // só o story simples é refeito; a arte com IA fica
  const zip = unzipSync(await store.exportZip(p.id));
  assert.ok(zip['stories/01.png']&&zip['stories/02.png']); assert.match(strFromU8(zip['stories.txt']),/Sticker: Já errou\? \| Sim \| Não/);
});
