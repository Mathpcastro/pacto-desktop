import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage, Notification, screen, Menu, powerMonitor, clipboard } from 'electron';
import { PilotLog } from '../core/pilot-log.mjs';
import { reminder } from '../core/rhythm.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname, resolve } from 'node:path';
import { readFile, writeFile, stat, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { validateReference } from '../core/store.mjs';
import { Profiles } from '../core/profiles.mjs';
import { CodexClient, safeError } from '../core/codex.mjs';
import { Runtime, ACTIONS } from '../core/runtime.mjs';
import { loadKnowledge } from '../core/knowledge.mjs';
import { normalizeExport, normalizeFiles, jpegCards } from '../core/export.mjs';
import { OsScheduler, SCHEDULE_FLAG } from '../core/schedule.mjs';
import { PilotScheduler, PILOT_FLAG } from '../core/autopilot-schedule.mjs';
import { AutopilotStore } from '../core/autopilot-store.mjs';
import { Autopilot } from '../core/autopilot.mjs';
import { TelegramClient } from '../core/telegram.mjs';
import { createSecrets } from './secrets.mjs';
import { Composio, COMPOSIO_BASE } from '../core/composio.mjs';
import { startUpdates } from './updater.mjs';
import { createTray } from './tray.mjs';
import { Notices, NOTICES_URL } from '../core/notices.mjs';
import { configureIdentity } from './identity.mjs';
import { createRenderer } from './render.mjs';
import { readPage } from './page.mjs';
import { startControl } from '../core/control.mjs';
import { cliInfo, installCli } from './cli-install.mjs';
import { translateUi } from '../core/i18n.mjs';
import { PRIVACY_URL, TERMS_URL } from '../core/license.mjs';
import { LicenseService } from './license.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
// 0.2.1 identifies itself as pacto-desktop, including the packaged Windows app.
// Pin that historical directory before changing the commercial display name.
configureIdentity(app,process.env.PACTO_USER_DATA);
// --segundo-plano: sem janela, só o controle local para a CLI (agentes). Não usar --headless: o Chromium
// entende essa opção como o modo sem tela dele e nenhuma janela aparece depois. Uma instância por usuário:
// abrir o app com o segundo plano rodando mostra a janela nesse mesmo processo.
const BACKGROUND='--segundo-plano';
const headless=process.argv.includes(BACKGROUND);
const primary=app.requestSingleInstanceLock();
if(!primary)app.quit();
const IDLE_MS=Number(process.env.PACTO_IDLE_MS)||10*60*1000;
let window,runtime,codex,updates,control,licenseService,showUI,publishDue,tray,warnedBackground=false,awaitingLogin=false,lastActivity=Date.now();
function emit(event){lastActivity=Date.now();if(window&&!window.isDestroyed())window.webContents.send('pacto:event',event);control?.broadcast(event);}
const windowOpen=()=>Boolean(window&&!window.isDestroyed());
function authUrlAllowed(raw){try{const u=new URL(raw);return u.protocol==='https:'&&['auth.openai.com','auth0.openai.com','chatgpt.com','auth.chatgpt.com'].includes(u.hostname);}catch{return false;}}
// OAuth runs in the user's default browser; Codex's local callback server completes the login and the app is brought back to front.
async function login(url){
  if(!authUrlAllowed(url))throw new Error('Endereço de autenticação inválido.');
  awaitingLogin=true;await shell.openExternal(url);
}
function returnFromLogin(){if(!awaitingLogin||!window||window.isDestroyed())return;awaitingLogin=false;if(window.isMinimized())window.restore();window.show();window.setAlwaysOnTop(true);window.focus();window.setAlwaysOnTop(false);}
async function createWindow(){
  // Fit small screens (e.g. 1366×768 at 125% leaves about 1093×580): never open or lock the window larger than the work area.
  const area=screen.getPrimaryDisplay().workAreaSize;
  window=new BrowserWindow({width:Math.min(1440,area.width),height:Math.min(940,area.height),minWidth:Math.min(960,area.width),minHeight:Math.min(560,area.height),title:'Carrossell',icon:join(root,'resources','branding','icon-256.png'),backgroundColor:'#f6f3ed',autoHideMenuBar:true,...(process.platform==='darwin'?{titleBarStyle:'hiddenInset',trafficLightPosition:{x:18,y:20}}:{titleBarStyle:'hidden',titleBarOverlay:{color:'#fcfbf8',symbolColor:'#191919',height:55}}),webPreferences:{preload:join(root,'electron','preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  // Clique direito com Recortar, Copiar e Colar: compradores colam o contexto da marca pelo menu.
  window.webContents.on('context-menu',(_event,params)=>{
    const f=params.editFlags||{};
    const items=params.isEditable
      ?[{label:ui('Desfazer'),role:'undo',enabled:f.canUndo!==false},{label:ui('Refazer'),role:'redo',enabled:f.canRedo!==false},{type:'separator'},{label:ui('Recortar'),role:'cut',enabled:f.canCut!==false},{label:ui('Copiar'),role:'copy',enabled:f.canCopy!==false},{label:ui('Colar'),role:'paste',enabled:f.canPaste!==false},{label:ui('Selecionar tudo'),role:'selectAll'}]
      :params.selectionText?.trim()?[{label:ui('Copiar'),role:'copy'},{label:ui('Selecionar tudo'),role:'selectAll'}]:[];
    if(items.length)Menu.buildFromTemplate(items).popup({window});
  });window.webContents.on('will-navigate',event=>event.preventDefault());
  // Lessons play in-app through the privacy-enhanced YouTube embed: only that
  // origin may load in a frame, and it only gets fullscreen.
  const lessonFrame=raw=>{try{const u=new URL(raw);return u.protocol==='https:'&&['www.youtube-nocookie.com','www.youtube.com','youtube.com'].includes(u.hostname);}catch{return false;}};
  // The app itself may only write to the clipboard ("Copiar legenda", DMs, stories).
  const appPage=raw=>{try{const u=new URL(raw);return u.protocol==='file:'||(!app.isPackaged&&u.origin===new URL(process.env.PACTO_DEV_URL||'http://127.0.0.1').origin);}catch{return false;}};
  const allowed=(permission,url)=>(permission==='fullscreen'&&lessonFrame(url))||(permission==='clipboard-sanitized-write'&&appPage(url));
  window.webContents.session.setPermissionRequestHandler((_contents,permission,callback,details)=>callback(allowed(permission,details?.requestingUrl||'')));
  window.webContents.session.setPermissionCheckHandler((_contents,permission,origin)=>allowed(permission,origin||''));
  window.webContents.on('will-frame-navigate',event=>{if(!event.isMainFrame&&!lessonFrame(event.url))event.preventDefault();});
  // From file:// the embed sends no Referer and YouTube refuses to play (error 153); identify the embed itself.
  window.webContents.session.webRequest.onBeforeSendHeaders({urls:['https://www.youtube-nocookie.com/embed/*']},(details,callback)=>{const headers={...details.requestHeaders};if(!headers.Referer)headers.Referer='https://www.youtube-nocookie.com/';callback({requestHeaders:headers});});
  const dev=!app.isPackaged&&process.env.PACTO_DEV_URL;
  if(dev){const url=new URL(dev);if(url.hostname!=='127.0.0.1'||url.protocol!=='http:')throw new Error('URL de desenvolvimento inválida.');await window.loadURL(url.href);}
  else await window.loadFile(join(root,'dist','index.html'));
}
if(process.platform==='win32')app.setAppUserModelId('com.matheuscastro.pacto');
// Menu Editar explícito: Ctrl/Cmd+C, V, X, A e Z funcionam em qualquer sistema, inclusive no Mac.
const ui=s=>translateUi(runtime?.locale?.()||'pt-BR',s);
function appMenu(){
  const edit={label:ui('Editar'),submenu:[{label:ui('Desfazer'),role:'undo'},{label:ui('Refazer'),role:'redo'},{type:'separator'},{label:ui('Recortar'),role:'cut'},{label:ui('Copiar'),role:'copy'},{label:ui('Colar'),role:'paste'},{label:ui('Colar sem formatação'),role:'pasteAndMatchStyle'},{label:ui('Selecionar tudo'),role:'selectAll'}]};
  const view={label:ui('Exibir'),submenu:[{label:ui('Aumentar'),role:'zoomIn'},{label:ui('Diminuir'),role:'zoomOut'},{label:ui('Tamanho original'),role:'resetZoom'},{type:'separator'},{label:ui('Tela cheia'),role:'togglefullscreen'}]};
  const mac=process.platform==='darwin'?[{label:'Carrossell',submenu:[{role:'about',label:ui('Sobre o Carrossell')},{type:'separator'},{role:'hide',label:ui('Ocultar')},{role:'quit',label:ui('Sair')}]}]:[];
  return Menu.buildFromTemplate([...mac,edit,view,{label:ui('Janela'),submenu:[{label:ui('Minimizar'),role:'minimize'},{label:ui('Fechar'),role:'close'},{type:'separator'},{label:ui('Sair'),role:'quit'}]}]);
}
// Mac: abrir o app (Finder, Dock, Launchpad) com ele já rodando em segundo plano pelo piloto não cria
// uma segunda instância; o sistema só reativa o processo. Sem isto, nenhuma janela aparecia.
app.on('activate',()=>{if(!windowOpen())void showUI?.();});
app.on('second-instance',(_event,argv)=>{if(argv.includes(PILOT_FLAG)){void runtime?.autopilot?.log.write('tarefa-do-sistema',{app_ja_aberto:true});void runtime?.autopilot?.step();}else if(argv.includes(SCHEDULE_FLAG))void publishDue?.();else if(!argv.includes(BACKGROUND))void showUI?.();});
// Link de conexão do Instagram: só https do Composio, Instagram ou Facebook abre no navegador.
// Só em desenvolvimento: PACTO_COMPOSIO_URL aponta para um Composio falso local (provas de interface) e o link não abre o navegador.
const fakeComposio=!app.isPackaged&&/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.PACTO_COMPOSIO_URL||'')?process.env.PACTO_COMPOSIO_URL:'';
function openAuth(raw){if(fakeComposio)return console.log(`Link de conexão (teste): ${raw}`);const u=new URL(raw);if(u.protocol!=='https:'||!['composio.dev','instagram.com','facebook.com'].some(d=>u.hostname===d||u.hostname.endsWith(`.${d}`)))throw new Error('Link de conexão inválido.');return shell.openExternal(u.href);}
const notify=(title,body)=>{if(Notification.isSupported())new Notification({title,icon:join(root,'resources','branding','icon-256.png'),body}).show();};
app.whenReady().then(async()=>{
  if(!primary)return;
  if(headless)app.dock?.hide();
  Menu.setApplicationMenu(appMenu());
  const userData=app.getPath('userData');const secrets=createSecrets(userData);licenseService=new LicenseService({store:secrets,userData,appVersion:app.getVersion()});
  setInterval(()=>{void licenseService?.status().catch(()=>{});},60*60*1000).unref?.();
  const profiles=await new Profiles(join(userData,'library')).init();const store=await profiles.store();const knowledge=await loadKnowledge(join(root,'resources','pacto'));
  codex=new CodexClient({home:join(app.getPath('userData'),'codex'),workspace:join(app.getPath('userData'),'generation'),onActivity:message=>emit({type:'activity',message:translateUi(runtime?.locale?.()||'pt-BR',message)}),onStatus:()=>{if(runtime)emit({type:'state',state:runtime.state()});if(codex?.status.account.connected)returnFromLogin();}});
  const render=createRenderer({folder:join(app.getPath('userData'),'render'),fontsDir:join(root,'node_modules','@fontsource','archivo','files'),failFirst:!app.isPackaged?Number(process.env.PACTO_RENDER_FAIL_FIRST||0):0});
  // Só em desenvolvimento: a prova de renderização cria renderizadores próprios com falhas forçadas.
  if(!app.isPackaged&&process.env.PACTO_PROOF_RENDER==='1')globalThis.__pactoCreateRenderer=createRenderer;
  const run=promisify(execFile);
  const schedulerOptions={exe:process.execPath,args:app.isPackaged?[BACKGROUND]:[root,BACKGROUND],run:(cmd,args)=>run(cmd,args,{windowsHide:true}),writeFile:async(file,data)=>{await mkdir(dirname(file),{recursive:true});await writeFile(file,data);},rm:file=>rm(file,{force:true}),tempDir:app.getPath('temp'),agentsDir:join(homedir(),'Library','LaunchAgents'),uid:process.getuid?.()??0};
  const scheduler=new OsScheduler(schedulerOptions);
  const pilotScheduler=!app.isPackaged&&process.env.PACTO_AUTOPILOT_NO_TASKS==='1'?{add:async()=>{},remove:async()=>{}}:new PilotScheduler(schedulerOptions);
  runtime=new Runtime({store,profiles,codex,knowledge,emit,instagram:{composio:options=>new Composio({...options,base:fakeComposio?`${fakeComposio}/api/v3.1`:COMPOSIO_BASE})},dialogs:{login,render,readPage,openTelegram:async raw=>{const url=new URL(raw);if(url.protocol!=='https:'||url.hostname!=='t.me')throw new Error('Link do Telegram inválido.');return shell.openExternal(url.href);},openNotice:async raw=>{const u=new URL(raw);if(u.protocol!=='https:')throw new Error('Link do aviso inválido.');return shell.openExternal(u.href);},cliInfo:()=>cliInfo(root),installCli:()=>installCli(root),secrets,scheduler,openAuth,toJpeg:pngs=>jpegCards(pngs,nativeImage),toPreviewJpeg:pngs=>pngs.map(bytes=>{const image=nativeImage.createFromBuffer(bytes);if(image.isEmpty())throw new Error('Não foi possível preparar a prévia para o Telegram.');return image.toJPEG(88);}),
    async savePdf(project,bytes){const suggested=project.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'').slice(0,80)||'documento';const result=await dialog.showSaveDialog(window,{title:ui('Salvar PDF'),defaultPath:`${suggested}.pdf`,filters:[{name:'PDF',extensions:['pdf']}]});if(result.canceled||!result.filePath)return {cancelled:true};await writeFile(result.filePath,bytes);return {path:result.filePath};},
    async export(project,bytes){const normalized=normalizeExport(bytes,nativeImage);const suggested=project.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'').slice(0,80)||'carrossel';const result=await dialog.showSaveDialog(window,{title:ui('Exportar carrossel'),defaultPath:`${suggested}.zip`,filters:[{name:ui('Carrossel ZIP'),extensions:['zip']}]});if(result.canceled||!result.filePath)return {cancelled:true};await writeFile(result.filePath,normalized);return {path:result.filePath,count:project.slides.length,width:1080,height:1350};},
    async normalizeFiles(files){return normalizeFiles(files,nativeImage);},
    async chooseFolder(){const result=await dialog.showOpenDialog(window,{title:ui('Escolha a pasta sincronizada (ex.: Meu Drive)'),properties:['openDirectory','createDirectory']});return result.canceled?null:result.filePaths[0]||null;},
    async openCourse(url){const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='www.youtube.com')throw new Error('Link do curso inválido.');await shell.openExternal(u.href);},
    async importReference(){const result=await dialog.showOpenDialog(window,{title:ui('Importar referência visual'),properties:['openFile'],filters:[{name:ui('Imagens'),extensions:['png','jpg','jpeg','webp']}]});if(result.canceled||!result.filePaths[0])return {cancelled:true};const file=result.filePaths[0];if((await stat(file)).size>20*1024*1024)throw new Error('Use uma referência de até 20 MB.');const bytes=await readFile(file);if(nativeImage.createFromBuffer(bytes).isEmpty())throw new Error('Não foi possível ler a imagem.');const extension=extname(file).toLowerCase();const mime=extension==='.png'?'png':extension==='.webp'?'webp':'jpeg';const ref=validateReference({name:file.split(/[\\/]/).at(-1),dataUrl:`data:image/${mime};base64,${bytes.toString('base64')}`});return ref;}
  }});
  const telegramBase=!app.isPackaged&&/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.PACTO_TELEGRAM_URL||'')?process.env.PACTO_TELEGRAM_URL:undefined;
  // Diário do piloto (pilot.log na pasta de dados): mostra se o app estava aberto, se o PC dormiu e o
  // que aconteceu em cada horário. Sai do computador só pelo botão "Copiar diagnóstico".
  const pilotLog=new PilotLog(join(app.getPath('userData'),'pilot.log'));
  void pilotLog.write('app-aberto',{versao:app.getVersion(),sistema:`${process.platform} ${process.arch}`,modo:headless?'segundo plano':'janela',pela_tarefa:process.argv.includes(PILOT_FLAG)});
  powerMonitor.on('suspend',()=>void pilotLog.write('pc-suspenso'));
  powerMonitor.on('resume',()=>{void pilotLog.write('pc-acordou');void runtime.autopilot?.step();});
  app.on('before-quit',()=>void pilotLog.write('app-fechando'));
  runtime.dialogs.appInfo=()=>({version:app.getVersion(),platform:`${process.platform} ${process.arch}`});
  runtime.dialogs.copyText=text=>clipboard.writeText(String(text));
  runtime.autopilot=new Autopilot({runtime,log:pilotLog,state:await new AutopilotStore(app.getPath('userData')).init(),secrets:runtime.dialogs.secrets,scheduler:pilotScheduler,clientFactory:token=>new TelegramClient({token,...(telegramBase?{base:telegramBase}:{})})});
  try{await runtime.autopilot.rearm();}catch{runtime.autopilot.connectionError='Não foi possível registrar a rotina no sistema. Abra o piloto e salve a configuração novamente.';}
  runtime.autopilot.start();void runtime.autopilot.step();
  // Avisos do dono do app: lê o arquivo público ao abrir e a cada hora, e avisa no sistema o que é novo.
  // Só em desenvolvimento PACTO_NOTICES_URL aponta para um servidor local de prova.
  const noticesUrl=!app.isPackaged&&/^http:\/\/127\.0\.0\.1:\d+\//.test(process.env.PACTO_NOTICES_URL||'')?process.env.PACTO_NOTICES_URL:NOTICES_URL;
  runtime.notices=await new Notices({root:app.getPath('userData'),version:app.getVersion(),url:noticesUrl}).init();
  const noticeTick=async()=>{
    if(!await runtime.notices.refresh())return;
    for(const n of await runtime.notices.takeNew())if(Notification.isSupported()){const note=new Notification({title:`Carrossell · ${n.title}`,icon:join(root,'resources','branding','icon-256.png'),body:n.body.slice(0,240)});note.on('click',()=>void showUI?.());note.show();}
    try{emit({type:'state',state:runtime.state()});}catch{}
  };
  setTimeout(()=>void noticeTick(),process.env.PACTO_NOTICES_URL?1500:20000).unref?.();setInterval(()=>void noticeTick(),60*60*1000).unref?.();
  ipcMain.handle('pacto:request',async(event,action,args)=>{
    const licenseActions=['licenseStatus','activateLicense','revalidateLicense','openLicenseLink'];
    if(event.sender!==window?.webContents||event.senderFrame!==window.webContents.mainFrame||!(ACTIONS.includes(action)||action==='installUpdate'||action==='titleBar'||licenseActions.includes(action)))throw new Error('Solicitação não permitida.');
    if(action==='installUpdate'){updates?.install();return {ok:true};}
    // Cores dos botões de janela acompanham o tema e a paleta escolhidos no app.
    if(action==='titleBar'){const color=String(args?.color||''),symbol=String(args?.symbol||'');if(process.platform!=='darwin'&&/^#[0-9a-f]{6}$/i.test(color)&&/^#[0-9a-f]{6}$/i.test(symbol))window.setTitleBarOverlay({color,symbolColor:symbol,height:55});return {ok:true};}
    if(action==='licenseStatus')return licenseService.status();
    if(action==='activateLicense')return licenseService.activateLicense(args);
    if(action==='revalidateLicense')return licenseService.revalidateLicense();
    if(action==='openLicenseLink'){const url=args?.which==='termos'?TERMS_URL:args?.which==='privacidade'?PRIVACY_URL:null;if(!url)throw new Error('Link da licença inválido.');await shell.openExternal(url);return {ok:true};}
    try{const result=await runtime.request(action,args);if(action==='saveSettings'&&(args?.language==='es'||args?.language==='pt-BR')){Menu.setApplicationMenu(appMenu());tray?.setLocale?.(args.language);}return result;}catch(error){throw safeError(error);}
  });
  try{control=await startControl({userData:app.getPath('userData'),runtime,allowed:ACTIONS,version:app.getVersion(),headless,info:()=>({window:windowOpen()&&window.isVisible()}),onActivity:()=>{lastActivity=Date.now();}});}
  catch(error){console.error(`Controle local indisponível: ${safeError(error).message}`);}
  // Posts agendados vencidos (tarefa do sistema ou computador que estava desligado) e métricas do Instagram.
  publishDue=async()=>{
    try{const r=await runtime.request('publishDue');if(r.published.length)notify(ui('Carrossell · post publicado'),r.published.length>1?ui(`${r.published.length} carrosséis agendados foram publicados no Instagram.`):ui('O carrossel agendado foi publicado no Instagram.'));for(const f of r.failed)notify(ui('Carrossell · o post agendado não saiu'),ui(f.error));if(r.late.length)notify(ui('Carrossell · post agendado atrasado'),ui('O computador estava desligado na hora marcada. Abra o Carrossell para postar agora ou cancelar.'));}
    catch(error){console.error(`Agendados: ${safeError(error).message}`);}
    if(headless&&process.argv.includes(SCHEDULE_FLAG)&&!windowOpen()&&!control?.clients()&&!runtime.job&&!runtime.autopilot?.keepAlive())app.quit();
  };
  const metrics=async()=>{if(!runtime.dialogs.secrets.hasKey())return;for(const p of profiles.list())await runtime.request('refreshMetrics',{profileId:p.id}).catch(()=>{});};
  void publishDue();
  setTimeout(()=>void metrics(),60000).unref();setInterval(()=>void metrics(),30*60000).unref();
  // Sem janela, sem trabalho e sem CLI conectada por 10 minutos: fecha.
  setInterval(()=>{if(!windowOpen()&&!runtime.job&&!runtime.autopilot?.keepAlive()&&!control?.clients()&&Date.now()-lastActivity>IDLE_MS)app.quit();},Math.min(30000,IDLE_MS)).unref();
  let started=false;
  showUI=async()=>{
    if(windowOpen()){if(window.isMinimized())window.restore();window.show();window.focus();updates?.refresh();return;}
    app.dock?.show();await createWindow();if(headless){window.show();window.focus();}
    if(started){updates?.refresh();return;}started=true;
    updates=startUpdates({app,emit,notify:(body,title='Carrossell · atualização pronta')=>{if(Notification.isSupported())new Notification({title,icon:join(root,'resources','branding','icon-256.png'),body}).show();},open:url=>{const u=new URL(url);if(u.protocol==='https:'&&u.hostname==='github.com'||u.protocol==='http:'&&u.hostname==='127.0.0.1')return shell.openExternal(u.href);}});
    // Lembrete diário em qualquer perfil com resultado pendente; o primeiro encontrado avisa.
    let remind='',remindStore=store,remindProfile=profiles.active;for(const p of profiles.list()){const s=await profiles.store(p.id).catch(()=>null);const r=s&&reminder(s.state().projects,s.state().settings);if(r){remind=profiles.list().length>1?`${p.name}: ${r}`:r;remindStore=s;remindProfile=p.id;break;}}
    if(remind&&Notification.isSupported()){const note=new Notification({title:ui('Carrossell · hora de medir'),icon:join(root,'resources','branding','icon-256.png'),body:translateUi(remindStore.state().settings?.language,remind)});note.on('click',async()=>{window?.show();window?.focus();if(remindProfile!==profiles.active)await runtime.request('switchProfile',{id:remindProfile}).then(state=>emit({type:'state',state})).catch(()=>{});emit({type:'navigate',view:'rhythm'});});note.show();await remindStore.saveSettings({lastReminderAt:new Date().toISOString()});}
  };
  // Windows: com o piloto ligado o app segue rodando sem janela; a bandeja abre, procura atualização e sai.
  if(process.platform==='win32')tray=createTray({icon:join(root,'resources','branding',process.platform==='win32'?'carrossell.ico':'icon-32.png'),locale:runtime.locale(),show:()=>void showUI?.(),checkUpdates:()=>updates?updates.check():notify(ui('Carrossell · atualização'),ui('Abra o Carrossell para procurar atualização.')),quit:()=>app.quit()});
  Menu.setApplicationMenu(appMenu());
  if(!headless)await showUI();
  void codex.start().catch(error=>emit({type:'activity',message:safeError(error).message}));
}).catch(error=>{dialog.showErrorBox('Não foi possível abrir o Carrossell',safeError(error).message);app.quit();});
// Fechar a janela com a CLI conectada ou trabalho rodando deixa o app em segundo plano até terminar.
app.on('window-all-closed',()=>{
  if(control?.clients()||runtime?.job||runtime?.autopilot?.keepAlive()){
    if(!warnedBackground&&tray){warnedBackground=true;notify(ui('Carrossell continua aberto'),ui('O piloto automático segue funcionando. Para sair, clique com o botão direito no ícone do Carrossell perto do relógio e escolha Sair.'));}
    return;
  }
  app.quit();
});app.on('before-quit',()=>{runtime?.autopilot?.stop();void runtime?.sharing?.stop();codex?.stop();});
