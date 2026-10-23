import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { zipSync, strToU8, unzlibSync } from 'fflate';

export function text(value, max=30000) {
  if (typeof value!=='string'||value.length>max) throw new Error('Campo deve ser texto dentro do limite permitido.');
  return value;
}
export function validId(value) {
  if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(value))throw new Error('Identificador inválido.');
  return value;
}
export function pngBytes(input) {
  const bytes=Buffer.from(input);
  if(bytes.length>30*1024*1024||bytes.length<45||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('A imagem não é um PNG válido.');
  let pos=8,header=false,end=false; const idat=[];
  while(pos+12<=bytes.length){
    const n=bytes.readUInt32BE(pos),type=bytes.toString('ascii',pos+4,pos+8);
    if(pos+n+12>bytes.length)throw new Error('PNG incompleto.');
    if(type==='IHDR'){if(n!==13||header||pos!==8)throw new Error('PNG inválido.');header=true;const w=bytes.readUInt32BE(pos+8),h=bytes.readUInt32BE(pos+12);if(!w||!h||w*h>40000000)throw new Error('Dimensões PNG inválidas.');}
    if(type==='IDAT')idat.push(bytes.subarray(pos+8,pos+8+n));
    pos+=n+12;if(type==='IEND'){end=true;break;}
  }
  if(!header||!end||!idat.length||pos!==bytes.length)throw new Error('PNG inválido ou incompleto.');
  try{if(!unzlibSync(Buffer.concat(idat)).length)throw Error();}catch{throw new Error('Pixels PNG inválidos.');}
  return bytes;
}
export function validateReference(reference) {
  if(!reference||typeof reference!=='object')throw new Error('Referência de imagem inválida.');
  const name=text(reference.name,200),dataUrl=text(reference.dataUrl,42*1024*1024);
  if(!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(dataUrl))throw new Error('Referência deve ser uma imagem PNG, JPEG ou WebP.');
  const bytes=Buffer.from(dataUrl.split(',')[1],'base64');
  const kind=dataUrl.slice(11,dataUrl.indexOf(';'));
  if(kind==='png')pngBytes(bytes);
  else if(kind==='jpeg'&&!(bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217))throw new Error('Imagem JPEG inválida.');
  else if(kind==='webp'&&!(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'))throw new Error('Imagem WebP inválida.');
  return {name,dataUrl};
}
const fields=['brand','product','audience','problem','promise','offer','cta','proof','tone','colors','style','freebie','differentiators','territories','designPreset'];
// Documentos aprovados nas entrevistas do curso (Aula 02 e Aula 05).
const documents=['brandContext','designKit'];
export const INTERVIEWS=['brand','design'];
const emptyInterview=()=>({messages:[],document:'',brandName:''});
// Campos de texto do card. Mudar o que aparece na arte deixa a imagem desatualizada.
const slideText=['role','title','body','emphasis','visual','prompt'];
const artText=['title','body','emphasis','visual','prompt'];
const projectText={title:200,brief:30000,caption:30000,architectureId:100,goal:200,editorialLine:2000,visualConcept:4000};
export const CARD_COUNTS=[0,4,6,8,10];
function cardCount(value){const n=Number(value||0);if(!CARD_COUNTS.includes(n))throw new Error('Quantidade de cards inválida.');return n;}
const defaultSettings=()=>({weeklyGoal:5,driveFolder:'',firstCompletedAt:''});
export class Store {
  constructor(root){this.root=resolve(root);this.data={profile:null,projects:[],ideas:[],settings:defaultSettings(),onboarding:{brand:emptyInterview(),design:emptyInterview()}};this.queue=Promise.resolve();}
  async init(){
    await mkdir(join(this.root,'images'),{recursive:true});
    try{this.data=JSON.parse(await readFile(join(this.root,'state.json'),'utf8'));if(!Array.isArray(this.data.projects))throw Error();}
    catch(error){if(error.code!=='ENOENT')throw new Error('A biblioteca local não pôde ser lida. Seus arquivos foram preservados.');}
    this.data.onboarding={brand:emptyInterview(),design:emptyInterview(),...this.data.onboarding};
    if(!Array.isArray(this.data.ideas))this.data.ideas=[];
    this.data.settings={...defaultSettings(),...this.data.settings};
    // Projetos anteriores ao fluxo texto → capa → restante: arte existente vale como texto aprovado.
    for(const p of this.data.projects){if(p.textApproved===undefined)p.textApproved=p.slides.some(s=>s.image);if(!Array.isArray(p.coverOptions))p.coverOptions=[];}
    for(const p of this.data.projects)if(['planning','generating'].includes(p.status)){p.status='draft';p.slides=p.slides.map(s=>s.state==='generating'?{...s,state:s.previousState||(s.image?'complete':'draft')}:s);p.error='A operação foi interrompida. Você pode continuar deste rascunho.';}
    await this.persist();return this;
  }
  state(){return structuredClone(this.data);}
  get(id){validId(id);const p=this.data.projects.find(p=>p.id===id);if(!p)throw new Error('Projeto não encontrado.');return structuredClone(p);}
  persist(){
    const body=JSON.stringify(this.data,null,2);
    const job=this.queue.then(async()=>{const temp=join(this.root,`state-${randomUUID()}.tmp`);await writeFile(temp,body,'utf8');await rename(temp,join(this.root,'state.json'));});
    this.queue=job.catch(()=>{});return job;
  }
  async saveProfile(profile){
    if(!profile||typeof profile!=='object'||Array.isArray(profile))throw new Error('Perfil inválido.');
    const result={};for(const key of Object.keys(profile))if(![...fields,...documents,'references'].includes(key))throw new Error('Campo do perfil não permitido.');
    for(const key of fields)result[key]=text(profile[key]??'',10000);
    for(const key of documents)result[key]=text(profile[key]??'',40000);
    if(profile.references!==undefined&&!Array.isArray(profile.references))throw new Error('Referências inválidas.');
    if((profile.references?.length||0)>6)throw new Error('Use até seis referências.');
    result.references=(profile.references||[]).map(validateReference);this.data.profile=result;await this.persist();return this.state();
  }
  interview(kind){if(!INTERVIEWS.includes(kind))throw new Error('Entrevista inválida.');return structuredClone(this.data.onboarding[kind]);}
  async saveInterview(kind,patch){
    const current=this.interview(kind),next={...current};
    if(patch.messages!==undefined){if(!Array.isArray(patch.messages)||patch.messages.length>80)throw new Error('Conversa inválida.');next.messages=patch.messages.map(m=>({id:validId(m.id),role:m.role==='user'?'user':'assistant',text:text(m.text,20000)}));}
    if(patch.document!==undefined)next.document=text(patch.document,40000);
    if(patch.brandName!==undefined)next.brandName=text(patch.brandName,200);
    this.data.onboarding[kind]=next;await this.persist();return this.interview(kind);
  }
  async resetInterview(kind){this.interview(kind);this.data.onboarding[kind]=emptyInterview();await this.persist();return this.interview(kind);}
  async saveSettings(patch){
    if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new Error('Configurações inválidas.');
    const next={...this.data.settings};
    for(const key of Object.keys(patch)){
      if(key==='weeklyGoal'){const n=Number(patch[key]);if(!Number.isInteger(n)||n<1||n>50)throw new Error('Meta semanal inválida.');next.weeklyGoal=n;}
      else if(key==='driveFolder')next.driveFolder=text(patch[key],1000);
      else if(key==='firstCompletedAt')next.firstCompletedAt=text(patch[key],40);
      else throw new Error('Configuração não permitida.');
    }
    this.data.settings=next;await this.persist();return this.state();
  }
  async createProject({title,brief,architectureId='',goal='',editorialLine='',visualConcept='',cardCount:cards=0}){
    const now=new Date().toISOString();const p={id:randomUUID(),title:text(title,200).trim()||'Novo carrossel',brief:text(brief),architectureId:text(architectureId,100),goal:text(goal,200),cardCount:cardCount(cards),publishedAt:'',stories:[],editorialLine:text(editorialLine,2000),visualConcept:text(visualConcept,4000),textApproved:false,coverOptions:[],ctaKit:null,results:null,status:'draft',slides:[],caption:'',architecture:'',messages:[],createdAt:now,updatedAt:now};
    this.data.projects.unshift(p);await this.persist();return this.get(p.id);
  }
  async saveProject(args){
    if(!args||typeof args!=='object')throw new Error('Projeto inválido.');
    for(const key of Object.keys(args))if(!['id','slides','cardCount',...Object.keys(projectText)].includes(key))throw new Error('Campo do projeto não permitido.');
    const patch={};for(const [key,max] of Object.entries(projectText))if(args[key]!==undefined)patch[key]=text(args[key],max);
    if(args.cardCount!==undefined)patch.cardCount=cardCount(args.cardCount);
    if(args.slides!==undefined){patch.slides=this.validateSlides(args.slides,this.get(args.id).slides);if(patch.slides.some(s=>s.state==='outdated'))patch.status='ready';}
    return this.update(args.id,patch);
  }
  validateSlides(slides,previous=[]){
    if(!Array.isArray(slides)||slides.length>20)throw new Error('Slides inválidos: use até vinte slides.');
    const seen=new Set();return slides.map((s,i)=>{
      const id=validId(s.id||randomUUID());if(seen.has(id))throw new Error('Slide repetido.');seen.add(id);
      const old=previous.find(p=>p.id===id);const result={id,index:i+1};
      for(const k of slideText)result[k]=text(s[k]??'',12000);
      if(old?.image){result.image=old.image;result.versions=old.versions;result.state=artText.some(k=>result[k]!==(old[k]??''))?'outdated':old.state;}
      return result;
    });
  }
  async update(id,patch){this.get(id);const p=this.data.projects.find(p=>p.id===id);Object.assign(p,structuredClone(patch),{updatedAt:new Date().toISOString()});await this.persist();return this.get(id);}
  async duplicate(id){const original=this.get(id),copy={...original,id:randomUUID(),title:`${original.title} (cópia)`,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};copy.status=copy.slides.length&&copy.slides.every(s=>s.image)?'complete':copy.slides.length?'ready':'draft';delete copy.error;this.data.projects.unshift(copy);await this.persist();return this.get(copy.id);}
  async delete(id){this.get(id);this.data.projects=this.data.projects.filter(p=>p.id!==id);await this.persist();return this.state();}
  // Opções de capa ficam no projeto até a pessoa escolher uma (fluxo: texto aprovado → capa → restante).
  async addCoverOption(id,input){
    const bytes=pngBytes(input),p=this.get(id);const file=`${randomUUID()}.png`;await writeFile(join(this.root,'images',file),bytes);
    const option={id:randomUUID(),file,image:`data:image/png;base64,${bytes.toString('base64')}`,createdAt:new Date().toISOString()};
    return this.update(id,{coverOptions:[...(p.coverOptions||[]),option].slice(-6)});
  }
  async chooseCover(id,optionId){
    const p=this.get(id),option=(p.coverOptions||[]).find(o=>o.id===validId(optionId));if(!option)throw new Error('Opção de capa não encontrada.');
    if(!p.slides.length)throw new Error('Crie o texto antes de escolher a capa.');
    return this.addImage(id,p.slides[0].id,Buffer.from(option.image.split(',')[1],'base64'));
  }
  ideaBatches(){return structuredClone(this.data.ideas);}
  async saveIdeaBatch(batch){this.data.ideas=[batch,...this.data.ideas].slice(0,40);await this.persist();return batch;}
  async deleteIdeaBatch(id){validId(id);this.data.ideas=this.data.ideas.filter(b=>b.id!==id);await this.persist();}
  async addImage(id,slideId,input){
    const bytes=pngBytes(input),p=this.get(id),slide=p.slides.find(s=>s.id===validId(slideId));if(!slide)throw new Error('Slide não encontrado.');
    const file=`${randomUUID()}.png`;await writeFile(join(this.root,'images',file),bytes);
    const image=`data:image/png;base64,${bytes.toString('base64')}`;
    slide.versions=[...(slide.versions||[]),{file,createdAt:new Date().toISOString()}];slide.image=image;slide.state='complete';
    return this.update(id,{slides:p.slides});
  }
  // A mesma lista de arquivos serve ao ZIP, ao celular e à pasta do Google Drive.
  exportFiles(id){const p=this.get(id);if(!p.slides.length||p.slides.some(s=>!s.image||s.state==='outdated'||s.state==='generating'))throw new Error('Carrossel incompleto. Atualize as imagens de todos os slides antes de exportar.');const files={};
    for(const [i,s]of p.slides.entries()){const bytes=pngBytes(Buffer.from(s.image.split(',')[1],'base64'));files[`${String(i+1).padStart(2,'0')}.png`]=bytes;}
    files['legenda.txt']=strToU8(p.caption||'');
    if(p.ctaKit){const k=p.ctaKit;files['cta-e-dm.txt']=strToU8([`Palavras-chave: ${k.keywords.join(', ')}`,`CTA do primeiro card: ${k.firstCardCta}`,`CTA do último card: ${k.lastCardCta}`,`Material gratuito: ${k.freebie}`,'',`DM 1:\n${k.dm1}`,'',`DM 2:\n${k.dm2}`].join('\n'));}
    if(p.stories?.length){
      files['stories.txt']=strToU8(p.stories.map((s,i)=>[`STORY ${i+1} — ${s.type}`,s.text,s.sticker?`Sticker: ${s.sticker}`:'',s.cta?`CTA: ${s.cta}`:''].filter(Boolean).join('\n')).join('\n\n'));
      p.stories.forEach((s,i)=>{if(s.image)files[`stories/${String(i+1).padStart(2,'0')}.png`]=pngBytes(Buffer.from(s.image.split(',')[1],'base64'));});
    }
    return files;
  }
  async exportZip(id){return zipSync(this.exportFiles(id),{level:0});}
  async saveStories(id,stories){
    if(!Array.isArray(stories)||!stories.length||stories.length>10)throw new Error('Sequência de stories inválida.');
    const clean=stories.map(s=>({id:validId(s.id||randomUUID()),type:text(String(s.type||'Story'),60),text:text(String(s.text||''),2000),sticker:text(String(s.sticker||''),500),cta:text(String(s.cta||''),500),visual:text(String(s.visual||''),2000)}));
    return this.update(id,{stories:clean});
  }
  async addStoryImage(id,storyId,input){
    const bytes=pngBytes(input),p=this.get(id),story=(p.stories||[]).find(s=>s.id===validId(storyId));if(!story)throw new Error('Story não encontrado.');
    const file=`${randomUUID()}.png`;await writeFile(join(this.root,'images',file),bytes);
    story.image=`data:image/png;base64,${bytes.toString('base64')}`;story.file=file;
    return this.update(id,{stories:p.stories});
  }
}
