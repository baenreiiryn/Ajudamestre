import {EventEmitter} from 'node:events';
import {spawn} from 'node:child_process';
import {BUSES,volume} from './store.mjs';
export const FRAME_BYTES=3840,SAMPLE_RATE=48000;
export class FileDecoder {
 constructor(file,{ffmpeg,loop=false,onError=()=>{}}={}){
  this.chunks=[];this.bytes=0;this.ended=false;this.closed=false;this.error='';
  this.process=spawn(ffmpeg,['-hide_banner','-loglevel','error','-nostdin',...(loop?['-stream_loop','-1']:[]),'-protocol_whitelist','file,pipe','-i',file,'-vn','-f','s16le','-ar','48000','-ac','2','pipe:1'],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  this.process.stdout.on('data',chunk=>{this.chunks.push(chunk);this.bytes+=chunk.length;if(this.bytes>256*1024)this.process.stdout.pause();});
  this.process.stdout.on('end',()=>{this.ended=true;});
  this.process.stderr.on('data',b=>{this.error=(this.error+b.toString()).slice(-600);});
  this.process.on('error',e=>{this.ended=true;onError(e.message);});
  this.process.on('exit',code=>{if(code&&!this.closed)onError(this.error||`FFmpeg encerrou com código ${code}`);});
 }
 read(){const out=Buffer.alloc(FRAME_BYTES);let offset=0;while(offset<out.length&&this.chunks.length){const chunk=this.chunks[0],n=Math.min(chunk.length,out.length-offset);chunk.copy(out,offset,0,n);offset+=n;this.bytes-=n;if(n===chunk.length)this.chunks.shift();else this.chunks[0]=chunk.subarray(n);}if(this.bytes<64*1024&&!this.closed)this.process.stdout.resume();return out;}
 close(){this.closed=true;this.process.stdout.destroy();this.process.stderr.destroy();this.process.kill();this.chunks=[];this.bytes=0;}
}
export class PCMMixer extends EventEmitter {
 constructor({decoder=(file,opts)=>new FileDecoder(file,opts),ffmpeg}={}){super();this.decoder=decoder;this.ffmpeg=ffmpeg;this.sources=new Map();this.volumes={master:.8,music:.65,ambience:.6,sfx:.8};this.paused=false;this.timer=null;this.nextFrameAt=null;this.lateFrames=0;}
 addSource(source){if(this.sources.size>=24)throw Error('Limite de 24 sons simultâneos.');if(!BUSES.includes(source.bus))throw Error('Canal inválido.');this.sources.set(source.id,{volume:1,...source});this.emit('change');return source.id;}
 play(asset,file,{bus='sfx',loop=false,volume:gain=.7,slotId,packId}={}){
  if(!BUSES.includes(bus))throw Error('Canal inválido.');gain=volume(gain);if(bus==='music')this.stopBus('music');if(this.sources.size>=24)throw Error('Limite de 24 sons simultâneos.');
  const id=crypto.randomUUID(),decoder=this.decoder(file,{ffmpeg:this.ffmpeg,loop,onError:message=>{this.emit('notice',message);this.stop(id);}});
  return this.addSource({id,slotId,packId,assetId:asset.id,name:asset.name,bus,loop,volume:gain,startedAt:Date.now(),read:()=>decoder.read(),close:()=>decoder.close(),decoder});
 }
 setVolume(bus,value){if(!Object.hasOwn(this.volumes,bus))throw Error('Canal inválido.');this.volumes[bus]=volume(value);this.emit('change');}
 pause(paused){this.paused=!!paused;this.emit('change');}
 stop(id){const s=this.sources.get(id);if(!s)return;s.close?.();this.sources.delete(id);this.emit('change');}
 stopBus(bus){for(const [id,s]of this.sources)if(s.bus===bus)this.stop(id);}
 stopAll(){for(const id of [...this.sources.keys()])this.stop(id);this.paused=false;this.emit('change');}
 snapshot(){return {volumes:{...this.volumes},paused:this.paused,voices:[...this.sources.values()].map(({id,slotId,packId,assetId,name,bus,loop,volume,startedAt})=>({id,slotId,packId,assetId,name,bus,loop,volume,startedAt}))};}
 renderFrame(){
  const sums=new Float64Array(FRAME_BYTES/2);if(!this.paused)for(const [id,source]of this.sources){
   if(source.decoder?.ended&&source.decoder.bytes===0){this.stop(id);continue;}
   const frame=source.read(),gain=source.volume*this.volumes[source.bus]*this.volumes.master;
   for(let i=0;i+1<Math.min(FRAME_BYTES,frame.length);i+=2)sums[i/2]+=frame.readInt16LE(i)*gain;
  }
  const output=Buffer.alloc(FRAME_BYTES);for(let i=0;i<sums.length;i++)output.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(sums[i]))),i*2);return output;
 }
 advanceClock(now=performance.now()){
  this.nextFrameAt??=now;let due=Math.max(0,Math.floor((now-this.nextFrameAt)/20)+1);
  if(due>10){this.lateFrames+=due-10;this.nextFrameAt+=(due-10)*20;due=10;}
  for(let i=0;i<due;i++){this.emit('frame',this.renderFrame());this.nextFrameAt+=20;}
 }
 start(){if(this.timer)return;this.nextFrameAt=performance.now();this.timer=setInterval(()=>this.advanceClock(),10);this.timer.unref?.();}
 close(){clearInterval(this.timer);this.timer=null;this.nextFrameAt=null;this.stopAll();this.removeAllListeners();}
}
