import electronUpdater from 'electron-updater';
import { RELEASES, macDownload, newer } from './versions.mjs';
const { autoUpdater } = electronUpdater;
// Atualização automática: o app instalado procura uma versão nova ao abrir e a cada
// 4 horas, baixa em segundo plano e instala ao fechar (ou na hora, se a pessoa pedir).
// O endereço vem do "publish" do package.json (app-update.yml dentro do instalador).
const EVERY=4*60*60*1000;
// Mac sem assinatura da Apple não instala atualizações sozinho: o app confere a versão
// publicada e oferece o download do .dmg certo; a biblioteca fica fora do app e é preservada.
function manualUpdates({app,emit,notify,open,base}){
  let found=null;
  const check=async()=>{
    try{
      const response=await fetch(`${base}latest.yml`,{cache:'no-store'});if(!response.ok)return;
      const version=/^version:\s*(\S+)/m.exec(await response.text())?.[1];
      if(!newer(version,app.getVersion())||found?.version===version)return;
      found={type:'update',status:'manual',version,url:macDownload(process.arch,base)};emit(found);
      notify(`A versão ${version} do Carrossell está disponível. Abra o app e clique em Baixar.`,'Carrossell · nova versão');
    }catch(error){console.error('[atualização]',error?.message||error);}
  };
  setTimeout(check,15000);setInterval(check,EVERY).unref?.();
  return {status:()=>found,install(){if(found)void open(found.url);}};
}
export function startUpdates({app,emit,notify,open=()=>{}}){
  let ready=null;
  if(!app.isPackaged)return {status:()=>null,install(){}};
  // Só para testes locais: aponta para um servidor no próprio computador.
  const test=process.env.PACTO_UPDATE_URL;
  if(test){const u=new URL(test);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1')throw new Error('Endereço de teste de atualização inválido.');}
  if(process.platform==='darwin'||process.env.PACTO_MANUAL_UPDATE==='1')return manualUpdates({app,emit,notify,open,base:test?new URL(test).href.replace(/\/?$/,'/'):RELEASES});
  if(test)autoUpdater.setFeedURL({provider:'generic',url:new URL(test).href});
  autoUpdater.autoDownload=true;
  autoUpdater.autoInstallOnAppQuit=true;
  autoUpdater.on('update-available',info=>emit({type:'update',status:'downloading',version:info.version}));
  autoUpdater.on('update-downloaded',info=>{
    ready={type:'update',status:'ready',version:info.version};emit(ready);
    notify(`A versão ${info.version} do Carrossell foi baixada. Ela será instalada quando você fechar o app.`);
  });
  // Sem internet ou servidor fora do ar: tenta de novo na próxima rodada, sem incomodar.
  autoUpdater.on('error',error=>console.error('[atualização]',error?.message||error));
  const check=()=>{if(!ready)void autoUpdater.checkForUpdates().catch(()=>{});};
  setTimeout(check,15000);setInterval(check,EVERY).unref?.();
  return {status:()=>ready,install(){if(ready)autoUpdater.quitAndInstall(false,true);}};
}
