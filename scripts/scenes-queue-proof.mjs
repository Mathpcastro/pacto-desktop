// Electron real: cenas sugeridas mostram a ideia em texto (antes eram quadros cinza "Prévia depois de
// aprovar", que pareciam carregamento travado) e várias aprovações seguidas entram na fila em vez de
// falhar. Sem conta ChatGPT: a fila fica esperando a conexão.
import { _electron, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root=resolve('.'),out=join(root,'.cache','scenes-queue-proof');await mkdir(out,{recursive:true});
const userData=await mkdtemp(join(tmpdir(),'carrossell-scenes-'));
const env={...process.env,PACTO_USER_DATA:userData,PACTO_AUTOPILOT_NO_TASKS:'1',PACTO_NOTICES_URL:'http://127.0.0.1:9/notices.json'};delete env.ELECTRON_RUN_AS_NODE;
const vite=await createServer({root,logLevel:'error',server:{host:'127.0.0.1',port:0}});
let app;
try{
  await vite.listen();env.PACTO_DEV_URL=`http://127.0.0.1:${vite.httpServer.address().port}`;
  app=await _electron.launch({args:['.'],cwd:root,env});const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>window.pacto);
  await page.evaluate(()=>window.pacto.request('saveProfile',{profile:{brand:'Prova',product:'Terapia',audience:'Adultos',brandContext:'Psicóloga que atende online. '.repeat(6),designKit:'Verde e creme. '.repeat(6)}}));
  await page.evaluate(()=>window.pacto.request('saveMedia',{addScenes:[{label:'Livro deixado de lado',prompt:'Mesa de canto com um livro aberto virado para baixo, xícara de chá e luz da tarde.'},{label:'Agenda e demandas',prompt:'Agenda de papel aberta com post-its e caneta sobre a mesa de trabalho.'},{label:'Espaço para terapia online',prompt:'Notebook numa mesa limpa, planta e almofada, pronto para a sessão online.'}]}));
  await page.setViewportSize({width:1280,height:900});await page.reload();
  const license=page.getByRole('dialog',{name:'Ative sua licença'});await license.waitFor({timeout:10000}).then(()=>license.getByRole('button',{name:'Agora não'}).click()).catch(()=>{});
  await page.getByRole('button',{name:'Marca',exact:true}).click();
  await page.getByRole('navigation',{name:'Seções da marca'}).getByRole('button',{name:/fotos/i}).first().click();
  const grid=page.locator('.scene-grid');
  await expect(grid.getByText('Aprove para gerar a foto')).toHaveCount(3);
  await expect(grid.getByText('Agenda de papel aberta com post-its')).toBeVisible();
  await expect(grid.getByText('Prévia depois de aprovar')).toHaveCount(0);
  console.log('✔ cada cena mostra a ideia em texto e diz que a foto vem depois de aprovar');
  const approve=grid.getByRole('button',{name:'Aprovar'});
  await approve.first().click();await approve.first().click();
  await expect(grid.getByText('Na fila para gerar a foto')).toHaveCount(2);
  await grid.screenshot({path:join(out,'cenas.png')});
  console.log('✔ duas aprovações seguidas entram na fila, sem erro');
  if(errors.length)throw new Error(errors.join('\n'));console.log('✔ sem erros de página');
}finally{
  const proc=app?.process();await Promise.race([app?.close().catch(()=>{}),new Promise(r=>setTimeout(r,8000))]);if(proc&&proc.exitCode===null)proc.kill();
  await vite.close();await rm(userData,{recursive:true,force:true}).catch(()=>{});
}
process.exit(process.exitCode||0);
