const {app,BrowserWindow,ipcMain}=require('electron');const {mkdtemp,rm,writeFile}=require('node:fs/promises');const {tmpdir}=require('node:os');const {join}=require('node:path');
let runtime,dir,window;const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const root=process.env.AM_SMOKE_ROOT||join(__dirname,'..');
app.whenReady().then(async()=>{
 try{
  dir=await mkdtemp(join(tmpdir(),'am-studio-smoke-'));const {startRuntime}=await import(pathToFileURL(join(root,'companion/server.mjs')).href);runtime=await startRuntime({port:32991,vaultDir:dir});
  ipcMain.handle('am-bootstrap',()=>({port:32991,pairingKey:runtime.pairingKey}));ipcMain.handle('am-open-external',()=>{});
  window=new BrowserWindow({width:1440,height:1050,show:false,webPreferences:{preload:join(root,'desktop/preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  if(process.env.AM_SMOKE_ROOT){const packagedRequire=require('node:module').createRequire(join(root,'package.json'));packagedRequire('@snazzah/davey');packagedRequire('@discordjs/voice');await require('node:fs/promises').access(runtime.audio.ffmpeg);assert(runtime.audio.ffmpeg.includes('app.asar.unpacked'));}
  const errors=[];window.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message);});
  await window.loadURL('http://127.0.0.1:32991/studio/');
  await new Promise(r=>setTimeout(r,800));
  const state=await window.webContents.executeJavaScript(`({sync:document.getElementById('sync').textContent,pairing:document.getElementById('pairing').hidden,mixer:document.querySelectorAll('.channel').length,overflow:document.body.scrollWidth>innerWidth})`);
  assert.equal(state.sync,'● Sincronizado');assert.equal(state.pairing,true);assert.equal(state.mixer,4);assert.equal(state.overflow,false);
  await window.webContents.executeJavaScript(`document.getElementById('new-pack').click();document.getElementById('pack-name').value='Masmorra de teste';document.getElementById('pack-form').requestSubmit();`);
  await new Promise(r=>setTimeout(r,500));assert.equal(runtime.audio.store.data.packs[0].name,'Masmorra de teste');
  await window.webContents.executeJavaScript(`document.getElementById('settings-open').click()`);await new Promise(r=>setTimeout(r,150));
  assert(await window.webContents.executeJavaScript(`document.getElementById('settings').open`));await window.webContents.executeJavaScript(`document.getElementById('settings-close').click()`);
  const found=await runtime.audio.catalog.search('footsteps',{provider:'kenney'});const asset=await runtime.audio.candidate(found.results[0].id);assert.equal(asset.license,'CC0-1.0');
  const pack=runtime.audio.store.data.packs[0];await runtime.audio.perform('save-pack',{...pack,slots:[{assetId:asset.id,name:'Passos de teste',bus:'sfx',loop:true,volume:.5}]});await new Promise(r=>setTimeout(r,150));
  let audible=false;const listen=frame=>{if(frame.some(b=>b!==0))audible=true;};runtime.audio.mixer.on('frame',listen);await window.webContents.executeJavaScript("document.querySelector('.pad').click()");await new Promise(r=>setTimeout(r,500));assert(audible,'Pad empacotado não produziu PCM.');await window.webContents.executeJavaScript("document.querySelector('.pad').click()");await new Promise(r=>setTimeout(r,100));runtime.audio.mixer.off('frame',listen);assert.equal(runtime.audio.mixer.sources.size,0);
  const output=process.env.AM_SMOKE_SCREENSHOT||join(tmpdir(),'ajudamestre-studio-smoke.png');await writeFile(output,(await window.webContents.capturePage()).toPNG());
  assert.equal(errors.length,0,errors.join('\n'));console.log('Desktop real: sincronização, mixer, criação de pacote e diálogo de conexões verificados. Screenshot: '+output);
 }catch(e){console.error(e.stack);process.exitCode=1;}
 finally{window?.destroy();await runtime?.close();if(dir)await rm(dir,{recursive:true,force:true});app.exit(process.exitCode||0);}
});
