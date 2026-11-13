import { randomBytes, randomUUID } from 'node:crypto';
import { approvalFingerprint as fingerprint } from './approval.mjs';
import { TelegramClient } from './telegram.mjs';
import { DEFAULT_CONFIG, nextRun, validateConfig, upcomingRuns, liveSkips, slotFor } from './autopilot-schedule.mjs';
import { parseWhen } from './schedule.mjs';
import { postable } from './instagram.mjs';
import { validId } from './store.mjs';
import { emptyConversation } from './autopilot-store.mjs';
import { TelegramConversation } from './telegram-conversation.mjs';
import { TelegramSchedule, SCHEDULE_COMMAND } from './telegram-schedule.mjs';
import { translateUi, intlLocale } from './i18n.mjs';

function localizeMarkup(locale, extra){
  const rows=extra?.reply_markup?.inline_keyboard;
  if(!rows)return extra;
  return {...extra,reply_markup:{...extra.reply_markup,inline_keyboard:rows.map(row=>row.map(button=>button?.text?{...button,text:translateUi(locale,button.text)}:button))}};
}

const TERMINAL=new Set(['published','scheduled','discarded','error','uncertain']);
const decisionStates=new Set(['ready','scheduleDate','scheduleConfirm']);
// Uma nova tentativa automática quando a preparação falha (por exemplo, a imagem de um card).
const RETRIES=1,RETRY_MS=2*60000;
// Com vários horários por dia, cabem tantos carrosséis esperando aprovação quanto horários.
const pendingLimit=config=>Math.max(1,(config?.times||[]).length);
const waiting=n=>n===1?'um carrossel aguardando':`${n} carrosséis aguardando`;
const CHATGPT_GRACE_MS=3*60000;
const WAIT_CHATGPT='Aguardando a conexão da conta ChatGPT para gerar. Abra o app se precisar conectar novamente.';
const BOT_ELSEWHERE='Este bot do Telegram está sendo usado em outro computador ou programa. Deixe o bot só neste Carrossell (desconecte no outro) para receber as prévias e os botões aqui.';
const hourOf=at=>{const d=new Date(at);return Number.isNaN(d.getTime())?'':`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
const messageError=error=>String(error?.message||'Não foi possível concluir a operação.').replace(/https?:\/\/\S+/g,'[endereço omitido]').replace(/\b\d{5,}:[A-Za-z0-9_-]+/g,'[token omitido]').slice(0,600);
const sleep=(ms,signal)=>new Promise(resolve=>{if(signal?.aborted)return resolve();const done=()=>{clearTimeout(timer);signal?.removeEventListener('abort',done);resolve();};const timer=setTimeout(done,ms);timer.unref?.();signal?.addEventListener('abort',done,{once:true});});

const identities=accounts=>Object.fromEntries((accounts||[]).map(a=>[a.id,{igUserId:a.igUserId||'',username:a.username||''}]));

// Coordena somente efeitos explicitamente habilitados no app. Uma decisão durável
// sempre precede publicar; uma resposta incerta nunca vira tentativa automática.
export class Autopilot {
  constructor({runtime,state,secrets,scheduler=null,clientFactory=token=>new TelegramClient({token}),now=()=>Date.now()}){
    Object.assign(this,{rt:runtime,state,secrets,scheduler,clientFactory,now});this.client=null;this.processing=null;this.controller=null;this.connectionError='';this.schedules=new TelegramSchedule(this);this.conversation=new TelegramConversation(this);
  }
  clientForToken(){const token=this.secrets.getTelegramToken?.();if(!token)throw new Error('Conecte o bot do Telegram.');const client=this.client??=this.clientFactory(token);if(!client.localized){const sendText=client.sendText.bind(client),answer=client.answerCallbackQuery.bind(client),locale=()=>this.rt.locale();client.sendText=(chat,text,extra)=>sendText(chat,translateUi(locale(),text),localizeMarkup(locale(),extra));client.answerCallbackQuery=(id,text)=>answer(id,translateUi(locale(),text));client.localized=true;}return client;}
  bindingActive(){const binding=this.state.snapshot().binding;return !!binding&&(!binding.expiresAt||new Date(binding.expiresAt)>this.now());}
  status(profileId){
    const data=this.state.snapshot();return {hasToken:Boolean(this.secrets.getTelegramToken?.()),bot:data.bot,paired:Boolean(data.binding),pairing:data.pairing&&new Date(data.pairing.expiresAt)>this.now()?{...data.pairing,url:`https://t.me/${data.bot.username}?start=${data.pairing.code}`}:null,connectionError:this.connectionError,routineError:data.configs[profileId]?.scheduleError||data.configs[profileId]?.runError||'',
      config:this.shownConfig(data.configs[profileId]),upcoming:this.upcoming(data.configs[profileId]),jobs:data.jobs.filter(j=>j.profileId===profileId).slice(-12).reverse().map(({id,projectId,status,title,error,createdAt})=>({id,projectId,status,title,error,createdAt}))};
  }
  shownConfig(saved){
    if(!saved)return {...DEFAULT_CONFIG};
    try{const v=validateConfig(saved);return {...DEFAULT_CONFIG,...saved,time:v.time,times:v.times,slots:v.slots,style:v.style,cardCount:v.cardCount};}
    catch{return {...DEFAULT_CONFIG,...saved};}
  }
  upcoming(config){if(!config)return [];try{return upcomingRuns(validateConfig(config),new Date(this.now()),8);}catch{return [];}}
  keepAlive(){const data=this.state.snapshot();return Boolean(this.secrets.getTelegramToken?.()&&(data.pairing&&new Date(data.pairing.expiresAt)>this.now()||data.binding&&(!data.binding.expiresAt||new Date(data.binding.expiresAt)>this.now())));}
  async changed(profileId){
    if(profileId&&!this.rt.profileList().some(p=>p.id===profileId))profileId=undefined;
    await this.rt.inProfile(profileId,()=>this.rt.emit({type:'state',state:this.rt.state()}));
  }
  async patch(id,patch){await this.state.change(data=>{const job=data.jobs.find(j=>j.id===id);if(!job)throw new Error('Trabalho do piloto não encontrado.');Object.assign(job,patch);});const job=this.state.snapshot().jobs.find(j=>j.id===id);await this.changed(job.profileId);return job;}
  async connect(token){
    if(this.processing)throw new Error('Aguarde o trabalho do piloto terminar.');
    if(typeof token!=='string'||!/^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(token.trim())||token.length>300)throw new Error('Copie o token completo do BotFather.');
    const client=this.clientFactory(token.trim()),bot=await client.getMe(),webhook=await client.getWebhookInfo();
    if(webhook?.url)throw new Error('Este bot já usa um webhook em outro serviço. Use um bot exclusivo para o Carrossell.');
    if(!/^[a-zA-Z0-9_]{5,64}$/.test(bot.username||''))throw new Error('O Telegram não devolveu o nome do bot.');
    this.controller?.abort();this.controller=null;
    await this.secrets.setTelegramToken(token.trim());this.client=client;this.connectionError='';
    await this.state.change(data=>{data.bot={username:bot.username};data.binding=null;data.pairing=null;data.offset=0;data.conversation=emptyConversation();for(const config of Object.values(data.configs))config.enabled=false;for(const job of data.jobs)if(!TERMINAL.has(job.status))job.status='discarded';});
    await this.rearm();await this.changed();if(this.started)this.start();return this.status(this.rt.profileId());
  }
  async disconnect(){
    if(this.processing)throw new Error('Aguarde o trabalho do piloto terminar.');
    this.controller?.abort();this.controller=null;await this.secrets.clearTelegramToken();this.client=null;
    await this.state.change(data=>{data.bot=null;data.binding=null;data.pairing=null;data.offset=0;data.conversation=emptyConversation();for(const config of Object.values(data.configs))config.enabled=false;for(const job of data.jobs)if(!TERMINAL.has(job.status))job.status='discarded';});
    this.connectionError='';await this.rearm();await this.changed();if(this.started)this.start();
  }
  async pair(){
    this.clientForToken();if(this.state.snapshot().binding)throw new Error('Este bot já está vinculado. Desconecte antes de trocar a conversa.');
    const pairing={code:randomBytes(16).toString('hex'),expiresAt:new Date(this.now()+10*60000).toISOString()};
    await this.state.change(data=>{data.pairing=pairing;});await this.changed();return {...pairing,url:`https://t.me/${this.state.snapshot().bot.username}?start=${pairing.code}`};
  }
  async saveConfig(profileId,input){
    validId(profileId);this.rt.profiles?.find(profileId);
    // A tela não envia os pulos; eles continuam valendo enquanto o horário existir.
    const before=this.state.snapshot().configs[profileId];
    const config=validateConfig(input&&typeof input==='object'&&input.skips===undefined?{...input,skips:before?.skips||[]}:input);
    config.skips=liveSkips(config.skips,new Date(this.now()));
    let accountUsers=before?.accountUsers||{};
    if(config.enabled){if(!this.state.snapshot().binding)throw new Error('Vincule sua conversa do Telegram primeiro.');this.clientForToken();}
    // Guarda quem é cada conta no Instagram para reencontrá-la se a conexão do Composio for refeita.
    try{accountUsers=identities(await this.rt.inProfile(profileId,()=>this.rt.social.pick(config.accounts)));}catch(error){if(config.enabled)throw error;}
    const next={...config,accountUsers,nextAt:config.enabled?nextRun(config,new Date(this.now())):null};
    // Configuração persistida antes do registro no SO; uma tarefa órfã não gera se disabled.
    await this.state.change(data=>{data.configs[profileId]=next;});
    try{if(this.scheduler){if(config.enabled)await this.scheduler.add(profileId,new Date(next.nextAt));else await this.scheduler.remove(profileId).catch(()=>{});}}
    catch(error){await this.state.change(data=>{data.configs[profileId].enabled=false;data.configs[profileId].nextAt=null;});await this.changed(profileId);throw new Error(`Não foi possível ativar a rotina no sistema: ${messageError(error)}`);}
    await this.changed(profileId);return next;
  }
  // Pula (ou volta a preparar) uma ocorrência da rotina sem mudar os horários.
  async skipRun(profileId,at,skip=true){
    validId(profileId);const config=this.state.snapshot().configs[profileId];if(!config)throw new Error('Salve a rotina antes.');
    const iso=new Date(typeof at==='string'?at:NaN);if(Number.isNaN(iso.getTime()))throw new Error('Horário inválido.');
    const key=iso.toISOString();
    if(skip&&!upcomingRuns(validateConfig(config),new Date(this.now()),30).some(run=>run.at===key))throw new Error('Este horário não está entre os próximos da rotina.');
    const skips=liveSkips(config.skips||[],new Date(this.now())).filter(a=>a!==key);if(skip)skips.push(key);
    return this.saveConfig(profileId,{...config,skips});
  }
  async rearm(){
    if(!this.scheduler)return;const configs=this.state.snapshot().configs;
    for(const [id,config]of Object.entries(configs)){
      if(config.enabled&&config.nextAt)await this.arm(id,config.nextAt);else await this.scheduler.remove(id).catch(()=>{});
    }
  }
  async arm(profileId,nextAt){
    if(!this.scheduler)return;
    try{await this.scheduler.add(profileId,new Date(nextAt));await this.state.change(d=>{const c=d.configs[profileId];if(c){c.scheduleError='';c.rearmAt=null;}});}
    catch{await this.state.change(d=>{const c=d.configs[profileId];if(c){c.scheduleError='A próxima rotina não foi registrada no sistema. O app tentará novamente; mantenha-o aberto ou salve a rotina de novo.';c.rearmAt=new Date(this.now()+60000).toISOString();}});}
    await this.changed(profileId);
  }
  // "at" é a ocorrência da rotina (ou o horário escolhido): define o tipo de carrossel daquele horário.
  async enqueue(profileId,at=null){
    validId(profileId);this.clientForToken();if(!this.state.snapshot().binding)throw new Error('Vincule sua conversa do Telegram.');
    const raw=this.state.snapshot().configs[profileId],saved=validateConfig(raw||DEFAULT_CONFIG);
    const healed=this.healAccounts(saved.accounts,raw?.accountUsers);
    if(healed){
      saved.accounts=healed.ids;await this.state.change(d=>{const c=d.configs[profileId];if(c){c.accounts=healed.ids;c.accountUsers=identities(healed.accounts);}});
      await this.notifyRoutine(profileId,`A conta ${healed.accounts.map(a=>`@${a.username}`).join(', ')} foi conectada de novo no Composio. A rotina passou a usar a conexão nova.`);
    }
    const slot=slotFor(saved,at||saved.nextAt||this.state.snapshot().configs[profileId]?.nextAt);
    const config={...saved,style:slot.style,cardCount:slot.cardCount,architectureId:slot.architectureId||'',slot:slot.time};
    if(!config.accounts.length)throw new Error('Escolha as contas do Instagram e salve a rotina.');
    await this.rt.inProfile(profileId,()=>{this.rt.ensureConnected();this.rt.social.pick(config.accounts);if(!this.rt.store.state().profile?.brandContext?.trim())throw new Error('Conclua o Contexto da Marca antes de gerar.');});
    const job={id:randomUUID(),profileId,config,accounts:config.accounts,status:'queued',createdAt:new Date(this.now()).toISOString(),error:'',title:'Próxima pauta do Radar'};
    await this.state.change(data=>{const open=data.jobs.filter(j=>j.profileId===profileId&&!TERMINAL.has(j.status));if(open.length>=pendingLimit(config))throw new Error(`Este perfil já tem ${waiting(open.length)}: ${open.map(j=>`“${j.title}”`).join(', ')}. Aprove ou descarte no Telegram ou no app (Piloto automático › Para revisar) para a rotina voltar a preparar.`);data.jobs.push(job);});await this.changed(profileId);return job;
  }
  async call(action,args={}){
    const result=await this.rt.request(action,args),token=this.rt.job;if(token?.done)await token.done;
    if(args.id){const p=this.rt.store.get(args.id);if(p.status==='error'||p.error)throw new Error(p.error||'A geração não terminou.');}
    return result;
  }
  async generate(job){
    await this.rt.inProfile(job.profileId,async()=>{
      await this.patch(job.id,{status:'generating',error:''});let project;
      if(job.projectId)project=this.rt.store.state().projects.find(p=>p.id===job.projectId);
      if(!project){
        let ideas=this.rt.store.ideaBatches().filter(b=>b.source==='radar').flatMap(b=>b.ideas||[]);
        const used=new Set(this.state.snapshot().jobs.filter(j=>j.profileId===job.profileId).map(j=>j.ideaId));
        let idea=job.idea||ideas.find(i=>!used.has(i.id));
        if(!idea){await this.call('radar');ideas=this.rt.store.ideaBatches().filter(b=>b.source==='radar').flatMap(b=>b.ideas||[]);idea=ideas.find(i=>!used.has(i.id));}
        if(!idea)throw new Error('O Radar não trouxe uma pauta disponível.');
        // Reserva o id antes de criar para retomar sem duplicar após um encerramento.
        const projectId=job.projectId||randomUUID();await this.patch(job.id,{ideaId:idea.id,idea,projectId,title:idea.theme||idea.hook});
        project=await this.rt.store.createProject({title:idea.theme||idea.hook,brief:[idea.theme,idea.hook,idea.why,idea.deliverable,idea.connection].filter(Boolean).join('\n'),style:job.config.style,cardCount:job.config.cardCount,architectureId:job.config.architectureId||''},{reservedId:projectId});
        this.rt.publish(project);
      }
      const id=project.id;
      if(project.error)project=await this.rt.update(id,{error:null,status:project.slides.length?'ready':'draft'});
      if(!project.slides.length){await this.call('generatePlan',{id});project=this.rt.store.get(id);}
      if(project.slides.length!==job.config.cardCount)throw new Error(`O texto veio com ${project.slides.length} cards. O piloto pediu ${job.config.cardCount}. Ajuste no Estúdio antes de retomar.`);
      if(!project.textApproved)await this.call('approveText',{id});
      project=this.rt.store.get(id);
      if(!project.slides[0]?.image){if(!project.coverOptions?.length)await this.call('generateCovers',{id,count:1});const cover=this.rt.store.get(id).coverOptions[0];if(!cover)throw new Error('A capa não ficou pronta.');await this.call('chooseCover',{id,optionId:cover.id});}
      project=this.rt.store.get(id);
      if(project.slides.some(s=>!s.image||s.state!=='complete'))await this.call('generateSlides',{id});
      project=this.rt.store.get(id);if(!project.stories?.length)await this.call('stories',{id});
      else if(project.stories.some(s=>!s.image))await this.call('storyTheme',{id,theme:project.storyTheme||'preto'});
      await this.preview(job.id);
    });
  }
  async preview(id){
    const job=this.state.snapshot().jobs.find(j=>j.id===id),p=this.rt.store.get(job.projectId);postable(p);
    const binding=this.state.snapshot().binding;if(!binding)throw new Error('O Telegram foi desconectado.');
    const reviewId=randomBytes(12).toString('hex'),hash=fingerprint(p);await this.patch(id,{status:'sending',reviewId,messageId:null,fingerprint:hash});
    const client=this.clientForToken(),name=this.rt.store.state().profile?.brand||'Sua marca';
    await client.sendText(binding.chatId,`${name} · ${p.title}\nPrévia do carrossel. Confira os cards e a legenda antes de aprovar.`);
    const files=await this.rt.exportedFiles(p.id),photos=Object.entries(files).filter(([name])=>/^\d+\.png$/.test(name)).map(([name,bytes])=>({name,bytes}));
    if(photos.length!==p.slides.length)throw new Error('Não foi possível preparar todos os cards.');
    await client.sendPhotos(binding.chatId,await this.telegramPhotos(photos));await client.sendText(binding.chatId,`Legenda:\n${p.caption||'(sem legenda)'}`);
    const stories=Object.entries(files).filter(([name])=>name.startsWith('stories/')&&name.endsWith('.png')).map(([name,bytes])=>({name,bytes}));
    if(stories.length){await client.sendText(binding.chatId,'Stories de apoio · para postar manualmente:');await client.sendPhotos(binding.chatId,await this.telegramPhotos(stories));}
    const accounts=this.rt.social.pick(job.accounts).map(a=>`@${a.username}`).join(', ');
    // Rotina sem revisão: a prévia fica no Telegram como registro e o carrossel segue direto para publicar.
    if(job.config?.approval==='auto'&&job.origin!=='conversation'){
      await client.sendText(binding.chatId,`Marca: ${name}\nContas: ${accounts}\nRotina sem revisão: publicando agora. Para revisar antes, mude em Piloto automático › Configurar rotina.`);
      await this.patch(id,{status:'approved',messageId:null,title:p.title,error:'',auto:true});return;
    }
    const messages=await client.sendText(binding.chatId,`Marca: ${name}\nContas: ${accounts}\nO que fazer com este carrossel? Você também pode aprovar no app.`,{reply_markup:{inline_keyboard:[[{text:'Postar agora',callback_data:`p:${reviewId}:post`},{text:'Agendar',callback_data:`p:${reviewId}:schedule`}],[{text:'Refazer',callback_data:`p:${reviewId}:redo`},{text:'Descartar',callback_data:`p:${reviewId}:discard`}]]}});
    await this.patch(id,{status:'ready',messageId:messages.at(-1).message_id,title:p.title,error:''});
  }
  // Fotos para o Telegram em JPEG. O Telegram recomprime as fotos de todo jeito, e o PNG de cada card
  // (cerca de 1,4 MB) fazia o álbum da prévia passar do tempo de envio em conexões lentas.
  async telegramPhotos(photos){
    const toJpeg=this.rt.dialogs?.toPreviewJpeg;if(!toJpeg||!photos.length)return photos;
    const jpegs=await toJpeg(photos.map(photo=>photo.bytes));
    return photos.map((photo,index)=>({name:photo.name.replace(/\.png$/i,'.jpg'),bytes:jpegs[index]}));
  }
  // Reconectar a conta no Composio cria outra conexão, com outro id, e a rotina guardava o antigo:
  // todo horário falhava com "Conta do Instagram não encontrada". Reencontra a mesma conta pelo id
  // do Instagram, pelo @ ou, se só há uma conta conectada, por ela. Devolve null se nada mudou.
  healAccounts(ids,known={}){
    const usable=this.rt.social.usable?.()||[];if(!usable.length||!ids.length)return null;
    const accounts=[];let changed=false;
    for(const id of ids){
      const same=usable.find(a=>a.id===id);if(same){accounts.push(same);continue;}
      const was=known?.[id]||{};
      const match=usable.find(a=>was.igUserId&&a.igUserId===was.igUserId)||usable.find(a=>was.username&&a.username===was.username)||(usable.length===1&&ids.length===1?usable[0]:null);
      if(!match)return null;accounts.push(match);changed=true;
    }
    const unique=[...new Map(accounts.map(a=>[a.id,a])).values()];
    return changed?{ids:unique.map(a=>a.id),accounts:unique}:null;
  }
  // Um horário da rotina que não começa sempre avisa no Telegram; antes o motivo ficava só no app.
  async notifyRoutine(profileId,text){
    const binding=this.state.snapshot().binding;if(!binding)return;
    const brand=await this.rt.inProfile(profileId,()=>this.rt.store.state().profile?.brand||'Sua marca').catch(()=>'Sua marca');
    await this.clientForToken().sendText(binding.chatId,`${brand} · ${text}`).catch(()=>{});
  }
  async reviewProject(profileId,projectId,accounts){
    validId(profileId);validId(projectId);if(!this.state.snapshot().binding)throw new Error('Vincule sua conversa do Telegram.');
    return this.rt.inProfile(profileId,async()=>{
      this.rt.social.pick(accounts);const project=this.rt.store.get(projectId);postable(project);
      const job={id:randomUUID(),profileId,projectId,accounts:[...new Set(accounts)],status:'resend',createdAt:new Date(this.now()).toISOString(),title:project.title,error:'',origin:'conversation'};
      await this.state.change(data=>{for(const old of data.jobs)if(old.profileId===profileId&&old.projectId===projectId&&decisionStates.has(old.status))old.status='discarded';data.jobs.push(job);});
      await this.preview(job.id);return job;
    });
  }
  async ack(id,message){await this.clientForToken().answerCallbackQuery(id,message).catch(()=>{});}
  async handleUpdate(update){
    const data=this.state.snapshot(),message=update.message,query=update.callback_query,client=this.clientForToken();
    if(message?.chat?.type==='private'&&message.from?.id){
      const code=/^\/start(?:@\w+)?\s+([a-f0-9]+)$/.exec(message.text||'')?.[1];
      if(!data.binding&&code&&data.pairing?.code===code&&new Date(data.pairing.expiresAt)>this.now()){
        let paired=false;await this.state.change(next=>{if(!next.binding&&next.pairing?.code===code&&new Date(next.pairing.expiresAt)>this.now()){next.binding={chatId:message.chat.id,userId:message.from.id};next.pairing=null;paired=true;}});
        if(paired){await this.changed();await client.sendText(message.chat.id,'Telegram conectado ao Carrossell. Configure a rotina no computador; toda publicação espera sua aprovação.');}return;
      }
      if(this.bindingActive()&&data.binding?.chatId===message.chat.id&&data.binding.userId===message.from.id){
        if(SCHEDULE_COMMAND.test(message.text||'')){await this.schedules.list().catch(error=>client.sendText(message.chat.id,messageError(error)));return;}
        if(await this.schedules.handleMessage(message))return;
        const job=[...data.jobs].reverse().find(j=>j.status==='scheduleDate');if(!job||/^\/(?:ajuda|status|marcas|projetos|cancelar|parar)(?:@\w+)?(?:\s|$)/i.test(message.text||'')){
          if(job&&/^\/(?:cancelar|parar)(?:@\w+)?(?:\s|$)/i.test(message.text||''))await this.patch(job.id,{status:'resend',at:null});
          await this.conversation.handle(update);return;
        }
        try{
          const at=parseWhen(message.text,new Date(this.now())).toISOString();
          const title=await this.rt.inProfile(job.profileId,()=>this.rt.store.state().profile?.brand||'Sua marca');
          const messages=await client.sendText(message.chat.id,`${title} · ${job.title}\nAgendar para ${new Date(at).toLocaleString(intlLocale(this.rt.locale()))} (horário do computador)?\nContas: ${job.accounts.join(', ')}`,{reply_markup:{inline_keyboard:[[{text:'Confirmar agendamento',callback_data:`p:${job.reviewId}:confirm`}],[{text:'Cancelar',callback_data:`p:${job.reviewId}:cancel`}]]}});
          await this.patch(job.id,{status:'scheduleConfirm',at,messageId:messages.at(-1).message_id});
        }catch(error){await client.sendText(message.chat.id,`${messageError(error)}\nEnvie a data como 2026-11-03 18:00, no horário do computador.`);}return;
      }
    }
    if(!query)return;
    if(!this.bindingActive()||!data.binding||query.from?.id!==data.binding.userId||query.message?.chat?.id!==data.binding.chatId||query.message.chat.type!=='private'){await this.ack(query.id,'Esta conversa não está vinculada ao seu Carrossell.');return;}
    if(String(query.data||'').startsWith('s:')){await this.schedules.handleQuery(query);return;}
    const match=/^p:([a-f0-9]{24}):(post|schedule|redo|discard|confirm|cancel)$/.exec(query.data||'');
    const job=match&&data.jobs.find(j=>j.reviewId===match[1]&&j.messageId===query.message.message_id&&decisionStates.has(j.status));
    if(!job){await this.ack(query.id,'Esta prévia já foi respondida ou substituída.');return;}
    let current;
    try{current=await this.rt.inProfile(job.profileId,()=>this.rt.store.get(job.projectId));}
    catch{await this.patch(job.id,{status:'discarded',error:'O projeto ou perfil desta prévia foi removido.'});await this.ack(query.id,'Este projeto não está mais disponível no Carrossell.');return;}
    if(fingerprint(current)!==job.fingerprint){await this.patch(job.id,{status:'error',error:'O projeto mudou depois da prévia. Retome para enviar uma nova revisão antes de aprovar.'});await this.ack(query.id,'O projeto mudou. Envie uma nova prévia pelo app.');return;}
    const action=match[2];let status;
    if(action==='post'&&job.status==='ready')status='approved';
    if(action==='schedule'&&['ready','scheduleDate'].includes(job.status))status='scheduleDate';
    if(action==='confirm'&&job.status==='scheduleConfirm')status='approvedSchedule';
    if(action==='cancel'&&['scheduleDate','scheduleConfirm'].includes(job.status))status='resend';
    if(action==='redo'&&job.status==='ready')status='redo';
    if(action==='discard')status='discarded';
    if(!status){await this.ack(query.id,'Use os botões da mensagem mais recente.');return;}
    let accepted=false;
    await this.state.change(next=>{const saved=next.jobs.find(j=>j.id===job.id);if(status==='scheduleDate'&&next.jobs.some(j=>j.id!==job.id&&['scheduleDate','scheduleConfirm'].includes(j.status)))return;if(saved?.status===job.status&&saved.messageId===job.messageId){saved.status=status;accepted=true;}});
    await this.ack(query.id,accepted?'Recebido. O Carrossell vai processar sua escolha.':'Conclua a escolha pendente antes de iniciar outra.');
    if(!accepted)return;await this.changed(job.profileId);await client.editMessageReplyMarkup(data.binding.chatId,job.messageId).catch(()=>{});
    if(status==='scheduleDate'){
      const messages=await client.sendText(data.binding.chatId,`Envie a data e hora para “${job.title}”, como 2026-11-03 18:00. Use o horário do computador. A próxima mensagem pedirá confirmação.`,{reply_markup:{inline_keyboard:[[{text:'Cancelar',callback_data:`p:${job.reviewId}:cancel`}]]}});
      await this.patch(job.id,{messageId:messages.at(-1).message_id});
    }
  }
  async retry(id){
    const job=this.state.snapshot().jobs.find(j=>j.id===validId(id));if(!job)throw new Error('Trabalho não encontrado.');
    if(job.status==='uncertain')throw new Error('Confira o Instagram e os agendamentos no app antes de qualquer nova tentativa.');
    if(job.status!=='error')throw new Error('Só é possível retomar um trabalho com erro.');
    await this.state.change(data=>{const saved=data.jobs.find(j=>j.id===id);if(saved.status!=='error')throw new Error('Este trabalho já foi retomado.');const open=data.jobs.filter(j=>j.id!==id&&j.profileId===saved.profileId&&!TERMINAL.has(j.status)).length;if(open>=pendingLimit(data.configs[saved.profileId]))throw new Error(`Este perfil já tem ${waiting(open)}.`);Object.assign(saved,{status:'queued',error:'',reviewId:null,messageId:null});});await this.changed(job.profileId);
  }
  // Aprovação pelo app: publicar agora ou agendar a prévia que está esperando no Telegram.
  async approve(id,at=null){
    const job=this.state.snapshot().jobs.find(j=>j.id===validId(id));
    if(!job||job.status!=='ready')throw new Error('Esta prévia já foi respondida ou ainda não está pronta.');
    const current=await this.rt.inProfile(job.profileId,()=>this.rt.store.get(job.projectId));
    if(fingerprint(current)!==job.fingerprint)throw new Error('O projeto mudou depois da prévia. Descarte e gere outra, ou revise no Estúdio.');
    let when=null;if(at!==null&&at!==undefined&&at!==''){when=parseWhen(String(at),new Date(this.now())).toISOString();}
    let accepted=false;
    await this.state.change(data=>{const saved=data.jobs.find(j=>j.id===id);if(saved?.status==='ready'&&saved.messageId===job.messageId){Object.assign(saved,when?{status:'approvedSchedule',at:when}:{status:'approved'});saved.approvedIn='app';accepted=true;}});
    if(!accepted)throw new Error('Esta prévia acabou de ser respondida no Telegram.');
    await this.changed(job.profileId);
    const binding=this.state.snapshot().binding;
    if(binding){
      const client=this.clientForToken();
      if(job.messageId)await client.editMessageReplyMarkup(binding.chatId,job.messageId).catch(()=>{});
      await client.sendText(binding.chatId,`${job.title}: aprovado no app. ${when?`Agendando para ${new Date(when).toLocaleString(intlLocale(this.rt.locale()))}.`:'Publicando agora.'}`).catch(()=>{});
    }
    return this.state.snapshot().jobs.find(j=>j.id===id);
  }
  async discard(id){
    const job=this.state.snapshot().jobs.find(j=>j.id===validId(id));if(!job||!['ready','error','queued','scheduleDate','scheduleConfirm'].includes(job.status))throw new Error('Este trabalho não pode ser descartado agora.');
    await this.patch(id,{status:'discarded'});
  }
  async removeProfile(profileId){
    await this.state.change(data=>{delete data.configs[profileId];for(const job of data.jobs)if(job.profileId===profileId&&!TERMINAL.has(job.status))job.status='discarded';const c=data.conversation;for(const entry of c.inbox)if(entry.profileId===profileId&&['queued','running'].includes(entry.status))entry.status='discarded';if(c.profileId===profileId){c.profileId=null;c.projectId=null;c.history=[];c.needsProfileSelection=true;}});
    await this.scheduler?.remove(profileId).catch(()=>{});
  }
  async removeProject(profileId,projectId){
    await this.state.change(data=>{for(const job of data.jobs)if(job.profileId===profileId&&job.projectId===projectId&&!TERMINAL.has(job.status))job.status='discarded';if(data.conversation.profileId===profileId&&data.conversation.projectId===projectId)data.conversation.projectId=null;});
  }
  async step(){
    if(this.processing||this.rt.job||this.rt.resizing||!this.secrets.getTelegramToken?.())return;
    this.processing=this.work();try{await this.processing;}finally{this.processing=null;}
  }
  async work(){
    const initial=this.state.snapshot();
    if(!this.bindingActive()){await this.conversation.step();return;}
    // A saved publication decision takes precedence over a later chat edit. Due
    // routines also get their turn; long inference never runs in the poll loop.
    const pending=initial.jobs.some(j=>['queued','approved','approvedSchedule','redo','resend'].includes(j.status))||Object.values(initial.configs).some(c=>c.enabled&&((c.nextAt&&new Date(c.nextAt)<=this.now())||(c.rearmAt&&new Date(c.rearmAt)<=this.now())));
    if(!pending&&await this.conversation.step())return;
    for(const [profileId,config]of Object.entries(initial.configs))if(config.enabled&&config.rearmAt&&new Date(config.rearmAt)<=this.now())await this.arm(profileId,config.nextAt);
    for(const [profileId,config]of Object.entries(initial.configs))if(config.enabled&&config.nextAt&&new Date(config.nextAt)<=this.now()){
      // No cold start o login persistido é carregado assincronamente. Não gastar
      // a ocorrência antes de a sessão estar disponível ou um trabalho ser criado.
      if(!this.rt.codex.status.account.connected){
        if(config.runError!==WAIT_CHATGPT){await this.state.change(d=>{d.configs[profileId].runError=WAIT_CHATGPT;});await this.changed(profileId);}
        // Ao abrir pela tarefa do sistema a sessão leva alguns segundos para carregar: só avisa no
        // Telegram se a espera passar de 3 minutos, uma vez por espera.
        const wait=(this.waitingChatgpt??={})[profileId]??={since:this.now(),notified:false};
        if(!wait.notified&&this.now()-wait.since>=CHATGPT_GRACE_MS){wait.notified=true;await this.notifyRoutine(profileId,`A rotina das ${hourOf(config.nextAt)} está esperando a conta ChatGPT. Abra o Carrossell no computador e confira a conexão com o ChatGPT. O carrossel é preparado assim que ela voltar.`);}
        continue;
      }
      delete this.waitingChatgpt?.[profileId];
      const dueAt=config.nextAt,nextAt=nextRun(validateConfig(config),new Date(this.now()));await this.state.change(d=>{const c=d.configs[profileId];c.nextAt=nextAt;c.skips=liveSkips(c.skips||[],new Date(this.now()));});
      try{await this.enqueue(profileId,dueAt);await this.state.change(d=>{d.configs[profileId].runError='';});}
      catch(error){
        const reason=messageError(error);await this.state.change(d=>{d.configs[profileId].runError=reason;});await this.changed(profileId);
        await this.notifyRoutine(profileId,`O carrossel das ${hourOf(dueAt)} não foi preparado. ${reason}\nA rotina continua ativa nos próximos horários.`);
      }
      await this.arm(profileId,nextAt);
    }
    const jobs=this.state.snapshot().jobs,due=j=>!j.retryAt||new Date(j.retryAt)<=this.now(),job=jobs.find(j=>['approved','approvedSchedule'].includes(j.status))||jobs.find(j=>['queued','redo','resend'].includes(j.status)&&due(j));if(!job){await this.conversation.step();return;}
    try{
      await this.rt.inProfile(job.profileId,async()=>{
        if(!this.bindingActive())throw new Error('O vínculo do Telegram expirou. Reconecte e envie uma nova prévia.');
        if(job.status==='queued'){await this.generate(job);return;}
        if(job.status==='redo'){
          // Novo projeto preserva o rascunho anterior e jamais reaproveita a aprovação.
          await this.patch(job.id,{status:'queued',projectId:null,reviewId:null,messageId:null});await this.generate({...job,projectId:null});return;
        }
        if(job.status==='resend'){await this.preview(job.id);return;}
        const p=this.rt.store.get(job.projectId);if(fingerprint(p)!==job.fingerprint)throw new Error('O projeto mudou depois da aprovação. Retome para receber outra prévia.');
        if(job.status==='approved'){
          await this.patch(job.id,{status:'publishing'});
          if(!this.bindingActive())throw new Error('O vínculo do Telegram expirou. Envie uma nova prévia depois de reconectar.');
          if(fingerprint(this.rt.store.get(job.projectId))!==job.fingerprint)throw new Error('O projeto mudou depois da aprovação. Envie outra prévia.');
          try{await this.rt.social.publish(job.projectId,{accounts:job.accounts});await this.patch(job.id,{status:'published',error:''});}
          catch(error){await this.patch(job.id,{status:'uncertain',error:`Confira o Instagram antes de tentar novamente. ${messageError(error)}`});}
        }else{
          await this.patch(job.id,{status:'scheduling'});
          if(!this.bindingActive())throw new Error('O vínculo do Telegram expirou. Envie uma nova prévia depois de reconectar.');
          if(fingerprint(this.rt.store.get(job.projectId))!==job.fingerprint)throw new Error('O projeto mudou depois da aprovação. Envie outra prévia.');
          try{await this.rt.social.schedule(job.projectId,job.at,job.accounts,{approvalFingerprint:job.fingerprint});await this.patch(job.id,{status:'scheduled',error:''});}
          catch(error){await this.patch(job.id,{status:'uncertain',error:`Confira os agendamentos no app. ${messageError(error)}`});}
        }
        const final=this.state.snapshot().jobs.find(j=>j.id===job.id),binding=this.state.snapshot().binding;
        await this.clientForToken().sendText(binding.chatId,`${job.title}: ${final.status==='published'?'publicado nas contas escolhidas.':final.status==='scheduled'?'agendamento confirmado.':final.error}`);
      });
    }catch(error){
      const current=this.state.snapshot().jobs.find(j=>j.id===job.id);
      if(!['published','scheduled','uncertain'].includes(current.status)){
        // Falha ao preparar (texto, artes ou prévia): tenta mais uma vez sozinho em 2 minutos, do ponto
        // em que parou. A rotina nunca é pausada por um erro: os próximos horários continuam.
        const preparing=['queued','generating','sending','redo','resend'].includes(current.status);
        if(preparing&&(current.retries||0)<RETRIES){
          await this.patch(job.id,{status:'queued',retries:(current.retries||0)+1,retryAt:new Date(this.now()+RETRY_MS).toISOString(),error:`Tentando de novo em 2 minutos. ${messageError(error)}`});return;
        }
        await this.patch(job.id,{status:'error',error:messageError(error),retryAt:null});
        const config=this.state.snapshot().configs[job.profileId];
        if(config?.enabled)await this.state.change(d=>{const c=d.configs[job.profileId];if(c)c.runError=`O carrossel "${job.title}" não ficou pronto. A rotina continua ativa nos próximos horários. ${messageError(error)}`;});
        await this.changed(job.profileId);
        const binding=this.state.snapshot().binding;
        if(binding)await this.clientForToken().sendText(binding.chatId,`${job.title}: não foi possível concluir. ${messageError(error)}\n${config?.enabled?'A rotina continua ativa nos próximos horários. ':''}Abra o piloto no Carrossell para retomar este carrossel.`).catch(()=>{});
      }
    }
  }
  start(){
    this.started=true;if(this.controller)return;const controller=new AbortController();this.controller=controller;
    void this.poll(controller.signal);this.timer??=setInterval(()=>void this.step().catch(error=>{this.connectionError=messageError(error);void this.changed();}),5000);this.timer.unref?.();
  }
  async poll(signal){
    let failures=0;
    while(!signal.aborted){
      if(!this.secrets.getTelegramToken?.()){await sleep(2000,signal);continue;}
      try{
        const updates=await this.clientForToken().getUpdates(this.state.snapshot().offset,{signal});
        if(signal.aborted)break;
        for(const update of updates){if(signal.aborted)break;await this.handleUpdate(update);await this.state.change(data=>{data.offset=Math.max(data.offset,update.update_id+1);});}
        failures=0;if(this.connectionError){this.connectionError='';await this.changed();}
        if(!updates.length)await sleep(250,signal);
      }catch(error){
        if(signal.aborted)break;this.connectionError=error.code===409?BOT_ELSEWHERE:messageError(error);await this.changed();failures++;
        await sleep(Math.max((error.retryAfter||0)*1000,Math.min(60000,1000*2**Math.min(failures,6))),signal);
      }
    }
  }
  stop(){this.started=false;this.controller?.abort();this.controller=null;clearInterval(this.timer);this.timer=null;}
}
