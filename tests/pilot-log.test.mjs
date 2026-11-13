import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PilotLog } from '../core/pilot-log.mjs';

test('pilot log keeps one JSON line per event without tokens, addresses or e-mails',async t=>{
  const root=await mkdtemp(join(tmpdir(),'carrossell-pilot-log-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const log=new PilotLog(join(root,'pilot.log'),{now:()=>Date.UTC(2026,10,13,12)});
  await log.write('horario-falhou',{perfil:'principal',motivo:'Falha em https://api.telegram.org/bot123456:ABCDEFGHIJKLMNOPQRSTUVWX/send para cliente@exemplo.com',atraso_min:3,rotinas:[{perfil:'a',ativa:true}]});
  const lines=await log.tail();assert.equal(lines.length,1);const entry=JSON.parse(lines[0]);
  assert.equal(entry.t,'2026-11-13T12:00:00.000Z');assert.equal(entry.event,'horario-falhou');assert.equal(entry.atraso_min,3);assert.deepEqual(entry.rotinas,[{perfil:'a',ativa:true}]);
  assert.doesNotMatch(lines[0],/123456:|api\.telegram|cliente@/);assert.match(entry.motivo,/\[endereço\].*\[e-mail\]/);
});
test('pilot log rotates at its size limit and tail reads across both files',async t=>{
  const root=await mkdtemp(join(tmpdir(),'carrossell-pilot-log-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const file=join(root,'pilot.log'),log=new PilotLog(file,{maxBytes:400});
  for(let i=0;i<20;i++)void log.write('pulso',{n:i});
  const lines=await log.tail(1000);assert.equal(JSON.parse(lines.at(-1)).n,19);
  assert.ok((await stat(file)).size<=400);assert.ok((await readFile(`${file}.1`,'utf8')).length>0);
  assert.ok(lines.length<20);// as linhas mais antigas saem
});
test('a log that cannot be written never breaks the pilot',async()=>{
  const log=new PilotLog(join(tmpdir(),'\0invalido','pilot.log'));
  await log.write('app-aberto');assert.deepEqual(await log.tail(),[]);
});
