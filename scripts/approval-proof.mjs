import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron, expect } from '@playwright/test';
import { createServer } from 'vite';

// Electron real: escolha "Publicar sem revisão" na rotina e aprovação pelo app (publicar agora e agendar).
// A aprovação usa o componente real com um pedido "esperando aprovação" de teste; nada é publicado.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(root,'.cache','approval-proof');await mkdir(out,{recursive:true});
const userData=await mkdtemp(join(tmpdir(),'carrossell-approval-proof-'));
const vite=await createServer({root,logLevel:'error',server:{host:'127.0.0.1',port:0}});await vite.listen();
const env={...process.env,PACTO_USER_DATA:userData,PACTO_AUTOPILOT_NO_TASKS:'1',PACTO_DEV_URL:`http://127.0.0.1:${vite.httpServer.address().port}`,PACTO_NOTICES_URL:'http://127.0.0.1:9/notices.json'};delete env.ELECTRON_RUN_AS_NODE;
const ok=name=>console.log('✔',name);
let app;
try{
  app=await _electron.launch({args:['.'],cwd:root,env});const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>window.pacto);
  await page.evaluate(()=>window.pacto.request('saveProfile',{profile:{brand:'Aprovação · prova',product:'Teste',audience:'Teste',brandContext:'Contexto local de teste. '.repeat(10),designKit:'Preto e branco. '.repeat(10)}}));
  await page.reload();await page.setViewportSize({width:1280,height:900});
  await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:/^Radar/}).click();
  await page.getByRole('tab',{name:'Piloto automático',exact:true}).click();
  await expect(page.locator('.pilot-routine-meta')).toContainText('com revisão antes de publicar');ok('rotina nova começa com revisão');
  await page.getByRole('button',{name:'Configurar rotina',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Configurar rotina',exact:true});
  await dialog.getByLabel('Publicar sem revisão').check();
  await expect(dialog.getByRole('note')).toContainText('sem você ver antes');
  await dialog.getByRole('note').scrollIntoViewIfNeeded();await page.screenshot({path:join(out,'1-publicar-sem-revisao.png')});
  await dialog.getByRole('button',{name:'Salvar rotina'}).click();
  await expect(page.getByText('Rotina salva para este perfil.')).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.locator('.pilot-routine-meta')).toContainText('publica sem revisão');
  await expect(page.locator('.pilot-approval-rule')).toContainText('A rotina publica sem revisão');
  const saved=await page.evaluate(async()=>(await window.pacto.request('telegramStatus')).autopilot.config.approval);assert.equal(saved,'auto');
  ok('"Publicar sem revisão" salvo, com aviso no diálogo e no resumo');
  // Componente real com um pedido esperando aprovação.
  const main=(await vite.transformRequest('/src/main.jsx')).code;
  const reactUrl=main.match(/from "([^"\n]*\/react\.js[^"\n]*)"/)[1],clientUrl=main.match(/from "([^"\n]*\/react-dom_client\.js[^"\n]*)"/)[1];
  await page.evaluate(async({reactUrl,clientUrl})=>{
    const [reactModule,clientModule,{default:Autopilot}]=await Promise.all([import(reactUrl),import(clientUrl),import('/src/components/Autopilot.jsx')]);
    const React=reactModule.default||reactModule,{createRoot}=clientModule.default||clientModule;
    const box=document.createElement('div');box.style.cssText='position:fixed;inset:0;overflow:auto;padding:24px;background:var(--paper);z-index:9999';document.body.append(box);document.querySelector('#root').style.display='none';
    window.__calls=[];
    const state={profileId:'fixture',projects:[],composio:{accounts:[]},account:{connected:true},autopilot:{hasToken:true,paired:true,config:{enabled:true,approval:'review',slots:[{time:'09:00',style:'texto',cardCount:6,architectureId:''}],days:[1,2,3,4,5],accounts:[]},upcoming:[],jobs:[{id:'job-ready',projectId:'p1',status:'ready',title:'Como pedir o primeiro pagamento',createdAt:new Date().toISOString()}]}};
    createRoot(box).render(React.createElement(Autopilot,{pane:'review',state,request:async(action,args)=>{window.__calls.push({action,args});return state;},onNotice:()=>{}}));
  },{reactUrl,clientUrl});
  await page.getByRole('button',{name:'Publicar agora',exact:true}).click();
  await expect(page.getByText('O carrossel vai para o Instagram agora')).toBeVisible();
  await page.screenshot({path:join(out,'2-confirmar-publicacao.png')});
  await page.getByRole('button',{name:'Confirmar e publicar'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__calls.length)).toBe(1);
  assert.deepEqual(await page.evaluate(()=>window.__calls[0]),{action:'approveAutopilot',args:{id:'job-ready'}});ok('Publicar agora pede confirmação e aprova pelo app');
  await page.getByRole('button',{name:'Agendar',exact:true}).click();
  await page.getByLabel('Data e hora do agendamento').fill('2026-11-20T18:30');
  await page.screenshot({path:join(out,'3-agendar.png')});
  await page.getByRole('button',{name:'Confirmar agendamento'}).click();
  await expect.poll(()=>page.evaluate(()=>window.__calls.length)).toBe(2);
  assert.deepEqual(await page.evaluate(()=>window.__calls[1]),{action:'approveAutopilot',args:{id:'job-ready',at:'2026-11-20T18:30'}});ok('Agendar manda a data escolhida');
  await page.setViewportSize({width:390,height:844});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('rolagem lateral no telefone');ok('sem rolagem lateral a 390px');
  assert.deepEqual(errors,[]);ok('sem erros na página');
}finally{if(app){const proc=app.process();await Promise.race([app.close().catch(()=>{}),new Promise(r=>setTimeout(r,8000))]);if(proc.exitCode===null)proc.kill();}await vite.close();await rm(userData,{recursive:true,force:true}).catch(()=>{});}
process.exit(process.exitCode||0);
