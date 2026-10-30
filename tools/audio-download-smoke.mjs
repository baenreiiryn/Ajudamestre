import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {AudioService} from '../companion/audio/service.mjs';
const dir=await mkdtemp(join(tmpdir(),'am-download-smoke-'));let audio;
try{
 audio=await AudioService.create(dir);
 const found=await audio.catalog.search('forest',{provider:'tabletop'});
 assert(found.results.length,'Nenhum resultado do catálogo.');
 const asset=await audio.candidate(found.results[0].id);
 assert(asset.bytes>1000);assert(asset.license);assert(asset.author);
 let audible=false;const listen=frame=>{for(let i=0;i<frame.length;i+=2)if(frame.readInt16LE(i)){audible=true;break;}};
 audio.mixer.on('frame',listen);await audio.play({assetId:asset.id,bus:'music',volume:.5,loop:true});
 const deadline=Date.now()+5000;while(!audible&&Date.now()<deadline)await new Promise(r=>setTimeout(r,50));
 assert(audible,'Áudio baixado não produziu PCM audível.');audio.mixer.off('frame',listen);
 console.log(JSON.stringify({name:asset.name,bytes:asset.bytes,license:asset.license,decoded:true,temporary:true}));
}finally{await audio?.close();await rm(dir,{recursive:true,force:true});}
