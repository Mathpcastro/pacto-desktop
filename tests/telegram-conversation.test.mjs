import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AutopilotStore } from '../core/autopilot-store.mjs';
import { Autopilot } from '../core/autopilot.mjs';
import { Profiles } from '../core/profiles.mjs';
import { Runtime } from '../core/runtime.mjs';
import { loadKnowledge } from '../core/knowledge.mjs';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=','base64');
const message=(text,id=1,user=7)=>({update_id:id,message:{message_id:id,text,chat:{id:42,type:'private'},from:{id:user}}});
const intent=(action,args={})=>({text:JSON.stringify({action,args:JSON.stringify(args),reply:''})});
async function fixture(t){
  const root=await mkdtemp(join(tmpdir(),'carrossell-conversation-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const profiles=await new Profiles(join(root,'library')).init(),store=await profiles.store();
  await store.saveProfile({brand:'Marca',brandContext:'Uma marca de cursos',designKit:'Verde e branco'});
  const sent=[],calls=[];let plan=intent('status'),number=1;
  const codex={status:{account:{connected:true}},cancel:async()=>{},run:async options=>{
    calls.push(options);
    if(options.outputSchema?.properties?.action)return typeof plan==='function'?plan(options):plan;
    return {text:JSON.stringify({title:'Pauta',architecture:'Lista',editorialLine:'',visualConcept:'',coverHooks:[],caption:'Salve',reply:'Texto pronto',regenerateSlideIds:[],slides:[{id:'one',role:'Capa',title:'Aprenda hoje',body:'Texto',emphasis:'',visual:'',prompt:''},{id:'two',role:'CTA',title:'Salve isto',body:'Confira',emphasis:'',visual:'',prompt:''}]})};
  }};
  const runtime=new Runtime({store,profiles,codex,knowledge:loadKnowledge(),dialogs:{render:{png:async()=>png,fonts:{}}}});
  runtime.social.pick=ids=>ids.map(id=>({id,username:'marca'}));let posts=0;runtime.social.publish=async()=>{posts++;};
  const client={sendText:async(chat,text,extra={})=>{sent.push({text,...extra});return[{message_id:number++}];},sendPhotos:async(chat,photos)=>{sent.push({photos});return[{message_id:number++}];},sendDocument:async(chat,file)=>{sent.push({file});return{message_id:number++};},answerCallbackQuery:async()=>{},editMessageReplyMarkup:async()=>{}};
  const state=await new AutopilotStore(root).init();await state.change(d=>{d.binding={chatId:42,userId:7};});
  const pilot=new Autopilot({runtime,state,secrets:{getTelegramToken:()=> 'synthetic-token',clearTelegramToken:async()=>{}},clientFactory:()=>client});runtime.autopilot=pilot;
  return{root,profiles,store,runtime,pilot,state,sent,calls,client,posts:()=>posts,setPlan:value=>{plan=value;}};
}

test('version 1 operational store migrates conversation without losing configs or jobs and interrupts running work',async t=>{
  const root=await mkdtemp(join(tmpdir(),'carrossell-conversation-migration-'));t.after(()=>rm(root,{recursive:true,force:true}));
  await writeFile(join(root,'autopilot.json'),JSON.stringify({version:1,offset:20,binding:{chatId:42,userId:7},configs:{principal:{enabled:false}},jobs:[{id:'old',status:'ready'}],conversation:{profileId:'principal',projectId:'draft',history:[],inbox:[{id:'u1',status:'running'}],seen:[]}}));
  const state=await new AutopilotStore(root).init();assert.equal(state.snapshot().jobs[0].status,'ready');assert.equal(state.snapshot().offset,20);
  assert.equal(state.snapshot().conversation.inbox[0].status,'interrupted');assert.match(state.snapshot().conversation.inbox[0].error,/interromp/i);
});
test('paired conversation keeps process alive even with no enabled routine',async t=>{const f=await fixture(t);assert.equal(f.pilot.keepAlive(),true);});
test('only authenticated private free text is durably queued and replayed updates cannot create twice',async t=>{
  const f=await fixture(t);f.setPlan(intent('createText',{title:'Pauta',brief:'Ensine algo',style:'texto',cardCount:2}));
  await f.pilot.handleUpdate(message('crie um carrossel',1,99));assert.equal(f.calls.length,0);
  await f.pilot.handleUpdate(message('crie um carrossel',2));assert.equal(f.calls.length,0);assert.equal(f.state.snapshot().conversation.inbox.length,1);
  await f.pilot.handleUpdate(message('crie um carrossel',2));await f.pilot.step();await f.pilot.step();assert.equal(f.store.state().projects.length,1);
  assert.equal(f.store.state().projects[0].textApproved,false);assert.equal(f.store.state().projects[0].coverOptions.length,0);assert.match(f.sent.at(-1).text,/aprovar/i);
});
test('planner context stays pinned when the desktop switches profile and excludes local paths and media',async t=>{
  const f=await fixture(t);await f.pilot.handleUpdate(message('qual é a marca?'));
  const other=await f.profiles.create('Outra');await f.profiles.setActive(other.id);f.runtime.store=await f.profiles.store(other.id);
  await f.pilot.step();assert.equal(f.state.snapshot().conversation.profileId,'principal');assert.equal(f.profiles.active,other.id);
  assert.match(f.calls[0].prompt,/Uma marca de cursos/);assert.doesNotMatch(f.calls[0].prompt,/data:image|driveFolder|synthetic-token/);assert.equal(f.calls[0].textOnly,true);
});
test('privileged and unknown planner actions fail closed including model supplied profile and arbitrary URLs',async t=>{
  for(const [action,args] of [['publishInstagram',{confirmed:true}],['saveSettings',{driveFolder:'C:/tmp'}],['createText',{title:'X',brief:'X',profileId:'other'}],['modelReference',{text:'x',url:'https://example.com'}]]){
    const f=await fixture(t);f.setPlan(intent(action,args));await f.pilot.handleUpdate(message('faça isso'));await f.pilot.step();assert.equal(f.store.state().projects.length,0);assert.equal(f.posts(),0);assert.match(f.sent.at(-1).text,/permitid|inválid/i);
  }
});
test('busy planner cancellation bypasses polling work and never cancels desktop work',async t=>{
  const f=await fixture(t);let release,started;const ready=new Promise(resolve=>{started=resolve;});f.setPlan(()=>{started();return new Promise(resolve=>{release=resolve;});});let cancels=0;f.runtime.codex.cancel=async()=>{cancels++;};
  await f.pilot.handleUpdate(message('crie um carrossel'));const work=f.pilot.step();await ready;
  await f.pilot.handleUpdate(message('/cancelar',2));assert.equal(cancels,1);release(intent('createText',{title:'X',brief:'X'}));await work;assert.equal(f.store.state().projects.length,0);
  f.runtime.job={id:'desktop',owner:'desktop'};await f.pilot.handleUpdate(message('/cancelar',3));assert.equal(cancels,1);assert.equal(f.runtime.job.id,'desktop');
});
test('deterministic help status brands and projects bypass a busy interpreter',async t=>{
  const f=await fixture(t);f.runtime.job={id:'desktop'};for(const [i,command]of ['/ajuda','/status','/marcas','/projetos'].entries())await f.pilot.handleUpdate(message(command,i+1));assert.equal(f.calls.length,0);assert.equal(f.sent.length,4);assert.match(f.sent[0].text,/texto/i);
});
test('credential-bearing chat is rejected before inbox history or planner',async t=>{
  const f=await fixture(t);await f.pilot.handleUpdate(message('token 123456:abcdefghijklmnopqrstuv e Bearer secretValue'));await f.pilot.step();assert.equal(f.calls.length,0);assert.doesNotMatch(JSON.stringify(f.state.snapshot()),/abcdefghijklmnopqrstuv|secretValue/);assert.match(f.sent.at(-1).text,/computador/i);
});
test('restart reports interrupted work once without recreating or replaying a running mutation',async t=>{
  const f=await fixture(t);await f.pilot.handleUpdate(message('crie um carrossel'));await f.state.change(d=>{d.conversation.inbox[0].status='running';});
  const restored=await new AutopilotStore(f.root).init();f.pilot.state=restored;f.pilot.conversation.state=restored;await f.pilot.step();await f.pilot.step();assert.equal(f.calls.length,0);assert.equal(f.store.state().projects.length,0);assert.equal(f.sent.length,1);assert.match(f.sent[0].text,/interromp/i);
});
test('publication intent sends a fresh fingerprint review and requires existing callback before social publish',async t=>{
  const f=await fixture(t);const p=await f.store.createProject({title:'Pronto',brief:'Pauta',style:'texto'});await f.store.update(p.id,{textApproved:true,slides:[{id:'one',title:'Título',body:'',image:'one.png',state:'complete'},{id:'two',title:'Salve',body:'',image:'two.png',state:'complete'}]});
  f.runtime.exportedFiles=async()=>({'01.png':png,'02.png':png});await f.state.change(d=>{d.conversation.profileId='principal';d.conversation.projectId=p.id;});
  f.setPlan(intent('reviewPublication',{accounts:['ig1']}));await f.pilot.handleUpdate(message('publique na conta ig1'));await f.pilot.step();assert.equal(f.posts(),0);
  const review=f.state.snapshot().jobs[0];assert.equal(review.status,'ready');assert.ok(review.fingerprint);
  await f.store.saveProject({id:p.id,caption:'Mudou'});await f.pilot.handleUpdate({callback_query:{id:'cb',from:{id:7},message:{message_id:review.messageId,chat:{id:42,type:'private'}},data:`p:${review.reviewId}:post`}});await f.pilot.step();assert.equal(f.posts(),0);assert.equal(f.state.snapshot().jobs[0].status,'error');
});
test('text approval needs explicit user wording and a vague creation request cannot approve',async t=>{
  const f=await fixture(t);const p=await f.store.createProject({title:'Pauta',brief:'Pauta'});await f.store.update(p.id,{slides:[{id:'one',title:'Título',body:''}]});await f.state.change(d=>{d.conversation.profileId='principal';d.conversation.projectId=p.id;});
  f.setPlan(intent('approveText'));await f.pilot.handleUpdate(message('crie o carrossel'));await f.pilot.step();assert.equal(f.store.get(p.id).textApproved,false);
  await f.pilot.handleUpdate(message('aprovo o texto',2));await f.pilot.step();assert.equal(f.store.get(p.id).textApproved,true);
});
test('disconnect clears conversation queue and history',async t=>{
  const f=await fixture(t);await f.pilot.handleUpdate(message('crie um carrossel'));await f.pilot.disconnect();assert.equal(f.state.snapshot().conversation.inbox.length,0);assert.equal(f.state.snapshot().conversation.history.length,0);
});
test('cover options are delivered before choosing and option numbers refer to the current project only',async t=>{
  const f=await fixture(t);const p=await f.store.createProject({title:'Pauta',brief:'Pauta',style:'texto'});await f.store.saveProject({id:p.id,slides:[{id:'one',title:'Título',body:'Texto'},{id:'two',title:'Salve',body:'Texto'}]});await f.store.update(p.id,{textApproved:true});
  await f.state.change(d=>{d.conversation.profileId='principal';d.conversation.projectId=p.id;});
  f.setPlan(intent('generateCovers',{count:3}));await f.pilot.handleUpdate(message('gere 3 capas'));await f.pilot.step();assert.equal(f.sent.find(x=>x.photos)?.photos.length,3);assert.match(f.sent.at(-1).text,/escolho a capa 1/);
  const options=f.store.get(p.id).coverOptions;f.setPlan(intent('chooseCover',{optionId:options[1].id}));await f.pilot.handleUpdate(message('escolho a capa 2',2));await f.pilot.step();assert.equal(f.store.get(p.id).styleVariant,options[1].variant);
  f.setPlan(intent('chooseCover',{optionId:options[0].id}));await f.pilot.handleUpdate(message('escolho a capa 2',3));await f.pilot.step();assert.equal(f.store.get(p.id).styleVariant,options[1].variant);assert.match(f.sent.at(-1).text,/escolha|opção/i);
});
test('explicit profile selection resets project context without switching desktop or leaking another brand',async t=>{
  const f=await fixture(t),other=await f.profiles.create('Outra Marca');await (await f.profiles.store(other.id)).saveProfile({brand:'Outra Marca',brandContext:'Outro contexto'});
  f.setPlan(intent('selectProfile',{profileId:other.id}));await f.pilot.handleUpdate(message('quero criar conteúdo'));await f.pilot.step();assert.equal(f.state.snapshot().conversation.profileId,'principal');
  await f.pilot.handleUpdate(message('use Outra Marca',2));await f.pilot.step();assert.equal(f.state.snapshot().conversation.profileId,other.id);assert.equal(f.state.snapshot().conversation.projectId,null);assert.equal(f.profiles.active,'principal');
});
test('attachments queue only authorized bounded image descriptors and are validated before modeling',async t=>{
  const f=await fixture(t);let downloads=0;f.client.downloadFile=async()=>{downloads++;return png;};
  const incoming={update_id:1,message:{message_id:1,caption:'modele esta referência',document:{file_id:'registered-id',file_size:png.length,mime_type:'image/png'},chat:{id:42,type:'private'},from:{id:7}}};
  f.setPlan(intent('modelReference',{useAttachment:true}));await f.pilot.handleUpdate(incoming);assert.equal(downloads,0);assert.equal(f.state.snapshot().conversation.inbox[0].attachment.fileId,'registered-id');
  await f.pilot.step();assert.equal(downloads,1);assert.ok(f.calls.some(c=>c.references?.[0]?.startsWith('data:image/png')));
  await f.pilot.handleUpdate({...incoming,update_id:2,message:{...incoming.message,document:{...incoming.message.document,file_size:11*1024*1024}}});assert.match(f.sent.at(-1).text,/10 MB/);assert.equal(downloads,1);
});
test('export uses normalized runtime files and enforces size before sending a generated ZIP',async t=>{
  const f=await fixture(t),p=await f.store.createProject({title:'Pauta',brief:'Pauta'});await f.state.change(d=>{d.conversation.profileId='principal';d.conversation.projectId=p.id;});
  let normalized=0;f.runtime.exportedFiles=async()=>{normalized++;return{'01.png':png};};f.setPlan(intent('export',{format:'zip'}));await f.pilot.handleUpdate(message('exporte ZIP'));await f.pilot.step();assert.equal(normalized,1);assert.ok(f.sent.at(-1).text.includes('ZIP'));assert.match(f.sent.find(x=>x.file).file.name,/^carrossell-[a-zA-Z0-9_-]+\.zip$/);
  f.runtime.exportedFiles=async()=>({'01.png':Buffer.alloc(46*1024*1024)});await f.pilot.handleUpdate(message('exporte ZIP',2));await f.pilot.step();assert.equal(f.sent.filter(x=>x.file).length,1);assert.match(f.sent.at(-1).text,/45 MB/);
});
test('expired binding and replay beyond the recent-id ring cannot execute queued work',async t=>{
  const f=await fixture(t);f.setPlan(intent('createText',{title:'Pauta',brief:'Pauta'}));await f.pilot.handleUpdate(message('crie texto',1000));
  await f.state.change(d=>{d.conversation.seen=[];d.binding.expiresAt=new Date(0).toISOString();});await f.pilot.step();assert.equal(f.calls.length,0);assert.equal(f.store.state().projects.length,0);
  await f.state.change(d=>{delete d.binding.expiresAt;});await f.pilot.handleUpdate(message('crie texto',1000));await f.pilot.step();assert.equal(f.store.state().projects.length,0);
});
test('explicit queued brand change applies to the next queued content request in FIFO order',async t=>{
  const f=await fixture(t),other=await f.profiles.create('Marca Ana');let i=0;f.setPlan(()=>++i===1?intent('selectProfile',{profileId:other.id}):intent('createText',{title:'Pauta Ana',brief:'Pauta',style:'texto',cardCount:2}));
  await f.pilot.handleUpdate(message('use Marca Ana',1));await f.pilot.handleUpdate(message('crie o texto',2));await f.pilot.step();await f.pilot.step();assert.equal(f.store.state().projects.length,0);assert.equal((await f.profiles.store(other.id)).state().projects.length,1);
});
test('latest idea batch is returned and metrics retain likes reach and unavailable values',async t=>{
  const f=await fixture(t);await f.store.saveIdeaBatch({id:'old',title:'Pauta antiga',ideas:[]});await f.store.saveIdeaBatch({id:'new',title:'Pauta nova',ideas:[]});assert.match(f.pilot.conversation.ideaText(),/Pauta nova/);
  const p=await f.store.createProject({title:'Pauta',brief:'Pauta'});await f.store.update(p.id,{instagram:{posts:[{accountId:'ig1',mediaId:'m1',metrics:{likes:10,reach:null,comments:3,saves:5}}]}});await f.state.change(d=>{d.conversation.profileId='principal';d.conversation.projectId=p.id;});f.runtime.social.refreshMetrics=async()=>{};
  f.setPlan(intent('metrics'));await f.pilot.handleUpdate(message('analise as métricas'));await f.pilot.step();assert.match(f.sent.at(-1).text,/Curtidas: 10/);assert.match(f.sent.at(-1).text,/Alcance: indisponível/);assert.doesNotMatch(f.sent.at(-1).text,/"metrics"/);
});
test('long brand documents cannot crowd out current project in a valid compact planner snapshot',async t=>{
  const f=await fixture(t),p=await f.store.createProject({title:'PROJETO_ATUAL',brief:'Pauta'});await f.store.saveProfile({brand:'Marca',brandContext:'x'.repeat(40000),designKit:'y'.repeat(40000)});await f.state.change(d=>{d.conversation.profileId='principal';d.conversation.projectId=p.id;});
  await f.pilot.handleUpdate(message('mostre o texto'));await f.pilot.step();const prompt=f.calls[0].prompt;assert.match(prompt,/PROJETO_ATUAL/);const raw=prompt.split('CONTEXTO SEGURO:\n')[1].split('\nPEDIDO ATUAL:')[0];assert.equal(JSON.parse(raw).project.title,'PROJETO_ATUAL');
});
test('cancellation interrupts a conversation-owned Runtime generation and preserves other jobs',async t=>{
  const f=await fixture(t);let pending,started;const ready=new Promise(resolve=>{started=resolve;});let cancelled=0;const original=f.runtime.codex.run;
  f.setPlan(intent('createText',{title:'Pauta',brief:'Pauta'}));f.runtime.codex.run=async options=>{if(options.outputSchema?.properties?.action)return original(options);started();return new Promise(resolve=>{pending=resolve;});};f.runtime.codex.cancel=async()=>{cancelled++;pending({text:'{}'});};
  await f.pilot.handleUpdate(message('crie o texto'));const work=f.pilot.step();await ready;assert.ok(f.runtime.job.owner);await f.pilot.handleUpdate(message('/parar',2));await work;assert.equal(cancelled,1);assert.equal(f.state.snapshot().conversation.inbox[0].status,'cancelled');assert.equal(f.store.state().projects.length,1);assert.equal(f.store.state().projects[0].textApproved,false);
});
test('deleted project is cleared so the next content request can recover',async t=>{
  const f=await fixture(t),p=await f.store.createProject({title:'Apagar',brief:'Pauta'});await f.state.change(d=>{d.conversation.profileId='principal';d.conversation.projectId=p.id;});await f.runtime.request('delete',{id:p.id});assert.equal(f.state.snapshot().conversation.projectId,null);
  f.setPlan(intent('createText',{title:'Nova pauta',brief:'Pauta'}));await f.pilot.handleUpdate(message('crie outro texto'));await f.pilot.step();assert.equal(f.store.state().projects.length,1);
});
test('deleted selected brand discards queued work and requires choosing another brand',async t=>{
  const f=await fixture(t),other=await f.profiles.create('Temporária');await f.state.change(d=>{d.conversation.profileId=other.id;});await f.pilot.handleUpdate(message('crie um texto'));await f.runtime.request('deleteProfile',{id:other.id});assert.equal(f.state.snapshot().conversation.profileId,null);assert.equal(f.state.snapshot().conversation.inbox[0].status,'discarded');
  f.setPlan(intent('selectProfile',{profileId:'principal'}));await f.pilot.handleUpdate(message('use Principal',2));await f.pilot.step();assert.equal(f.state.snapshot().conversation.profileId,'principal');assert.equal(f.store.state().projects.length,0);
});
test('cancelar clears a pending scheduling date so the next message is conversational',async t=>{
  const f=await fixture(t);await f.state.change(d=>{d.jobs.push({id:'date-job',profileId:'principal',status:'scheduleDate',messageId:10});});await f.pilot.handleUpdate(message('/cancelar'));assert.equal(f.state.snapshot().jobs[0].status,'resend');await f.pilot.handleUpdate(message('quero criar um texto',2));assert.equal(f.state.snapshot().conversation.inbox.length,1);
});
test('natural publication account name is present in planner context and creates review only',async t=>{
  const f=await fixture(t),p=await f.store.createProject({title:'Pronto',brief:'Pauta',style:'texto'});await f.store.update(p.id,{textApproved:true,slides:[{id:'one',title:'Título',body:'',image:'one.png',state:'complete'},{id:'two',title:'Salve',body:'',image:'two.png',state:'complete'}]});f.runtime.exportedFiles=async()=>({'01.png':png,'02.png':png});f.runtime.social.summary=()=>({accounts:[{id:'ig1',username:'marca'}],defaults:['ig1']});await f.state.change(d=>{d.conversation.profileId='principal';d.conversation.projectId=p.id;});
  f.setPlan(intent('reviewPublication',{accounts:['ig1']}));await f.pilot.handleUpdate(message('publique na @marca'));await f.pilot.step();assert.match(f.calls[0].prompt,/"username":"marca"/);assert.equal(f.state.snapshot().jobs[0].status,'ready');assert.equal(f.posts(),0);
});
test('conversational card count change uses Runtime resize and waits for the new actual slide count',async t=>{
  const f=await fixture(t),p=await f.store.createProject({title:'Pauta',brief:'Pauta',cardCount:2});await f.store.saveProject({id:p.id,slides:[{id:'one',title:'Primeiro',body:'Texto'},{id:'two',title:'Final',body:'Texto'}]});await f.state.change(d=>{d.conversation.profileId='principal';d.conversation.projectId=p.id;});
  const original=f.runtime.codex.run;f.runtime.codex.run=async options=>{if(options.outputSchema?.properties?.action)return original(options);return{text:JSON.stringify({title:'Pauta',architecture:'Lista',editorialLine:'',visualConcept:'',coverHooks:[],caption:'Salve',reply:'Adaptado',regenerateSlideIds:[],slides:[{id:'one',role:'Capa',title:'Primeiro',body:'Texto',emphasis:'',visual:'',prompt:''},{id:'middle',role:'Conteúdo',title:'Meio',body:'Texto',emphasis:'',visual:'',prompt:''},{id:'two',role:'CTA',title:'Final',body:'Texto',emphasis:'',visual:'',prompt:''}]})};};
  f.setPlan(intent('editProject',{cardCount:3}));await f.pilot.handleUpdate(message('mude para 3 cards'));await f.pilot.step();assert.equal(f.store.get(p.id).cardCount,3);assert.equal(f.store.get(p.id).slides.length,3);assert.equal(f.runtime.job,null);
});
test('document creation returns editable pages and explains PDF rather than asking for covers',async t=>{
  const f=await fixture(t);const original=f.runtime.codex.run;f.runtime.codex.run=async options=>options.outputSchema?.properties?.action?original(options):{text:JSON.stringify({title:'Material',caption:'',reply:'Texto pronto',pages:[{id:'one',layout:'cover',role:'Capa',title:'Meu material',body:'Texto',emphasis:''},{id:'two',layout:'text',role:'Conteúdo',title:'Passo 1',body:'Conteúdo',emphasis:''}]})};f.setPlan(intent('createText',{title:'Material',brief:'Ensine algo',format:'material'}));await f.pilot.handleUpdate(message('crie um material gratuito'));await f.pilot.step();assert.equal(f.store.state().projects[0].format,'material');assert.match(f.sent.at(-1).text,/Meu material/);
  f.setPlan(intent('approveText'));await f.pilot.handleUpdate(message('aprovo o texto',2));await f.pilot.step();assert.match(f.sent.at(-1).text,/PDF/);assert.doesNotMatch(f.sent.at(-1).text,/capas/);
});
test('planner cannot approve text quoted as copy or choose a negated cover',async t=>{
  const f=await fixture(t),p=await f.store.createProject({title:'Pauta',brief:'Pauta'});await f.store.saveProject({id:p.id,slides:[{id:'one',title:'Título',body:'Texto'}]});await f.state.change(d=>{d.conversation.profileId='principal';d.conversation.projectId=p.id;});f.setPlan(intent('approveText'));await f.pilot.handleUpdate(message('escreva no card a frase "aprovo o texto"'));await f.pilot.step();assert.equal(f.store.get(p.id).textApproved,false);
});
test('an authenticated uploaded logo is validated and stored through the normal brand asset workflow',async t=>{
  const f=await fixture(t);f.client.downloadFile=async()=>png;f.setPlan(intent('saveBrandImage',{kind:'logo'}));await f.pilot.handleUpdate({update_id:1,message:{message_id:1,caption:'adicione este logo à marca',document:{file_id:'registered-logo',file_size:png.length,mime_type:'image/png'},chat:{id:42,type:'private'},from:{id:7}}});await f.pilot.step();assert.equal(f.store.media().assets.length,1);assert.equal(f.store.media().assets[0].kind,'logo');assert.match(f.store.media().assets[0].dataUrl,/^data:image\/png;base64,/);
});
test('conversation stories are generated and edited through Runtime, and theme preserves the saved text',async t=>{
  const f=await fixture(t),p=await f.store.createProject({title:'Pauta',brief:'Pauta'});await f.store.saveProject({id:p.id,slides:[{id:'one',title:'Primeiro',body:'Texto'},{id:'two',title:'Final',body:'Texto'}]});await f.state.change(d=>{d.conversation.profileId='principal';d.conversation.projectId=p.id;});const original=f.runtime.codex.run;f.runtime.codex.run=async options=>options.outputSchema?.properties?.action?original(options):{text:JSON.stringify({stories:[{type:'Gancho',text:'Uma história',sticker:'',cta:'',visual:''},{type:'CTA',text:'Veja o post',sticker:'',cta:'Comente',visual:''}]})};
  f.setPlan(intent('stories'));await f.pilot.handleUpdate(message('crie stories'));await f.pilot.step();assert.equal(f.store.get(p.id).stories.length,2);assert.ok(f.store.get(p.id).stories.every(s=>s.image));assert.match(f.sent.at(-1).text,/Uma história/);
  const story=f.store.get(p.id).stories[0];f.setPlan(intent('saveStory',{storyId:story.id,text:'Texto editado'}));await f.pilot.handleUpdate(message('mude o story 1 para Texto editado',2));await f.pilot.step();f.setPlan(intent('storyTheme',{theme:'branco'}));await f.pilot.handleUpdate(message('use fundo branco nos stories',3));await f.pilot.step();assert.equal(f.store.get(p.id).stories[0].text,'Texto editado');assert.equal(f.store.get(p.id).storyTheme,'branco');
});
test('photo magic/type mismatch is rejected before an uploaded asset can reach the library',async t=>{
  const f=await fixture(t);f.client.downloadFile=async()=>Buffer.from('not-an-image');f.setPlan(intent('saveBrandImage',{kind:'logo'}));await f.pilot.handleUpdate({update_id:1,message:{message_id:1,caption:'adicione este logo',document:{file_id:'registered-logo',file_size:12,mime_type:'image/png'},chat:{id:42,type:'private'},from:{id:7}}});await f.pilot.step();assert.equal(f.store.media().assets.length,0);assert.match(f.sent.at(-1).text,/PNG|imagem/i);
});
test('a durable publication approval runs before ordinary queued conversation messages',async t=>{
  const f=await fixture(t),p=await f.store.createProject({title:'Pronto',brief:'Pauta',style:'texto'});await f.store.update(p.id,{textApproved:true,slides:[{id:'one',title:'Título',body:'',image:'one.png',state:'complete'},{id:'two',title:'Salve',body:'',image:'two.png',state:'complete'}]});f.runtime.exportedFiles=async()=>({'01.png':png,'02.png':png});await f.pilot.reviewProject('principal',p.id,['ig1']);let review=f.state.snapshot().jobs[0];
  await f.pilot.handleUpdate(message('como está o projeto?'));await f.pilot.handleUpdate({callback_query:{id:'cb',from:{id:7},message:{message_id:review.messageId,chat:{id:42,type:'private'}},data:`p:${review.reviewId}:post`}});await f.pilot.step();assert.equal(f.posts(),1);assert.equal(f.calls.length,0);assert.equal(f.state.snapshot().conversation.inbox[0].status,'queued');
});
test('expired binding cannot approve a preview or execute an already saved publication approval',async t=>{
  const f=await fixture(t),p=await f.store.createProject({title:'Pronto',brief:'Pauta',style:'texto'});await f.store.update(p.id,{textApproved:true,slides:[{id:'one',title:'Título',body:'',image:'one.png',state:'complete'},{id:'two',title:'Salve',body:'',image:'two.png',state:'complete'}]});f.runtime.exportedFiles=async()=>({'01.png':png,'02.png':png});await f.pilot.reviewProject('principal',p.id,['ig1']);const review=f.state.snapshot().jobs[0];await f.state.change(d=>{d.binding.expiresAt=new Date(0).toISOString();});
  await f.pilot.handleUpdate({callback_query:{id:'cb',from:{id:7},message:{message_id:review.messageId,chat:{id:42,type:'private'}},data:`p:${review.reviewId}:post`}});assert.equal(f.state.snapshot().jobs[0].status,'ready');await f.state.change(d=>{d.jobs[0].status='approved';});await f.pilot.step();assert.equal(f.posts(),0);
});
test('Runtime clarification questions reach the user without approval prompts before any text exists',async t=>{
  const f=await fixture(t),original=f.runtime.codex.run;let clarify=true;
  f.runtime.codex.run=async options=>{if(options.outputSchema?.properties?.action||!clarify)return original(options);return{text:JSON.stringify({title:'',architecture:'',editorialLine:'',visualConcept:'',coverHooks:[],caption:'',reply:'Qual produto e qual público você quer alcançar?',regenerateSlideIds:[],slides:[]})};};
  f.setPlan(intent('createText',{title:'Pauta',brief:'Quero criar conteúdo'}));await f.pilot.handleUpdate(message('crie um texto'));await f.pilot.step();assert.match(f.sent.at(-1).text,/Qual produto/);assert.doesNotMatch(f.sent.at(-1).text,/aprovo o texto|Peça.*capa/);
  clarify=false;f.setPlan(intent('reviseText',{text:'Meu produto é um curso e o público é de criadores'}));await f.pilot.handleUpdate(message('É um curso para criadores',2));await f.pilot.step();assert.match(f.sent.at(-1).text,/Aprenda hoje/);assert.equal(f.store.state().projects[0].textApproved,false);
});
test('ordinary-message acceptance persists dedupe and the durable inbox in one transaction',async t=>{
  const f=await fixture(t),change=f.state.change.bind(f.state);f.state.change=async fn=>{const result=await change(fn),c=f.state.snapshot().conversation;if(c.seen.includes('u1'))assert.ok(c.inbox.some(e=>e.updateId==='u1'),'accepted update must already be durably queued');return result;};await f.pilot.handleUpdate(message('crie um texto'));assert.equal(f.state.snapshot().conversation.inbox.length,1);
});
test('ambiguous brand names and negated selection require an explicit affirmative unique choice',async t=>{
  const f=await fixture(t),one=await f.profiles.create('Marca Ana');await f.profiles.create('Marca Ana');f.setPlan(intent('selectProfile',{profileId:one.id}));await f.pilot.handleUpdate(message('use Marca Ana'));await f.pilot.step();assert.equal(f.state.snapshot().conversation.profileId,'principal');assert.match(f.sent.at(-1).text,/ambígu|id/i);
  await f.pilot.handleUpdate(message(`não use ${one.id}`,2));await f.pilot.step();assert.equal(f.state.snapshot().conversation.profileId,'principal');await f.pilot.handleUpdate(message(`use ${one.id}`,3));await f.pilot.step();assert.equal(f.state.snapshot().conversation.profileId,one.id);
});
test('duplicate project titles cannot be resolved by an arbitrary planner-selected id',async t=>{
  const f=await fixture(t),one=await f.store.createProject({title:'Pauta igual',brief:'A'});await f.store.createProject({title:'Pauta igual',brief:'B'});f.setPlan(intent('selectProject',{projectId:one.id}));await f.pilot.handleUpdate(message('use Pauta igual'));await f.pilot.step();assert.equal(f.state.snapshot().conversation.projectId,null);await f.pilot.handleUpdate(message(`use ${one.id}`,2));await f.pilot.step();assert.equal(f.state.snapshot().conversation.projectId,one.id);
});
test('known provider keys and exact configured credentials never enter inbox history or interpreter',async t=>{
  for(const value of ['ak_projectabcdefghijklmno','ck_connectabcdefghijklmn','uak_userabcdefghijklmno','AIzaSyabcdefghijklmnopqrstuvwx','opaque-actual-configured-secret']){
    const f=await fixture(t);f.runtime.dialogs.secrets={getKey:()=> 'opaque-actual-configured-secret'};await f.pilot.handleUpdate(message(value));await f.pilot.step();assert.equal(f.calls.length,0);assert.doesNotMatch(JSON.stringify(f.state.snapshot()),new RegExp(value));assert.match(f.sent.at(-1).text,/computador/);
  }
});

test('story preview sends rendered stories without requiring finished carousel cards',async t=>{
  const f=await fixture(t),p=await f.store.createProject({title:'Stories sem artes do carrossel',brief:'Pauta'});
  await f.store.saveProject({id:p.id,slides:[{id:'one',title:'Texto pronto',body:'Conteúdo'}]});
  await f.store.saveStories(p.id,[{id:'story-one',type:'Gancho',text:'História pronta',sticker:'',cta:''}]);
  await f.store.addStoryImage(p.id,'story-one',png,{art:'simples'});
  await f.state.change(d=>{d.conversation.profileId='principal';d.conversation.projectId=p.id;});
  f.setPlan(intent('preview',{scope:'stories'}));await f.pilot.handleUpdate(message('me envie a prévia dos stories'));await f.pilot.step();
  const delivery=f.sent.find(item=>item.photos);
  assert.equal(delivery?.photos.length,1);assert.deepEqual(delivery.photos[0].bytes,png);
  assert.match(delivery.photos[0].name,/^story-/);assert.match(f.sent.at(-1).text,/Stories enviados/);
  assert.equal(f.store.get(p.id).slides[0].image,undefined);
});

test('story preview refuses an incomplete story set before sending a partial album',async t=>{
  const f=await fixture(t),p=await f.store.createProject({title:'Stories incompletos',brief:'Pauta'});
  await f.store.saveStories(p.id,[{id:'first',type:'Gancho',text:'Um',sticker:'',cta:''},{id:'second',type:'CTA',text:'Dois',sticker:'',cta:''}]);
  await f.store.addStoryImage(p.id,'first',png,{art:'simples'});
  await f.state.change(d=>{d.conversation.profileId='principal';d.conversation.projectId=p.id;});
  f.setPlan(intent('preview',{scope:'stories'}));await f.pilot.handleUpdate(message('me envie os stories'));await f.pilot.step();
  assert.equal(f.sent.some(item=>item.photos),false);assert.match(f.sent.at(-1).text,/stories|Story/i);
});
