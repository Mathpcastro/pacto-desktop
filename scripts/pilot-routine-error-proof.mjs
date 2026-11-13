// Electron real: um erro da rotina aparece em "Sua rotina" e não é mais rotulado como problema de
// conexão do Telegram. O autopilot.json é semeado antes de abrir; sem contas, bot ou geração.
import { _electron, expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root=resolve('.'),out=join(root,'.cache','pilot-routine-error-proof');await mkdir(out,{recursive:true});
const userData=await mkdtemp(join(tmpdir(),'carrossell-routine-error-'));
const ERROR='O carrossel "Pauta de teste" não ficou pronto. Conta do Instagram não encontrada. Atualize a lista em Conectar Instagram.';
await writeFile(join(userData,'autopilot.json'),JSON.stringify({version:1,offset:0,bot:null,binding:null,pairing:null,jobs:[],
  configs:{principal:{enabled:false,time:'09:00',times:['09:00'],slots:[{time:'09:00',style:'texto',cardCount:6,architectureId:''}],days:[1,2,3,4,5],style:'texto',cardCount:6,accounts:[],skips:[],approval:'review',nextAt:null,runError:ERROR}}}));
const env={...process.env,PACTO_USER_DATA:userData,PACTO_AUTOPILOT_NO_TASKS:'1',PACTO_NOTICES_URL:'http://127.0.0.1:9/notices.json'};delete env.ELECTRON_RUN_AS_NODE;
const vite=await createServer({root,logLevel:'error',server:{host:'127.0.0.1',port:0}});
let app;
try{
  await vite.listen();env.PACTO_DEV_URL=`http://127.0.0.1:${vite.httpServer.address().port}`;
  app=await _electron.launch({args:['.'],cwd:root,env});const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.getByRole('region',{name:'Configuração do projeto'}).waitFor();
  await page.evaluate(()=>window.pacto.request('saveProfile',{profile:{brand:'Prova local',product:'Interface',audience:'Teste',brandContext:'Fixture local para validar o erro da rotina. '.repeat(4),designKit:'Preto e branco. '.repeat(6)}}));
  await page.setViewportSize({width:1280,height:900});await page.reload();await page.getByRole('heading',{name:'O que vamos criar hoje?'}).waitFor();
  const license=page.getByRole('dialog',{name:'Ative sua licença'});await license.waitFor({timeout:8000}).then(()=>license.getByRole('button',{name:'Agora não'}).click()).catch(()=>{});
  await page.getByRole('navigation',{name:'Navegação principal'}).getByRole('button',{name:/^Radar/}).click();
  await page.getByRole('tab',{name:'Piloto automático',exact:true}).click();
  const routine=page.locator('section.pilot-routine');
  await expect(routine.getByRole('alert')).toContainText('Conta do Instagram não encontrada');
  await expect(page.getByText('Conexão precisa de atenção')).toHaveCount(0);
  await routine.screenshot({path:join(out,'rotina-com-erro.png')});
  console.log('✔ o erro da rotina aparece em "Sua rotina" e a conexão do Telegram não é marcada como problema');
  if(errors.length)throw new Error(errors.join('\n'));console.log('✔ sem erros de página');
}finally{
  const proc=app?.process();await Promise.race([app?.close().catch(()=>{}),new Promise(r=>setTimeout(r,8000))]);if(proc&&proc.exitCode===null)proc.kill();
  await vite.close();await rm(userData,{recursive:true,force:true}).catch(()=>{});
}
process.exit(process.exitCode||0);
