import { mkdtemp,mkdir,copyFile,rm,writeFile,readFile } from 'node:fs/promises';
import { tmpdir,homedir } from 'node:os';
import { resolve,join,relative,isAbsolute } from 'node:path';
import { CodexClient } from '../core/codex.mjs';
import { Store } from '../core/store.mjs';
import { Runtime } from '../core/runtime.mjs';
import { loadKnowledge } from '../core/knowledge.mjs';
import { unzipSync } from 'fflate';

const output=resolve('.cache/app-proof');await mkdir(output,{recursive:true});
const privateRoot=await mkdtemp(join(tmpdir(),'pacto-app-proof-'));
const home=join(privateRoot,'auth');await mkdir(home,{recursive:true});
const report={purpose:'Teste técnico real do Runtime do aplicativo, sem simular inferência ou imagens',startedAt:new Date().toISOString(),completed:false};
let codex;
try{
  await copyFile(join(process.env.CODEX_HOME||join(homedir(),'.codex'),'auth.json'),join(home,'auth.json'));
  codex=new CodexClient({home,workspace:join(privateRoot,'generation'),onActivity:message=>console.log(JSON.stringify({activity:message}))});
  const status=await codex.start();report.connected=status.account.connected;report.model=status.model;
  const store=await new Store(join(output,'library')).init();
  const runtime=new Runtime({store,codex,knowledge:loadKnowledge(),emit:event=>{
    if(event.type==='activity')console.log(JSON.stringify({activity:event.message}));
    if(event.type==='project')console.log(JSON.stringify({status:event.project.status,slides:event.project.slides.length,images:event.project.slides.filter(s=>s.image).length}));
  },dialogs:{export:async(project,bytes)=>{const path=join(output,'carrossel-pacto-prova.zip');await writeFile(path,bytes);return{path,count:project.slides.length};}}});
  await runtime.request('saveProfile',{profile:{brand:'PACTO',product:'Aplicativo Windows para criar e organizar carrosséis com o método P.A.C.T.O.',audience:'Criadores e pequenos negócios que querem organizar a produção de conteúdo',problem:'Muitas ideias soltas e dificuldade de escolher o assunto de um post',promise:'Ajudar a organizar uma pauta clara antes de escrever',offer:'Aplicativo Electron por R$47, com a própria conta ChatGPT do comprador',cta:'Salvar o post para revisar antes de escrever',proof:'',tone:'Direto e didático',colors:'Azul-marinho #16324f e branco quente #f5f3ee',style:'Editorial limpo, hierarquia forte, pequenas ilustrações originais de cartões, sem mascote',freebie:'Nenhum material gratuito prometido neste teste',differentiators:'Método do curso aplicado dentro do app',territories:'Pautas, organização de ideias e produção de carrosséis'}});
  const project=await runtime.request('createProject',{title:'Prova técnica — PACTO 4:5',brief:'Ensine a escolher uma ideia central antes de escrever um carrossel. Gere exatamente dois slides para um teste técnico: capa com promessa específica e segundo card com uma ação prática e convite para salvar. Não prometa resultados financeiros nem material em DM. Ambos serão imagens separadas verticais 4:5.'});
  report.projectId=project.id;
  async function waitJob(){const deadline=Date.now()+20*60000;while(runtime.job){if(Date.now()>deadline){await runtime.request('cancel',{id:project.id});throw Error('Timeout do teste real.');}await new Promise(r=>setTimeout(r,500));}const current=store.get(project.id);if(current.status==='error')throw Error(current.error);return current;}
  await runtime.request('sendMessage',{id:project.id,text:'Crie o plano com exatamente dois slides didáticos conforme o briefing. Adapte a arquitetura sem enchimento. A marca é PACTO, sem usar resultados pessoais do professor. CTA para salvar, sem promessa de material gratuito. Retorne a copy pronta para revisão.'});
  const plan=await waitJob();report.planSlides=plan.slides.length;
  if(plan.slides.length!==2)throw Error(`O modelo retornou ${plan.slides.length} slides em vez de dois.`);
  await writeFile(join(output,'plano.json'),JSON.stringify({...plan,slides:plan.slides.map(({image,versions,...s})=>s)},null,2));
  await runtime.request('generateSlides',{id:project.id});
  const generated=await waitJob();report.generatedSlides=generated.slides.filter(s=>s.image).length;
  report.dimensions=[];
  for(const slide of generated.slides){const bytes=Buffer.from(slide.image.split(',')[1],'base64');const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);report.dimensions.push({index:slide.index,width,height,ratio:width/height});await writeFile(join(output,`${String(slide.index).padStart(2,'0')}.png`),bytes);}
  if(report.dimensions.some(d=>Math.abs(d.ratio-0.8)>0.01))throw Error('O gerador não respeitou 4:5. As imagens foram preservadas para diagnóstico.');
  report.export=await runtime.request('export',{id:project.id});
  const zip=unzipSync(await readFile(report.export.path));report.zipFiles=Object.keys(zip);
  if(!zip['01.png']||!zip['02.png']||!zip['legenda.txt'])throw Error('ZIP incompleto.');
  const reopened=await new Store(join(output,'library')).init();report.reopenedImages=reopened.get(project.id).slides.filter(s=>s.image).length;
  report.completed=report.reopenedImages===2;console.log(JSON.stringify({completed:report.completed,dimensions:report.dimensions,zipFiles:report.zipFiles}));
}catch(error){report.error=error.message;console.log(JSON.stringify({error:report.error}));process.exitCode=1;}
finally{
  codex?.stop();await new Promise(r=>setTimeout(r,500));
  const rel=relative(resolve(tmpdir()),resolve(privateRoot));
  if(!rel.startsWith('pacto-app-proof-')||rel.includes('..')||isAbsolute(rel))throw Error('Diretório de prova fora do destino esperado.');
  await rm(privateRoot,{recursive:true,force:true});report.finishedAt=new Date().toISOString();await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));
}
