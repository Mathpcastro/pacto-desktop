import { Composio } from './composio.mjs';
import { accountInfo, fetchMetrics, nextMetricsAt, postable, publishCarousel, recentPosts } from './instagram.mjs';
import { duePosts, parseWhen } from './schedule.mjs';
import { text } from './store.mjs';

// Instagram pelo Composio, por perfil: a chave do Composio é do app (cifrada fora da biblioteca);
// cada perfil liga a própria conta do Instagram e vira um "usuário" separado no Composio.
const CONNECT_TIMEOUT_MS=10*60*1000;
export class Social {
  constructor(runtime,{composio=options=>new Composio(options),now=()=>Date.now(),pollMs=3000}={}){
    this.rt=runtime;this.make=composio;this.now=now;this.pollMs=pollMs;this.clients=new Map();this.posting=new Set();this.watching=new Set();
  }
  get secrets(){return this.rt.dialogs.secrets;}
  get store(){return this.rt.store;}
  emit(message){this.rt.emit({type:'activity',message});}
  client(profileId=this.rt.profileId()){
    const key=this.secrets?.getKey?.();if(!key)throw new Error('Cole a chave de API do Composio em Marca › Instagram.');
    const userId=`carrossell-${this.secrets.installId()}-${profileId}`,cacheKey=`${key.slice(-8)}:${userId}`;
    if(!this.clients.has(cacheKey))this.clients.set(cacheKey,this.make({apiKey:key,userId}));
    return this.clients.get(cacheKey);
  }
  account(){const a=this.store.instagram();if(!a.connectedAccountId||!a.igUserId)throw new Error('Conecte o Instagram deste perfil em Marca › Instagram.');return a;}
  status(){
    const a=this.store.instagram();
    return {hasKey:Boolean(this.secrets?.hasKey?.()),account:a.connectedAccountId?{username:a.username,igUserId:a.igUserId,connectedAt:a.connectedAt,followers:a.followers}:null,pending:Boolean(a.pendingAccountId),
      scheduled:this.store.state().projects.filter(p=>p.schedule&&['scheduled','late','failed'].includes(p.schedule.status)).map(p=>({id:p.id,title:p.title,...p.schedule}))};
  }
  async saveKey(value){
    if(!this.secrets?.setKey)throw new Error('Disponível só no aplicativo.');
    const key=text(String(value??''),300).trim();if(key.length<10||/\s/.test(key))throw new Error('Essa chave não parece uma chave de API do Composio. Copie de novo em Settings › API Keys no Composio.');
    // Testa a chave antes de guardar: abrir uma sessão não mexe em nenhuma conta.
    await this.make({apiKey:key,userId:`carrossell-${this.secrets.installId()}-teste`}).session();
    await this.secrets.setKey(key);this.clients.clear();return this.status();
  }
  async removeKey(){await this.secrets?.clearKey?.();this.clients.clear();return this.status();}
  async connect(){
    const composio=this.client(),{url,accountId}=await composio.link();
    await this.store.saveInstagram({pendingAccountId:accountId||''});
    await this.rt.dialogs.openAuth?.(url);
    if(accountId)this.watch(accountId);
    return {...this.status(),url};
  }
  // Acompanha o OAuth no navegador e grava a conta quando ela fica ativa (até 10 minutos).
  watch(accountId){
    if(this.watching.has(accountId))return;this.watching.add(accountId);
    const deadline=this.now()+CONNECT_TIMEOUT_MS;
    const tick=async()=>{
      try{const done=await this.check();if(done.account||!done.pending||this.now()>deadline){if(!done.account&&this.now()>deadline)await this.store.saveInstagram({pendingAccountId:''});return this.watching.delete(accountId);}}
      catch(error){this.watching.delete(accountId);this.emit(error.message);return;}
      setTimeout(()=>void tick(),this.pollMs).unref?.();
    };
    setTimeout(()=>void tick(),this.pollMs).unref?.();
  }
  async check(){
    const a=this.store.instagram();if(!a.pendingAccountId)return this.status();
    const composio=this.client(),status=String((await composio.account(a.pendingAccountId)).status||'').toUpperCase();
    if(['FAILED','EXPIRED','REVOKED'].includes(status)){await this.store.saveInstagram({pendingAccountId:''});throw new Error('A conexão com o Instagram não foi concluída. Tente conectar de novo.');}
    if(status!=='ACTIVE')return this.status();
    const info=await accountInfo(composio,a.pendingAccountId);
    await this.store.saveInstagram({connectedAccountId:a.pendingAccountId,igUserId:info.igUserId,username:info.username,followers:info.followers,connectedAt:new Date(this.now()).toISOString(),pendingAccountId:''});
    this.rt.emit({type:'state',state:this.rt.state()});
    return this.status();
  }
  async disconnect(){
    const a=this.store.instagram();
    if(a.connectedAccountId&&this.secrets?.hasKey?.())await this.client().disconnect(a.connectedAccountId);
    for(const p of this.store.state().projects)if(p.schedule?.status==='scheduled')await this.unschedule(p.id);
    await this.store.saveInstagram(null);return this.status();
  }
  async publish(id,{again=false,fromSchedule=false}={}){
    const p=this.store.get(id);postable(p);const account=this.account();
    if(p.instagram?.mediaId&&!again)throw new Error('Este carrossel já foi postado no Instagram.');
    if(this.posting.has(id))throw new Error('Este carrossel já está sendo postado.');
    if(!this.rt.dialogs.toJpeg)throw new Error('Disponível só no aplicativo.');
    this.posting.add(id);
    try{
      this.emit('Preparando as imagens…');
      const jpegs=await this.rt.dialogs.toJpeg(p.slides.map(s=>Buffer.from(s.image.split(',')[1],'base64')));
      const result=await publishCarousel({composio:this.client(),account,caption:p.caption||'',jpegs,onStep:m=>this.emit(m),now:this.now});
      await this.rt.update(id,{instagram:{...result,metrics:null,nextMetricsAt:nextMetricsAt(result.publishedAt,this.now())},publishedAt:p.publishedAt||result.publishedAt,schedule:p.schedule?{...p.schedule,status:'published',error:''}:null,error:null});
      if(p.schedule&&!fromSchedule)await this.rt.dialogs.scheduler?.remove(id).catch(()=>{});
      return this.store.get(id);
    }catch(error){
      if(p.schedule)await this.rt.update(id,{schedule:{...p.schedule,status:'failed',error:error.message}});
      throw error;
    }finally{this.posting.delete(id);this.emit('');}
  }
  async schedule(id,at){
    const when=parseWhen(at,new Date(this.now())),p=this.store.get(id);postable(p);this.account();
    if(p.instagram?.mediaId)throw new Error('Este carrossel já foi postado no Instagram.');
    if(!this.rt.dialogs.scheduler)throw new Error('Disponível só no aplicativo.');
    await this.rt.dialogs.scheduler.add(id,when);
    return this.rt.update(id,{schedule:{at:when.toISOString(),status:'scheduled',error:'',createdAt:new Date(this.now()).toISOString()}});
  }
  async unschedule(id){this.store.get(id);await this.rt.dialogs.scheduler?.remove(id).catch(()=>{});return this.rt.update(id,{schedule:null});}
  // Roda em todos os perfis: chamado pela tarefa do sistema e sempre que o app abre.
  async publishDue({includeLate=false}={}){
    const summary={published:[],failed:[],late:[]};
    const each=async()=>{
      for(const due of duePosts(this.store.state().projects,this.now())){
        const p=this.store.get(due.id);
        if(due.late&&!includeLate){await this.rt.update(due.id,{schedule:{...p.schedule,status:'late'}});summary.late.push(due.id);continue;}
        try{await this.publish(due.id,{fromSchedule:true});summary.published.push(due.id);}
        catch(error){summary.failed.push({id:due.id,error:error.message});}
        finally{await this.rt.dialogs.scheduler?.remove(due.id).catch(()=>{});}
      }
    };
    if(this.rt.profiles)for(const profile of this.rt.profiles.list())await this.rt.inProfile(profile.id,each);
    else await each();
    return summary;
  }
  // Atualiza um carrossel ou todos os que chegaram na data (1, 3 e 7 dias após postar).
  async refreshMetrics({id}={}){
    const targets=id?[this.store.get(id)]:this.store.state().projects.filter(p=>p.instagram?.mediaId&&p.instagram.nextMetricsAt&&new Date(p.instagram.nextMetricsAt).getTime()<=this.now());
    if(id&&!targets[0].instagram?.mediaId)throw new Error('Este carrossel ainda não foi postado pelo Carrossell.');
    if(!targets.length)return [];
    const composio=this.client(),account=this.account(),updated=[];
    for(const p of targets){
      const m=await fetchMetrics(composio,account,p.instagram.mediaId);
      const results={comments:m.metrics.comments??p.results?.comments??0,saves:m.metrics.saves??p.results?.saves??0,sales:p.results?.sales||0,recordedAt:m.updatedAt,source:'instagram'};
      await this.rt.update(p.id,{results,instagram:{...p.instagram,metrics:m.metrics,insights:m.insights,metricsAt:m.updatedAt,permalink:p.instagram.permalink||m.permalink,nextMetricsAt:nextMetricsAt(p.instagram.publishedAt,this.now())}});
      updated.push({id:p.id,...m});
    }
    return updated;
  }
  async posts(limit=25){return recentPosts(this.client(),this.account(),Math.min(Math.max(Number(limit)||25,1),100));}
}
