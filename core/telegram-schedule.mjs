import { randomBytes } from 'node:crypto';
import { parseWhen } from './schedule.mjs';

// /agendados no Telegram: lista os posts agendados de todas as marcas e deixa cancelar ou trocar a data.
// Nada muda sem uma confirmação por botão; os botões valem só para a mensagem mais recente.
const OPEN=['scheduled','late','failed','partial'];
const LABEL={scheduled:'agendado',late:'atrasado',failed:'não saiu',partial:'saiu em parte'};
const MAX=10;
const when=iso=>new Date(iso).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
const describe=item=>`“${item.title}” (${item.brand}) · ${when(item.at)} · ${(item.usernames||[]).map(u=>`@${u}`).join(', ')||'contas escolhidas'}`;
export const SCHEDULE_COMMAND=/^\/agendados(?:@\w+)?(?:\s|$)/i;
const errorText=error=>String(error?.message||error||'Não foi possível concluir.').slice(0,300);

export class TelegramSchedule {
  constructor(pilot){this.pilot=pilot;this.rt=pilot.rt;this.state=pilot.state;}
  client(){return this.pilot.clientForToken();}
  chat(){return this.state.snapshot().binding?.chatId;}
  async send(text,keyboard){const options=keyboard?{reply_markup:{inline_keyboard:keyboard}}:{};const messages=await this.client().sendText(this.chat(),text,options);return messages.at(-1)?.message_id;}
  async items(){
    const out=[];
    for(const profile of this.rt.profileList()){
      const projects=await this.rt.inProfile(profile.id,()=>this.rt.store.state().projects);
      for(const p of projects)if(p.schedule&&OPEN.includes(p.schedule.status))out.push({profileId:profile.id,brand:profile.name,projectId:p.id,title:p.title,at:p.schedule.at,status:p.schedule.status,usernames:p.schedule.usernames||[]});
    }
    return out.sort((a,b)=>a.at.localeCompare(b.at));
  }
  async list(){
    const all=await this.items(),items=all.slice(0,MAX).map(item=>({...item,key:randomBytes(4).toString('hex')}));
    if(!items.length){await this.state.change(data=>{data.scheduleChat={menu:null,pending:null};});await this.send('Nenhum post agendado agora.');return;}
    const text=`Posts agendados (horário do computador):\n${items.map((item,i)=>`${i+1}. ${describe(item)}${item.status==='scheduled'?'':` · ${LABEL[item.status]}`}`).join('\n')}${all.length>MAX?`\n\nMostrando os ${MAX} mais próximos. Veja todos no app.`:''}\n\nEscolha o que fazer:`;
    const messageId=await this.send(text,items.map((item,i)=>[{text:`Trocar data ${i+1}`,callback_data:`s:${item.key}:move`},{text:`Cancelar ${i+1}`,callback_data:`s:${item.key}:drop`}]));
    await this.state.change(data=>{data.scheduleChat={menu:{messageId,items},pending:null};});
  }
  // Responde a uma mensagem de texto quando está esperando a nova data. Devolve true se tratou.
  async handleMessage(message){
    const pending=this.state.snapshot().scheduleChat?.pending;
    if(pending?.status!=='date')return false;
    const text=String(message.text||'').trim();
    if(/^\/(?:cancelar|parar)(?:@\w+)?(?:\s|$)/i.test(text)){await this.clear();await this.send('Troca de data cancelada. Nada foi alterado.');return true;}
    if(text.startsWith('/'))return false;
    let at;
    try{at=parseWhen(text,new Date(this.pilot.now())).toISOString();}
    catch(error){await this.send(`${errorText(error)}\nEnvie a data como 2026-11-03 18:00, no horário do computador.`);return true;}
    const messageId=await this.send(`Trocar a data de ${describe(pending)}\npara ${when(at)}?`,[[{text:'Confirmar nova data',callback_data:`s:${pending.key}:ok`}],[{text:'Cancelar',callback_data:`s:${pending.key}:no`}]]);
    await this.state.change(data=>{data.scheduleChat.pending={...pending,status:'confirm',newAt:at,messageId};});
    return true;
  }
  async clear(){await this.state.change(data=>{if(data.scheduleChat)data.scheduleChat.pending=null;});}
  async handleQuery(query){
    const ack=text=>this.client().answerCallbackQuery(query.id,text).catch(()=>{});
    const match=/^s:([a-f0-9]{8}):(move|drop|dropok|ok|no)$/.exec(query.data||'');
    const chat=this.state.snapshot().scheduleChat||{},action=match?.[2],messageId=query.message?.message_id;
    const fromMenu=['move','drop'].includes(action),source=fromMenu?chat.menu:chat.pending;
    const item=match&&source&&source.messageId===messageId&&(fromMenu?source.items.find(i=>i.key===match[1]):source.key===match[1]?source:null);
    if(!item){await ack('Estes botões já foram usados ou substituídos. Envie /agendados de novo.');return;}
    await this.client().editMessageReplyMarkup(this.chat(),messageId).catch(()=>{});
    if(action==='no'){await ack('Nada foi alterado.');await this.clear();await this.send('Nada foi alterado.');return;}
    if(action==='drop'){
      await ack('Confirme o cancelamento.');
      const id=await this.send(`Cancelar o agendamento de ${describe(item)}?\nO carrossel continua salvo no app.`,[[{text:'Sim, cancelar',callback_data:`s:${item.key}:dropok`}],[{text:'Não',callback_data:`s:${item.key}:no`}]]);
      await this.state.change(data=>{data.scheduleChat.pending={...item,status:'confirm',action:'drop',messageId:id};});return;
    }
    if(action==='move'){
      if(this.state.snapshot().jobs.some(j=>['scheduleDate','scheduleConfirm'].includes(j.status))){await ack('Conclua o agendamento pendente antes.');await this.send('Há uma prévia esperando data. Conclua ou cancele esse agendamento antes de trocar outra data.');return;}
      await ack('Envie a nova data.');
      const id=await this.send(`Envie a nova data e hora para “${item.title}”, como 2026-11-03 18:00. Use o horário do computador.`,[[{text:'Cancelar',callback_data:`s:${item.key}:no`}]]);
      await this.state.change(data=>{data.scheduleChat.pending={...item,status:'date',action:'move',messageId:id};});return;
    }
    await ack('Recebido.');await this.clear();
    try{
      // O projeto pode ter mudado no app depois da lista: só altera se ainda é o mesmo agendamento.
      const current=await this.rt.inProfile(item.profileId,()=>this.rt.store.get(item.projectId).schedule);
      if(!current||current.at!==item.at||!OPEN.includes(current.status))throw new Error('Este agendamento mudou no app depois da lista. Envie /agendados de novo.');
      if(action==='dropok'){await this.rt.inProfile(item.profileId,()=>this.rt.request('cancelSchedule',{id:item.projectId}));await this.send(`Agendamento cancelado: “${item.title}”. O carrossel continua salvo no app.`);}
      if(action==='ok'){const p=await this.rt.inProfile(item.profileId,()=>this.rt.request('reschedulePost',{id:item.projectId,at:item.newAt}));await this.send(`Nova data salva: “${item.title}” em ${when(p.schedule.at)}.`);}
    }catch(error){await this.send(`Não foi possível concluir: ${errorText(error)}`);}
  }
}
