import { OsScheduler } from './schedule.mjs';
import { STYLES } from './templates.mjs';

export const PILOT_FLAG='--piloto-automatico';
export const DEFAULT_CONFIG={enabled:false,time:'09:00',days:[1,2,3,4,5],style:'texto',cardCount:6,accounts:[],nextAt:null};
export function validateConfig(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Configuração do piloto inválida.');
  const {enabled=false,time='09:00',days=[1,2,3,4,5],style='texto',cardCount=6,accounts=[]}=input;
  if(typeof enabled!=='boolean')throw new Error('Ativação inválida.');
  if(typeof time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('Escolha um horário válido.');
  if(!Array.isArray(days)||!days.length||days.some(n=>!Number.isInteger(n)||n<0||n>6))throw new Error('Escolha pelo menos um dia válido.');
  if(!STYLES.includes(style))throw new Error('Escolha um estilo válido.');
  if(!Number.isInteger(cardCount)||cardCount<2||cardCount>10)throw new Error('Escolha de 2 a 10 cards para publicar.');
  if(!Array.isArray(accounts)||accounts.length>30||accounts.some(a=>typeof a!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(a))||enabled&&!accounts.length)throw new Error('Escolha uma conta do Instagram.');
  return {enabled,time,days:[...new Set(days)].sort(),style,cardCount,accounts:[...new Set(accounts)]};
}
export function nextRun(config,now=new Date()){
  const [hours,minutes]=config.time.split(':').map(Number);
  for(let delta=0;delta<=7;delta++){const at=new Date(now);at.setDate(at.getDate()+delta);at.setHours(hours,minutes,0,0);if(at>now&&config.days.includes(at.getDay()))return at.toISOString();}
  throw new Error('Não foi possível calcular o próximo horário.');
}
export class PilotScheduler extends OsScheduler {
  constructor(options){
    super(options);this.args=[...(options.args||[]),PILOT_FLAG];
    this.xmlOptions={executionTimeLimit:'PT0S',description:'Carrossell: criar carrosséis e receber aprovação pelo Telegram'};
    // launchd gerencia um launcher curto; rearmar/remover a tarefa não encerra o app.
    if(this.platform==='darwin'){this.exe='/usr/bin/open';this.args=['-g','-a',options.exe,'--args',...this.args];}
  }
  name(id){return this.platform==='win32'?`Carrossell\\pilot-${id}`:`com.carrossell.pilot.${id}`;}
}
