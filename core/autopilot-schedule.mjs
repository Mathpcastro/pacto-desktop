import { OsScheduler } from './schedule.mjs';
import { STYLES } from './templates.mjs';

export const PILOT_FLAG='--piloto-automatico';
export const DEFAULT_CONFIG={enabled:false,time:'09:00',times:['09:00'],days:[1,2,3,4,5],style:'texto',cardCount:6,accounts:[],skips:[],nextAt:null};
// Horários por dia: cada um prepara um carrossel. Seis cobre quem posta muito sem lotar a fila.
export const MAX_TIMES=6;
const TIME=/^([01]\d|2[0-3]):[0-5]\d$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
export function validateConfig(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Configuração do piloto inválida.');
  const {enabled=false,time='09:00',days=[1,2,3,4,5],style='texto',cardCount=6,accounts=[],skips=[]}=input;
  // Rotinas salvas antes da 0.7.8 têm só "time".
  const times=input.times===undefined?[time]:input.times;
  if(typeof enabled!=='boolean')throw new Error('Ativação inválida.');
  if(!Array.isArray(times)||!times.length||times.some(t=>typeof t!=='string'||!TIME.test(t)))throw new Error('Escolha um horário válido.');
  if(times.length>MAX_TIMES)throw new Error(`Escolha até ${MAX_TIMES} horários por dia.`);
  if(new Set(times).size!==times.length)throw new Error('Há dois horários iguais. Troque ou remova um deles.');
  if(!Array.isArray(skips)||skips.length>100||skips.some(a=>typeof a!=='string'||!ISO.test(a)))throw new Error('Lista de horários pulados inválida.');
  if(!Array.isArray(days)||!days.length||days.some(n=>!Number.isInteger(n)||n<0||n>6))throw new Error('Escolha pelo menos um dia válido.');
  if(!STYLES.includes(style))throw new Error('Escolha um estilo válido.');
  if(!Number.isInteger(cardCount)||cardCount<2||cardCount>10)throw new Error('Escolha de 2 a 10 cards para publicar.');
  if(!Array.isArray(accounts)||accounts.length>30||accounts.some(a=>typeof a!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(a))||enabled&&!accounts.length)throw new Error('Escolha uma conta do Instagram.');
  const sorted=[...times].sort();
  return {enabled,time:sorted[0],times:sorted,days:[...new Set(days)].sort(),style,cardCount,accounts:[...new Set(accounts)],skips:[...new Set(skips)].sort()};
}
// Próximas ocorrências em ordem, incluindo as puladas (marcadas), para mostrar e controlar.
export function upcomingRuns(config,now=new Date(),count=8){
  const times=[...(config.times||[config.time])].sort(),skips=new Set(config.skips||[]),out=[];
  for(let delta=0;delta<=14&&out.length<count;delta++)for(const time of times){
    const [hours,minutes]=time.split(':').map(Number),at=new Date(now);at.setDate(at.getDate()+delta);at.setHours(hours,minutes,0,0);
    if(at>now&&config.days.includes(at.getDay())&&out.length<count)out.push({at:at.toISOString(),skipped:skips.has(at.toISOString())});
  }
  return out;
}
export function nextRun(config,now=new Date()){
  // Mais pulos do que horários em duas semanas não acontece: a lista tem no máximo 100.
  const next=upcomingRuns(config,now,120).find(run=>!run.skipped);
  if(!next)throw new Error('Não foi possível calcular o próximo horário.');
  return next.at;
}
// Remove pulos que já passaram para a lista não crescer.
export function liveSkips(skips=[],now=new Date()){return skips.filter(at=>new Date(at)>now);}
export class PilotScheduler extends OsScheduler {
  constructor(options){
    super(options);this.args=[...(options.args||[]),PILOT_FLAG];
    this.xmlOptions={executionTimeLimit:'PT0S',description:'Carrossell: criar carrosséis e receber aprovação pelo Telegram'};
    // launchd gerencia um launcher curto; rearmar/remover a tarefa não encerra o app.
    if(this.platform==='darwin'){this.exe='/usr/bin/open';this.args=['-g','-a',options.exe,'--args',...this.args];}
  }
  name(id){return this.platform==='win32'?`Carrossell\\pilot-${id}`:`com.carrossell.pilot.${id}`;}
}
