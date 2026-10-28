import { _electron as electron } from '@playwright/test';
import { mkdir,readFile,writeFile,stat,cp,mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve,join } from 'node:path';
import { unzipSync } from 'fflate';

// Smoke do executável empacotado: reabre o projeto real com imagens, exporta o ZIP
// e confirma que os modelos (fonte embutida no pacote) e o PDF funcionam fora do dev.
const output=resolve('.cache/packaged-proof');await mkdir(output,{recursive:true});
// Cópia da biblioteca de prova: o smoke cria projetos e não deve alterar o original.
const userData=await mkdtemp(join(tmpdir(),'carrossell-packaged-'));await cp(resolve('.cache/app-proof'),userData,{recursive:true});
const exported=join(output,'exportado-pelo-app.zip');
const env={...process.env,PACTO_USER_DATA:userData};delete env.ELECTRON_RUN_AS_NODE;delete env.PACTO_DEV_URL;
const app=await electron.launch({executablePath:resolve('release/win-unpacked/Carrossell.exe'),env});
const errors=[];const report={completed:false,packaged:true};
try{
  const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1366,height:768});
  const open=page.getByRole('button',{name:'Abrir Escolha uma ideia antes de escrever',exact:true});
  await open.waitFor({timeout:30000});
  const state=await page.evaluate(()=>window.pacto.request('bootstrap'));
  report.course=state.course.length;report.transcribed=state.knowledge.transcribed;
  const project=state.projects.find(p=>p.id==='050acd57-da91-4250-bd24-522dc291681f');
  if(!project||project.slides.filter(s=>s.image).length!==2)throw Error('A biblioteca empacotada não reabriu as imagens reais.');
  await page.screenshot({path:join(output,'inicio.png')});
  await open.click();
  await page.getByLabel('Prévia no Instagram').waitFor();
  await page.screenshot({path:join(output,'estudio-publicar.png')});
  await app.evaluate(({dialog},folder)=>{dialog.showSaveDialog=async(_w,o)=>({canceled:false,filePath:o.defaultPath.endsWith('.zip')?`${folder}\\exportado-pelo-app.zip`:`${folder}\\${o.defaultPath}`});},output);
  await page.getByRole('button',{name:'Mais ações do projeto'}).click();
  await page.getByRole('button',{name:/Baixar ZIP/}).click();
  await page.getByRole('status').filter({hasText:'imagens exportadas'}).waitFor({timeout:15000});
  const files=unzipSync(await readFile(exported));report.zipFiles=Object.keys(files);
  report.images=['01.png','02.png'].map(name=>{const b=Buffer.from(files[name]);return{name,width:b.readUInt32BE(16),height:b.readUInt32BE(20)};});
  if(report.images.some(i=>i.width!==1080||i.height!==1350))throw Error('Exportação fora do padrão 1080x1350.');
  // Modelos e PDF no pacote: sem IA, com a fonte vinda de dentro do app.asar.
  const rendered=await page.evaluate(async()=>{
    const r=window.pacto.request;
    const p=await r('createProject',{title:'Smoke empacotado · modelo',brief:'Texto de teste escrito à mão.',style:'tweet'});
    await r('saveProject',{id:p.id,slides:[{id:'s1',title:'Smoke do app empacotado',body:'Modelo renderizado sem IA.'},{id:'s2',title:'Segundo card',body:''}]});
    await r('approveText',{id:p.id});
    const c=await r('generateCovers',{id:p.id});
    const done=await r('chooseCover',{id:p.id,optionId:c.coverOptions[0].id});
    const d=await r('createProject',{title:'Smoke empacotado · material',brief:'Teste',format:'material'});
    await r('saveProject',{id:d.id,slides:[{id:'d1',layout:'cover',title:'Material de teste',body:'Escrito à mão.'},{id:'d2',layout:'checklist',title:'Lista',body:'Um\nDois'}]});
    await r('approveText',{id:d.id});
    const dc=await r('generateCovers',{id:d.id});
    await r('chooseCover',{id:d.id,optionId:dc.coverOptions[0].id});
    const pdf=await r('exportPdf',{id:d.id});
    return {cards:done.slides.map(s=>s.image.slice(0,40)),cover:done.slides[0].image,pdf};
  });
  const cover=Buffer.from(rendered.cover.split(',')[1],'base64');
  report.template={width:cover.readUInt32BE(16),height:cover.readUInt32BE(20)};
  await writeFile(join(output,'modelo-tweet.png'),cover);
  if(report.template.width!==1080||report.template.height!==1350)throw Error('Modelo fora de 1080x1350 no pacote.');
  report.pdf=(await stat(rendered.pdf.path)).size;
  if(!(await readFile(rendered.pdf.path)).toString('latin1').startsWith('%PDF'))throw Error('PDF inválido no pacote.');
  report.pageErrors=errors;if(errors.length)throw Error(errors.join('\n'));
  report.completed=true;console.log(JSON.stringify(report));
}catch(error){report.error=error.message;process.exitCode=1;console.log(JSON.stringify(report));}
finally{await app.close();await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));}
