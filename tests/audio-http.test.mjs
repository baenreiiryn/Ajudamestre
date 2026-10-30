import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBridge} from '../companion/server.mjs';
import {AudioService} from '../companion/audio/service.mjs';
import {PCMMixer} from '../companion/audio/mixer.mjs';
import {FoundryTools} from '../scripts/tools.js';

test('audio commands are idempotent and state synchronizes without exposing bot token',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'am-audio-http-'));const mixer=new PCMMixer({decoder:()=>{}});const discord={on(){},snapshot:()=>({status:'disconnected'}),disconnect:async()=>{}};
 const audio=await AudioService.create(dir,{ffmpeg:'not-used',mixer,discord});t.after(async()=>{await audio.close();await rm(dir,{recursive:true,force:true});});await audio.settings({discordToken:'sensitive-token'});
 const server=createBridge({auth:{status:async()=>({connected:false})},pairingKey:'pair',origins:['http://foundry.test'],audio});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r));});
 const base=`http://127.0.0.1:${server.address().port}`,headers={Authorization:'Bearer pair','Content-Type':'application/json'};
 const response=await fetch(base+'/audio/state',{headers});const state=await response.json();assert.equal(state.configured.discord,true);assert(!JSON.stringify(state).includes('sensitive-token'));
 const payload={action:'volume',args:{bus:'music',value:.2},commandId:'same'};
 const send=p=>fetch(base+'/audio/command',{method:'POST',headers,body:JSON.stringify(p)});
 assert.equal((await send(payload)).status,200);const revision=audio.revision;assert.equal((await send(payload)).status,200);assert.equal(audio.revision,revision);
 assert.equal((await send({...payload,args:{bus:'music',value:.9}})).status,400);assert.equal(mixer.volumes.music,.2);
 assert.equal((await fetch(base+'/audio/state')).status,401);
 const controller=new AbortController(),stream=await fetch(base+'/audio/events',{headers,signal:controller.signal}),reader=stream.body.getReader();const chunk=await reader.read();assert(new TextDecoder().decode(chunk.value).includes('revision'));controller.abort();
 assert.equal((await fetch(base+'/studio/')).status,200);
});
test('Foundry assistant checks audio permission before sending a command to PC',async()=>{
 let calls=0;const policies={audio:'deny'};
 const tools=new FoundryTools({game:{user:{isGM:true},settings:{get:()=>policies}},confirm:async()=>true});tools.audio={call:async()=>{calls++;return {ok:true};}};
 await assert.rejects(()=>tools.execute('audio_play',{assetId:'a'}),/bloqueada/);assert.equal(calls,0);
 policies.audio='allow';await tools.execute('audio_play',{assetId:'a'});assert.equal(calls,1);
});
