import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {PCMMixer,FRAME_BYTES} from '../companion/audio/mixer.mjs';
import {resolveFFmpeg,probeAudio} from '../companion/audio/service.mjs';
const ffmpeg=await resolveFFmpeg();
function wav(sample){const frames=48000/5,data=Buffer.alloc(frames*4);for(let i=0;i<data.length;i+=2)data.writeInt16LE(sample,i);const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+data.length,4);h.write('WAVE',8);h.write('fmt ',12);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(2,22);h.writeUInt32LE(48000,24);h.writeUInt32LE(192000,28);h.writeUInt16LE(4,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(data.length,40);return Buffer.concat([h,data]);}
async function ready(m){const deadline=Date.now()+8000;while(Date.now()<deadline){if([...m.sources.values()].every(v=>v.decoder.bytes>=FRAME_BYTES))return;await new Promise(r=>setTimeout(r,20));}throw Error('Decoder não produziu PCM em 8 segundos.');}
test('real FFmpeg decodes and loops local files, overlays a pad, and stops cleanly',{skip:spawnSync(ffmpeg,['-version'],{windowsHide:true,stdio:'ignore'}).status!==0},async()=>{
 const dir=await mkdtemp(join(tmpdir(),'am-ffmpeg-')),m=new PCMMixer({ffmpeg});
 try{const a=join(dir,'music.wav'),b=join(dir,'pad.wav');await writeFile(a,wav(1000));await writeFile(b,wav(5000));await probeAudio(ffmpeg,a);
 m.setVolume('master',1);m.setVolume('music',1);m.setVolume('sfx',1);m.play({id:'a',name:'Music'},a,{bus:'music',loop:true,volume:1});await ready(m);assert.equal(m.renderFrame().readInt16LE(0),1000);
 m.play({id:'b',name:'Pad'},b,{bus:'sfx',loop:true,volume:1});await ready(m);assert.equal(m.renderFrame().readInt16LE(0),6000);
 m.pause(true);assert.equal(m.renderFrame().readInt16LE(0),0);m.pause(false);m.stopAll();assert.equal(m.renderFrame().readInt16LE(0),0);
 }finally{m.close();await new Promise(r=>setTimeout(r,50));await rm(dir,{recursive:true,force:true});}
});
