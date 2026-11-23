import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { deflateSync, crc32 } from 'node:zlib';
import { Profiles } from '../core/profiles.mjs';
import { Runtime } from '../core/runtime.mjs';
import { pngDifferenceHash } from '../core/personas.mjs';
import { keepBlock } from '../core/ugc.mjs';

const fields={nome:'Lia',idade:28,genero:'mulher',etnia:'parda',cabelo:'cacheado castanho',estilo:'casual com jeans',cenario:'café de bairro',nicho:'educação',instagram:'@lia'};
function png(channels=3, filtered=true){
  function chunk(type,data){
    const body=Buffer.concat([Buffer.from(type),data]),head=Buffer.alloc(4),tail=Buffer.alloc(4);
    head.writeUInt32BE(data.length);tail.writeUInt32BE(crc32(body));
    return Buffer.concat([head,body,tail]);
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(9);header.writeUInt32BE(8,4);header[8]=8;header[9]=channels===3?2:6;
  const rows=Array.from({length:8},(_,y)=>{
    const filter=filtered?y%5:0,row=Buffer.alloc(1+9*channels);row[0]=filter;
    for(let x=0;x<9;x++){
      const value=240-10*x-y,left=x?value+10:0,up=y?value+1:0;
      const predictor=[0,left,up,(left+up)>>1,x?left:up][filter];
      row.fill((value-predictor)&255,1+x*channels,1+(x+1)*channels);
    }
    return row;
  });
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.concat(rows))),chunk('IEND',Buffer.alloc(0))]);
}
const photo='data:image/png;base64,'+png().toString('base64');
async function setup(t){
  const root=await mkdtemp(join(tmpdir(),'personas-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  const profiles=await new Profiles(root).init();
  const runtime=new Runtime({profiles,store:await profiles.store(),codex:{status:{account:{connected:false}}},knowledge:{lessons:[]}});
  return {root,profiles,request:runtime.request.bind(runtime)};
}

test('cria, edita, ativa e apaga personas por perfil com âncora em blob',async t=>{
  const {root,profiles,request}=await setup(t);
  const other=await profiles.create('Outra marca');
  const {persona}=await request('savePersona',{persona:{...fields,anchor:photo},use:true});
  const state=await readFile(join(root,'state.json'),'utf8');
  assert.match(state,/"anchor": "carrossell-imagem:\/\/[a-f0-9]{40}\.png"/);
  const reopened=(await (await new Profiles(root).init()).store()).persona(persona.id);
  assert.equal(reopened.anchor,photo);
  assert.equal(reopened.keepBlock,keepBlock(persona));
  assert.match(reopened.keepBlock,/MANTER.*casual com jeans/);
  assert.doesNotMatch(reopened.keepBlock,/ESTA FOTO/);
  assert.equal((await request('personas')).activePersonaId,persona.id);
  assert.deepEqual((await request('personas',{profileId:other.id})).personas,[]);
  await assert.rejects(request('usePersona',{profileId:other.id,id:persona.id}),/neste perfil/);
  const edited=await request('savePersona',{persona:{id:persona.id,nome:'Lia Costa'}});
  assert.equal(edited.persona.id,persona.id);
  assert.equal(edited.persona.createdAt,persona.createdAt);
  assert.equal(edited.persona.anchor,photo);
  assert.match(edited.persona.keepBlock,/Lia Costa/);
  await assert.rejects(request('savePersona',{persona:{id:persona.id,anchor:''}}),/foto-âncora original.*salva/);
  await request('usePersona',{id:'Lia Costa'});
  await request('deletePersona',{id:persona.id});
  assert.deepEqual(await request('personas'),{personas:[],activePersonaId:null,avatarPersonaId:null,avisos:[]});
});

test('recupera o bloco MANTER de uma persona salva antes da biblioteca',async t=>{
  const {root,request}=await setup(t);
  const {persona}=await request('savePersona',{persona:{...fields,anchor:photo}});
  const path=join(root,'state.json');
  const legacy=JSON.parse(await readFile(path,'utf8'));
  delete legacy.personas[0].keepBlock;
  await writeFile(path,JSON.stringify(legacy));
  const reopened=await (await new Profiles(root).init()).store();
  assert.equal(reopened.persona(persona.id).anchor,photo);
  assert.equal(reopened.persona(persona.id).keepBlock,keepBlock(persona));
});

test('associa a âncora ao perfil, ativa o avatar e mantém a biblioteca ao remover a foto',async t=>{
  const {root,profiles,request}=await setup(t);
  const other=await profiles.create('Outra marca');
  const scope={profileId:other.id};
  const {persona:draft}=await request('savePersona',{...scope,persona:fields});
  await assert.rejects(request('setProfileAvatar',{...scope,id:draft.id}),/Salve a foto-âncora/);
  const {persona}=await request('savePersona',{...scope,persona:{id:draft.id,anchor:photo}});
  await assert.rejects(request('setProfileAvatar',{id:persona.id}),/neste perfil/);
  const library=await request('setProfileAvatar',{...scope,id:persona.id});
  assert.equal(library.avatarPersonaId,persona.id);
  assert.equal(library.activePersonaId,persona.id);
  const brand=await request('bootstrap',scope);
  assert.equal(brand.media.avatar,photo);
  assert.equal(brand.brandInfo.avatar,photo);
  assert.equal(brand.brandInfo.avatarPersonaId,persona.id);
  assert.equal((await request('bootstrap')).media.avatar,'');
  const reopened=await (await new Profiles(root).init()).store(other.id);
  assert.equal(reopened.media().avatar,photo);
  assert.equal(reopened.media().avatarPersonaId,persona.id);
  const removed=await request('saveMedia',{...scope,avatar:''});
  assert.equal(removed.media.avatar,'');
  assert.equal(removed.media.avatarPersonaId,null);
  assert.equal(removed.activePersonaId,persona.id);
  assert.equal(removed.personas[0].anchor,photo);
  await request('setProfileAvatar',{...scope,id:persona.id});
  await request('deletePersona',{...scope,id:persona.id});
  const deleted=await request('bootstrap',scope);
  assert.equal(deleted.media.avatar,'');
  assert.equal(deleted.media.avatarPersonaId,null);
  assert.equal(deleted.activePersonaId,null);
});

test('avisa sobre clones entre perfis por atributos e por distância do hash',async t=>{
  const {profiles,request}=await setup(t);
  const other=await profiles.create('Outra marca');
  await request('savePersona',{persona:{...fields,anchor:photo}});
  const same=await request('savePersona',{profileId:other.id,persona:{...fields,nome:'Bia',idade:32,cenario:'cafe de Bairro'}});
  assert.match(same.avisos[0].motivo,/descrições visuais/);
  const jpeg='data:image/jpeg;base64,/9j/AAH/2Q==';
  const face=await request('savePersona',{profileId:other.id,persona:{...fields,nome:'Cris',idade:50,anchor:jpeg,anchorHash:'fffffffffffffc00'}});
  const match=face.avisos.find(({b})=>b.id===face.persona.id);
  assert.match(match.motivo,/rosto possivelmente igual/);
  assert.equal(match.b.profileName,'Outra marca');
  const far=await request('savePersona',{profileId:other.id,persona:{...fields,nome:'Dani',idade:50,anchor:'data:image/jpeg;base64,'+Buffer.from([255,216,255,0,2,255,217]).toString('base64'),anchorHash:'fffffffffffff800'}});
  assert.ok(!far.avisos.some(({a,b})=>a.profileId!==b.profileId && b.id===far.persona.id));
});

test('valida dados da persona em português',async t=>{
  const {request}=await setup(t);
  for(const [patch,error] of [[{idade:1.5},/anos inteiros/],[{etnia:''},/a aparência/],[{instagram:'lia'},/Use @/],[{anchor:'foto.png'},/imagem PNG/]]) {
    await assert.rejects(request('savePersona',{persona:{...fields,...patch}}),error);
  }
});

test('dHash decodifica RGB e RGBA com os filtros PNG 0 a 4',()=>{
  for(const channels of [3,4]) for(const filtered of [false,true]) assert.equal(pngDifferenceHash(png(channels,filtered)),'ffffffffffffffff');
});
