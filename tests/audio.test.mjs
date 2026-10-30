import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const store=await import('../companion/audio/store.mjs').catch(()=>({}));
const mix=await import('../companion/audio/mixer.mjs').catch(()=>({}));
const catalog=await import('../companion/audio/catalog.mjs').catch(()=>({}));
test('mixer combines buses, applies volume, clamps peaks, and stop removes all voices',()=>{
 assert.equal(typeof mix.PCMMixer,'function');
 const m=new mix.PCMMixer({decoder:()=>{}});const frame=Buffer.alloc(3840);for(let i=0;i<frame.length;i+=2)frame.writeInt16LE(20000,i);
 m.addSource({id:'music',bus:'music',read:()=>frame,close(){}});m.addSource({id:'pad',bus:'sfx',read:()=>frame,close(){}});
 m.setVolume('master',1);m.setVolume('music',1);m.setVolume('sfx',1);assert.equal(m.renderFrame().readInt16LE(0),32767);
 m.setVolume('music',0);assert.equal(m.renderFrame().readInt16LE(0),20000);m.stopAll();assert.equal(m.renderFrame().readInt16LE(0),0);m.close();
});
test('library preserves credits, does not expose secrets and persists packs',async t=>{
 assert.equal(typeof store.AudioStore,'function');const dir=await mkdtemp(join(tmpdir(),'am-audio-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const s=new store.AudioStore(dir);await s.init();await s.setSecrets({discordToken:'secret'});const a=await s.addAsset({name:'Passos',file:'file.wav',source:'local',license:'user',author:'Mestre'});const p=await s.savePack({name:'Masmorra',slots:[{assetId:a.id,name:'Passos',bus:'sfx',loop:false,volume:.5}]});
 const restored=new store.AudioStore(dir);await restored.init();assert.equal(restored.snapshot().packs[0].id,p.id);assert.equal(restored.snapshot().assets[0].author,'Mestre');assert(!JSON.stringify(restored.snapshot()).includes('secret'));await assert.rejects(()=>s.savePack({name:'Bad',slots:[{assetId:'missing',bus:'sfx'}]}));
});
test('catalog refuses restricted soundpads and rejects a download host outside known sources',()=>{
 assert.equal(typeof catalog.allowedAsset,'function');assert.equal(catalog.allowedAsset({provider:'tabletop',kind:'soundpad',license:'CC-BY-NC-ND-4.0'}),false);
 assert.equal(catalog.allowedAsset({provider:'commons',license:'CC0-1.0'}),true);assert.equal(catalog.allowedAsset({provider:'commons',license:'unknown'}),false);
 assert.throws(()=>catalog.validateDownloadURL('http://127.0.0.1/file.wav'));
 assert.throws(()=>catalog.validateDownloadURL('https://evil.test/file.wav'));
 assert.equal(catalog.validateDownloadURL('https://upload.wikimedia.org/a.wav').hostname,'upload.wikimedia.org');
});
test('pack builder reports a missing requested effect instead of silently replacing it',async()=>{
 assert.equal(typeof catalog.buildPack,'function');let saved;
 const result=await catalog.buildPack({name:'Masmorra',slots:[{name:'Passos',query:'footsteps',bus:'sfx'},{name:'Sussurros',query:'whispers',bus:'sfx'}]}, {search:async q=>q==='footsteps'?[{id:'c1',name:'Steps'}]:[],importCandidate:async()=>({id:'a1'}),savePack:async p=>(saved=p),progress:()=>{}});
 assert.equal(saved.slots.length,1);assert.equal(result.missing[0].name,'Sussurros');
});
test('voice limit rejects before opening another decoder',()=>{
 let opened=0;const m=new mix.PCMMixer({decoder:()=>{opened++;return {read:()=>Buffer.alloc(3840),close(){}};}});
 for(let i=0;i<24;i++)m.addSource({id:String(i),bus:'sfx',read:()=>Buffer.alloc(3840)});
 assert.throws(()=>m.play({id:'extra',name:'Extra'},'unused.wav'),/24/);assert.equal(opened,0);m.close();
});
