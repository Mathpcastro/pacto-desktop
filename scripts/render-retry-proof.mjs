import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { _electron } from '@playwright/test';

// Electron real: o renderizador de cards tenta de novo quando a janela não consegue abrir o arquivo
// (o ERR_FAILED do Windows). Força falhas de abertura e confere o PNG e a mensagem final.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const userData=await mkdtemp(join(tmpdir(),'carrossell-render-proof-'));
const env={...process.env,PACTO_USER_DATA:userData,PACTO_AUTOPILOT_NO_TASKS:'1',PACTO_NOTICES_URL:'http://127.0.0.1:9/notices.json',PACTO_PROOF_RENDER:'1'};delete env.ELECTRON_RUN_AS_NODE;
const ok=name=>console.log('✔',name);
const app=await _electron.launch({args:['.'],cwd:root,env});
try{
  await app.firstWindow();
  const run=(failFirst)=>app.evaluate(async(_electron,{folder,fontsDir,failFirst})=>{
    const r=globalThis.__pactoCreateRenderer({folder,fontsDir,failFirst});
    try{const png=await r.png('<!doctype html><html><body style="margin:0;background:#ff5a36"><h1>Card</h1></body></html>',{width:270,height:338});return {bytes:png.length,head:[...png.subarray(1,4)].map(c=>String.fromCharCode(c)).join('')};}
    catch(error){return {error:error.message};}
  },{folder:join(userData,'render'),fontsDir:join(root,'node_modules','@fontsource','archivo','files'),failFirst});
  const clean=await run(0);assert.equal(clean.head,'PNG');ok(`sem falha: PNG com ${clean.bytes} bytes`);
  const twice=await run(2);assert.equal(twice.head,'PNG');ok(`2 falhas de abertura: o card sai na 3ª tentativa (${twice.bytes} bytes)`);
  const thrice=await run(3);assert.match(thrice.error,/depois de 3 tentativas/);assert.match(thrice.error,/antivírus/);ok(`3 falhas: mensagem clara (${thrice.error.slice(0,90)}…)`);
  assert.deepEqual(await readdir(join(userData,'render')),[]);ok('nenhum arquivo temporário sobra na pasta render');
}finally{const proc=app.process();await Promise.race([app.close().catch(()=>{}),new Promise(r=>setTimeout(r,8000))]);if(proc.exitCode===null)proc.kill();await rm(userData,{recursive:true,force:true}).catch(()=>{});}
process.exit(process.exitCode||0);
