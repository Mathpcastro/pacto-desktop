import { posix, win32 } from 'node:path';

// Agendamento de posts: nem o Instagram nem o Composio agendam, então o próprio sistema abre o
// Carrossell em segundo plano na hora certa (Agendador de Tarefas no Windows, launchd no Mac).
// Se o computador estiver desligado, a tarefa roda quando ele voltar e o app posta com atraso:
// até 6 horas posta sozinho; depois disso pede confirmação, para não publicar fora de contexto.
export const LATE_LIMIT_MS=6*60*60*1000;
const MIN_AHEAD_MS=2*60*1000,MAX_AHEAD_MS=120*24*60*60*1000;
export const SCHEDULE_FLAG='--publicar-agendados';

// Aceita ISO ("2026-11-02T18:00") ou "2026-11-02 18:00" no horário local.
export function parseWhen(value,now=new Date()){
  const raw=String(value||'').trim();
  const m=/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/.exec(raw);
  const date=m?new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5]):new Date(raw);
  if(!raw||Number.isNaN(date.getTime()))throw new Error('Data inválida. Use, por exemplo, 2026-11-02 18:00.');
  if(date.getTime()<now.getTime()+MIN_AHEAD_MS)throw new Error('Agende para pelo menos 2 minutos no futuro.');
  if(date.getTime()>now.getTime()+MAX_AHEAD_MS)throw new Error('Agende para no máximo 120 dias à frente.');
  return date;
}
// Agendados vencidos: "post" sai agora; "late" passou do limite e espera a pessoa confirmar.
export function duePosts(projects,now=Date.now()){
  const out=[];
  for(const p of projects){const s=p.schedule;if(!s||s.status!=='scheduled')continue;const at=new Date(s.at).getTime();if(at>now)continue;out.push({id:p.id,at:s.at,late:now-at>LATE_LIMIT_MS});}
  return out;
}
const pad=n=>String(n).padStart(2,'0');
const localStamp=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
const xml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const quote=a=>/[\s"]/.test(a)?`"${a.replace(/"/g,'\\"')}"`:a;
// Tarefa do usuário atual, sem administrador; StartWhenAvailable roda depois se o PC estava desligado.
export function windowsTaskXml({at,exe,args,executionTimeLimit='PT1H',description='Carrossell: publicar um post agendado no Instagram'}){
  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>${xml(description)}</Description></RegistrationInfo>
  <Triggers><TimeTrigger><StartBoundary>${localStamp(at)}</StartBoundary><Enabled>true</Enabled></TimeTrigger></Triggers>
  <Principals><Principal id="Author"><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <ExecutionTimeLimit>${xml(executionTimeLimit)}</ExecutionTimeLimit>
    <Enabled>true</Enabled>
  </Settings>
  <Actions Context="Author"><Exec><Command>${xml(exe)}</Command><Arguments>${xml(args.map(quote).join(' '))}</Arguments></Exec></Actions>
</Task>
`;
}
export function macPlist({label,at,exe,args}){
  const items=[exe,...args].map(a=>`    <string>${xml(a)}</string>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${xml(label)}</string>
  <key>ProgramArguments</key>
  <array>
${items}
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Month</key><integer>${at.getMonth()+1}</integer><key>Day</key><integer>${at.getDate()}</integer><key>Hour</key><integer>${at.getHours()}</integer><key>Minute</key><integer>${at.getMinutes()}</integer></dict>
</dict>
</plist>
`;
}
// Registra e remove as tarefas; run(cmd,args), writeFile e rm vêm de fora (testes usam versões falsas).
export class OsScheduler {
  constructor({platform=process.platform,exe,args=[],run,writeFile,rm,tempDir,agentsDir,uid=0}){Object.assign(this,{platform,exe,args:[...args,SCHEDULE_FLAG],run,writeFile,rm,tempDir,agentsDir,uid});}
  // Caminhos no formato do sistema de destino (o teste do Mac também roda no Windows).
  join(...parts){return (this.platform==='win32'?win32:posix).join(...parts);}
  name(id){return this.platform==='win32'?`Carrossell\\post-${id}`:`com.carrossell.post.${id}`;}
  async add(id,at){
    await this.remove(id).catch(()=>{});
    if(this.platform==='win32'){
      const file=this.join(this.tempDir,`carrossell-task-${id}.xml`);
      // O Agendador lê o XML em UTF-16 com BOM.
      await this.writeFile(file,Buffer.concat([Buffer.from([0xff,0xfe]),Buffer.from(windowsTaskXml({at,exe:this.exe,args:this.args,...this.xmlOptions}),'utf16le')]));
      try{await this.run('schtasks.exe',['/Create','/TN',this.name(id),'/XML',file,'/F']);}finally{await this.rm(file).catch(()=>{});}
    }else if(this.platform==='darwin'){
      const label=this.name(id),file=this.join(this.agentsDir,`${label}.plist`);
      await this.writeFile(file,macPlist({label,at,exe:this.exe,args:this.args}));
      await this.run('launchctl',['bootstrap',`gui/${this.uid}`,file]);
    }else throw new Error('Agendamento disponível no Windows e no Mac.');
    return this.name(id);
  }
  async remove(id){
    if(this.platform==='win32')return this.run('schtasks.exe',['/Delete','/TN',this.name(id),'/F']);
    if(this.platform==='darwin'){const label=this.name(id);await this.run('launchctl',['bootout',`gui/${this.uid}/${label}`]).catch(()=>{});return this.rm(this.join(this.agentsDir,`${label}.plist`));}
  }
}
