import { app } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

// Comando "carrossell" para agentes: no Windows, a pasta resources\bin entra no PATH do usuário
// (sem administrador); no Mac, um atalho em ~/.local/bin chama o script de dentro do app.
const run=promisify(execFile);
const powershell=(command,env={})=>run('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,env:{...process.env,...env}});
const macLink=()=>join(homedir(),'.local','bin','carrossell');
function paths(root){
  // PACTO_CLI_PREVIEW=instalado (só em desenvolvimento): as gravações mostram o que o comprador vê no app instalado.
  if(!app.isPackaged&&process.env.PACTO_CLI_PREVIEW==='instalado')return {packaged:true,binDir:'',command:'carrossell',preview:true};
  if(!app.isPackaged)return {packaged:false,binDir:'',command:`node "${join(root,'cli','carrossell.mjs')}"`};
  return {packaged:true,binDir:join(process.resourcesPath,'bin'),command:'carrossell'};
}
async function userPath(){return (await powershell("[Environment]::GetEnvironmentVariable('Path','User')")).stdout.trim();}
export async function cliInfo(root){
  const p=paths(root);if(!p.packaged||p.preview)return {...p,installed:false};
  if(process.platform==='win32')return {...p,installed:(await userPath()).toLowerCase().split(';').includes(p.binDir.toLowerCase())};
  return {...p,installed:await access(macLink()).then(()=>true,()=>false)};
}
export async function installCli(root){
  const p=paths(root);if(!p.packaged)throw new Error('Em desenvolvimento, rode a CLI com node cli/carrossell.mjs.');
  if(process.platform==='win32'){
    const current=await userPath();
    // O valor vai por variável de ambiente, nunca montado dentro do comando.
    if(!current.toLowerCase().split(';').includes(p.binDir.toLowerCase()))await powershell("[Environment]::SetEnvironmentVariable('Path',$env:CARROSSELL_PATH,'User')",{CARROSSELL_PATH:current?`${current.replace(/;+$/,'')};${p.binDir}`:p.binDir});
  }else{
    await mkdir(dirname(macLink()),{recursive:true});
    await writeFile(macLink(),`#!/bin/sh\nexec "${join(p.binDir,'carrossell')}" "$@"\n`,{mode:0o755});
  }
  return cliInfo(root);
}
