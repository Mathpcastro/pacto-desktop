import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { PilotScheduler } from '../core/autopilot-schedule.mjs';

assert.equal(process.platform,'win32','Esta prova usa o Agendador do Windows.');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),folder=join(root,'.cache','autopilot-scheduler-proof');await mkdir(folder,{recursive:true});
const id=`proof-${randomUUID()}`,marker=join(folder,`${id}.txt`),fixture=join(folder,`${id}.mjs`),run=promisify(execFile);
await writeFile(fixture,"import {writeFile} from 'node:fs/promises';await writeFile(process.argv[2],'awake','utf8');",'utf8');
const scheduler=new PilotScheduler({platform:'win32',exe:process.execPath,args:[fixture,marker],run:(cmd,args)=>run(cmd,args,{windowsHide:true}),writeFile,rm:path=>rm(path,{force:true}),tempDir:folder});
let result;
try{
  await scheduler.add(id,new Date(Date.now()+3*60000));
  const {stdout}=await run('schtasks.exe',['/Query','/TN',scheduler.name(id),'/XML'],{windowsHide:true});assert.match(stdout,/<ExecutionTimeLimit>PT0S/);
  await run('schtasks.exe',['/Run','/TN',scheduler.name(id)],{windowsHide:true});
  let awakened=false;for(let i=0;i<30;i++){if(await readFile(marker,'utf8').catch(()=>null)==='awake'){awakened=true;break;}await new Promise(r=>setTimeout(r,500));}
  assert.ok(awakened,'O sistema não executou o processo de teste.');
  result={passed:true,scope:'Tarefa Windows real com programa de teste; sem abrir Carrossell, conectar contas ou publicar.',executionTimeLimit:'PT0S',wakeVerified:true};
}finally{await scheduler.remove(id).catch(()=>{});}
await writeFile(join(folder,'results.json'),JSON.stringify(result,null,2),'utf8');console.log(JSON.stringify(result));
