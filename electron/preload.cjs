const { contextBridge, ipcRenderer } = require('electron');
const actions=new Set(['bootstrap','saveProfile','connect','disconnect','createProject','saveProject','generatePlan','generateSlides','sendMessage','cancel','export','duplicate','delete','openCourse','importReference','interview','saveInterview','resetInterview','cancelInterview','approveText','generateCovers','chooseCover','radar','modelReference','replicate','deleteIdeas','ctaKit','cancelWork','markPublished','recordResults','saveSettings','shareToPhone','stopShare','saveToDrive','chooseDriveFolder','stories','generateStoryArt']);
contextBridge.exposeInMainWorld('pacto',Object.freeze({
  request(action,args={}){if(!actions.has(action))return Promise.reject(new Error('Ação não permitida.'));return ipcRenderer.invoke('pacto:request',action,args);},
  onEvent(callback){if(typeof callback!=='function')throw new TypeError('Callback inválido.');const listener=(_event,payload)=>callback(payload);ipcRenderer.on('pacto:event',listener);return ()=>ipcRenderer.removeListener('pacto:event',listener);}
}));
