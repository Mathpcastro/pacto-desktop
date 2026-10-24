import assert from 'node:assert/strict';
import { _electron } from '@playwright/test';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const output=resolve('.cache/brand-packaged-proof');await mkdir(output,{recursive:true});
const userData=await mkdtemp(join(tmpdir(),'carrossell-packaged-'));
const env={...process.env,PACTO_USER_DATA:userData};delete env.ELECTRON_RUN_AS_NODE;delete env.PACTO_DEV_URL;
const app=await _electron.launch({executablePath:resolve('release/win-unpacked/Carrossell.exe'),env});
const report={packaged:true,fixture:'Manual isolated UI smoke, no model inference',errors:[]};
try{
 const page=await app.firstWindow();page.on('pageerror',e=>report.errors.push(e.message));
 await page.getByRole('heading',{name:'Seu projeto, montado com você.'}).waitFor({timeout:30000});
 await page.getByRole('button',{name:'Carrossell, início'}).waitFor();
 report.identity=await app.evaluate(({app,BrowserWindow})=>({name:app.getName(),version:app.getVersion(),userData:app.getPath('userData'),windowTitle:BrowserWindow.getAllWindows()[0].getTitle(),packaged:app.isPackaged}));
 assert.equal(report.identity.name,'Carrossell');assert.equal(report.identity.userData,userData);assert.equal(report.identity.packaged,true);
 assert.match(report.identity.windowTitle,/Carrossell/);
 report.resources=await app.evaluate(({app})=>{
   const {readFileSync}=process.getBuiltinModule('fs');const {join}=process.getBuiltinModule('path');const base=join(app.getAppPath(),'resources','branding');
   const png=readFileSync(join(base,'icon-256.png'));const ico=readFileSync(join(base,'carrossell.ico'));return{pngWidth:png.readUInt32BE(16),icoImages:ico.readUInt16LE(4)};
 });assert.equal(report.resources.pngWidth,256);assert.equal(report.resources.icoImages,7);
 await page.screenshot({path:join(output,'onboarding-light.png')});
 await page.getByRole('button',{name:'Ativar tema escuro',exact:true}).click();await page.waitForTimeout(180);
 await page.screenshot({path:join(output,'onboarding-dark.png')});await page.reload();await page.getByRole('heading',{name:'Seu projeto, montado com você.'}).waitFor();
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');report.themePersists=true;
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.passed=false;report.error=error.stack;process.exitCode=1;}
finally{await app.close();await writeFile(join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
