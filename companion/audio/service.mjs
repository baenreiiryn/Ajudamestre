import {EventEmitter} from 'node:events';
import {spawn} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {open,rename,unlink,stat,access} from 'node:fs/promises';
import {join,extname} from 'node:path';
import {AudioStore} from './store.mjs';
import {PCMMixer} from './mixer.mjs';
import {AudioCatalog,buildPack} from './catalog.mjs';
import {DiscordOutput} from './discord.mjs';
import {AUDIO_TOOL_DEFINITIONS,AUDIO_INSTRUCTIONS} from '../../scripts/audio-tools.js';
import {validateArguments} from '../../scripts/utils.js';
import {runAgent} from '../../scripts/agent.js';
export async function resolveFFmpeg(){
 try{const imported=await import('ffmpeg-static'),path=imported.default.replace('app.asar','app.asar.unpacked');await access(path);return path;}catch{}
 try{const imported=await import('ffmpeg-static');await access(imported.default);return imported.default;}catch{return 'ffmpeg';}
}
export function probeAudio(ffmpeg,file){return new Promise((resolve,reject)=>{
 const p=spawn(ffmpeg,['-hide_banner','-loglevel','error','-nostdin','-protocol_whitelist','file,pipe','-i',file,'-map','0:a:0','-t','0.05','-f','null','-'],{windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';const timer=setTimeout(()=>{p.kill();reject(Error('FFmpeg não conseguiu validar o áudio em 15 segundos.'));},15000);
 p.stderr.on('data',b=>{error=(error+b.toString()).slice(-500);});p.on('error',()=>{clearTimeout(timer);reject(Error('FFmpeg indisponível. Instale as dependências do programa.'));});p.on('exit',code=>{clearTimeout(timer);code===0?resolve():reject(Error('Arquivo não contém áudio decodificável: '+error));});
});}
export class AudioService extends EventEmitter {
 static async create(dir,options={}){const service=new AudioService();service.store=await new AudioStore(dir).init();service.ffmpeg=options.ffmpeg??await resolveFFmpeg();service.mixer=options.mixer??new PCMMixer({ffmpeg:service.ffmpeg});service.discord=options.discord??new DiscordOutput(service.mixer);service.catalog=new AudioCatalog({store:service.store,fetcher:options.fetcher,validateAudio:file=>probeAudio(service.ffmpeg,file)});service.instanceId=randomUUID();service.revision=0;service.jobs=new Map();service.commands=new Map();service.sessions=new Map();service.notice='';service.activePackId=null;service.imports=0;
  for(const emitter of [service.store,service.mixer,service.discord])emitter.on('change',()=>service.changed());service.mixer.on('notice',message=>{service.notice=message;service.changed();});service.mixer.start();return service;
 }
 changed(){this.revision++;this.emit('state',this.snapshot());}
 snapshot(){const library=this.store.snapshot();return {version:'0.2.0',instanceId:this.instanceId,revision:this.revision,...library,mixer:this.mixer.snapshot(),discord:this.discord.snapshot(),jobs:[...this.jobs.values()].slice(-12),notice:this.notice,activePackId:this.activePackId};}
 async importStream(stream,name,{source='local',author='Arquivo do mestre',license='user'}={}){
  if(this.imports>=2)throw Error('Aguarde os downloads/importações em andamento.');this.imports++;
  const ext=extname(String(name)).toLowerCase();if(!['.mp3','.wav','.ogg','.oga','.opus','.flac','.m4a','.aac','.webm'].includes(ext)){this.imports--;throw Error('Formato de áudio não suportado.');}
  const file=randomUUID()+ext,tmp=join(this.store.assetsDir,file+'.part'),path=join(this.store.assetsDir,file);let handle,bytes=0;const hash=createHash('sha256');
  try{handle=await open(tmp,'wx',0o600);for await(const chunk of stream){bytes+=chunk.length;if(bytes>128*1024*1024)throw Error('Arquivo excedeu 128 MB.');hash.update(chunk);await handle.write(chunk);}await handle.close();await probeAudio(this.ffmpeg,tmp);await rename(tmp,path);return await this.store.addAsset({name:String(name).slice(0,200),file,source,author,license,bytes,sha256:hash.digest('hex')});}
  catch(e){await handle?.close().catch(()=>{});await unlink(tmp).catch(()=>{});await unlink(path).catch(()=>{});throw e;}finally{this.imports--;}
 }
 async candidate(id){if(this.imports>=2)throw Error('Aguarde os downloads/importações em andamento.');this.imports++;try{return await this.catalog.importCandidate(id);}finally{this.imports--;}}
 async file(id){const a=this.store.asset(id),path=join(this.store.assetsDir,a.file);if(!(await stat(path)).isFile())throw Error('Arquivo de áudio não existe no PC.');return {a,path};}
 pack(id){const p=this.store.data.packs.find(p=>p.id===id);if(!p)throw Error('Pacote não encontrado.');return p;}
 async play(args){const {a,path}=await this.file(args.assetId);return {voiceId:this.mixer.play(a,path,args)};}
 async playPack(packId){const p=this.pack(packId),background=p.slots.filter(s=>s.bus!=='sfx');const prepared=await Promise.all(background.map(async s=>({...s,...await this.file(s.assetId)})));this.mixer.stopBus('music');this.mixer.stopBus('ambience');for(const s of prepared)this.mixer.play(s.a,s.path,s);this.activePackId=packId;this.changed();return {playing:prepared.length,pads:p.slots.filter(s=>s.bus==='sfx').length};}
 build(spec){
  if([...this.jobs.values()].some(j=>j.status==='running'))throw Error('Já há um pacote sendo preparado. Aguarde a conclusão.');
  if(this.jobs.size>=30)this.jobs.delete(this.jobs.keys().next().value);
  const job={id:randomUUID(),name:spec.name,status:'running',progress:null,startedAt:Date.now()};this.jobs.set(job.id,job);this.changed();
  void buildPack(spec,{search:(q,o)=>this.catalog.search(q,o),importCandidate:id=>this.candidate(id),savePack:p=>this.store.savePack(p),progress:p=>{job.progress=p;this.changed();}}).then(result=>{job.status=result.missing.length?'partial':'ready';job.result=result;}).catch(e=>{job.status='failed';job.error=e.message;}).finally(()=>{job.finishedAt=Date.now();this.changed();});return {jobId:job.id,status:'running'};
 }
 async settings(data){
  if(data.discordToken?.trim())await this.store.setSecrets({discordToken:data.discordToken});if(data.freesoundKey?.trim())await this.store.setSecrets({freesoundKey:data.freesoundKey});
  if(data.clearDiscord)await this.store.setSecrets({discordToken:''});if(data.clearFreesound)await this.store.setSecrets({freesoundKey:''});return this.store.settings(data);
 }
 async command(action,args={},commandId){
  if(typeof commandId!=='string'||commandId.length>100||!commandId)throw Error('Comando precisa de um identificador.');
  const signature=JSON.stringify({action,args}),old=this.commands.get(commandId);if(old){if(old.signature!==signature)throw Error('Identificador de comando já usado.');return old.promise;}
  if(this.commands.size>=200)this.commands.delete(this.commands.keys().next().value);
  const promise=this.perform(action,args);this.commands.set(commandId,{signature,promise});return promise;
 }
 async perform(action,args){
  switch(action){
   case 'play':return this.play(args);
   case 'pack':return this.playPack(args.packId);
   case 'pad':{const p=this.pack(args.packId),s=p.slots.find(s=>s.id===args.slotId);if(!s)throw Error('Soundpad não encontrado.');const active=[...this.mixer.sources.values()].find(v=>v.packId===p.id&&v.slotId===s.id);if(s.loop&&active){this.mixer.stop(active.id);return {stopped:active.id};}return this.play({...s,packId:p.id,slotId:s.id});}
   case 'stop':if(args.voiceId)this.mixer.stop(args.voiceId);else if(args.bus)this.mixer.stopBus(args.bus);else this.mixer.stopAll();return {ok:true};
   case 'volume':this.mixer.setVolume(args.bus,args.value);return {ok:true};
   case 'pause':this.mixer.pause(args.paused);return {ok:true};
   case 'connect':return this.discord.connect({token:this.store.secrets.discordToken,...this.store.data.settings});
   case 'disconnect':await this.discord.disconnect();return {ok:true};
   case 'select-pack':this.pack(args.packId);this.activePackId=args.packId;this.changed();return {ok:true};
   case 'save-pack':{const p=await this.store.savePack(args);this.activePackId=p.id;this.changed();return p;}
   case 'delete-pack':return this.store.removePack(args.packId);
   default:throw Error('Comando de áudio desconhecido.');
  }
 }
 async tool(name,args={}){
  const definition=AUDIO_TOOL_DEFINITIONS.find(t=>t.name===name);if(!definition)throw Error('Ferramenta de áudio desconhecida.');validateArguments(args,definition.parameters);
  if(name==='audio_library'){const s=this.snapshot();return {assets:s.assets,packs:s.packs,mixer:s.mixer,discord:s.discord,jobs:s.jobs};}
  if(name==='audio_search')return this.catalog.search(args.query,args);
  if(name==='audio_import')return this.candidate(args.candidateId);
  if(name==='audio_build_pack')return this.build(args);
  if(name==='audio_job'){const j=this.jobs.get(args.jobId);if(!j)throw Error('Montagem não encontrada.');return structuredClone(j);}
  const actions={audio_play:'play',audio_play_pack:'pack',audio_trigger_pad:'pad',audio_stop:'stop',audio_volume:'volume'};return this.command(actions[name],args,randomUUID());
 }
 async assistant({text,sessionId,model},request){
  if(this.assistantBusy)throw Error('O assistente de áudio já está respondendo.');if(!text?.trim()||text.length>8000)throw Error('Pedido de áudio inválido.');
  if(!/^[\w-]{1,100}$/.test(sessionId??''))throw Error('Conversa inválida.');
  const previous=this.sessions.get(sessionId)??[];if(previous.length>100)throw Error('Inicie uma nova conversa para reduzir o contexto.');
  this.assistantBusy=true;
  try{const result=await runAgent({input:[...previous,{role:'user',content:text}],tools:AUDIO_TOOL_DEFINITIONS,maxSteps:12,request:p=>request({...p,model,instructions:AUDIO_INSTRUCTIONS}),execute:(name,args)=>this.tool(name,args)});if(this.sessions.size>=10)this.sessions.delete(this.sessions.keys().next().value);this.sessions.set(sessionId,result.history);return {text:result.text};}
  finally{this.assistantBusy=false;}
 }
 async close(){await this.discord.disconnect();this.mixer.close();await this.store.writes;this.removeAllListeners();}
}
