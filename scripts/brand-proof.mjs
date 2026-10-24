import assert from 'node:assert/strict';
import { _electron } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
const phase=process.argv[2]||'after';
const root=resolve('.');
const output=join(root,'.cache','brand-proof',phase);
await mkdir(output,{recursive:true});
const userData=await mkdtemp(join(tmpdir(),'carrossell-brand-proof-'));
const server=await createServer({root,server:{host:'127.0.0.1',port:0}});
const report={phase,fixture:'Manual UI verification only; no AI generation',screens:[],errors:[]};
let app;
try{
 await server.listen();
 const env={...process.env,PACTO_USER_DATA:userData,PACTO_DEV_URL:`http://127.0.0.1:${server.httpServer.address().port}`};
 delete env.ELECTRON_RUN_AS_NODE;
 app=await _electron.launch({args:['.'],cwd:root,env});
 const page=await app.firstWindow();
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.getByRole('heading',{name:'Seu projeto, montado com você.'}).waitFor();
 report.identity=await app.evaluate(({app})=>({name:app.getName(),userData:app.getPath('userData')}));
 const setSize=async(width,height)=>{await app.evaluate(({BrowserWindow},{width,height})=>BrowserWindow.getAllWindows()[0].setContentSize(width,height),{width,height});};
 const setTheme=async theme=>{if(await page.locator('html').getAttribute('data-theme')!==theme)await page.getByRole('button',{name:theme==='dark'?'Ativar tema escuro':'Ativar tema claro',exact:true}).click();await page.waitForTimeout(180);};
 const shot=async(name,width,theme)=>{
   await setSize(width,850);await setTheme(theme);
   await page.screenshot({path:join(output,`${name}-${width}-${theme}.png`)});
   const metrics=await page.evaluate(()=>{
     const selectors=['.app-header','.wordmark','.main-nav','.header-tools','.course-link'];
     return Object.fromEntries(selectors.map(selector=>{const e=document.querySelector(selector);if(!e)return[selector,null];const r=e.getBoundingClientRect();const c=getComputedStyle(e);return[selector,{x:r.x,y:r.y,width:r.width,height:r.height,font:c.fontFamily,fontSize:c.fontSize}];}));
   });
   report.screens.push({name,width,theme,metrics,scrollWidth:await page.evaluate(()=>document.documentElement.scrollWidth)});
 };
 await shot('onboarding',1440,'light');await shot('onboarding',1440,'dark');
 const projectId=await page.evaluate(async()=>{
   await window.pacto.request('saveProfile',{profile:{brand:'Verificação visual',product:'Material manual para validar a interface',audience:'Verificação de software'}});
   const p=await window.pacto.request('createProject',{title:'Verificação visual da biblioteca',brief:'Fixture manual; não é resultado de IA.'});
   await window.pacto.request('saveProject',{id:p.id,slides:[{id:'brand-first',title:'Uma ideia por card',body:'Texto manual para verificar o editor.',visual:'Sem imagem gerada',prompt:''},{id:'brand-last',title:'Próximo passo',body:'A interface continua no mesmo lugar.',visual:'Sem imagem gerada',prompt:''}]});
   return p.id;
 });
 await page.reload();await page.getByRole('button',{name:'Abrir Verificação visual da biblioteca',exact:true}).waitFor();
 for(const width of [1440,1000])for(const theme of ['light','dark'])await shot('library',width,theme);
 await setSize(1440,850);
 await page.getByRole('button',{name:'Abrir Verificação visual da biblioteca',exact:true}).click();
 await page.getByRole('textbox',{name:'Título',exact:true}).first().waitFor();
 for(const theme of ['light','dark'])await shot('editor',1440,theme);
 await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 report.themePersists=true;report.projectId=projectId;
 if(phase==='after'){
   assert.equal(await page.title(),'Carrossell · Estúdio de carrosséis');
   await page.getByRole('button',{name:'Carrossell, início',exact:true}).waitFor();
   const baseline=JSON.parse(await readFile(join(root,'.cache','brand-proof','before','report.json'),'utf8'));
   report.layoutChanges=[];
   for(let i=0;i<report.screens.length;i++){
     const current=report.screens[i],before=baseline.screens[i];
     for(const selector of ['.app-header','.main-nav','.header-tools','.course-link']){
       const a=current.metrics[selector],b=before.metrics[selector];if(!a||!b)continue;
       for(const key of ['x','y','width','height'])if(Math.abs(a[key]-b[key])>1)report.layoutChanges.push({screen:`${current.name}-${current.width}-${current.theme}`,selector,key,before:b[key],after:a[key]});
       assert.equal(a.font,b.font,`Changed font: ${selector}`);assert.equal(a.fontSize,b.fontSize,`Changed type size: ${selector}`);
     }
   }
   assert.deepEqual(report.layoutChanges,[],'Tutorial-visible header layout changed');
 }
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.passed=false;report.error=error.stack;process.exitCode=1;}
finally{if(app)await app.close();await server.close();await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
