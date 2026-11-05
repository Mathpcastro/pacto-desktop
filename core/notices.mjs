import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// Avisos do Carrossell para quem usa o app. O dono edita um arquivo público (notices.json no
// repositório de releases) e cada app lê esse arquivo ao abrir e a cada hora. O que chega é
// só texto: nada do arquivo vira código, HTML ou caminho no computador.
export const NOTICES_URL='https://raw.githubusercontent.com/Mathpcastro/pacto-releases/main/notices.json';
// Lugares do app que um aviso pode abrir. Links externos só https e só pelo processo principal.
export const NOTICE_VIEWS=['home','library','pilot','brand','brand:contexto','brand:design','brand:fotos','instagram'];
const ID=/^[a-z0-9][a-z0-9-]{0,63}$/;
const VERSION=/^\d+\.\d+\.\d+$/;
const clean=(value,max)=>String(value??'').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g,'').trim().slice(0,max);
const parts=v=>v.split('.').map(Number);
export function compareVersions(a,b){const x=parts(a),y=parts(b);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i]?1:-1;}return 0;}
function validUrl(value){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}}

// Valida o arquivo e devolve só os avisos que valem para esta versão e esta data, do mais novo ao mais antigo.
export function parseNotices(data,{version='0.0.0',now=Date.now()}={}){
  const list=Array.isArray(data)?data:Array.isArray(data?.notices)?data.notices:[];
  const out=[];
  for(const raw of list.slice(0,50)){
    if(!raw||typeof raw!=='object'||!ID.test(String(raw.id||'')))continue;
    const title=clean(raw.title,90),body=clean(raw.body,700);
    const date=new Date(raw.date||0);if(!title||!body||Number.isNaN(date.getTime()))continue;
    if(raw.until&&!(new Date(raw.until).getTime()>now))continue;
    if(date.getTime()>now)continue;
    if(raw.minVersion&&(!VERSION.test(raw.minVersion)||compareVersions(version,raw.minVersion)<0))continue;
    if(raw.maxVersion&&(!VERSION.test(raw.maxVersion)||compareVersions(version,raw.maxVersion)>0))continue;
    let action=null;const a=raw.action;
    if(a&&typeof a==='object'){
      const label=clean(a.label,32);
      if(label&&NOTICE_VIEWS.includes(a.view))action={label,view:a.view};
      else if(label&&validUrl(a.url))action={label,url:validUrl(a.url)};
    }
    out.push({id:raw.id,title,body,date:date.toISOString(),...(action?{action}:{}),important:raw.important===true});
  }
  return out.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
}

export class Notices {
  constructor({root,version,fetch:fetcher=globalThis.fetch,url=NOTICES_URL,now=()=>Date.now()}){
    Object.assign(this,{file:join(root,'notices.json'),version,fetcher,url,now});
    this.data={items:[],read:[],shown:[],fetchedAt:null};this.queue=Promise.resolve();
  }
  async init(){
    await mkdir(join(this.file,'..'),{recursive:true});
    try{const saved=JSON.parse(await readFile(this.file,'utf8'));this.data={items:Array.isArray(saved.items)?saved.items:[],read:Array.isArray(saved.read)?saved.read:[],shown:Array.isArray(saved.shown)?saved.shown:[],fetchedAt:saved.fetchedAt||null};}
    catch{}
    // O cache também passa pelos filtros: uma versão nova pode esconder um aviso antigo.
    this.data.items=parseNotices(this.data.items,{version:this.version,now:this.now()});
    return this;
  }
  save(){
    const body=JSON.stringify(this.data,null,2);
    this.queue=this.queue.then(async()=>{const temp=`${this.file}.${randomUUID()}.tmp`;await writeFile(temp,body,'utf8');await rename(temp,this.file);}).catch(()=>{});
    return this.queue;
  }
  // Busca o arquivo público. Sem internet, o app segue com os avisos já guardados.
  async refresh(){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await this.fetcher(`${this.url}?t=${Math.floor(this.now()/60000)}`,{signal:controller.signal,headers:{accept:'application/json'}});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const text=await response.text();if(text.length>200000)throw new Error('Arquivo de avisos grande demais.');
      this.data.items=parseNotices(JSON.parse(text),{version:this.version,now:this.now()});this.data.fetchedAt=new Date(this.now()).toISOString();
      await this.save();return true;
    }catch{return false;}finally{clearTimeout(timer);}
  }
  list(){
    const read=new Set(this.data.read);
    return parseNotices(this.data.items,{version:this.version,now:this.now()}).map(n=>({...n,read:read.has(n.id)}));
  }
  summary(){const items=this.list();return {items,unread:items.filter(n=>!n.read).length};}
  async markRead(id){
    if(!ID.test(String(id||'')))throw new Error('Aviso inválido.');
    if(!this.data.read.includes(id)){this.data.read=[...this.data.read,id].slice(-200);await this.save();}
    return this.summary();
  }
  async markAllRead(){for(const n of this.list())if(!this.data.read.includes(n.id))this.data.read.push(n.id);this.data.read=this.data.read.slice(-200);await this.save();return this.summary();}
  // Avisos que ainda não viraram notificação do sistema. Marca como mostrados.
  async takeNew(){
    const shown=new Set(this.data.shown),fresh=this.list().filter(n=>!n.read&&!shown.has(n.id));
    if(fresh.length){this.data.shown=[...this.data.shown,...fresh.map(n=>n.id)].slice(-200);await this.save();}
    return fresh;
  }
  link(id){const n=this.list().find(n=>n.id===id);if(!n?.action?.url)throw new Error('Este aviso não tem link.');return n.action.url;}
}
