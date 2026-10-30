import { safeStorage } from 'electron';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Chave do Composio cifrada pelo sistema (DPAPI no Windows, Keychain no Mac) em integrations.json,
// fora da biblioteca de projetos. Nunca vai para o estado da janela, para a CLI nem para logs.
export function createSecrets(userData){
  const file=join(userData,'integrations.json');
  let data={};try{data=JSON.parse(readFileSync(file,'utf8'));}catch{}
  if(!data.installId)data.installId=randomUUID();
  const save=async()=>{const temp=`${file}.${randomUUID()}.tmp`;await writeFile(temp,JSON.stringify(data,null,2),'utf8');await rename(temp,file);};
  void save().catch(()=>{});
  return {
    installId:()=>data.installId,
    hasKey:()=>Boolean(data.composio),
    getKey(){if(!data.composio)return '';try{return safeStorage.decryptString(Buffer.from(data.composio,'base64'));}catch{return '';}},
    async setKey(key){if(!safeStorage.isEncryptionAvailable())throw new Error('O sistema não ofereceu um cofre para guardar a chave com segurança.');data.composio=safeStorage.encryptString(key).toString('base64');await save();},
    async clearKey(){delete data.composio;delete data.accounts;await save();},
    // Contas do Instagram vistas no Composio (@, id da conta): uma lista para o app, usada por todos os perfis.
    accounts:()=>structuredClone(data.accounts||[]),
    async saveAccounts(list){data.accounts=list;await save();},
  };
}
