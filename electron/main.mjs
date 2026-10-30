import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage, Notification, screen, Menu } from 'electron';
import { reminder } from '../core/rhythm.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname, resolve } from 'node:path';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { validateReference } from '../core/store.mjs';
import { Profiles } from '../core/profiles.mjs';
import { CodexClient, safeError } from '../core/codex.mjs';
import { Runtime, ACTIONS } from '../core/runtime.mjs';
import { loadKnowledge } from '../core/knowledge.mjs';
import { normalizeExport, normalizeFiles } from '../core/export.mjs';
import { startUpdates } from './updater.mjs';
import { configureIdentity } from './identity.mjs';
import { createRenderer } from './render.mjs';
import { readPage } from './page.mjs';
import { startControl } from '../core/control.mjs';
import { cliInfo, installCli } from './cli-install.mjs';
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
let window,runtime,codex,updates,control,showUI,awaitingLogin=false,lastActivity=Date.now();
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
      ?[{label:'Desfazer',role:'undo',enabled:f.canUndo!==false},{label:'Refazer',role:'redo',enabled:f.canRedo!==false},{type:'separator'},{label:'Recortar',role:'cut',enabled:f.canCut!==false},{label:'Copiar',role:'copy',enabled:f.canCopy!==false},{label:'Colar',role:'paste',enabled:f.canPaste!==false},{label:'Selecionar tudo',role:'selectAll'}]
      :params.selectionText?.trim()?[{label:'Copiar',role:'copy'},{label:'Selecionar tudo',role:'selectAll'}]:[];
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
function appMenu(){
  const edit={label:'Editar',submenu:[{label:'Desfazer',role:'undo'},{label:'Refazer',role:'redo'},{type:'separator'},{label:'Recortar',role:'cut'},{label:'Copiar',role:'copy'},{label:'Colar',role:'paste'},{label:'Colar sem formatação',role:'pasteAndMatchStyle'},{label:'Selecionar tudo',role:'selectAll'}]};
  const view={label:'Exibir',submenu:[{label:'Aumentar',role:'zoomIn'},{label:'Diminuir',role:'zoomOut'},{label:'Tamanho original',role:'resetZoom'},{type:'separator'},{label:'Tela cheia',role:'togglefullscreen'}]};
  const mac=process.platform==='darwin'?[{label:'Carrossell',submenu:[{role:'about',label:'Sobre o Carrossell'},{type:'separator'},{role:'hide',label:'Ocultar'},{role:'quit',label:'Sair'}]}]:[];
  return Menu.buildFromTemplate([...mac,edit,view,{label:'Janela',submenu:[{label:'Minimizar',role:'minimize'},{label:'Fechar',role:'close'}]}]);
}
app.on('second-instance',(_event,argv)=>{if(!argv.includes(BACKGROUND))void showUI?.();});
app.whenReady().then(async()=>{
  if(!primary)return;
  if(headless)app.dock?.hide();
  Menu.setApplicationMenu(appMenu());
  const profiles=await new Profiles(join(app.getPath('userData'),'library')).init();const store=await profiles.store();const knowledge=await loadKnowledge(join(root,'resources','pacto'));
  codex=new CodexClient({home:join(app.getPath('userData'),'codex'),workspace:join(app.getPath('userData'),'generation'),onActivity:message=>emit({type:'activity',message}),onStatus:()=>{if(runtime)emit({type:'state',state:runtime.state()});if(codex?.status.account.connected)returnFromLogin();}});
  const render=createRenderer({folder:join(app.getPath('userData'),'render'),fontsDir:join(root,'node_modules','@fontsource','archivo','files')});
  runtime=new Runtime({store,profiles,codex,knowledge,emit,dialogs:{login,render,readPage,cliInfo:()=>cliInfo(root),installCli:()=>installCli(root),
    async savePdf(project,bytes){const suggested=project.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'').slice(0,80)||'documento';const result=await dialog.showSaveDialog(window,{title:'Salvar PDF',defaultPath:`${suggested}.pdf`,filters:[{name:'PDF',extensions:['pdf']}]});if(result.canceled||!result.filePath)return {cancelled:true};await writeFile(result.filePath,bytes);return {path:result.filePath};},
    async export(project,bytes){const normalized=normalizeExport(bytes,nativeImage);const suggested=project.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'').slice(0,80)||'carrossel';const result=await dialog.showSaveDialog(window,{title:'Exportar carrossel',defaultPath:`${suggested}.zip`,filters:[{name:'Carrossel ZIP',extensions:['zip']}]});if(result.canceled||!result.filePath)return {cancelled:true};await writeFile(result.filePath,normalized);return {path:result.filePath,count:project.slides.length,width:1080,height:1350};},
    async normalizeFiles(files){return normalizeFiles(files,nativeImage);},
    async chooseFolder(){const result=await dialog.showOpenDialog(window,{title:'Escolha a pasta sincronizada (ex.: Meu Drive)',properties:['openDirectory','createDirectory']});return result.canceled?null:result.filePaths[0]||null;},
    async openCourse(url){const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='www.youtube.com')throw new Error('Link do curso inválido.');await shell.openExternal(u.href);},
    async importReference(){const result=await dialog.showOpenDialog(window,{title:'Importar referência visual',properties:['openFile'],filters:[{name:'Imagens',extensions:['png','jpg','jpeg','webp']}]});if(result.canceled||!result.filePaths[0])return {cancelled:true};const file=result.filePaths[0];if((await stat(file)).size>20*1024*1024)throw new Error('Use uma referência de até 20 MB.');const bytes=await readFile(file);if(nativeImage.createFromBuffer(bytes).isEmpty())throw new Error('Não foi possível ler a imagem.');const extension=extname(file).toLowerCase();const mime=extension==='.png'?'png':extension==='.webp'?'webp':'jpeg';const ref=validateReference({name:file.split(/[\\/]/).at(-1),dataUrl:`data:image/${mime};base64,${bytes.toString('base64')}`});return ref;}
  }});
  ipcMain.handle('pacto:request',async(event,action,args)=>{
    if(event.sender!==window?.webContents||event.senderFrame!==window.webContents.mainFrame||!(ACTIONS.includes(action)||action==='installUpdate'||action==='titleBar'))throw new Error('Solicitação não permitida.');
    if(action==='installUpdate'){updates?.install();return {ok:true};}
    // Cores dos botões de janela acompanham o tema e a paleta escolhidos no app.
    if(action==='titleBar'){const color=String(args?.color||''),symbol=String(args?.symbol||'');if(process.platform!=='darwin'&&/^#[0-9a-f]{6}$/i.test(color)&&/^#[0-9a-f]{6}$/i.test(symbol))window.setTitleBarOverlay({color,symbolColor:symbol,height:55});return {ok:true};}
    try{return await runtime.request(action,args);}catch(error){throw safeError(error);}
  });
  try{control=await startControl({userData:app.getPath('userData'),runtime,allowed:ACTIONS,version:app.getVersion(),headless,info:()=>({window:windowOpen()&&window.isVisible()}),onActivity:()=>{lastActivity=Date.now();}});}
  catch(error){console.error(`Controle local indisponível: ${safeError(error).message}`);}
  // Sem janela, sem trabalho e sem CLI conectada por 10 minutos: fecha.
  setInterval(()=>{if(!windowOpen()&&!runtime.job&&!control?.clients()&&Date.now()-lastActivity>IDLE_MS)app.quit();},Math.min(30000,IDLE_MS)).unref();
  let started=false;
  showUI=async()=>{
    if(windowOpen()){if(window.isMinimized())window.restore();window.show();window.focus();return;}
    app.dock?.show();await createWindow();if(headless){window.show();window.focus();}
    if(started)return;started=true;
    updates=startUpdates({app,emit,notify:(body,title='Carrossell · atualização pronta')=>{if(Notification.isSupported())new Notification({title,icon:join(root,'resources','branding','icon-256.png'),body}).show();},open:url=>{const u=new URL(url);if(u.protocol==='https:'&&u.hostname==='github.com'||u.protocol==='http:'&&u.hostname==='127.0.0.1')return shell.openExternal(u.href);}});
    // Lembrete diário em qualquer perfil com resultado pendente; o primeiro encontrado avisa.
    let remind='',remindStore=store,remindProfile=profiles.active;for(const p of profiles.list()){const s=await profiles.store(p.id).catch(()=>null);const r=s&&reminder(s.state().projects,s.state().settings);if(r){remind=profiles.list().length>1?`${p.name}: ${r}`:r;remindStore=s;remindProfile=p.id;break;}}
    if(remind&&Notification.isSupported()){const note=new Notification({title:'Carrossell · hora de medir',icon:join(root,'resources','branding','icon-256.png'),body:remind});note.on('click',async()=>{window?.show();window?.focus();if(remindProfile!==profiles.active)await runtime.request('switchProfile',{id:remindProfile}).then(state=>emit({type:'state',state})).catch(()=>{});emit({type:'navigate',view:'rhythm'});});note.show();await remindStore.saveSettings({lastReminderAt:new Date().toISOString()});}
  };
  if(!headless)await showUI();
  void codex.start().catch(error=>emit({type:'activity',message:safeError(error).message}));
}).catch(error=>{dialog.showErrorBox('Não foi possível abrir o Carrossell',safeError(error).message);app.quit();});
// Fechar a janela com a CLI conectada ou trabalho rodando deixa o app em segundo plano até terminar.
app.on('window-all-closed',()=>{if(control?.clients()||runtime?.job)return;app.quit();});app.on('before-quit',()=>{void runtime?.sharing?.stop();codex?.stop();});
