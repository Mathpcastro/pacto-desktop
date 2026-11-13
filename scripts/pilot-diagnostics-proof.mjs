// Electron real: o diário do piloto (pilot.log) registra a abertura do app e o PC acordando, e o botão
// "Copiar diagnóstico" põe na área de transferência o resumo com o diário. Restaura a área de
// transferência do usuário no fim. Sem contas, bot ou geração.
import { _electron, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root=resolve('.'),out=join(root,'.cache','pilot-diagnostics-proof');await mkdir(out,{recursive:true});
const userData=await mkdtemp(join(tmpdir(),'carrossell-diagnostics-'));
const env={...process.env,PACTO_USER_DATA:userData,PACTO_AUTOPILOT_NO_TASKS:'1',PACTO_NOTICES_URL:'http://127.0.0.1:9/notices.json'};delete env.ELECTRON_RUN_AS_NODE;
const vite=await createServer({root,logLevel:'error',server:{host:'127.0.0.1',port:0}});
let app,saved=null;
try{
  await vite.listen();env.PACTO_DEV_URL=`http://127.0.0.1:${vite.httpServer.address().port}`;
  app=await _electron.launch({args:['.'],cwd:root,env});const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  saved=await app.evaluate(({clipboard})=>clipboard.readText());
  await page.getByRole('region',{name:'Configuração do projeto'}).waitFor();
  await page.evaluate(()=>window.pacto.request('saveProfile',{profile:{brand:'Prova local',product:'Interface',audience:'Teste',brandContext:'Fixture local para validar o diagnóstico. '.repeat(4),designKit:'Preto e branco. '.repeat(6)}}));
  await page.setViewportSize({width:1280,height:900});await page.reload();await page.getByRole('heading',{name:'O que vamos criar hoje?'}).waitFor();
  const license=page.getByRole('dialog',{name:'Ative sua licença'});await license.waitFor({timeout:8000}).then(()=>license.getByRole('button',{name:'Agora não'}).click()).catch(()=>{});
  await app.evaluate(({powerMonitor})=>{powerMonitor.emit('suspend');powerMonitor.emit('resume');});
  await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:/^Radar/}).click();
  await page.getByRole('tab',{name:'Piloto automático',exact:true}).click();
  const button=page.getByRole('button',{name:'Copiar diagnóstico'});await button.scrollIntoViewIfNeeded();
  await page.locator('.pilot-requirement').screenshot({path:join(out,'botao.png')});
  await button.click();await expect(page.getByText('Diagnóstico copiado. Cole na conversa com o suporte.')).toBeVisible();
  const text=await app.evaluate(({clipboard})=>clipboard.readText());await writeFile(join(out,'diagnostico.txt'),text);
  for(const part of ['Carrossell · diagnóstico do piloto automático','Versão: ','Telegram: sem bot','Diário (mais recente no fim):','"event":"app-aberto"','"event":"pc-suspenso"','"event":"pc-acordou"'])if(!text.includes(part))throw new Error(`faltou no diagnóstico: ${part}`);
  console.log('✔ o botão copia o diagnóstico com a versão, o estado e o diário');
  const log=await readFile(join(userData,'pilot.log'),'utf8');if(!/"event":"pc-acordou"/.test(log))throw new Error('pilot.log sem o PC acordando');
  console.log('✔ pilot.log registra a abertura do app, a suspensão e o PC acordando');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(4500);await page.locator('.pilot-requirement').screenshot({path:join(out,'botao-celular.png')});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw new Error('rolagem lateral no celular');
  if(errors.length)throw new Error(errors.join('\n'));console.log('✔ sem erros de página nem rolagem lateral');
}finally{
  if(app&&saved!==null)await app.evaluate(({clipboard},value)=>clipboard.writeText(value),saved).catch(()=>{});
  const proc=app?.process();await Promise.race([app?.close().catch(()=>{}),new Promise(r=>setTimeout(r,8000))]);if(proc&&proc.exitCode===null)proc.kill();
  await vite.close();await rm(userData,{recursive:true,force:true}).catch(()=>{});
}
process.exit(process.exitCode||0);
