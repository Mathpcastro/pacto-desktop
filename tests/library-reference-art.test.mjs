import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, validateAttachments, isLibraryReference } from '../core/store.mjs';
import { Runtime } from '../core/runtime.mjs';
import { loadKnowledge } from '../core/knowledge.mjs';

const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=';

test('the library post keeps its mark when the project is saved, and old projects are recognized by name',()=>{
  const [kept]=validateAttachments([{name:'Referência 0042 · @autora.webp',dataUrl:png,referenceId:'ref-0042'}]);
  assert.equal(kept.referenceId,'ref-0042');assert.ok(isLibraryReference(kept));
  assert.ok(isLibraryReference({name:'Referência 0042 · @autora.webp'}),'projetos salvos antes da correção');
  assert.ok(!isLibraryReference({name:'foto-produto.png'}));
  assert.equal(validateAttachments([{name:'x.png',dataUrl:png,referenceId:'<script>'}])[0].referenceId,undefined);
});

test('the cover uses the library post as the visual model instead of the generic art direction',async t=>{
  const root=await mkdtemp(join(tmpdir(),'carrossell-ref-art-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const store=await new Store(root).init();await store.saveProfile({brand:'Brotinhos',brandContext:'Devocional infantil para mães cristãs.',designKit:'Verde e creme.'});
  const runtime=new Runtime({store,knowledge:loadKnowledge(),codex:{status:{account:{connected:true}},run:async()=>({text:'{}',images:[]}),cancel:async()=>{}},dialogs:{}});
  const p=await store.createProject({title:'Pede pra ela',brief:'b',attachments:[{name:'Referência 0042 · @autora.webp',dataUrl:png,referenceId:'ref-0042'},{name:'produto.png',dataUrl:png}]});
  const [ref]=store.get(p.id).attachments;
  await store.saveProject({id:p.id,slides:[{id:'c',role:'Capa',title:'Pede pra ela',body:'',emphasis:'',visual:'',prompt:'',asset:ref.id},{id:'f',role:'CTA',title:'Salve',body:'',emphasis:'',visual:'',prompt:'',asset:''}]});
  const q=store.get(p.id),cover={...q.slides[0],index:1};
  const {references,legend}=runtime.imageRefs(q,cover);
  assert.equal(references[0],ref.dataUrl);assert.match(legend,/1\. POST DE REFERÊNCIA escolhido na Biblioteca: é o MODELO VISUAL/);
  assert.doesNotMatch(legend,/IMAGEM QUE DEVE APARECER/,'o post da Biblioteca nunca é colado no card');
  assert.match(legend,/referência anexada ao carrossel \("produto.png"\)/);
  const prompt=runtime.imagePrompt({id:p.id},cover,{references,legend});
  assert.match(prompt,/escolheu um POST DE REFERÊNCIA na Biblioteca/);assert.doesNotMatch(prompt,/guache e aquarela|LAYOUT DE CAPA/);
  assert.match(runtime.assetsContext(q),/POST DE REFERÊNCIA da Biblioteca: modelo de estilo e estrutura; nunca use este id em asset/);
  const plain=await store.createProject({title:'Sem referência',brief:'b'});await store.saveProject({id:plain.id,slides:[{id:'c',role:'Capa',title:'T',body:'',emphasis:'',visual:'',prompt:''}]});
  assert.match(runtime.imagePrompt({id:plain.id},{...store.get(plain.id).slides[0],index:1},{references:[]}),/guache e aquarela/);
});
