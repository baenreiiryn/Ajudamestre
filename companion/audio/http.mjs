import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript'};
export async function serveStudio(url,res,origins){
 const allowed=new Map([['/studio/','index.html'],['/studio','index.html'],['/studio/app.js','app.js'],['/studio/style.css','style.css'],['/studio/pcm-worklet.js','pcm-worklet.js']]);
 const name=allowed.get(url.pathname);if(!name)return false;
 const type=TYPES[name.slice(name.lastIndexOf('.'))];res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; media-src 'self' blob:; frame-ancestors 'self' ${origins.join(' ')}; object-src 'none'`});
 res.end(await readFile(fileURLToPath(new URL('../../studio/'+name,import.meta.url))));return true;
}
export function streamAudioState(audio,res){
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});
 const send=state=>{if(!res.destroyed&&res.writableLength<1024*1024)res.write(`data: ${JSON.stringify(state)}\n\n`);};send(audio.snapshot());audio.on('state',send);const timer=setInterval(()=>{if(!res.destroyed)res.write(': ping\n\n');},15000);
 res.on('close',()=>{clearInterval(timer);audio.off('state',send);});
}
export function streamMonitor(audio,res){
 res.writeHead(200,{'Content-Type':'application/octet-stream','Cache-Control':'no-store','X-Audio-Format':'s16le;rate=48000;channels=2'});
 const send=frame=>{if(!res.destroyed&&res.writableLength<192000)res.write(frame);};audio.mixer.on('frame',send);res.on('close',()=>audio.mixer.off('frame',send));
}
