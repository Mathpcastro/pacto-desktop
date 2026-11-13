import { appendFile, mkdir, readFile, rename, stat } from 'node:fs/promises';
import { dirname } from 'node:path';

// Diário do piloto automático: uma linha JSON por acontecimento, para descobrir por que a rotina não
// publicou. Fica no computador do usuário e só sai dele pelo botão "Copiar diagnóstico".
// Nunca grava token, legenda nem endereço: os textos passam por clean() e são cortados.
const MAX_BYTES=512*1024;
export function redact(value){
  return String(value??'').replace(/https?:\/\/\S+/g,'[endereço]').replace(/\b\d{5,}:[A-Za-z0-9_-]{20,}\b/g,'[token]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,'[e-mail]');
}
export function clean(value){return redact(value).replace(/\s+/g,' ').trim().slice(0,300);}
function cleanData(data){
  const out={};
  for(const [key,value] of Object.entries(data||{})){
    if(value===undefined)continue;
    if(value===null||typeof value==='number'||typeof value==='boolean')out[key]=value;
    else if(Array.isArray(value))out[key]=value.slice(0,20).map(v=>typeof v==='object'&&v?cleanData(v):clean(v));
    else if(typeof value==='object')out[key]=cleanData(value);
    else out[key]=clean(value);
  }
  return out;
}
export class PilotLog {
  constructor(file,{now=()=>Date.now(),maxBytes=MAX_BYTES}={}){this.file=file;this.now=now;this.maxBytes=maxBytes;this.queue=Promise.resolve();}
  // Nunca derruba quem chamou: um disco cheio não pode parar o piloto.
  write(event,data={}){
    const line=JSON.stringify({t:new Date(this.now()).toISOString(),event:clean(event),...cleanData(data)})+'\n';
    this.queue=this.queue.then(async()=>{
      await mkdir(dirname(this.file),{recursive:true});
      const size=await stat(this.file).then(s=>s.size,()=>0);
      if(size+line.length>this.maxBytes)await rename(this.file,`${this.file}.1`).catch(()=>{});
      await appendFile(this.file,line,'utf8');
    }).catch(()=>{});
    return this.queue;
  }
  async tail(lines=200){
    await this.queue;
    const read=file=>readFile(file,'utf8').catch(()=>'');
    const all=`${await read(`${this.file}.1`)}${await read(this.file)}`.split('\n').filter(Boolean);
    return all.slice(-lines);
  }
}
export const silentLog={write:async()=>{},tail:async()=>[]};
