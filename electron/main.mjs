import { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname, resolve } from 'node:path';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { Store, validateReference } from '../core/store.mjs';
import { CodexClient, safeError } from '../core/codex.mjs';
import { Runtime, ACTIONS } from '../core/runtime.mjs';
import { loadKnowledge } from '../core/knowledge.mjs';
import { normalizeExport } from '../core/export.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
if(process.env.PACTO_USER_DATA)app.setPath('userData',resolve(process.env.PACTO_USER_DATA));
let window,loginWindow,runtime,codex;
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
  window=new BrowserWindow({width:1440,height:940,minWidth:1000,minHeight:720,title:'PACTO',backgroundColor:'#f5f3ee',autoHideMenuBar:true,webPreferences:{preload:join(root,'electron','preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  const dev=!app.isPackaged&&process.env.PACTO_DEV_URL;
  if(dev){const url=new URL(dev);if(url.hostname!=='127.0.0.1'||url.protocol!=='http:')throw new Error('URL de desenvolvimento inválida.');await window.loadURL(url.href);}
  else await window.loadFile(join(root,'dist','index.html'));
}
app.whenReady().then(async()=>{
  const storage=join(app.getPath('userData'),'library');const store=await new Store(storage).init();const knowledge=await loadKnowledge(join(root,'resources','pacto'));
  codex=new CodexClient({home:join(app.getPath('userData'),'codex'),workspace:join(app.getPath('userData'),'generation'),onActivity:message=>emit({type:'activity',message}),onStatus:()=>{if(runtime)emit({type:'state',state:runtime.state()});if(codex?.status.account.connected&&loginWindow&&!loginWindow.isDestroyed())loginWindow.close();}});
  runtime=new Runtime({store,codex,knowledge,emit,dialogs:{login,
    async export(project,bytes){const normalized=normalizeExport(bytes,nativeImage);const suggested=project.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'').slice(0,80)||'carrossel';const result=await dialog.showSaveDialog(window,{title:'Exportar carrossel',defaultPath:`${suggested}.zip`,filters:[{name:'Carrossel ZIP',extensions:['zip']}]});if(result.canceled||!result.filePath)return {cancelled:true};await writeFile(result.filePath,normalized);return {path:result.filePath,count:project.slides.length,width:1080,height:1350};},
    async openCourse(url){const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='www.youtube.com')throw new Error('Link do curso inválido.');await shell.openExternal(u.href);},
    async importReference(){const result=await dialog.showOpenDialog(window,{title:'Importar referência visual',properties:['openFile'],filters:[{name:'Imagens',extensions:['png','jpg','jpeg','webp']}]});if(result.canceled||!result.filePaths[0])return {cancelled:true};const file=result.filePaths[0];if((await stat(file)).size>20*1024*1024)throw new Error('Use uma referência de até 20 MB.');const bytes=await readFile(file);if(nativeImage.createFromBuffer(bytes).isEmpty())throw new Error('Não foi possível ler a imagem.');const extension=extname(file).toLowerCase();const mime=extension==='.png'?'png':extension==='.webp'?'webp':'jpeg';const ref=validateReference({name:file.split(/[\\/]/).at(-1),dataUrl:`data:image/${mime};base64,${bytes.toString('base64')}`});return ref;}
  }});
  ipcMain.handle('pacto:request',async(event,action,args)=>{
    if(event.sender!==window?.webContents||event.senderFrame!==window.webContents.mainFrame||!ACTIONS.includes(action))throw new Error('Solicitação não permitida.');
    try{return await runtime.request(action,args);}catch(error){throw safeError(error);}
  });
  await createWindow();void codex.start().catch(error=>emit({type:'activity',message:safeError(error).message}));
}).catch(error=>{dialog.showErrorBox('Não foi possível abrir o PACTO',safeError(error).message);app.quit();});
app.on('window-all-closed',()=>app.quit());app.on('before-quit',()=>codex?.stop());
