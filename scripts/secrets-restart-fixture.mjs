// Executado somente em biblioteca temporária pelo teste de persistência do cofre.
import { app } from 'electron';
import { mkdirSync } from 'node:fs';
import { createSecrets } from '../electron/secrets.mjs';
import { configureIdentity } from '../electron/identity.mjs';
if(!process.env.PACTO_USER_DATA||!process.env.PACTO_USER_DATA.includes('secrets-restart-'))throw new Error('Exige pasta temporária de teste.');
mkdirSync(process.env.PACTO_USER_DATA,{recursive:true});
configureIdentity(app,process.env.PACTO_USER_DATA);
app.whenReady().then(async()=>{
  try{
    const secrets=createSecrets(app.getPath('userData'));
    if(process.argv.includes('--write'))await secrets.setKey('fixture-not-a-real-api-key');
    else if(secrets.getKey()!=='fixture-not-a-real-api-key')throw new Error('O cofre não preservou o texto após reiniciar.');
    console.log('cofre '+(process.argv.includes('--write')?'gravado':'reaberto')+' sem expor conteúdo');
    app.quit();
  }catch(error){console.error(error.message);app.exit(1);}
});
