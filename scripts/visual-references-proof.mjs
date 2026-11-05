import assert from 'node:assert/strict';
import { mkdtemp,mkdir,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { _electron,expect } from '@playwright/test';
import { createServer } from 'vite';
const root=resolve('.'),out=join(root,'.cache/visual-references-proof');await mkdir(out,{recursive:true});
const userData=await mkdtemp(join(tmpdir(),'carrossell-refs-ui-'));
const server=await createServer({root,logLevel:'error',server:{host:'127.0.0.1',port:0}});await server.listen();
const env={...process.env,PACTO_USER_DATA:userData,PACTO_AUTOPILOT_NO_TASKS:'1',PACTO_DEV_URL:`http://127.0.0.1:${server.httpServer.address().port}`};delete env.ELECTRON_RUN_AS_NODE;
let app;const errors=[];
try{
app=await _electron.launch({args:['.'],cwd:root,env});const page=await app.firstWindow();page.on('pageerror',e=>errors.push(e.message));await page.waitForFunction(()=>window.pacto);
await page.evaluate(()=>window.pacto.request('saveProfile',{profile:{brand:'Trading · prova',brandContext:'Ensino leitura de candles, suporte e resistência.',designKit:'Fundo escuro com verde e vermelho.'}}));await page.reload();await page.setViewportSize({width:1280,height:900});
await page.getByRole('button',{name:'Marca',exact:true}).click();await page.getByRole('button',{name:'Referências visuais',exact:true}).click();
const region=page.getByRole('region',{name:'Referências visuais',exact:true});
await region.getByLabel('Arquivos de referência visual').setInputFiles(join(root,'resources/branding/brand-sheet.png'));
await expect(region.locator('.reference-grid img')).toHaveCount(1);
// A browser ClipboardEvent exercises the same handler as a user paste, without reading the host clipboard.
await region.getByLabel('Colar imagens de referência').evaluate(el=>{
 const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
 const dt=new DataTransfer();dt.items.add(new File([bytes],'Candles.png',{type:'image/png'}));el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));
});await expect(region.locator('.reference-grid img')).toHaveCount(2);
await page.screenshot({path:join(out,'referencias.png'),fullPage:true});
const chart=await page.evaluateHandle(()=>{const el=document.createElement('div');el.style.cssText='position:fixed;inset:0;z-index:99999;background:#111820;color:#dce9ec;padding:70px;font:32px Arial';el.innerHTML='<h1>Leitura de suporte</h1><p>Referência ilustrativa de composição</p><svg width="800" height="420" viewBox="0 0 800 420"><path d="M0 330H800 M0 200H800 M0 70H800" stroke="#334455"/><path d="M60 90V190 M160 140V270 M260 220V350 M360 250V360 M460 180V300 M560 140V230 M660 70V160" stroke="#91a5b4" stroke-width="3"/><path d="M60 115V160 M160 180V230 M260 250V300" stroke="#f2676b" stroke-width="30"/><path d="M360 290V320 M460 220V270 M560 165V200 M660 95V140" stroke="#39c5a3" stroke-width="30"/><path d="M0 350H800" stroke="#39c5a3" stroke-width="3" stroke-dasharray="10 8"/></svg><p>REGIÃO DE SUPORTE</p>';document.body.append(el);return el;});
await page.screenshot({path:join(out,'chart-reference.png')});await chart.evaluate(el=>el.remove());await chart.dispose();

await page.reload();await page.getByRole('button',{name:'Marca',exact:true}).click();await expect(region.locator('.reference-grid img')).toHaveCount(2);
let state=await page.evaluate(()=>window.pacto.request('bootstrap'));assert.equal(state.profile.references[1].name,'Candles.png');assert.equal(state.profile.designKit,'Fundo escuro com verde e vermelho.');
// Profile switch must not leak gallery contents.
await page.evaluate(async()=>{await window.pacto.request('createProfile',{name:'Outra marca',activate:true});await window.pacto.request('saveProfile',{profile:{brand:'Outra marca',brandContext:'Outro negócio',designKit:'Outra identidade'}});});await page.reload();await page.getByRole('button',{name:'Marca',exact:true}).click();
await expect(region.locator('.reference-grid img')).toHaveCount(0);
await page.evaluate(id=>window.pacto.request('switchProfile',{id}),state.profileId);await page.reload();await page.getByRole('button',{name:'Marca',exact:true}).click();await expect(region.locator('.reference-grid img')).toHaveCount(2);
await region.getByRole('button',{name:'Remover referência 1',exact:true}).click();await expect(region.locator('.reference-grid img')).toHaveCount(1);
await page.reload();await page.getByRole('button',{name:'Marca',exact:true}).click();await expect(region.locator('.reference-grid img')).toHaveCount(1);
await region.getByLabel('Colar imagens de referência').evaluate(el=>{const dt=new DataTransfer();dt.setData('text/plain','https://example.test/image.png');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));});await expect(region.getByRole('alert')).toContainText('Um link ou texto não contém a imagem');
assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,checks:['upload','paste image','reload persistence','profile isolation','remove and reload','text paste error','brand documents preserved','no page errors'],out}));
}finally{if(app){await app.evaluate(({app})=>app.exit()).catch(()=>{});await app.close().catch(()=>{});}await server.close();await rm(userData,{recursive:true,force:true});}
