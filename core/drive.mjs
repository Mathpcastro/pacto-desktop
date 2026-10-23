import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, relative, isAbsolute } from 'node:path';

// Google Drive para computador: a pasta "Meu Drive" sincroniza sozinha com o celular.
export function findDriveFolders({env=process.env,exists=existsSync}={}){
  const found=[];
  for(const letter of 'DEFGHIJKLMNOPQRSTUVWXYZ'){
    for(const name of ['Meu Drive','My Drive']){const path=`${letter}:\\${name}`;if(exists(path))found.push(path);}
  }
  const home=env.USERPROFILE||env.HOME;
  if(home)for(const path of [join(home,'Google Drive','Meu Drive'),join(home,'Google Drive','My Drive'),join(home,'Google Drive')])if(exists(path))found.push(path);
  return [...new Set(found)];
}
export function safeName(value){return String(value||'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'').replace(/\s+/g,' ').trim().slice(0,80)||'carrossel';}
// Grava os arquivos exportados em <base>/PACTO/<título>/ sem sair dessa pasta.
export async function writeCarouselFolder(base,title,files){
  const folder=resolve(base,'PACTO',safeName(title));
  await mkdir(folder,{recursive:true});
  for(const [name,bytes] of Object.entries(files)){
    const target=resolve(folder,name),rel=relative(folder,target);
    if(!rel||rel.startsWith('..')||isAbsolute(rel))throw new Error('Arquivo fora da pasta do carrossel.');
    await mkdir(resolve(target,'..'),{recursive:true});await writeFile(target,Buffer.from(bytes));
  }
  return folder;
}
