import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage, Notification, screen } from 'electron';
import { reminder } from '../core/rhythm.mjs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname, resolve } from 'node:path';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { Store, validateReference } from '../core/store.mjs';
import { CodexClient, safeError } from '../core/codex.mjs';
import { Runtime, ACTIONS } from '../core/runtime.mjs';
import { loadKnowledge } from '../core/knowledge.mjs';
import { normalizeExport, normalizeFiles } from '../core/export.mjs';
import { startUpdates } from './updater.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(process.env.PACTO_USER_DATA)app.setPath('userData',resolve(process.env.PACTO_USER_DATA));
let window,loginWindow,runtime,codex,updates;
function emit(event){if(window&&!window.isDestroyed())window.webContents.send('pacto:event',event);}
function authUrlAllowed(raw){try{const u=new URL(raw);return u.protocol==='https:'&&(u.hostname==='auth.openai.com'||u.hostname==='auth0.openai.com'||u.hostname==='chatgpt.com'||u.hostname==='auth.chatgpt.com')||u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname);}catch{return false;}}
async function login(url){
  if(!authUrlAllowed(url))throw new Error('Endereço de autenticação inválido.');
  if(loginWindow&&!loginWindow.isDestroyed()){loginWindow.focus();return;}
  loginWindow=new BrowserWindow({width:560,height:760,title:'Conectar sua conta ChatGPT',parent:window,autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,partition:'persist:pacto-auth'}});
  loginWindow.webContents.setWindowOpenHandler(({url})=>{if(authUrlAllowed(url))void loginWindow.loadURL(url);return {action:'deny'};});
  loginWindow.webContents.on('will-navigate',(event,target)=>{if(!authUrlAllowed(target))event.preventDefault();});
  loginWindow.on('closed',()=>{loginWindow=null;});await loginWindow.loadURL(url);
}
async function createWindow(){
  // Fit small screens (e.g. 1366×768 at 125% leaves about 1093×580): never open or lock the window larger than the work area.
  const area=screen.getPrimaryDisplay().workAreaSize;
  window=new BrowserWindow({width:Math.min(1440,area.width),height:Math.min(940,area.height),minWidth:Math.min(960,area.width),minHeight:Math.min(560,area.height),title:'PACTO',backgroundColor:'#f5f3ee',autoHideMenuBar:true,webPreferences:{preload:join(root,'electron','preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());
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
app.whenReady().then(async()=>{
  const storage=join(app.getPath('userData'),'library');const store=await new Store(storage).init();const knowledge=await loadKnowledge(join(root,'resources','pacto'));
  codex=new CodexClient({home:join(app.getPath('userData'),'codex'),workspace:join(app.getPath('userData'),'generation'),onActivity:message=>emit({type:'activity',message}),onStatus:()=>{if(runtime)emit({type:'state',state:runtime.state()});if(codex?.status.account.connected&&loginWindow&&!loginWindow.isDestroyed())loginWindow.close();}});
  runtime=new Runtime({store,codex,knowledge,emit,dialogs:{login,
    async export(project,bytes){const normalized=normalizeExport(bytes,nativeImage);const suggested=project.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'').slice(0,80)||'carrossel';const result=await dialog.showSaveDialog(window,{title:'Exportar carrossel',defaultPath:`${suggested}.zip`,filters:[{name:'Carrossel ZIP',extensions:['zip']}]});if(result.canceled||!result.filePath)return {cancelled:true};await writeFile(result.filePath,normalized);return {path:result.filePath,count:project.slides.length,width:1080,height:1350};},
    async normalizeFiles(files){return normalizeFiles(files,nativeImage);},
    async chooseFolder(){const result=await dialog.showOpenDialog(window,{title:'Escolha a pasta sincronizada (ex.: Meu Drive)',properties:['openDirectory','createDirectory']});return result.canceled?null:result.filePaths[0]||null;},
    async openCourse(url){const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='www.youtube.com')throw new Error('Link do curso inválido.');await shell.openExternal(u.href);},
    async importReference(){const result=await dialog.showOpenDialog(window,{title:'Importar referência visual',properties:['openFile'],filters:[{name:'Imagens',extensions:['png','jpg','jpeg','webp']}]});if(result.canceled||!result.filePaths[0])return {cancelled:true};const file=result.filePaths[0];if((await stat(file)).size>20*1024*1024)throw new Error('Use uma referência de até 20 MB.');const bytes=await readFile(file);if(nativeImage.createFromBuffer(bytes).isEmpty())throw new Error('Não foi possível ler a imagem.');const extension=extname(file).toLowerCase();const mime=extension==='.png'?'png':extension==='.webp'?'webp':'jpeg';const ref=validateReference({name:file.split(/[\\/]/).at(-1),dataUrl:`data:image/${mime};base64,${bytes.toString('base64')}`});return ref;}
  }});
  ipcMain.handle('pacto:request',async(event,action,args)=>{
    if(event.sender!==window?.webContents||event.senderFrame!==window.webContents.mainFrame||!(ACTIONS.includes(action)||action==='installUpdate'))throw new Error('Solicitação não permitida.');
    if(action==='installUpdate'){updates?.install();return {ok:true};}
    try{return await runtime.request(action,args);}catch(error){throw safeError(error);}
  });
  await createWindow();
  updates=startUpdates({app,emit,notify:body=>{if(Notification.isSupported())new Notification({title:'PACTO · atualização pronta',body}).show();}});
  // Lembrete diário de Volume → Sinal → Repetição, só com o app aberto e resultado pendente.
  const remind=reminder(store.state().projects,store.state().settings);
  if(remind&&Notification.isSupported()){const note=new Notification({title:'PACTO · hora de medir',body:remind});note.on('click',()=>{window?.show();window?.focus();emit({type:'navigate',view:'rhythm'});});note.show();await store.saveSettings({lastReminderAt:new Date().toISOString()});}void codex.start().catch(error=>emit({type:'activity',message:safeError(error).message}));
}).catch(error=>{dialog.showErrorBox('Não foi possível abrir o PACTO',safeError(error).message);app.quit();});
app.on('window-all-closed',()=>app.quit());app.on('before-quit',()=>{void runtime?.sharing?.stop();codex?.stop();});
