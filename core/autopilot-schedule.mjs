import { OsScheduler } from './schedule.mjs';
import { STYLES } from './templates.mjs';
import { ARCHITECTURE_FLOW } from './copy.mjs';

// Arquiteturas do método que um horário pode fixar; vazio deixa o app escolher pela pauta.
export const ARCHITECTURES=Object.keys(ARCHITECTURE_FLOW);

export const PILOT_FLAG='--piloto-automatico';
export const DEFAULT_CONFIG={enabled:false,time:'09:00',times:['09:00'],slots:[{time:'09:00',style:'texto',cardCount:6,architectureId:''}],days:[1,2,3,4,5],style:'texto',cardCount:6,accounts:[],skips:[],nextAt:null};
// Horários por dia: cada um prepara um carrossel. Seis cobre quem posta muito sem lotar a fila.
export const MAX_TIMES=6;
const TIME=/^([01]\d|2[0-3]):[0-5]\d$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
export function validateConfig(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Configuração do piloto inválida.');
  const {enabled=false,time='09:00',days=[1,2,3,4,5],style='texto',cardCount=6,accounts=[],skips=[]}=input;
  // Cada horário tem o seu tipo de carrossel. Rotinas antigas têm "times" (0.7.8) ou só "time",
  // com um estilo e uma quantidade de cards para todos.
  const legacy=input.times===undefined?[time]:input.times;
  const slots=input.slots===undefined?(Array.isArray(legacy)?legacy.map(t=>({time:t,style,cardCount,architectureId:''})):legacy):input.slots;
  if(typeof enabled!=='boolean')throw new Error('Ativação inválida.');
  if(!Array.isArray(slots)||!slots.length||slots.some(x=>!x||typeof x!=='object'||typeof x.time!=='string'||!TIME.test(x.time)))throw new Error('Escolha um horário válido.');
  if(slots.length>MAX_TIMES)throw new Error(`Escolha até ${MAX_TIMES} horários por dia.`);
  if(new Set(slots.map(x=>x.time)).size!==slots.length)throw new Error('Há dois horários iguais. Troque ou remova um deles.');
  for(const x of slots){
    if(!STYLES.includes(x.style))throw new Error(`Escolha um estilo válido para ${x.time}.`);
    if(!Number.isInteger(x.cardCount)||x.cardCount<2||x.cardCount>10)throw new Error(`Escolha de 2 a 10 cards para publicar às ${x.time}.`);
    if(x.architectureId!==undefined&&x.architectureId!==''&&!ARCHITECTURES.includes(x.architectureId))throw new Error(`Escolha um tipo de carrossel válido para ${x.time}.`);
  }
  if(!Array.isArray(skips)||skips.length>100||skips.some(a=>typeof a!=='string'||!ISO.test(a)))throw new Error('Lista de horários pulados inválida.');
  if(!Array.isArray(days)||!days.length||days.some(n=>!Number.isInteger(n)||n<0||n>6))throw new Error('Escolha pelo menos um dia válido.');
  if(!Array.isArray(accounts)||accounts.length>30||accounts.some(a=>typeof a!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(a))||enabled&&!accounts.length)throw new Error('Escolha uma conta do Instagram.');
  const sorted=slots.map(({time,style,cardCount,architectureId=''})=>({time,style,cardCount,architectureId})).sort((a,b)=>a.time.localeCompare(b.time));
  // time/times/style/cardCount espelham o primeiro horário para quem ainda lê o formato antigo.
  return {enabled,time:sorted[0].time,times:sorted.map(x=>x.time),slots:sorted,days:[...new Set(days)].sort(),style:sorted[0].style,cardCount:sorted[0].cardCount,accounts:[...new Set(accounts)],skips:[...new Set(skips)].sort()};
}
// Próximas ocorrências em ordem, incluindo as puladas (marcadas), para mostrar e controlar.
export function upcomingRuns(config,now=new Date(),count=8){
  const times=[...(config.times||[config.time])].sort(),skips=new Set(config.skips||[]),out=[];
  for(let delta=0;delta<=14&&out.length<count;delta++)for(const time of times){
    const [hours,minutes]=time.split(':').map(Number),at=new Date(now);at.setDate(at.getDate()+delta);at.setHours(hours,minutes,0,0);
    if(at>now&&config.days.includes(at.getDay())&&out.length<count)out.push({at:at.toISOString(),time,skipped:skips.has(at.toISOString())});
  }
  return out;
}
export function nextRun(config,now=new Date()){
  // Mais pulos do que horários em duas semanas não acontece: a lista tem no máximo 100.
  const next=upcomingRuns(config,now,120).find(run=>!run.skipped);
  if(!next)throw new Error('Não foi possível calcular o próximo horário.');
  return next.at;
}
// O horário (HH:MM no relógio do computador) que corresponde a uma ocorrência.
export function slotFor(config,at){
  const date=new Date(at),time=Number.isNaN(date.getTime())?'':`${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  return config.slots.find(x=>x.time===time)||config.slots[0];
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
