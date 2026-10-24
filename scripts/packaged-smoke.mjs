import { _electron as electron } from '@playwright/test';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { unzipSync } from 'fflate';

const output=resolve('.cache/packaged-proof');await mkdir(output,{recursive:true});
const userData=resolve('.cache/app-proof');
const exported=join(output,'exportado-pelo-app.zip');
const env={...process.env,PACTO_USER_DATA:userData};delete env.ELECTRON_RUN_AS_NODE;delete env.PACTO_DEV_URL;
const app=await electron.launch({executablePath:resolve('release/win-unpacked/Carrossell.exe'),env});
const errors=[];const report={completed:false,packaged:true};
try{
  const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
  await page.getByRole('button',{name:'Abrir Escolha uma ideia antes de escrever',exact:true}).waitFor({timeout:30000});
  const state=await page.evaluate(()=>window.pacto.request('bootstrap'));
  report.course=state.course.length;report.transcribed=state.knowledge.transcribed;
  const project=state.projects.find(p=>p.id==='050acd57-da91-4250-bd24-522dc291681f');
  if(!project||project.slides.filter(s=>s.image).length!==2)throw Error('A biblioteca empacotada não reabriu as imagens reais.');
  await page.screenshot({path:join(output,'biblioteca.png')});
  await page.getByRole('button',{name:'Abrir Escolha uma ideia antes de escrever',exact:true}).click();
  await page.getByRole('button',{name:'Exportar',exact:true}).waitFor();
  await page.screenshot({path:join(output,'editor.png')});
  await app.evaluate(({dialog},path)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:path});},exported);
  await page.getByRole('button',{name:'Exportar',exact:true}).click();
  await page.getByRole('status').filter({hasText:'imagens exportadas'}).waitFor({timeout:10000});
  const files=unzipSync(await readFile(exported));report.zipFiles=Object.keys(files);
  report.images=['01.png','02.png'].map(name=>{const b=Buffer.from(files[name]);return{name,width:b.readUInt32BE(16),height:b.readUInt32BE(20)};});
  if(report.images.some(i=>i.width!==1080||i.height!==1350))throw Error('Exportação fora do padrão1080x1350.');
  report.pageErrors=errors;if(errors.length)throw Error(errors.join('\n'));
  report.completed=true;console.log(JSON.stringify(report));
}catch(error){report.error=error.message;process.exitCode=1;console.log(JSON.stringify(report));}
finally{await app.close();await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));}
