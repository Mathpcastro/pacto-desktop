import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
// Atualização automática: o app instalado procura uma versão nova ao abrir e a cada
// 4 horas, baixa em segundo plano e instala ao fechar (ou na hora, se a pessoa pedir).
// O endereço vem do "publish" do package.json (app-update.yml dentro do instalador).
const EVERY=4*60*60*1000;
export function startUpdates({app,emit,notify}){
  let ready=null;
  if(!app.isPackaged)return {status:()=>null,install(){}};
  // Só para testes locais: aponta para um servidor no próprio computador.
  const test=process.env.PACTO_UPDATE_URL;
  if(test){const u=new URL(test);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1')throw new Error('Endereço de teste de atualização inválido.');autoUpdater.setFeedURL({provider:'generic',url:u.href});}
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
