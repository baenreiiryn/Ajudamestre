const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('ajudamestreDesktop',{bootstrap:()=>ipcRenderer.invoke('am-bootstrap'),openExternal:url=>ipcRenderer.invoke('am-open-external',url)});
