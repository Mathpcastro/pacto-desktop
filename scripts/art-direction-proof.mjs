// Electron real: Marca › Design Kit mostra a Direção de arte com a sugestão automática pelo negócio e
// guarda a escolha do usuário. Sem conta ChatGPT nem geração.
import { _electron, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root=resolve('.'),out=join(root,'.cache','art-direction-proof');await mkdir(out,{recursive:true});
const userData=await mkdtemp(join(tmpdir(),'carrossell-art-direction-'));
const env={...process.env,PACTO_USER_DATA:userData,PACTO_AUTOPILOT_NO_TASKS:'1',PACTO_NOTICES_URL:'http://127.0.0.1:9/notices.json'};delete env.ELECTRON_RUN_AS_NODE;
const vite=await createServer({root,logLevel:'error',server:{host:'127.0.0.1',port:0}});
let app;
try{
  await vite.listen();env.PACTO_DEV_URL=`http://127.0.0.1:${vite.httpServer.address().port}`;
  app=await _electron.launch({args:['.'],cwd:root,env});const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.getByRole('region',{name:'Configuração do projeto'}).waitFor();
  await page.evaluate(()=>window.pacto.request('saveProfile',{profile:{brand:'Brotinhos de Fé',product:'Devocionais',audience:'Mães cristãs',brandContext:'Devocional infantil para mães cristãs ensinarem a Bíblia às crianças em casa. '.repeat(3),designKit:'Verde folha e creme, clima acolhedor. '.repeat(4)}}));
  await page.setViewportSize({width:1280,height:900});await page.reload();await page.getByRole('heading',{name:'O que vamos criar hoje?'}).waitFor();
  const license=page.getByRole('dialog',{name:'Ative sua licença'});await license.waitFor({timeout:8000}).then(()=>license.getByRole('button',{name:'Agora não'}).click()).catch(()=>{});
  await page.getByRole('button',{name:'Marca',exact:true}).click();
  await page.getByRole('navigation',{name:'Seções da marca'}).getByRole('button',{name:'Design Kit',exact:true}).click();
  const section=page.getByRole('region',{name:'Direção de arte'});
  const illustration=section.getByLabel('Estilo das ilustrações'),type=section.getByLabel('Tipografia');
  await expect(illustration.locator('option').first()).toHaveText('Automático · Guache e aquarela');
  await expect(type.locator('option').first()).toHaveText('Automático · Arredondada amigável');
  console.log('✔ o automático sugere guache e fonte arredondada para um perfil infantil e cristão');
  await illustration.selectOption('collage');await expect(page.getByText('Direção de arte salva. Vale para as próximas artes.')).toBeVisible();
  const state=await page.evaluate(()=>window.pacto.request('bootstrap'));
  if(state.settings.artDirection?.illustration!=='collage'||state.artDirection.illustration!=='collage'||state.artDirection.type!=='rounded')throw new Error(JSON.stringify(state.artDirection));
  await section.screenshot({path:join(out,'direcao-de-arte.png')});
  console.log('✔ a escolha fica salva e a tipografia continua automática');
  if(errors.length)throw new Error(errors.join('\n'));console.log('✔ sem erros de página');
}finally{
  const proc=app?.process();await Promise.race([app?.close().catch(()=>{}),new Promise(r=>setTimeout(r,8000))]);if(proc&&proc.exitCode===null)proc.kill();
  await vite.close();await rm(userData,{recursive:true,force:true}).catch(()=>{});
}
process.exit(process.exitCode||0);
