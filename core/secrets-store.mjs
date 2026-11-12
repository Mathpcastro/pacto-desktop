import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function createSecretStore(userData,encryption){
  const file=join(userData,'integrations.json');let data={};
  try{data=JSON.parse(readFileSync(file,'utf8'));if(!data||typeof data!=='object'||Array.isArray(data))throw new Error();}
  catch(error){if(error.code!=='ENOENT')throw new Error('Não foi possível ler o cofre de conexões. O arquivo foi preservado.');}
  if(!data.installId)data.installId=randomUUID();let queue=Promise.resolve();
  const change=fn=>{
    const operation=queue.then(async()=>{const next=structuredClone(data);fn(next);const temp=`${file}.${randomUUID()}.tmp`;await writeFile(temp,JSON.stringify(next,null,2),'utf8');await rename(temp,file);data=next;});queue=operation.catch(()=>{});return operation;
  };
  const decrypt=key=>{if(!data[key])return '';try{return encryption.decryptString(Buffer.from(data[key],'base64'));}catch{return '';}};
  const encrypt=value=>{if(!encryption.isEncryptionAvailable())throw new Error('O sistema não ofereceu um cofre para guardar a chave com segurança.');return encryption.encryptString(value).toString('base64');};
  void change(()=>{}).catch(()=>{});
  return {
    installId:()=>data.installId,hasKey:()=>Boolean(data.composio),getKey:()=>decrypt('composio'),
    setKey:key=>{const encoded=encrypt(key);return change(next=>{next.composio=encoded;});},
    clearKey:()=>change(next=>{delete next.composio;delete next.accounts;}),
    hasLicense:()=>Boolean(data.license),getLicense:()=>decrypt('license'),
    setLicense:token=>{const encoded=encrypt(token);return change(next=>{next.license=encoded;});},
    clearLicense:()=>change(next=>{delete next.license;}),
    accounts:()=>structuredClone(data.accounts||[]),saveAccounts:list=>change(next=>{next.accounts=structuredClone(list);}),
    hasTelegramToken:()=>Boolean(data.telegram),getTelegramToken:()=>decrypt('telegram'),
    setTelegramToken:token=>{const encoded=encrypt(token);return change(next=>{next.telegram=encoded;});},
    clearTelegramToken:()=>change(next=>{delete next.telegram;}),
  };
}
