import assert from 'node:assert/strict';
import { createServer as httpServer } from 'node:http';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron, expect } from '@playwright/test';
import { createServer } from 'vite';

// Rotina com vários horários no Electron real. Telegram e Composio são falsos e locais:
// nada é publicado nem enviado. Prova: configurar 3 horários, ativar, ver os próximos e pular um.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(root,'.cache','routine-times-proof');await mkdir(out,{recursive:true});
const TOKEN='123456:THIS_IS_A_SYNTHETIC_PROOF_TOKEN_000000',KEY='ak_routine_test_only';
const queue=[];let mid=0;
const json=(res,data,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
const telegram=httpServer(async(req,res)=>{
  let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw||'{}'),method=req.url.split('/').at(-1);
  if(!req.url.startsWith(`/bot${TOKEN}/`))return json(res,{ok:false},401);
  if(method==='getMe')return json(res,{ok:true,result:{id:123456,is_bot:true,username:'carrossell_test_bot'}});
  if(method==='getWebhookInfo')return json(res,{ok:true,result:{url:''}});
  if(method==='getUpdates'){const u=queue.filter(x=>x.update_id>=(body.offset||0));if(u.length)return json(res,{ok:true,result:u});return setTimeout(()=>json(res,{ok:true,result:[]}),400);}
  if(method==='sendMessage')return json(res,{ok:true,result:{message_id:++mid}});
  return json(res,{ok:true,result:true});
});
const composio=httpServer(async(req,res)=>{
  for await(const _ of req);const path=req.url.replace('/api/v3.1','');
  if(path.startsWith('/connected_accounts?'))return json(res,{items:[{id:'ca_marca',user_id:'test',status:'ACTIVE'}]});
  if(path.includes('INSTAGRAM_GET_USER_INFO'))return json(res,{data:{id:'1001',user_id:'1001',username:'marca.teste',account_type:'BUSINESS',followers_count:10},successful:true});
  return json(res,{data:{},successful:true});
});
await new Promise(r=>telegram.listen(0,'127.0.0.1',r));await new Promise(r=>composio.listen(0,'127.0.0.1',r));
const userData=await mkdtemp(join(tmpdir(),'carrossell-routine-times-'));
const vite=await createServer({root,logLevel:'error',server:{host:'127.0.0.1',port:0}});await vite.listen();
const env={...process.env,PACTO_USER_DATA:userData,PACTO_AUTOPILOT_NO_TASKS:'1',PACTO_DEV_URL:`http://127.0.0.1:${vite.httpServer.address().port}`,PACTO_TELEGRAM_URL:`http://127.0.0.1:${telegram.address().port}`,PACTO_COMPOSIO_URL:`http://127.0.0.1:${composio.address().port}`};delete env.ELECTRON_RUN_AS_NODE;
const app=await _electron.launch({args:['.'],cwd:root,env});const errors=[];
const ok=name=>console.log('✔',name);
try{
  const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>window.pacto);
  await page.evaluate(async({KEY,TOKEN})=>{
    await window.pacto.request('saveProfile',{profile:{brand:'Rotina · prova',product:'Teste',audience:'Teste',brandContext:'Contexto local de teste.',designKit:'Preto e branco.'}});
    await window.pacto.request('saveComposioKey',{key:KEY});
    await window.pacto.request('saveTelegramToken',{token:TOKEN});
  },{KEY,TOKEN});
  const pairing=await page.evaluate(()=>window.pacto.request('pairTelegram'));
  const code=pairing.code||pairing.autopilot?.pairing?.code;assert.ok(code,'código de vínculo');
  queue.push({update_id:1,message:{message_id:1,text:`/start ${code}`,chat:{id:42,type:'private'},from:{id:7}}});
  await page.waitForFunction(async()=>(await window.pacto.request('telegramStatus')).autopilot.paired,null,{timeout:15000});
  ok('Telegram falso vinculado');
  await page.reload();await page.getByRole('button',{name:'Piloto automático',exact:true}).first().click();
  await page.setViewportSize({width:1280,height:900});
  await page.getByRole('button',{name:'Configurar rotina',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Configurar rotina',exact:true});
  await dialog.getByLabel('Horário 1 da rotina',{exact:true}).fill('09:00');
  await dialog.getByRole('button',{name:'Adicionar horário'}).click();
  await expect(dialog.getByLabel('Horário 2 da rotina',{exact:true})).toHaveValue('12:00');
  await dialog.getByLabel('Horário 2 da rotina',{exact:true}).fill('09:00');
  await expect(dialog.getByText('Há dois horários iguais.')).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Salvar rotina'})).toBeDisabled();
  ok('horário repetido bloqueia salvar');
  await dialog.getByLabel('Horário 2 da rotina',{exact:true}).fill('19:00');
  await dialog.getByRole('button',{name:'Adicionar horário'}).click();
  await dialog.getByLabel('Horário 3 da rotina',{exact:true}).fill('13:30');
  // Um tipo diferente em cada horário.
  await dialog.getByLabel('Tipo de carrossel do horário 1',{exact:true}).selectOption({label:'Lista Útil'});
  await dialog.getByLabel('Tipo de carrossel do horário 2',{exact:true}).selectOption({label:'Framework'});
  await dialog.getByLabel('Estilo do horário 2',{exact:true}).selectOption('tweet');
  await dialog.getByLabel('Quantidade de cards do horário 2, de 2 a 10',{exact:true}).fill('5');
  await dialog.getByLabel('Tipo de carrossel do horário 3',{exact:true}).selectOption({label:'Estudo de Caso'});
  await dialog.getByLabel('Estilo do horário 3',{exact:true}).selectOption('textopreto');
  await dialog.getByRole('checkbox').first().check();
  await page.screenshot({path:join(out,'1-configurar-varios-horarios.png')});
  await dialog.getByRole('button',{name:'Salvar rotina'}).click();
  await expect(page.getByText('Rotina salva para este perfil.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pilot-schedule')).toHaveText(/às 9h, 13h30 e 19h$/);
  await expect(page.locator('.pilot-routine-meta')).toContainText('3 carrosséis por dia');
  await expect(page.locator('.pilot-slot-summary li')).toHaveText([/9h.*Lista Útil.*Texto em fundo claro.*6 cards/,/13h30.*Estudo de Caso.*Texto em fundo preto.*6 cards/,/19h.*Framework.*Tweet.*5 cards/]);
  ok('resumo mostra os três horários, cada um com o seu tipo');
  // Sem conta ChatGPT na prova o botão fica desligado; ativa pelo mesmo comando que ele chama.
  await expect(page.getByRole('button',{name:'Ativar rotina'})).toBeDisabled();
  await page.evaluate(async()=>{const s=(await window.pacto.request('telegramStatus')).autopilot.config;await window.pacto.request('saveAutopilot',{config:{slots:s.slots,days:s.days,accounts:s.accounts,enabled:true}});});
  await expect(page.getByText('Próximos horários',{exact:true})).toBeVisible();
  const items=page.locator('.pilot-upcoming li');await expect(items).toHaveCount(8);
  const saved=await page.evaluate(async()=>(await window.pacto.request('telegramStatus')).autopilot);
  assert.deepEqual(saved.config.times,['09:00','13:30','19:00']);
  assert.deepEqual(saved.config.slots.map(x=>[x.time,x.architectureId,x.style,x.cardCount]),[['09:00','lista-util','texto',6],['13:30','estudo-de-caso','textopreto',6],['19:00','framework','tweet',5]]);
  await expect(page.locator('.pilot-upcoming li').first()).toContainText(/Lista Útil|Estudo de Caso|Framework/);
  assert.equal(saved.config.nextAt,saved.upcoming[0].at);
  ok('rotina ativa com 8 próximos horários');
  await items.first().getByRole('button',{name:/^Pular/}).click();
  await expect(items.first()).toHaveClass(/skipped/);
  const after=await page.evaluate(async()=>(await window.pacto.request('telegramStatus')).autopilot);
  assert.equal(after.upcoming[0].skipped,true);assert.equal(after.config.nextAt,after.upcoming[1].at);
  await page.screenshot({path:join(out,'2-proximos-horarios-pulado.png'),fullPage:true});
  ok('pular move a próxima preparação para o horário seguinte');
  await items.first().getByRole('button',{name:/^Voltar a preparar/}).click();
  await expect(items.first()).not.toHaveClass(/skipped/);
  const back=await page.evaluate(async()=>(await window.pacto.request('telegramStatus')).autopilot);
  assert.equal(back.config.nextAt,back.upcoming[0].at);
  ok('voltar a preparar devolve o horário');
  await page.setViewportSize({width:390,height:844});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('overflow no telefone');
  await page.screenshot({path:join(out,'3-telefone.png'),fullPage:true});
  ok('sem rolagem lateral a 390px');
  assert.deepEqual(errors,[]);ok('sem erros na página');
}finally{await app.close().catch(()=>{});await vite.close();telegram.close();composio.close();await rm(userData,{recursive:true,force:true}).catch(()=>{});}
