import { Composio } from './composio.mjs';
import { approvalFingerprint } from './approval.mjs';
import { accountInfo, fetchMetrics, nextMetricsAt, postable, publishCarousel, recentPosts } from './instagram.mjs';
import { duePosts, parseWhen } from './schedule.mjs';
import { text } from './store.mjs';
import { ANALYTICS_TTL, analyticsRange, fetchAnalytics, followerHistory } from './analytics.mjs';

// Instagram pelo Composio. A chave e a lista de contas são do app (fora da biblioteca): todas as contas
// do Instagram ativas no projeto do Composio aparecem, sem reconectar. Cada perfil do Carrossell marca
// as contas padrão, e cada post ou agendamento escolhe em quais contas sai.
const CONNECT_TIMEOUT_MS=10*60*1000;
const publicAccount=a=>({id:a.id,username:a.username,followers:a.followers??null,status:a.status,error:a.error||''});
export class Social {
  constructor(runtime,{composio=options=>new Composio(options),now=()=>Date.now(),pollMs=3000}={}){
    this.rt=runtime;this.make=composio;this.now=now;this.pollMs=pollMs;this.clients=new Map();this.posting=new Set();this.pending=null;
  }
  get secrets(){return this.rt.dialogs.secrets;}
  // Avisa a janela (contas e padrões vivem no estado) e devolve o status.
  changed(){this.rt.emit({type:'state',state:this.rt.state()});return this.status();}
  get store(){return this.rt.store;}
  emit(message){this.rt.emit({type:'activity',message});}
  client(){
    const key=this.secrets?.getKey?.();if(!key)throw new Error('Conecte o Instagram: cole a chave de API do Composio em Conectar Instagram.');
    if(!this.clients.has(key))this.clients.set(key,this.make({apiKey:key,userId:`carrossell-${this.secrets.installId()}`}));
    return this.clients.get(key);
  }
  registry(){return this.secrets?.accounts?.()||[];}
  usable(){return this.registry().filter(a=>a.status==='ACTIVE'&&a.igUserId);}
  find(id){const a=this.usable().find(a=>a.id===String(id));if(!a)throw new Error('Conta do Instagram não encontrada. Atualize a lista em Conectar Instagram.');return a;}
  defaults(){const usable=this.usable();return this.store.instagram().defaults.filter(id=>usable.some(a=>a.id===id));}
  // Contas escolhidas para um post; sem escolha, as padrão do perfil.
  pick(ids){const list=ids===undefined||ids===null?this.defaults():ids;if(!Array.isArray(list)||!list.length)throw new Error('Escolha pelo menos uma conta do Instagram para postar.');return [...new Set(list.map(String))].map(id=>this.find(id));}
  // Resumo que vai no estado da janela: nunca a chave, só se ela existe, as contas e as padrão deste perfil.
  summary(){return {hasKey:Boolean(this.secrets?.hasKey?.()),accounts:this.registry().map(publicAccount),defaults:this.defaults(),pending:Boolean(this.pending)};}
  status(){
    return {hasKey:Boolean(this.secrets?.hasKey?.()),accounts:this.registry().map(publicAccount),defaults:this.defaults(),pending:Boolean(this.pending),
      scheduled:this.store.state().projects.filter(p=>p.schedule&&['scheduled','late','failed','partial'].includes(p.schedule.status)).map(p=>({id:p.id,title:p.title,...p.schedule}))};
  }
  async saveKey(value){
    if(!this.secrets?.setKey)throw new Error('Disponível só no aplicativo.');
    const key=text(String(value??''),300).trim();if(key.length<10||/\s/.test(key))throw new Error('Essa chave não parece uma chave de API do Composio. Copie de novo em Settings › Project Settings › API Keys no Composio.');
    if(/^ck_/i.test(key))throw new Error('Essa é a chave do Composio Connect (a do MCP, começa com ck_). O Carrossell precisa da chave do PROJETO: abra dashboard.composio.dev/~/project/settings/api-keys (o botão Abrir o Composio leva direto) e copie a chave de lá.');
    if(/^uak_/i.test(key))throw new Error('Essa é a sua chave de usuário (começa com uak_). O Carrossell precisa da chave do PROJETO: em composio.dev, abra Settings › Project Settings › API Keys.');
    // Testa a chave antes de guardar: listar as conexões não mexe em nenhuma conta.
    await this.make({apiKey:key,userId:`carrossell-${this.secrets.installId()}`}).accounts();
    await this.secrets.setKey(key);this.clients.clear();
    await this.sync().catch(()=>{});
    return this.changed();
  }
  async removeKey(){await this.secrets?.clearKey?.();this.clients.clear();this.pending=null;return this.changed();}
  // Busca no Composio as contas do Instagram já conectadas e o @ de cada uma (só das novas).
  async sync(){
    const composio=this.client(),old=new Map(this.registry().map(a=>[a.id,a])),next=[];
    for(const a of (await composio.accounts()).filter(a=>a.status==='ACTIVE')){
      const prev=old.get(a.id);
      if(prev?.status==='ACTIVE'&&prev.igUserId){next.push({...prev,userId:a.userId||prev.userId||''});continue;}
      try{next.push({id:a.id,userId:a.userId,alias:a.alias,...await accountInfo(composio,{id:a.id,userId:a.userId}),status:'ACTIVE',error:'',updatedAt:new Date(this.now()).toISOString()});}
      catch(error){if(error.code==='key')throw error;next.push({id:a.id,userId:a.userId,alias:a.alias,username:error.username||prev?.username||a.alias||'',igUserId:'',followers:null,status:error.code==='account'?'personal':'error',error:error.message,updatedAt:new Date(this.now()).toISOString()});}
    }
    await this.secrets.saveAccounts(next);
    return this.changed();
  }
  async connect(){
    const {url,accountId,userId}=await this.client().link();
    this.pending={accountId,userId,startedAt:this.now()};
    await this.rt.dialogs.openAuth?.(url);
    this.watch();
    return {...this.changed(),url};
  }
  // Acompanha o OAuth no navegador e grava a conta quando ela fica ativa (até 10 minutos).
  watch(){
    const tick=async()=>{
      if(!this.pending)return;
      try{const done=await this.check();if(!done.pending)return;}catch(error){this.emit(error.message);return;}
      if(this.now()-this.pending.startedAt>CONNECT_TIMEOUT_MS){this.pending=null;return;}
      setTimeout(()=>void tick(),this.pollMs).unref?.();
    };
    setTimeout(()=>void tick(),this.pollMs).unref?.();
  }
  async check(){
    const pending=this.pending;if(!pending)return this.status();
    const composio=this.client(),status=String((await composio.account(pending.accountId)).status||'').toUpperCase();
    if(['FAILED','EXPIRED','REVOKED'].includes(status)){this.pending=null;throw new Error('A conexão com o Instagram não foi concluída. Tente conectar de novo.');}
    if(status!=='ACTIVE')return this.status();
    let info;try{info=await accountInfo(composio,{id:pending.accountId,userId:pending.userId});}catch(error){this.pending=null;throw error;}
    const account={id:pending.accountId,userId:pending.userId,alias:'',...info,status:'ACTIVE',error:'',updatedAt:new Date(this.now()).toISOString()};
    await this.secrets.saveAccounts([...this.registry().filter(a=>a.id!==account.id),account]);
    if(!this.defaults().length)await this.store.saveInstagram({defaults:[account.id]});
    this.pending=null;
    return this.changed();
  }
  async setDefaults(ids){if(!Array.isArray(ids))throw new Error('Contas do Instagram inválidas.');ids.forEach(id=>this.find(id));await this.store.saveInstagram({defaults:ids.map(String)});return this.changed();}
  // Remove a conexão do Composio (deixa de funcionar para qualquer app que use a mesma chave).
  async remove(id){
    await this.client().disconnect(String(id));
    await this.secrets.saveAccounts(this.registry().filter(a=>a.id!==String(id)));
    await this.store.saveInstagram({defaults:this.store.instagram().defaults.filter(x=>x!==String(id))});
    return this.changed();
  }
  async publish(id,{accounts,fromSchedule=false}={}){
    const p=this.store.get(id);
    if(p.schedule?.approvalFingerprint&&approvalFingerprint(p)!==p.schedule.approvalFingerprint)throw new Error('O carrossel foi alterado depois da aprovação no Telegram. Cancele o agendamento e aprove uma nova prévia.');
    postable(p);const targets=this.pick(accounts);
    const done=p.instagram?.posts||[],todo=targets.filter(a=>!done.some(x=>x.accountId===a.id));
    if(!todo.length)throw new Error(targets.length>1?'Este carrossel já foi postado nessas contas.':`Este carrossel já foi postado em @${targets[0].username}.`);
    if(this.posting.has(id))throw new Error('Este carrossel já está sendo postado.');
    if(!this.rt.dialogs.toJpeg)throw new Error('Disponível só no aplicativo.');
    this.posting.add(id);const posted=[],errors=[];
    try{
      this.emit('Preparando as imagens…');
      const jpegs=await this.rt.dialogs.toJpeg(p.slides.map(s=>Buffer.from(s.image.split(',')[1],'base64')));
      const composio=this.client();
      for(const account of todo){
        try{const r=await publishCarousel({composio,account,caption:p.caption||'',jpegs,onStep:m=>this.emit(m),now:this.now});posted.push({...r,metrics:null,nextMetricsAt:nextMetricsAt(r.publishedAt,this.now())});}
        catch(error){if(error.code==='key')throw error;errors.push(`@${account.username}: ${error.message}`);}
      }
    }catch(error){errors.push(error.message);}
    finally{
      this.posting.delete(id);this.emit('');
      const current=this.store.get(id),patch={};
      if(posted.length){patch.instagram={posts:[...(current.instagram?.posts||[]),...posted]};patch.publishedAt=current.publishedAt||posted[0].publishedAt;}
      if(current.schedule)patch.schedule={...current.schedule,status:errors.length?(posted.length?'partial':'failed'):'published',error:errors.join(' · ')};
      if(Object.keys(patch).length)await this.rt.update(id,patch);
      if(current.schedule&&!fromSchedule&&!errors.length)await this.rt.dialogs.scheduler?.remove(id).catch(()=>{});
    }
    if(errors.length)throw new Error(posted.length?`Postado em ${posted.map(r=>`@${r.username}`).join(', ')}. Não saiu em ${errors.join(' · ')}`:errors.join(' · '));
    return this.store.get(id);
  }
  async schedule(id,at,accounts,{approvalFingerprint:approved}={}){
    const when=parseWhen(at,new Date(this.now())),p=this.store.get(id);postable(p);
    const done=p.instagram?.posts||[],targets=this.pick(accounts).filter(a=>!done.some(x=>x.accountId===a.id));
    if(!targets.length)throw new Error('Este carrossel já foi postado nessas contas.');
    if(!this.rt.dialogs.scheduler)throw new Error('Disponível só no aplicativo.');
    await this.rt.dialogs.scheduler.add(id,when);
    return this.rt.update(id,{schedule:{at:when.toISOString(),accounts:targets.map(a=>a.id),usernames:targets.map(a=>a.username),status:'scheduled',error:'',createdAt:new Date(this.now()).toISOString(),...(approved?{approvalFingerprint:approved}:{})}});
  }
  // Troca só a data: mantém as contas que faltam e a aprovação de um agendamento vindo do piloto.
  async reschedule(id,at){
    const s=this.store.get(id).schedule;if(!s||!['scheduled','late','failed','partial'].includes(s.status))throw new Error('Este carrossel não está agendado.');
    return this.schedule(id,at,s.accounts,{approvalFingerprint:s.approvalFingerprint});
  }
  async unschedule(id){this.store.get(id);await this.rt.dialogs.scheduler?.remove(id).catch(()=>{});return this.rt.update(id,{schedule:null});}
  // Roda em todos os perfis: chamado pela tarefa do sistema e sempre que o app abre.
  async publishDue({includeLate=false}={}){
    const summary={published:[],failed:[],late:[]};
    const each=async()=>{
      for(const due of duePosts(this.store.state().projects,this.now())){
        const p=this.store.get(due.id);
        if(due.late&&!includeLate){await this.rt.update(due.id,{schedule:{...p.schedule,status:'late'}});summary.late.push(due.id);continue;}
        try{await this.publish(due.id,{accounts:p.schedule.accounts,fromSchedule:true});summary.published.push(due.id);}
        catch(error){summary.failed.push({id:due.id,error:error.message});}
        finally{await this.rt.dialogs.scheduler?.remove(due.id).catch(()=>{});}
      }
    };
    if(this.rt.profiles)for(const profile of this.rt.profiles.list())await this.rt.inProfile(profile.id,each);
    else await each();
    return summary;
  }
  // Atualiza os posts de um carrossel, ou todos os que chegaram na data (1, 3 e 7 dias após postar).
  // Comentários e salvamentos somados de todas as contas viram o resultado usado pelo Ritmo e pelo Replicador.
  async refreshMetrics({id}={}){
    const projects=id?[this.store.get(id)]:this.store.state().projects;
    if(id&&!projects[0].instagram?.posts?.length)throw new Error('Este carrossel ainda não foi postado pelo Carrossell.');
    const due=post=>id||(post.nextMetricsAt&&new Date(post.nextMetricsAt).getTime()<=this.now());
    const updated=[];
    for(const p of projects){
      const posts=p.instagram?.posts||[];if(!posts.some(due))continue;
      const composio=this.client(),next=[];
      for(const post of posts){
        if(!due(post)){next.push(post);continue;}
        const account=this.usable().find(a=>a.id===post.accountId);if(!account){next.push(post);continue;}
        const m=await fetchMetrics(composio,account,post.mediaId);
        next.push({...post,metrics:m.metrics,insights:m.insights,metricsAt:m.updatedAt,permalink:post.permalink||m.permalink,nextMetricsAt:nextMetricsAt(post.publishedAt,this.now())});
        updated.push({id:p.id,accountId:post.accountId,username:post.username,...m});
      }
      const sum=key=>next.reduce((total,post)=>total+(post.metrics?.[key]??0),0),measured=next.some(post=>post.metrics);
      await this.rt.update(p.id,{instagram:{...p.instagram,posts:next},...(measured?{results:{comments:sum('comments'),saves:sum('saves'),sales:p.results?.sales||0,recordedAt:new Date(this.now()).toISOString(),source:'instagram'}}:{})});
    }
    return updated;
  }
  async posts(limit=25,accountId){const account=accountId?this.find(accountId):this.pick()[0];return recentPosts(this.client(),account,Math.min(Math.max(Number(limit)||25,1),100));}
  async analytics({account:accountId,days=7,refresh=false}={}){
    const account=this.find(accountId),store=this.store,range=analyticsRange(days,this.now());
    const saved=store.analytics().reports[`${account.id}:${range.days}`];
    let report=saved;
    if(refresh||!saved||this.now()-Date.parse(saved.updatedAt)>=ANALYTICS_TTL||saved.updatedAt.slice(0,10)!==new Date(this.now()).toISOString().slice(0,10)){
      report=await fetchAnalytics(this.client(),account,{days:range.days,now:this.now()});
      await store.saveAnalytics(report);
    }
    return {...report,history:followerHistory(store.analytics().snapshots[account.id],range.days,this.now())};
  }
  async importPost({account:accountId,mediaId,days=7}={}){
    const account=this.find(accountId),store=this.store;
    analyticsRange(days,this.now());
    const report=store.analytics().reports[`${account.id}:${Number(days)}`];
    const post=report?.posts.find(p=>p.id===String(mediaId));
    if(!post)throw new Error('Atualize o Analytics antes de usar este post no Replicador.');
    if(!post.caption.trim())throw new Error('Este post não tem legenda disponível. Use o Modelador com um print ou texto do post.');
    const project=store.state().projects.find(p=>p.instagram?.posts?.some(x=>x.accountId===account.id&&x.mediaId===post.id));
    const source=await store.saveInstagramSource({...post,accountId:account.id,username:account.username,importedAt:new Date(this.now()).toISOString()});
    this.changed();
    return {source,projectId:project?.id||''};
  }
}
