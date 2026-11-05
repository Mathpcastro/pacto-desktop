import assert from 'node:assert/strict';
import { createServer as httpServer } from 'node:http';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron, expect } from '@playwright/test';
import { createServer } from 'vite';

// Avisos no Electron real com um arquivo de avisos local (PACTO_NOTICES_URL, só em desenvolvimento).
// Prova: sino com contagem, faixa do aviso importante, botão que abre Marca › Contexto e leitura salva.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(root,'.cache','notices-proof');await mkdir(out,{recursive:true});
const feed={notices:[
  {id:'estrategia-contexto',date:'2026-11-05',important:true,title:'Seu Contexto da Marca agora vira um plano de venda',body:'Na aba Marca › Contexto, o botão "Melhorar estratégia" reescreve o seu Contexto com público, assuntos e CTA pensados para vender.',action:{label:'Melhorar estratégia',view:'brand:contexto'}},
  {id:'live-teste',date:'2026-11-04',title:'Aula ao vivo na quinta',body:'Vou mostrar a rotina com vários horários.'},
]};
const server=httpServer((req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(feed));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const userData=await mkdtemp(join(tmpdir(),'carrossell-notices-proof-'));
const vite=await createServer({root,logLevel:'error',server:{host:'127.0.0.1',port:0}});await vite.listen();
const env={...process.env,PACTO_USER_DATA:userData,PACTO_AUTOPILOT_NO_TASKS:'1',PACTO_DEV_URL:`http://127.0.0.1:${vite.httpServer.address().port}`,PACTO_NOTICES_URL:`http://127.0.0.1:${server.address().port}/notices.json`};delete env.ELECTRON_RUN_AS_NODE;
const ok=name=>console.log('✔',name);
let app;
try{
  app=await _electron.launch({args:['.'],cwd:root,env});const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>window.pacto);
  await page.evaluate(()=>window.pacto.request('saveProfile',{profile:{brand:'Avisos · prova',product:'Teste',audience:'Teste',brandContext:'# CONTEXTO OFICIAL DA MARCA\n\n## 1. Negócio e oferta\n'+'Agenda online para clínicas. '.repeat(20),designKit:'# DESIGN KIT\n'+'Preto e branco. '.repeat(20)}}));
  await page.reload();await page.setViewportSize({width:1280,height:860});
  const bell=page.getByRole('button',{name:/Avisos do Carrossell, 2 não lidos/});
  await expect(bell).toBeVisible({timeout:15000});ok('sino mostra 2 avisos não lidos');
  const banner=page.locator('.notice-banner');await expect(banner).toContainText('Seu Contexto da Marca agora vira um plano de venda');
  await page.screenshot({path:join(out,'1-faixa-e-sino.png')});ok('faixa do aviso importante');
  await bell.click();const dialog=page.getByRole('dialog',{name:'Avisos do Carrossell'});
  await expect(dialog.locator('.notice-item')).toHaveCount(2);await page.screenshot({path:join(out,'2-lista.png')});
  await page.keyboard.press('Escape');ok('lista de avisos');
  await banner.getByRole('button',{name:'Melhorar estratégia'}).click();
  await expect(page.getByRole('heading',{name:'Melhorar a estratégia de venda'})).toBeVisible();
  await expect(page.locator('.notice-banner')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Avisos do Carrossell, 1 não lido$/})).toBeVisible();
  await page.screenshot({path:join(out,'3-marca-contexto.png')});ok('botão do aviso abre Marca › Contexto e marca como lido');
  await page.setViewportSize({width:390,height:844});await page.reload();await page.waitForTimeout(800);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('rolagem lateral no telefone');ok('sem rolagem lateral a 390px');
  {const proc=app.process();await Promise.race([app.close(),new Promise(r=>setTimeout(r,8000))]);if(proc.exitCode===null){console.log('aviso: primeira janela não fechou em 8 s');proc.kill();}}app=null;
  // Reabrir: o aviso lido continua lido e não vira notificação de novo.
  app=await _electron.launch({args:['.'],cwd:root,env});const again=await app.firstWindow();await again.waitForFunction(()=>window.pacto);
  const state=await again.evaluate(async()=>(await window.pacto.request('bootstrap')).notices);
  assert.equal(state.unread,1);assert.equal(state.items.find(n=>n.id==='estrategia-contexto').read,true);ok('leitura salva depois de reabrir');await again.waitForTimeout(4000);
  assert.deepEqual(errors,[]);ok('sem erros na página');
}finally{if(app){const proc=app.process();await Promise.race([app.close().catch(()=>{}),new Promise(r=>setTimeout(r,8000))]);if(proc.exitCode===null){console.log('aviso: o Electron não fechou em 8 s; encerrando');proc.kill();}}await vite.close();server.closeAllConnections();server.close();await rm(userData,{recursive:true,force:true}).catch(()=>{});}
process.exit(process.exitCode||0);
