import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

// Estado operacional separado dos projetos. O token só existe no cofre do Electron.
export const emptyConversation=()=>({profileId:null,projectId:null,history:[],inbox:[],seen:[],lastUpdate:-1});
export class AutopilotStore {
  constructor(root){this.root=root;this.file=join(root,'autopilot.json');this.queue=Promise.resolve();this.data={version:1,offset:0,bot:null,binding:null,pairing:null,configs:{},jobs:[],conversation:emptyConversation()};}
  async init(){
    await mkdir(this.root,{recursive:true});
    try{const saved=JSON.parse(await readFile(this.file,'utf8'));if(saved.version!==1||!Array.isArray(saved.jobs)||!saved.configs)throw new Error();this.data=saved;}
    catch(error){if(error.code!=='ENOENT')throw new Error('Não foi possível ler a fila do piloto. Os arquivos foram preservados.');}
    await this.change(data=>{
      data.conversation={...emptyConversation(),...data.conversation};
      for(const entry of data.conversation.inbox)if(entry.status==='running'){entry.status='interrupted';entry.error='A conversa foi interrompida quando o app encerrou. Confira o rascunho antes de pedir novamente; a ação não será repetida.';}
      for(const job of data.jobs){
      if(['publishing','scheduling'].includes(job.status)){job.status='uncertain';job.error='O app encerrou durante uma operação. Confira o Instagram e os agendamentos antes de tentar novamente.';}
      if(job.status==='generating'){job.status='error';job.error='A geração foi interrompida. Você pode retomar o rascunho.';}
      if(job.status==='sending'){job.status='error';job.error='A prévia foi interrompida. Reenvie para receber novos botões.';}
    }});return this;
  }
  snapshot(){return structuredClone(this.data);}
  change(fn){
    const operation=this.queue.then(async()=>{
      const next=structuredClone(this.data),result=fn(next);const temp=`${this.file}.${randomUUID()}.tmp`;
      await writeFile(temp,JSON.stringify(next,null,2),'utf8');await rename(temp,this.file);this.data=next;return result;
    });
    this.queue=operation.catch(()=>{});return operation;
  }
}
