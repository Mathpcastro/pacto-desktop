import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Profiles } from '../core/profiles.mjs';
import { Runtime } from '../core/runtime.mjs';
import { loadKnowledge } from '../core/knowledge.mjs';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=','base64');

async function pilotFixture(t){
  const {AutopilotStore}=await import('../core/autopilot-store.mjs');const {Autopilot}=await import('../core/autopilot.mjs');
  const root=await mkdtemp(join(tmpdir(),'carrossell-pilot-flow-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const profiles=await new Profiles(join(root,'lib')).init(),store=await profiles.store();
  await store.saveProfile({brand:'Marca',product:'Curso',audience:'Criadores',brandContext:'Contexto da marca',designKit:'Cores verde e branco'});
  await store.saveIdeaBatch({id:'radar1',source:'radar',ideas:[{id:'idea1',theme:'Primeira pauta',hook:'Aprenda hoje'}]});
  const sent=[];let sequence=1,token='';let posts=0;
  const client={getMe:async()=>({username:'pilot_test_bot'}),getWebhookInfo:async()=>({url:''}),sendText:async(chat,text,extra={})=>{sent.push({chat,text,...extra});return [{message_id:sequence++}];},sendPhotos:async(chat,photos)=>{sent.push({chat,photos:photos.length});return photos.map(()=>({message_id:sequence++}));},answerCallbackQuery:async()=>{},editMessageReplyMarkup:async()=>{}};
  const secrets={getTelegramToken:()=>token,hasTelegramToken:()=>Boolean(token),setTelegramToken:async value=>{token=value;},clearTelegramToken:async()=>{token='';}};
  const runtime=new Runtime({store,profiles,knowledge:loadKnowledge(),dialogs:{render:{png:async()=>png,fonts:{}}},codex:{status:{account:{connected:true}},cancel:async()=>{},run:async({outputSchema})=>{
    if(outputSchema?.properties?.stories)return {text:JSON.stringify({stories:[{type:'Gancho',text:'Veja este ponto',sticker:'',cta:'',visual:''},{type:'CTA',text:'Salve o post',sticker:'',cta:'',visual:''}]})};
    return {text:JSON.stringify({title:'Minha pauta',architecture:'Lista Útil',editorialLine:'',visualConcept:'',coverHooks:[],caption:'Salve para conferir',reply:'Texto pronto',regenerateSlideIds:[],slides:[{id:'one',role:'Capa',title:'Aprenda hoje',body:'Texto',emphasis:'',visual:'',prompt:''},{id:'two',role:'CTA',title:'Salve isto',body:'Confira depois',emphasis:'',visual:'',prompt:''}]})};
  }}});
  runtime.social.pick=ids=>ids.map(id=>({id,username:'marca'}));runtime.social.publish=async id=>{posts++;return store.get(id);};
  const state=await new AutopilotStore(root).init();const pilot=new Autopilot({runtime,state,secrets,clientFactory:()=>client,now:()=>new Date(2026,10,2,12).getTime()});runtime.autopilot=pilot;
  await pilot.connect('123456:synthetic_test_token_for_pilot');const pairing=await pilot.pair();
  await pilot.handleUpdate({message:{text:`/start ${pairing.code}`,chat:{id:42,type:'private'},from:{id:7}}});
  await pilot.saveConfig('principal',{enabled:false,time:'09:00',days:[1,2,3,4,5],style:'texto',cardCount:2,accounts:['ig1']});
  return {pilot,state,runtime,store,profiles,sent,client,posts:()=>posts};
}

const callback=(job,action='post',extra={})=>({callback_query:{id:'callback1',from:{id:7},message:{message_id:job.messageId,chat:{id:42,type:'private'}},data:`p:${job.reviewId}:${action}`,...extra}});

test('opening Telegram after pairing opens only the validated linked bot',async t=>{
  const f=await pilotFixture(t),opened=[];f.runtime.dialogs.openTelegram=async url=>opened.push(url);
  await f.runtime.request('openTelegramPair');
  assert.deepEqual(opened,['https://t.me/pilot_test_bot']);
});

test('opening an unpaired bot retains the valid private pairing link',async t=>{
  const f=await pilotFixture(t),opened=[];f.runtime.dialogs.openTelegram=async url=>opened.push(url);
  await f.state.change(data=>{data.binding=null;});const pairing=await f.pilot.pair();
  await f.runtime.request('openTelegramPair');assert.deepEqual(opened,[pairing.url]);
});

test('Telegram opening rejects expired, absent and malformed destinations without invoking a browser',async t=>{
  const f=await pilotFixture(t),opened=[];f.runtime.dialogs.openTelegram=async url=>opened.push(url);
  await f.state.change(data=>{data.binding.expiresAt=new Date(0).toISOString();});
  await assert.rejects(()=>f.runtime.request('openTelegramPair'),/vincul|código|conversa/i);
  await f.state.change(data=>{delete data.binding.expiresAt;data.bot.username='evil.example/path';});
  await assert.rejects(()=>f.runtime.request('openTelegramPair'),/bot|Telegram/i);
  await f.pilot.disconnect();await assert.rejects(()=>f.runtime.request('openTelegramPair'),/bot|Telegram|vincul|código/i);
  assert.deepEqual(opened,[]);
});

test('pilot generates a real local draft through Runtime and requires a valid private decision before posting',async t=>{
  const f=await pilotFixture(t);await f.pilot.enqueue('principal');await f.pilot.step();
  let job=f.state.snapshot().jobs[0];assert.equal(job.status,'ready');assert.equal(f.posts(),0);assert.ok(f.store.get(job.projectId).stories.length);
  await f.pilot.handleUpdate(callback(job,'post',{from:{id:99}}));await f.pilot.step();assert.equal(f.posts(),0);
  await f.pilot.handleUpdate(callback(job));await f.pilot.handleUpdate(callback(job));await f.pilot.step();
  assert.equal(f.posts(),1);assert.equal(f.state.snapshot().jobs[0].status,'published');
});

test('editing after Telegram preview invalidates approval and cannot publish the changed project',async t=>{
  const f=await pilotFixture(t);await f.pilot.enqueue('principal');await f.pilot.step();const job=f.state.snapshot().jobs[0];
  await f.store.saveProject({id:job.projectId,caption:'Outra legenda'});await f.pilot.handleUpdate(callback(job));await f.pilot.step();
  assert.equal(f.posts(),0);assert.equal(f.state.snapshot().jobs[0].status,'error');
});

test('publication with lost response is uncertain and is never automatically retried',async t=>{
  const f=await pilotFixture(t);let attempts=0;f.runtime.social.publish=async()=>{attempts++;throw new Error('Resposta de rede perdida');};
  await f.pilot.enqueue('principal');await f.pilot.step();const job=f.state.snapshot().jobs[0];await f.pilot.handleUpdate(callback(job));
  await f.pilot.step();await f.pilot.step();assert.equal(attempts,1);assert.equal(f.state.snapshot().jobs[0].status,'uncertain');
  await assert.rejects(f.pilot.retry(job.id),/confira/i);
});

test('manual work has priority and a second profile cannot receive another profile project or approval',async t=>{
  const f=await pilotFixture(t);await f.pilot.enqueue('principal');f.runtime.job={id:'manual'};
  await f.pilot.step();assert.equal(f.state.snapshot().jobs[0].status,'queued');f.runtime.job=null;
  const other=await f.profiles.create('Outra marca');await f.profiles.setActive(other.id);f.runtime.store=await f.profiles.store(other.id);
  await f.pilot.step();const job=f.state.snapshot().jobs[0];assert.equal(job.profileId,'principal');assert.ok(f.store.get(job.projectId));
  assert.equal((await f.profiles.store(other.id)).state().projects.length,0);
});

test('scheduling requires a date and a second explicit confirmation',async t=>{
  const f=await pilotFixture(t);let scheduled=0;f.runtime.social.schedule=async()=>{scheduled++;};
  await f.pilot.enqueue('principal');await f.pilot.step();let job=f.state.snapshot().jobs[0];
  await f.pilot.handleUpdate(callback(job,'schedule'));
  await f.pilot.handleUpdate({message:{text:'2026-11-03 18:00',chat:{id:42,type:'private'},from:{id:7}}});
  job=f.state.snapshot().jobs[0];assert.equal(job.status,'scheduleConfirm');await f.pilot.step();assert.equal(scheduled,0);
  await f.pilot.handleUpdate(callback(job,'confirm'));await f.pilot.step();assert.equal(scheduled,1);assert.equal(f.state.snapshot().jobs[0].status,'scheduled');
});

test('pairing refuses groups and expired codes',async t=>{
  const f=await pilotFixture(t);await f.state.change(data=>{data.binding=null;data.pairing={code:'secret',expiresAt:new Date(0).toISOString()};});
  await f.pilot.handleUpdate({message:{text:'/start secret',chat:{id:51,type:'private'},from:{id:9}}});assert.equal(f.state.snapshot().binding,null);
  await f.state.change(data=>{data.pairing.expiresAt=new Date(2027,0,1).toISOString();});
  await f.pilot.handleUpdate({message:{text:'/start secret',chat:{id:-51,type:'group'},from:{id:9}}});assert.equal(f.state.snapshot().binding,null);
});

test('a draft reserved before interruption is created exactly once with its durable id',async t=>{
  const f=await pilotFixture(t);await f.pilot.enqueue('principal');const job=f.state.snapshot().jobs[0];
  await f.state.change(d=>{Object.assign(d.jobs[0],{projectId:'reserved-project',ideaId:'idea1',idea:{id:'idea1',theme:'Pauta reservada',hook:'Veja como'}});});
  await f.pilot.step();const saved=f.state.snapshot().jobs[0];
  assert.equal(saved.status,'ready');assert.equal(saved.projectId,'reserved-project');assert.equal(f.store.state().projects.length,1);
});

test('editing during durable approval cannot slip changed content into publication',async t=>{
  const f=await pilotFixture(t);await f.pilot.enqueue('principal');await f.pilot.step();const job=f.state.snapshot().jobs[0];await f.pilot.handleUpdate(callback(job));
  const patch=f.pilot.patch.bind(f.pilot);f.pilot.patch=async(id,change)=>{const result=await patch(id,change);if(change.status==='publishing')await f.store.saveProject({id:job.projectId,caption:'Edição concorrente'});return result;};
  await f.pilot.step();assert.equal(f.posts(),0);assert.equal(f.state.snapshot().jobs[0].status,'error');
});

test('Runtime exposes pilot state without credentials and rejects another profile job action',async t=>{
  const f=await pilotFixture(t);const state=await f.runtime.request('telegramStatus');assert.equal(state.autopilot.paired,true);
  assert.doesNotMatch(JSON.stringify(state),/synthetic_test_token/);
  const other=await f.profiles.create('Outra');await f.pilot.enqueue('principal');const job=f.state.snapshot().jobs[0];
  await assert.rejects(f.runtime.request('discardAutopilot',{profileId:other.id,id:job.id}),/perfil/i);
});

test('retry cannot create two active jobs for a profile',async t=>{
  const f=await pilotFixture(t);await f.pilot.enqueue('principal');const old=f.state.snapshot().jobs[0];await f.pilot.patch(old.id,{status:'error'});
  await f.pilot.enqueue('principal');await assert.rejects(f.pilot.retry(old.id),/aguardando/i);
});

test('only one Telegram date conversation is active and its prompt offers cancellation',async t=>{
  const f=await pilotFixture(t);await f.pilot.enqueue('principal');await f.pilot.step();let first=f.state.snapshot().jobs[0];
  await f.pilot.handleUpdate(callback(first,'schedule'));first=f.state.snapshot().jobs[0];
  const prompt=f.sent.at(-1);assert.match(prompt.reply_markup.inline_keyboard[0][0].callback_data,/:cancel$/);
  await f.state.change(d=>{d.jobs.push({...first,id:'other-job',profileId:'principal',status:'ready',reviewId:'b'.repeat(24),messageId:999});});
  const second=f.state.snapshot().jobs[1];await f.pilot.handleUpdate(callback(second,'schedule'));assert.equal(f.state.snapshot().jobs[1].status,'ready');
  await f.pilot.handleUpdate(callback(first,'cancel'));assert.equal(f.state.snapshot().jobs[0].status,'resend');
});

test('failed recurrence registration remains visible and is retried without another generation',async t=>{
  const f=await pilotFixture(t);let attempts=0;f.pilot.scheduler={add:async()=>{if(++attempts===1)throw new Error('Sistema indisponível');}};
  await f.state.change(d=>{d.configs.principal={...d.configs.principal,enabled:true,nextAt:new Date(0).toISOString()};});
  await f.pilot.step();assert.equal(f.state.snapshot().jobs.length,1);assert.match(f.pilot.status('principal').connectionError,/rotina/i);
  f.pilot.now=()=>new Date(2026,10,2,12,2).getTime();await f.pilot.step();
  assert.equal(attempts,2);assert.equal(f.state.snapshot().jobs.length,1);assert.equal(f.pilot.status('principal').config.scheduleError,'');
});

test('cold start retains a due generation until the saved ChatGPT session becomes available',async t=>{
  const f=await pilotFixture(t);const at=new Date(2026,10,2,9).toISOString();
  await f.state.change(d=>{d.configs.principal={...d.configs.principal,enabled:true,nextAt:at};});
  f.runtime.codex.status.account.connected=false;await f.pilot.step();
  assert.equal(f.state.snapshot().configs.principal.nextAt,at);assert.equal(f.state.snapshot().jobs.length,0);
  assert.match(f.pilot.status('principal').connectionError,/ChatGPT/);
  f.runtime.codex.status.account.connected=true;await f.pilot.step();assert.equal(f.state.snapshot().jobs.length,1);assert.equal(f.state.snapshot().jobs[0].status,'ready');
});

test('a scheduled pilot approval becomes invalid if the draft is edited before the scheduled publication',async t=>{
  const f=await pilotFixture(t);await f.pilot.enqueue('principal');await f.pilot.step();const job=f.state.snapshot().jobs[0];
  await f.store.update(job.projectId,{schedule:{status:'scheduled',approvalFingerprint:job.fingerprint}});
  await f.store.saveProject({id:job.projectId,caption:'Texto ainda não aprovado'});
  await assert.rejects(Object.getPrototypeOf(f.runtime.social).publish.call(f.runtime.social,job.projectId,{accounts:['ig1'],fromSchedule:true}),/alterado.*aprova/i);
});

test('removing a profile also removes its pilot wake and invalidates its pending approvals',async t=>{
  const f=await pilotFixture(t),other=await f.profiles.create('Removível');const removed=[];
  f.pilot.scheduler={remove:async id=>removed.push(id)};
  await f.state.change(d=>{d.configs[other.id]={enabled:true};d.jobs.push({id:'pending-delete',profileId:other.id,status:'ready'});});
  await f.runtime.request('deleteProfile',{id:other.id});
  assert.equal(f.state.snapshot().configs[other.id],undefined);assert.equal(f.state.snapshot().jobs[0].status,'discarded');assert.deepEqual(removed,[other.id]);
});

test('deleting a project invalidates its preview and an old callback cannot block later updates',async t=>{
  const f=await pilotFixture(t);await f.pilot.enqueue('principal');await f.pilot.step();const job=f.state.snapshot().jobs[0];
  await f.runtime.request('delete',{id:job.projectId});await f.pilot.handleUpdate(callback(job));
  assert.equal(f.state.snapshot().jobs[0].status,'discarded');assert.equal(f.posts(),0);
  // Também tolera dados removidos fora do fluxo normal, sem lançar pelo callback.
  await f.state.change(d=>{d.jobs[0].status='ready';});await f.pilot.handleUpdate(callback(job));assert.equal(f.state.snapshot().jobs[0].status,'discarded');
});

test('an expired Telegram callback acknowledgement never blocks a saved decision',async t=>{
  const f=await pilotFixture(t);await f.pilot.enqueue('principal');await f.pilot.step();const job=f.state.snapshot().jobs[0];
  f.client.answerCallbackQuery=async()=>{throw Object.assign(new Error('query is too old'),{code:400});};
  await f.pilot.handleUpdate(callback(job,'discard'));
  assert.equal(f.state.snapshot().jobs[0].status,'discarded');
  await f.pilot.handleUpdate(callback(job,'post'));assert.equal(f.posts(),0);
});

test('autopilot persists serialized decisions and recovers an interrupted publication without retrying it',async t=>{
  const {AutopilotStore}=await import('../core/autopilot-store.mjs');
  const root=await mkdtemp(join(tmpdir(),'carrossell-pilot-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const state=await new AutopilotStore(root).init();
  await Promise.all(Array.from({length:10},(_,i)=>state.change(data=>{data.jobs.push({id:`j${i}`,status:i===0?'publishing':'ready',profileId:'principal'});})));
  const recovered=await new AutopilotStore(root).init();
  assert.equal(recovered.snapshot().jobs.length,10);
  assert.equal(recovered.snapshot().jobs[0].status,'uncertain');
  assert.equal(JSON.parse(await readFile(join(root,'autopilot.json'),'utf8')).jobs[0].status,'uncertain');
});

test('pilot configuration accepts the new publishable sizes and rejects unsafe schedule and destinations',async()=>{
  const {validateConfig,nextRun}=await import('../core/autopilot-schedule.mjs');
  const config=validateConfig({enabled:true,time:'09:00',days:[1,2,3,4,5],style:'texto',cardCount:3,accounts:['ig1','ig1']});
  assert.deepEqual(config.accounts,['ig1']);assert.equal(config.cardCount,3);
  assert.throws(()=>validateConfig({...config,cardCount:1}),/2.*10/);
  assert.throws(()=>validateConfig({...config,time:'24:05'}),/horário/i);
  assert.throws(()=>validateConfig({...config,days:[]}),/dia/i);
  assert.throws(()=>validateConfig({...config,accounts:[]}),/conta/i);
  assert.throws(()=>validateConfig({...config,style:'unknown'}),/estilo/i);
  const friday=new Date(2026,10,6,10);const monday=new Date(nextRun(config,friday));
  assert.equal(monday.getDay(),1);assert.equal(monday.getDate(),9);assert.equal(monday.getHours(),9);
});

test('OS pilot tasks have distinct identities and launch their own background flag',async()=>{
  const {PilotScheduler}=await import('../core/autopilot-schedule.mjs');const calls=[],files=[];
  const scheduler=new PilotScheduler({platform:'win32',exe:'C:\\Apps\\Carrossell.exe',args:['--segundo-plano'],run:async(...args)=>calls.push(args),writeFile:async(name,data)=>files.push([name,data]),rm:async()=>{},tempDir:'C:\\Temp'});
  await scheduler.add('principal',new Date(2026,10,3,9));
  assert.match(calls[1][1].join(' '),/Carrossell\\pilot-principal/);
  assert.match(files[0][1].subarray(2).toString('utf16le'),/--piloto-automatico/);
  assert.doesNotMatch(files[0][1].subarray(2).toString('utf16le'),/--publicar-agendados/);
  assert.match(files[0][1].subarray(2).toString('utf16le'),/<ExecutionTimeLimit>PT0S/);
});
