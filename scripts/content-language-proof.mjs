// Electron real: o seletor "Idioma" em Ajustes cria o carrossel no idioma escolhido, o botão Ajustes
// mostra o idioma quando ele difere da tela e a escolha vira o padrão do perfil. Sem conta ChatGPT.
import { _electron, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root=resolve('.'),out=join(root,'.cache','content-language-proof');await mkdir(out,{recursive:true});
const userData=await mkdtemp(join(tmpdir(),'carrossell-language-'));
const env={...process.env,PACTO_USER_DATA:userData,PACTO_AUTOPILOT_NO_TASKS:'1',PACTO_NOTICES_URL:'http://127.0.0.1:9/notices.json'};delete env.ELECTRON_RUN_AS_NODE;
const vite=await createServer({root,logLevel:'error',server:{host:'127.0.0.1',port:0}});
let app;
try{
  await vite.listen();env.PACTO_DEV_URL=`http://127.0.0.1:${vite.httpServer.address().port}`;
  app=await _electron.launch({args:['.'],cwd:root,env});const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.getByRole('region',{name:'Configuração do projeto'}).waitFor();
  await page.evaluate(()=>window.pacto.request('saveProfile',{profile:{brand:'Prova local',product:'Interface',audience:'Teste',brandContext:'Fixture local para validar o idioma. '.repeat(4),designKit:'Preto e branco. '.repeat(6)}}));
  await page.setViewportSize({width:1280,height:900});await page.reload();await page.getByRole('heading',{name:'O que vamos criar hoje?'}).waitFor();
  const license=page.getByRole('dialog',{name:'Ative sua licença'});await license.waitFor({timeout:8000}).then(()=>license.getByRole('button',{name:'Agora não'}).click()).catch(()=>{});
  await page.getByRole('button',{name:/^Ajustes/}).click();
  await page.getByRole('button',{name:/Idioma\s+Português do Brasil/}).click();
  await page.getByRole('menu').getByRole('menuitemradio',{name:/^Inglês/}).click();
  await expect(page.getByRole('button',{name:/^Ajustes · Inglês/})).toBeVisible();
  await page.locator('.composer-adjustments').screenshot({path:join(out,'ajustes.png')});
  console.log('✔ Ajustes mostra o seletor e o idioma escolhido');
  await page.getByPlaceholder('Escreva o tema, cole uma ideia ou descreva uma referência…').fill('Three habits for a calmer morning');
  await page.getByRole('button',{name:/Criar carrossel/}).click();
  await expect.poll(async()=>(await page.evaluate(()=>window.pacto.request('bootstrap'))).projects?.[0]?.language,{timeout:15000}).toBe('en');
  const state=await page.evaluate(()=>window.pacto.request('bootstrap'));
  if(state.settings.contentLanguage!=='en')throw new Error(`padrão do perfil: ${state.settings.contentLanguage}`);
  console.log('✔ o carrossel foi criado em inglês e o inglês virou o padrão do perfil');
  if(errors.length)throw new Error(errors.join('\n'));console.log('✔ sem erros de página');
}finally{
  const proc=app?.process();await Promise.race([app?.close().catch(()=>{}),new Promise(r=>setTimeout(r,8000))]);if(proc&&proc.exitCode===null)proc.kill();
  await vite.close();await rm(userData,{recursive:true,force:true}).catch(()=>{});
}
process.exit(process.exitCode||0);
