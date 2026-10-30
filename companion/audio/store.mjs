import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join,basename} from 'node:path';
import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
export const BUSES=['music','ambience','sfx'];
export const volume=v=>{const n=Number(v);if(!Number.isFinite(n)||n<0||n>1)throw Error('Volume deve estar entre 0 e 1.');return n;};
const text=(v,max=300)=>String(v??'').slice(0,max);
export class AudioStore extends EventEmitter {
 constructor(dir){super();this.dir=dir;this.assetsDir=join(dir,'assets');this.data={assets:[],packs:[],settings:{guildId:'',channelId:'',model:''}};this.secrets={};this.writes=Promise.resolve();}
 async init(){await mkdir(this.assetsDir,{recursive:true,mode:0o700});for(const [file,key]of [['library.json','data'],['secrets.json','secrets']])try{this[key]=JSON.parse(await readFile(join(this.dir,file),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}return this;}
 async write(file,data){const snapshot=JSON.stringify(data,null,2);this.writes=this.writes.catch(()=>{}).then(async()=>{const path=join(this.dir,file),tmp=path+'.'+randomUUID()+'.tmp';await writeFile(tmp,snapshot,{mode:0o600});await rename(tmp,path);});await this.writes;this.emit('change');}
 snapshot(){return structuredClone({...this.data,configured:{discord:!!this.secrets.discordToken,freesound:!!this.secrets.freesoundKey}});}
 async setSecrets(values){for(const key of ['discordToken','freesoundKey'])if(Object.hasOwn(values,key))this.secrets[key]=text(values[key],512).trim();await this.write('secrets.json',this.secrets);}
 async settings(values){for(const key of ['guildId','channelId','model','foundryOrigin','botId'])if(Object.hasOwn(values,key))this.data.settings[key]=text(values[key],512);await this.write('library.json',this.data);return this.snapshot();}
 async addAsset(asset){
  const record={id:randomUUID(),name:text(asset.name),file:basename(asset.file),source:text(asset.source),sourceId:text(asset.sourceId),sourceURL:text(asset.sourceURL,2048),license:text(asset.license),licenseURL:text(asset.licenseURL,2048),author:text(asset.author),kind:text(asset.kind||'audio'),preview:!!asset.preview,bytes:asset.bytes??0,sha256:text(asset.sha256),createdAt:Date.now()};
  this.data.assets.push(record);await this.write('library.json',this.data);return structuredClone(record);
 }
 asset(id){const a=this.data.assets.find(x=>x.id===id);if(!a)throw Error('Áudio não encontrado na biblioteca.');return structuredClone(a);}
 async savePack(pack){
  if(!Array.isArray(pack.slots)||pack.slots.length>40)throw Error('Pacote deve ter até 40 sons.');
  if(pack.slots.filter(s=>s.bus==='music').length>1)throw Error('Use uma trilha de música por pacote; ambientes e pads podem ser múltiplos.');
  const slots=pack.slots.map(s=>{this.asset(s.assetId);if(!BUSES.includes(s.bus))throw Error('Canal inválido.');return {id:s.id??randomUUID(),assetId:s.assetId,name:text(s.name||this.asset(s.assetId).name),bus:s.bus,loop:!!s.loop,volume:volume(s.volume??.7)};});
  const old=pack.id?this.data.packs.find(x=>x.id===pack.id):null;if(pack.id&&!old)throw Error('Pacote não encontrado.');
  const result={id:old?.id??randomUUID(),name:text(pack.name||'Novo pacote'),description:text(pack.description,1000),slots,createdAt:old?.createdAt??Date.now(),updatedAt:Date.now()};
  if(old)this.data.packs=this.data.packs.filter(x=>x.id!==old.id);this.data.packs.push(result);await this.write('library.json',this.data);return structuredClone(result);
 }
 async removePack(id){this.data.packs=this.data.packs.filter(p=>p.id!==id);await this.write('library.json',this.data);}
}
