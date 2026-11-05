import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../core/store.mjs';
import { Runtime } from '../core/runtime.mjs';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=';
async function fixture(t){const root=await mkdtemp(join(tmpdir(),'brand-refs-'));t.after(()=>rm(root,{recursive:true,force:true}));const store=await new Store(root).init();const rt=new Runtime({store,knowledge:{method:'',lessons:[],prompts:[]},codex:{status:{account:{connected:false}}}});await store.saveProfile({brand:'Trading',brandContext:'Ensino leitura de candles, suporte e resistência.',designKit:'Preto e verde.'});return {rt,store,root};}
test('saving visual references preserves brand documents and persists across reopening',async t=>{const {rt,store,root}=await fixture(t);await rt.request('saveVisualReferences',{references:[{name:'Candles',dataUrl:png}]});assert.equal(store.state().profile.designKit,'Preto e verde.');const again=await new Store(root).init();assert.equal(again.state().profile.references[0].name,'Candles');await assert.rejects(rt.request('saveVisualReferences',{references:Array(7).fill({name:'x',dataUrl:png})}),/seis/);await assert.rejects(rt.request('saveVisualReferences',{references:[{name:'x',dataUrl:'https://example.com/x.png'}]}),/imagem/);await rt.request('saveVisualReferences',{references:[]});assert.equal(store.state().profile.references.length,0);});
test('art direction includes the brand context and distinguishes references from approved artwork',async t=>{const {rt,store}=await fixture(t);const p=await store.createProject({title:'Suporte',brief:'Como identificar suporte'});assert.match(rt.imageContext(p.id),/Ensino leitura de candles/);assert.match(rt.imageContext(p.id),/UNIVERSO VISUAL/);});
test('brand references keep room next to the approved cover even with many project attachments',async t=>{const {rt,store}=await fixture(t);await store.saveProfile({...store.state().profile,references:[{name:'Candles',dataUrl:png}]});const p=await store.createProject({title:'Trading',brief:'Candles',attachments:Array.from({length:6},(_,i)=>({id:'img'+i,name:'Anexo '+i,dataUrl:png}))});const anchor='data:image/png;base64,ANCHOR';const refs=rt.imageRefs(p,{},[{image:anchor,label:'capa aprovada'}]);assert.equal(refs.references[0],anchor);assert.ok(refs.legend.includes('Candles'));assert.ok(refs.legend.includes('inspire-se'));assert.ok(refs.references.length<=6);});

test('native cover, inner card and story calls receive the saved brand images and context',async t=>{
 const {rt,store}=await fixture(t);const calls=[];
 rt.codex.run=async args=>{calls.push(args);return {images:[Buffer.from(png.split(',')[1],'base64')],text:''};};
 await rt.request('saveVisualReferences',{references:[{name:'Candles',dataUrl:png}]});
 const p=await store.createProject({title:'Trading',brief:'Como identificar suporte',style:'ia'});
 await store.saveProject({id:p.id,slides:[{id:'cover',index:1,title:'Suporte',body:'Aprenda a ler o gráfico',visual:'Candles em suporte'},{id:'inner',index:2,title:'Observe a reação',body:'',visual:'Gráfico com região de suporte'}]});
 const token={id:p.id,cancelled:false};await rt.covers(token,1);
 assert.equal(calls.length,1);assert.ok(calls[0].references.includes(png));assert.match(calls[0].prompt,/Candles/);assert.match(calls[0].prompt,/Ensino leitura de candles/);
 const image=Buffer.from(png.split(',')[1],'base64');await store.addImage(p.id,'cover',image);
 await rt.images(token,'inner');assert.equal(calls.length,2);assert.ok(calls[1].references.includes(png));assert.match(calls[1].prompt,/capa aprovada/);
 await store.saveStories(p.id,[{id:'story1',type:'Gancho',text:'Observe o suporte',cta:'',sticker:'',visual:'Candles'}]);
 await rt.storyArt(token,'story1');assert.equal(calls.length,3);assert.ok(calls[2].references.includes(png));assert.match(calls[2].prompt,/referência visual da marca/);assert.match(calls[2].prompt,/Ensino leitura de candles/);
});

test('new photos for template backgrounds use the brand context and visual references',async t=>{const {rt,store}=await fixture(t);await rt.request('saveVisualReferences',{references:[{name:'Candles',dataUrl:png}]});await store.saveMedia({addScenes:[{label:'Mesa do trader',prompt:'Monitor com gráfico de candles'}]});const scene=store.media().scenes[0],calls=[];rt.codex.status.account.connected=true;rt.codex.run=async args=>{calls.push(args);return {images:[Buffer.from(png.split(',')[1],'base64')],text:''};};await rt.sceneImage(scene.id,1);assert.ok(calls[0].references.includes(png));assert.match(calls[0].prompt,/Ensino leitura de candles/);});
