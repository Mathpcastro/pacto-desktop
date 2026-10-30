import { createServer, createConnection } from 'node:net';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { dirname, join, resolve, normalize, isAbsolute } from 'node:path';

// Controle local para agentes (CLI): o app — com ou sem janela — é o único dono da biblioteca,
// e a CLI conversa com ele por um named pipe (Windows) ou socket Unix (Mac), com um token que só
// o próprio usuário do sistema lê. Mensagens são JSON, uma por linha.
const MAX_LINE=64*1024*1024;
export function userDataDir(env=process.env,platform=process.platform,home=process.env.HOME||process.env.USERPROFILE||''){
  if(env.PACTO_USER_DATA)return resolve(env.PACTO_USER_DATA);
  if(platform==='win32')return join(env.APPDATA||join(home,'AppData','Roaming'),'pacto-desktop');
  if(platform==='darwin')return join(home,'Library','Application Support','pacto-desktop');
  return join(env.XDG_CONFIG_HOME||join(home,'.config'),'pacto-desktop');
}
export function controlAddress(userData,platform=process.platform){
  if(platform==='win32')return `\\\\.\\pipe\\carrossell-${createHash('sha256').update(resolve(userData).toLowerCase()).digest('hex').slice(0,16)}`;
  return join(userData,'control.sock');
}
const tokenFile=userData=>join(userData,'control.token');
function sameToken(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&x.length>0&&timingSafeEqual(x,y);}
// A CLI nunca recebe imagens em base64: troca por um marcador para não despejar megabytes no agente.
export function lean(value){
  if(typeof value==='string')return value.startsWith('data:')&&value.length>200?'[imagem]':value;
  if(Array.isArray(value))return value.map(lean);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,lean(v)]));
  return value;
}
export function projectSummary(p){
  const last=[...(p.messages||[])].reverse().find(m=>m.role==='assistant');
  return {id:p.id,title:p.title,format:p.format,style:p.style,status:p.status,error:p.error||null,textApproved:Boolean(p.textApproved),brief:p.brief,caption:p.caption||'',cardCount:p.cardCount||0,
    slides:(p.slides||[]).map(s=>({id:s.id,index:s.index,role:s.role,title:s.title,body:s.body,emphasis:s.emphasis||'',layout:s.layout||'',state:s.state||'draft',image:Boolean(s.image)})),
    coverOptions:(p.coverOptions||[]).map((o,i)=>({n:i+1,id:o.id})),lastReply:last?.text||'',publishedAt:p.publishedAt||null,results:p.results||null,createdAt:p.createdAt,updatedAt:p.updatedAt};
}
function statusSummary(state,job){
  return {account:state.account,profileId:state.profileId,profiles:state.profiles,job:job?{projectId:job.id,kind:job.kind}:null,brand:Boolean(state.profile),brandName:state.profile?.brand||state.brandInfo?.name||'',
    projects:state.projects.length,ready:state.projects.filter(p=>p.status==='complete').length};
}
// Pastas de exportação: só caminho absoluto, e cada arquivo precisa cair dentro dela.
async function writeFiles(folder,files){
  if(typeof folder!=='string'||!isAbsolute(folder))throw new Error('Informe a pasta de exportação com o caminho completo.');
  const base=resolve(folder),written=[];
  for(const [name,bytes] of Object.entries(files)){
    const target=resolve(base,normalize(name));if(!target.startsWith(base))throw new Error('Nome de arquivo inválido.');
    await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);written.push(target);
  }
  return written;
}
// Ações próprias da CLI, sobre o mesmo runtime da janela.
export function agentActions(runtime,{version='',headless=false,info=()=>({})}={}){
  const state=profileId=>runtime.request('bootstrap',profileId?{profileId}:{});
  const project=async(profileId,id)=>{const p=(await state(profileId)).projects.find(p=>p.id===id);if(!p)throw new Error('Projeto não encontrado.');return p;};
  return {
    ping:async()=>({app:'Carrossell',version,headless,pid:process.pid,...info()}),
    status:async({profileId})=>statusSummary(await state(profileId),runtime.job),
    projects:async({profileId})=>(await state(profileId)).projects.map(p=>{const s=projectSummary(p);return {id:s.id,title:s.title,format:s.format,style:s.style,status:s.status,cards:s.slides.length,textApproved:s.textApproved,updatedAt:s.updatedAt};}),
    project:async({profileId,id})=>projectSummary(await project(profileId,id)),
    brand:async({profileId})=>{const s=await state(profileId);return {profileId:s.profileId,profile:s.profile?{...s.profile,references:(s.profile.references||[]).map(r=>r.name)}:null,brandInfo:s.brandInfo,
      drafts:{brand:s.onboarding.brand.document,design:s.onboarding.design.document,brandName:s.onboarding.brand.brandName},media:{displayName:s.media.displayName,handle:s.media.handle,faces:s.media.faces.length,assets:s.media.assets.map(a=>({id:a.id,name:a.name,kind:a.kind}))},feedback:s.feedback};},
    // Aprova os rascunhos do começo rápido (marca configurar) como o perfil da marca, igual à tela final do onboarding.
    approveBrand:async({profileId,name})=>{
      const s=await state(profileId),d=s.onboarding;if(!d.brand.document.trim()||!d.design.document.trim())throw new Error('Gere o Contexto e o Design Kit antes de aprovar (carrossell marca configurar).');
      const profile={...(s.profile||{}),brand:String(name||d.brand.brandName||s.profile?.brand||''),brandContext:d.brand.document,designKit:d.design.document};
      await runtime.request('saveProfile',{profileId:s.profileId,profile});return (await agentActions(runtime).brand({profileId:s.profileId}));
    },
    ideas:async({profileId})=>(await state(profileId)).ideas,
    exportTo:async({profileId,id,folder})=>{
      const files=await runtime.inProfile(profileId,()=>runtime.exportedFiles(id));
      return {folder:resolve(folder||''),files:await writeFiles(folder,files)};
    },
  };
}
// Servidor: aceita {id, token, action, args}; "subscribe" passa a receber os eventos do app.
export async function startControl({userData,runtime,allowed,version,headless=false,info,actions=agentActions(runtime,{version,headless,info}),onActivity=()=>{}}){
  await mkdir(userData,{recursive:true});
  const token=randomBytes(32).toString('hex'),address=controlAddress(userData);
  await writeFile(tokenFile(userData),token,{encoding:'utf8',mode:0o600});
  if(process.platform!=='win32')await rm(address,{force:true});
  const sockets=new Set(),listeners=new Set();
  const server=createServer(socket=>{
    sockets.add(socket);onActivity();
    socket.on('close',()=>{sockets.delete(socket);listeners.delete(socket);onActivity();});socket.on('error',()=>{});
    const send=value=>{if(!socket.destroyed)socket.write(`${JSON.stringify(value)}\n`);};
    const lines=createInterface({input:socket,crlfDelay:Infinity});
    lines.on('line',async line=>{
      onActivity();let message;
      try{if(line.length>MAX_LINE)throw new Error('Mensagem grande demais.');message=JSON.parse(line);}catch{send({ok:false,error:'Mensagem inválida.'});return socket.end();}
      const {id=null,action,args={}}=message||{};
      if(!sameToken(message?.token,token)){send({id,ok:false,error:'Acesso negado.'});return socket.end();}
      try{
        if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('Dados inválidos.');
        let result;
        if(action==='subscribe'){listeners.add(socket);result={subscribed:true};}
        else if(Object.hasOwn(actions,action))result=await actions[action](args);
        else if(allowed.includes(action))result=await runtime.request(action,args);
        else throw new Error('Ação não permitida.');
        send({id,ok:true,result:lean(result)});
      }catch(error){send({id,ok:false,error:String(error?.message||error)});}
      onActivity();
    });
  });
  await new Promise((resolvePromise,reject)=>{server.once('error',reject);server.listen(address,()=>{server.off('error',reject);resolvePromise();});});
  return {
    address,
    clients:()=>sockets.size,
    broadcast(event){if(!listeners.size)return;const line=`${JSON.stringify({event:lean(event)})}\n`;for(const s of listeners)if(!s.destroyed)s.write(line);},
    async close(){for(const s of sockets)s.destroy();await new Promise(r=>server.close(()=>r()));await rm(tokenFile(userData),{force:true});},
  };
}
// Cliente usado pela CLI.
export async function connectControl(userData,{timeout=2000}={}){
  const token=(await readFile(tokenFile(userData),'utf8')).trim();
  const socket=await new Promise((resolvePromise,reject)=>{const s=createConnection(controlAddress(userData));const timer=setTimeout(()=>{s.destroy();reject(new Error('O Carrossell não respondeu.'));},timeout);s.once('connect',()=>{clearTimeout(timer);resolvePromise(s);});s.once('error',error=>{clearTimeout(timer);reject(error);});});
  const pending=new Map(),events=new Set();let next=0;
  createInterface({input:socket,crlfDelay:Infinity}).on('line',line=>{
    let message;try{message=JSON.parse(line);}catch{return;}
    if(message.event){for(const fn of events)fn(message.event);return;}
    const waiter=pending.get(message.id);if(!waiter)return;pending.delete(message.id);
    message.ok?waiter.resolve(message.result):waiter.reject(new Error(message.error||'Falha no Carrossell.'));
  });
  socket.on('close',()=>{for(const w of pending.values())w.reject(new Error('A conexão com o Carrossell foi encerrada.'));pending.clear();});
  socket.on('error',()=>{});
  return {
    call(action,args={}){const id=++next;return new Promise((resolvePromise,reject)=>{pending.set(id,{resolve:resolvePromise,reject});socket.write(`${JSON.stringify({id,token,action,args})}\n`);});},
    async subscribe(fn){events.add(fn);await this.call('subscribe');},
    close(){socket.end();},
  };
}
