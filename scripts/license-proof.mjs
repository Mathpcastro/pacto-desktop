import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer as createHttp } from 'node:http';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron, expect } from '@playwright/test';
import { createServer } from 'vite';

// Electron real: janela de ativação da licença contra um servidor de licença falso local que responde
// como o de produção (HTTP 200 com ok:false/activation_failed para e-mail sem compra).
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(root,'.cache','license-proof');await mkdir(out,{recursive:true});
const userData=await mkdtemp(join(tmpdir(),'carrossell-license-proof-'));
const BUYER='comprador@exemplo.com';
const sha=v=>createHash('sha256').update(v,'utf8').digest('hex');
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const calls=[];
const license=createHttp((req,res)=>{let raw='';req.on('data',c=>raw+=c);req.on('end',()=>{
  const body=JSON.parse(raw||'{}');calls.push({path:req.url,email:body.email});
  res.setHeader('content-type','application/json');
  if(req.url==='/license/activate'&&body.email===BUYER){
    const exp=Math.floor(Date.now()/1000)+30*86400;
    const token=`${b64({alg:'HS256',typ:'JWT'})}.${b64({exp,email_hash:sha(BUYER),device_hash:body.device_hash,terms_version:body.terms_version,accepted_at:body.accepted_at})}.assinatura`;
    return res.end(JSON.stringify({ok:true,token,expires_at:new Date(exp*1000).toISOString(),code:'activated'}));
  }
  res.end(JSON.stringify({ok:false,code:'activation_failed'}));
});});
await new Promise(r=>license.listen(0,'127.0.0.1',r));
const vite=await createServer({root,logLevel:'error',server:{host:'127.0.0.1',port:0}});await vite.listen();
const env={...process.env,PACTO_USER_DATA:userData,PACTO_AUTOPILOT_NO_TASKS:'1',PACTO_DEV_URL:`http://127.0.0.1:${vite.httpServer.address().port}`,PACTO_NOTICES_URL:'http://127.0.0.1:9/notices.json',PACTO_LICENSE_URL:`http://127.0.0.1:${license.address().port}`};delete env.ELECTRON_RUN_AS_NODE;
const ok=name=>console.log('✔',name);
let app;
try{
  app=await _electron.launch({args:['.'],cwd:root,env});const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>window.pacto);
  await page.evaluate(()=>window.pacto.request('saveProfile',{profile:{brand:'Licença · prova',product:'Teste',audience:'Teste',brandContext:'Contexto local de teste. '.repeat(10),designKit:'Preto e branco. '.repeat(10)}}));
  await page.setViewportSize({width:1280,height:860});await page.reload();
  const dialog=page.getByRole('dialog',{name:'Ative sua licença'});
  await expect(dialog).toBeVisible({timeout:20000});
  await expect(dialog.getByLabel('E-mail da compra')).toBeFocused();
  await page.screenshot({path:join(out,'1-janela.png')});ok('janela abre sozinha com o campo de e-mail em foco');
  await dialog.getByLabel('E-mail da compra').fill(BUYER);await dialog.getByLabel('E-mail da compra').press('Enter');
  await expect(dialog.getByRole('alert')).toContainText('Marque que você aceita');
  assert.equal(calls.length,0);await page.screenshot({path:join(out,'2-sem-aceite.png')});ok('Enter sem marcar os termos explica o que falta (antes o botão ficava apagado sem aviso)');
  await dialog.getByLabel('E-mail da compra').fill('sem-compra@exemplo.com');await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button',{name:'Ativar licença'}).click();
  await expect(dialog.getByRole('alert')).toContainText('Não encontramos uma compra com este e-mail');
  assert.equal(calls.at(-1).email,'sem-compra@exemplo.com');await page.screenshot({path:join(out,'3-email-sem-compra.png')});ok('e-mail sem compra mostra o motivo (antes nada mudava)');
  await dialog.getByLabel('E-mail da compra').fill(BUYER);await dialog.getByRole('button',{name:'Ativar licença'}).click();
  const success=page.getByRole('dialog',{name:'Licença ativada'});
  await expect(success).toContainText('c*****r@exemplo.com');await page.screenshot({path:join(out,'4-ativada.png')});ok('compra encontrada: confirmação com o e-mail mascarado');
  await expect(success).toBeHidden({timeout:5000});
  await expect(page.locator('.notice-strip', {hasText:'licença'})).toHaveCount(0);
  const status=await page.evaluate(()=>window.pacto.request('licenseStatus'));assert.equal(status.activated,true);
  await page.screenshot({path:join(out,'5-depois.png')});ok('a janela fecha sozinha, a faixa some e a licença fica ativa');
  await page.setViewportSize({width:390,height:760});await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
  assert.deepEqual(errors,[]);ok('sem erros de página');
}finally{
  const proc=app?.process();await Promise.race([app?.close().catch(()=>{}),new Promise(r=>setTimeout(r,8000))]);if(proc&&proc.exitCode===null)proc.kill();
  await vite.close();license.close();await rm(userData,{recursive:true,force:true}).catch(()=>{});
}
process.exit(process.exitCode||0);
