import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { _electron } from '@playwright/test';
const userData=await mkdtemp(join(tmpdir(),'carrossell-analytics-packaged-'));
const env={...process.env,PACTO_USER_DATA:userData};delete env.ELECTRON_RUN_AS_NODE;delete env.PACTO_DEV_URL;
const app=await _electron.launch({executablePath:resolve('release/analytics/win-unpacked/Carrossell.exe'),env});
try{
  const page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.waitForFunction(()=>window.pacto);
  await page.evaluate(()=>window.pacto.request('saveProfile',{profile:{brand:'Teste isolado',brandContext:'# Contexto',designKit:'# Design'}}));
  await page.reload();await page.getByRole('button',{name:'Marca',exact:true}).click();
  await page.getByRole('navigation',{name:'Seções da marca'}).getByRole('button',{name:'Analytics',exact:true}).click();
  await page.getByRole('heading',{name:'Os números da sua conta, aqui'}).waitFor();
  const error=await page.evaluate(()=>window.pacto.request('instagramAnalytics',{account:'inexistente',days:7}).then(()=>'',e=>e.message));
  assert.match(error,/Conta do Instagram não encontrada/);assert.deepEqual(errors,[]);
  console.log('✔ build Windows abre Analytics e expõe o contrato no preload, com biblioteca isolada');
}finally{
  await app.close();
  if(resolve(userData).startsWith(resolve(tmpdir())+'\\'))await rm(userData,{recursive:true,force:true}).catch(()=>{});
}
