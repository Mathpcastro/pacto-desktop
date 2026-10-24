import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Store } from '../core/store.mjs';
import { configureIdentity } from '../electron/identity.mjs';

function electronPaths(appData) {
  let name='pacto-desktop';const configured={};
  return {getName:()=>name,setName:value=>{name=value;},setPath:(key,value)=>{configured[key]=value;},getPath:key=>key==='appData'?appData:configured[key]||join(appData,name)};
}

test('commercial rename reopens existing library and keeps the original Codex home',async t=>{
 const appData=await mkdtemp(join(tmpdir(),'carrossell-migration-'));t.after(()=>rm(appData,{recursive:true,force:true}));
 const historical=join(appData,'pacto-desktop');
 const oldStore=await new Store(join(historical,'library')).init();
 await oldStore.saveProfile({brand:'Marca do comprador',product:'Produto existente',audience:'Cliente existente'});
 const p=await oldStore.createProject({title:'Projeto anterior à marca',brief:'Não perder dados na troca do nome comercial.'});
 await mkdir(join(historical,'codex'),{recursive:true});await writeFile(join(historical,'codex','sentinel.txt'),'Existing Codex home, no credentials');
 const app=electronPaths(appData);configureIdentity(app);
 assert.equal(app.getName(),'Carrossell');
 const reopened=await new Store(join(app.getPath('userData'),'library')).init();
 assert.equal(reopened.state().profile.brand,'Marca do comprador');assert.equal(reopened.get(p.id).title,p.title);
 assert.equal(await readFile(join(app.getPath('userData'),'codex','sentinel.txt'),'utf8'),'Existing Codex home, no credentials');
});

test('explicit temporary userData override never opens the historical data directory',()=>{
 const app=electronPaths(join(tmpdir(),'carrossell-not-used'));const requested=join(tmpdir(),'carrossell-isolated-proof');
 configureIdentity(app,requested);assert.equal(app.getPath('userData'),resolve(requested));assert.equal(app.getName(),'Carrossell');
});
