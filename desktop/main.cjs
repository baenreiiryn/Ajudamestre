const {app,BrowserWindow,ipcMain,shell,dialog}=require('electron');
const {join}=require('node:path');const {homedir}=require('node:os');const fs=require('node:fs/promises');
let window,runtime,owned=false,quitting=false;
if(!app.requestSingleInstanceLock())app.quit();
else {
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.focus();}});
 app.whenReady().then(async()=>{
  try{
   let existing;try{const data=JSON.parse(await fs.readFile(join(homedir(),'.ajudamestre','credentials.json'),'utf8'));const response=await fetch('http://127.0.0.1:3210/audio/state',{headers:{Authorization:`Bearer ${data.pairingKey}`},signal:AbortSignal.timeout(1500)});if(response.ok&&(await response.json()).version==='0.2.1')existing={port:3210,pairingKey:data.pairingKey};}catch{}
   if(existing)runtime=existing;else{const {startRuntime}=await import('../companion/server.mjs');runtime=await startRuntime();owned=true;}
   window=new BrowserWindow({width:1430,height:960,minWidth:940,minHeight:650,title:'Ajudamestre · Audio Studio',backgroundColor:'#10141c',show:false,webPreferences:{preload:join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
   window.setMenuBarVisibility(false);const origin=`http://127.0.0.1:${runtime.port}`;
   const external=async url=>{const parsed=new URL(url);if(parsed.protocol!=='https:')throw Error('Endereço externo inválido.');await shell.openExternal(parsed.href);};
   ipcMain.handle('am-bootstrap',event=>{if(event.sender!==window.webContents)throw Error('Janela inválida.');return {port:runtime.port,pairingKey:runtime.pairingKey};});
   ipcMain.handle('am-open-external',async(event,url)=>{if(event.sender!==window.webContents)throw Error('Janela inválida.');await external(url);});
   window.webContents.setWindowOpenHandler(({url})=>{void external(url).catch(()=>{});return {action:'deny'};});
   window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==origin){event.preventDefault();void external(url).catch(()=>{});}});
   window.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
   window.once('ready-to-show',()=>window.show());await window.loadURL(origin+'/studio/');
  }catch(error){dialog.showErrorBox('Ajudamestre não iniciou',error.message+'\n\nSe o conector antigo estiver aberto no terminal, encerre-o com Ctrl+C e abra o programa novamente.');app.quit();}
 });
 app.on('window-all-closed',()=>app.quit());
 app.on('before-quit',event=>{if(!quitting&&owned&&runtime){event.preventDefault();quitting=true;runtime.close().finally(()=>app.quit());}});
}
