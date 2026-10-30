const {app,BrowserWindow,ipcMain}=require('electron');const {mkdtemp,rm,writeFile}=require('node:fs/promises');const {tmpdir}=require('node:os');const {join}=require('node:path');
let runtime,dir,window;const assert=require('node:assert/strict');
app.whenReady().then(async()=>{
 try{
  dir=await mkdtemp(join(tmpdir(),'am-studio-smoke-'));const {startRuntime}=await import('../companion/server.mjs');runtime=await startRuntime({port:32991,vaultDir:dir});
  ipcMain.handle('am-bootstrap',()=>({port:32991,pairingKey:runtime.pairingKey}));ipcMain.handle('am-open-external',()=>{});
  window=new BrowserWindow({width:1440,height:1050,show:false,webPreferences:{preload:join(__dirname,'../desktop/preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  const errors=[];window.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message);});
  await window.loadURL('http://127.0.0.1:32991/studio/');
  await new Promise(r=>setTimeout(r,800));
  const state=await window.webContents.executeJavaScript(`({sync:document.getElementById('sync').textContent,pairing:document.getElementById('pairing').hidden,mixer:document.querySelectorAll('.channel').length,overflow:document.body.scrollWidth>innerWidth})`);
  assert.equal(state.sync,'● Sincronizado');assert.equal(state.pairing,true);assert.equal(state.mixer,4);assert.equal(state.overflow,false);
  await window.webContents.executeJavaScript(`document.getElementById('new-pack').click();document.getElementById('pack-name').value='Masmorra de teste';document.getElementById('pack-form').requestSubmit();`);
  await new Promise(r=>setTimeout(r,500));assert.equal(runtime.audio.store.data.packs[0].name,'Masmorra de teste');
  await window.webContents.executeJavaScript(`document.getElementById('settings-open').click()`);await new Promise(r=>setTimeout(r,150));
  assert(await window.webContents.executeJavaScript(`document.getElementById('settings').open`));await window.webContents.executeJavaScript(`document.getElementById('settings-close').click()`);
  const output=process.env.AM_SMOKE_SCREENSHOT||join(tmpdir(),'ajudamestre-studio-smoke.png');await writeFile(output,(await window.webContents.capturePage()).toPNG());
  assert.equal(errors.length,0,errors.join('\n'));console.log('Desktop real: sincronização, mixer, criação de pacote e diálogo de conexões verificados. Screenshot: '+output);
 }catch(e){console.error(e.stack);process.exitCode=1;}
 finally{window?.destroy();await runtime?.close();if(dir)await rm(dir,{recursive:true,force:true});app.exit(process.exitCode||0);}
});
