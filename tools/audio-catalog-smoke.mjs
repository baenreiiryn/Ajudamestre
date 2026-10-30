import {AudioCatalog} from '../companion/audio/catalog.mjs';
const catalog=new AudioCatalog({store:{secrets:{},data:{assets:[]}}});
for(const [provider,query]of [['tabletop','forest'],['commons','footsteps']]){
 const result=await catalog.search(query,{provider});console.log(JSON.stringify({provider,query,count:result.results.length,examples:result.results.slice(0,3).map(x=>({name:x.name,license:x.license,host:new URL(x.downloadURL).hostname})),warnings:result.warnings}));
 if(provider==='tabletop'&&!result.results.length)process.exitCode=1;
}
