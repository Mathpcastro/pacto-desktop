import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Store, text, validId } from './store.mjs';

// Perfis (multicontas): cada perfil é uma biblioteca separada, com marca, Design Kit, fotos,
// feedback, ideias e carrosséis próprios. A biblioteca anterior aos perfis vira o "principal"
// e continua na pasta raiz, sem mover arquivos; os novos ficam em profiles/<id>/.
export const MAIN_PROFILE='principal';
const MAX_PROFILES=30;
function profileName(value){const name=text(String(value??''),60).trim();if(!name)throw new Error('Dê um nome ao perfil.');return name;}
export class Profiles {
  constructor(root){this.root=resolve(root);this.stores=new Map();this.index={active:MAIN_PROFILE,profiles:[]};}
  async init(){
    await mkdir(this.root,{recursive:true});
    try{const saved=JSON.parse(await readFile(join(this.root,'profiles.json'),'utf8'));if(Array.isArray(saved.profiles))this.index=saved;}
    catch(error){if(error.code!=='ENOENT')throw new Error('A lista de perfis não pôde ser lida. Seus arquivos foram preservados.');}
    if(!this.index.profiles.some(p=>p.id===MAIN_PROFILE))this.index.profiles.unshift({id:MAIN_PROFILE,name:'Principal',createdAt:new Date().toISOString()});
    if(!this.index.profiles.some(p=>p.id===this.index.active))this.index.active=MAIN_PROFILE;
    await this.persist();return this;
  }
  persist(){const temp=join(this.root,`profiles-${randomUUID()}.tmp`);return writeFile(temp,JSON.stringify(this.index,null,2),'utf8').then(()=>rename(temp,join(this.root,'profiles.json')));}
  list(){return structuredClone(this.index.profiles);}
  get active(){return this.index.active;}
  find(id){validId(id);const p=this.index.profiles.find(p=>p.id===id);if(!p)throw new Error('Perfil não encontrado.');return p;}
  folder(id){return id===MAIN_PROFILE?this.root:join(this.root,'profiles',id);}
  // Cada perfil abre a própria Store uma vez e fica em memória.
  async store(id=this.index.active){
    this.find(id);
    if(!this.stores.has(id))this.stores.set(id,new Store(this.folder(id)).init().catch(error=>{this.stores.delete(id);throw error;}));
    return this.stores.get(id);
  }
  async create(name){
    if(this.index.profiles.length>=MAX_PROFILES)throw new Error(`Use até ${MAX_PROFILES} perfis.`);
    const profile={id:randomUUID(),name:profileName(name),createdAt:new Date().toISOString()};
    this.index.profiles.push(profile);await this.persist();await this.store(profile.id);return structuredClone(profile);
  }
  async rename(id,name){const p=this.find(id);p.name=profileName(name);await this.persist();return structuredClone(p);}
  async setActive(id){this.find(id);await this.store(id);this.index.active=id;await this.persist();return id;}
  async remove(id){
    this.find(id);if(id===MAIN_PROFILE)throw new Error('O perfil Principal não pode ser excluído.');
    const store=await this.store(id);await store.queue;
    this.index.profiles=this.index.profiles.filter(p=>p.id!==id);if(this.index.active===id)this.index.active=MAIN_PROFILE;
    await this.persist();this.stores.delete(id);
    await rm(this.folder(id),{recursive:true,force:true});
  }
}
