// Electron real sobre uma CÓPIA de uma biblioteca existente (só a pasta library, sem bot, conta nem
// segredos): o app abre os projetos depois da troca do base64 por arquivos em blobs/, as artes chegam
// à tela e uma nova gravação continua pequena.
// Uso: node scripts/library-blobs-proof.mjs <pasta library copiada>
import { _electron, expect } from '@playwright/test';
import { createServer } from 'vite';
import { cp, mkdtemp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const source=process.argv[2];if(!source)throw new Error('Informe a pasta library copiada.');
const root=resolve('.'),out=join(root,'.cache','library-blobs-proof');await mkdir(out,{recursive:true});
const userData=await mkdtemp(join(tmpdir(),'carrossell-library-blobs-'));await cp(source,join(userData,'library'),{recursive:true});
const env={...process.env,PACTO_USER_DATA:userData,PACTO_AUTOPILOT_NO_TASKS:'1',PACTO_NOTICES_URL:'http://127.0.0.1:9/notices.json'};delete env.ELECTRON_RUN_AS_NODE;
const vite=await createServer({root,logLevel:'error',server:{host:'127.0.0.1',port:0}});
let app;
try{
  await vite.listen();env.PACTO_DEV_URL=`http://127.0.0.1:${vite.httpServer.address().port}`;
  app=await _electron.launch({args:['.'],cwd:root,env});const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1280,height:900});
  await page.waitForFunction(()=>window.pacto);
  const license=page.getByRole('dialog',{name:'Ative sua licença'});await license.waitFor({timeout:10000}).then(()=>license.getByRole('button',{name:'Agora não'}).click()).catch(()=>{});
  let best=null;
  for(const profile of (await page.evaluate(()=>window.pacto.request('bootstrap'))).profiles){
    const state=await page.evaluate(id=>window.pacto.request('switchProfile',{id}),profile.id);
    const images=state.projects.flatMap(p=>p.slides.map(s=>s.image).filter(Boolean));
    if(images.some(i=>!i.startsWith('data:image/')))throw new Error('imagem que não voltou a ser data URL');
    if(!best||images.length>best.count)best={id:profile.id,count:images.length,projects:state.projects.length};
  }
  if(!best?.count)throw new Error('nenhuma arte encontrada na biblioteca copiada');
  await page.evaluate(id=>window.pacto.request('switchProfile',{id}),best.id);await page.reload();
  await license.waitFor({timeout:5000}).then(()=>license.getByRole('button',{name:'Agora não'}).click()).catch(()=>{});
  console.log(`✔ ${best.projects} projetos e ${best.count} artes voltaram como imagem`);
  await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:/^Conteúdos/}).click();
  await expect.poll(()=>page.evaluate(()=>[...document.images].filter(i=>i.src.startsWith('data:image/')&&i.complete&&i.naturalWidth>0).length),{timeout:15000}).toBeGreaterThan(0);
  await page.screenshot({path:join(out,'conteudos.png')});console.log('✔ as artes aparecem na tela de Conteúdos');
  const folder=best.id==='principal'?join(userData,'library'):join(userData,'library','profiles',best.id);
  await page.evaluate(()=>window.pacto.request('saveSettings',{weeklyGoal:4}));
  const size=(await stat(join(folder,'state.json'))).size,raw=await readFile(join(folder,'state.json'),'utf8');
  if(size>2e6||raw.includes(';base64,'))throw new Error(`state.json com ${size} bytes`);
  console.log(`✔ nova gravação: state.json com ${Math.round(size/1024)} KB, sem base64`);
  if(errors.length)throw new Error(errors.join('\n'));console.log('✔ sem erros de página');
}finally{
  const proc=app?.process();await Promise.race([app?.close().catch(()=>{}),new Promise(r=>setTimeout(r,8000))]);if(proc&&proc.exitCode===null)proc.kill();
  await vite.close();await rm(userData,{recursive:true,force:true}).catch(()=>{});
}
process.exit(process.exitCode||0);
