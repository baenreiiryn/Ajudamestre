import {randomUUID,createHash} from 'node:crypto';
import {open,rename,unlink,readFile,writeFile} from 'node:fs/promises';
import {join,extname} from 'node:path';
const PAD_CATALOG=JSON.parse(await readFile(new URL('./pads/catalog.json',import.meta.url),'utf8'));
const USER_AGENT='Ajudamestre/0.2.0 (personal RPG audio library; https://github.com/baenreiiryn/Ajudamestre)';
const HOSTS=new Set(['upload.wikimedia.org','cdn.freesound.org','freesound.org','sounds.tabletopaudio.com','tabletopaudio.com','assets.tabletopaudio.com']);
const strip=v=>String(v??'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').slice(0,1500);
export function validateDownloadURL(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||!HOSTS.has(u.hostname)||u.port)throw Error('Endereço de áudio fora das fontes autorizadas.');if(/soundpad|patreon|\/alts?\//i.test(u.pathname))throw Error('Este conteúdo não está liberado para importação.');return u;}
export function allowedAsset(c){if(c.provider==='tabletop')return c.kind!=='soundpad'&&c.license==='CC-BY-NC-ND-4.0';return ['CC0-1.0','CC-BY-4.0','CC-BY-3.0','Public-domain'].includes(c.license);}
function licenseOf(v){const s=strip(v).toLowerCase();if(/\bcc0\b|publicdomain\/zero|creative commons 0/.test(s))return 'CC0-1.0';if(/public domain|publicdomain\/mark/.test(s))return 'Public-domain';if(/by-sa|by-nc|by-nd/.test(s))return 'unknown';if(/by\/4|cc by 4|attribution 4/.test(s))return 'CC-BY-4.0';if(/by\/3|cc by 3|attribution 3/.test(s))return 'CC-BY-3.0';return 'unknown';}
export function effectQueries(query){
 const q=String(query).trim();const concepts=[[/footsteps?|passos?|walking/i,'footsteps'],[/whisper|sussurr/i,'whisper'],[/breath|respira/i,'breathing'],[/door|porta/i,'door'],[/crow|raven|corvo/i,'crow'],[/creak|rang/i,'creaking'],[/rattle|chocalh/i,'rattle'],[/wind|vento/i,'wind'],[/stone|rock|pedra|rubble|entulho/i,'stone impact'],[/glass|vidro/i,'glass impact'],[/metal|sword|espada/i,'metal impact']];
 const primary=concepts.find(([pattern])=>pattern.test(q))?.[1];return [...new Set([q,primary].filter(Boolean))];
}
async function remote(url,{fetcher=fetch,headers={},signal}={}){const r=await fetcher(url,{headers:{'User-Agent':USER_AGENT,...headers},signal:signal??AbortSignal.timeout(20000)});if(!r.ok)throw Error(`Fonte de áudio HTTP ${r.status}`);return r;}
export class AudioCatalog {
 constructor({store,fetcher=fetch,validateAudio=async()=>{}}){Object.assign(this,{store,fetcher,validateAudio});this.candidates=new Map();this.ttaCache=null;}
 remember(c){if(!allowedAsset(c))return null;if(c.provider==='kenney'){if(!PAD_CATALOG.some(p=>p.file===c.sourceId))return null;}else try{validateDownloadURL(c.downloadURL);}catch{return null;}const id=`${c.provider}:${c.sourceId}`;const candidate={...c,id,cachedAt:Date.now()};this.candidates.set(id,candidate);return candidate;}
 kenney(query){
  const variants=effectQueries(query),words=(variants[1]??variants[0]).toLowerCase().split(/\s+/).filter(Boolean);
  return PAD_CATALOG.map(c=>{const tags=(c.name+' '+c.tags).toLowerCase();const score=words.every(w=>tags.includes(w))?100+String(query).toLowerCase().split(/\s+/).filter(w=>w.length>2&&tags.includes(w)).length:0;return {...c,score};}).filter(c=>c.score>0).sort((a,b)=>b.score-a.score).slice(0,12).map(c=>({provider:'kenney',sourceId:c.file,name:c.name,sourceURL:c.sourceURL,author:'Kenney',license:'CC0-1.0',licenseURL:'https://creativecommons.org/publicdomain/zero/1.0/',kind:'effect'}));
 }
 async tabletop(query){
  if(!this.ttaCache||Date.now()-this.ttaCache.at>3600000){
   const html=await(await remote('https://tabletopaudio.com/',{fetcher:this.fetcher})).text();
   const path=html.match(/src=["']([^"']*tta4XFADE[^"']*\.js(?:\?[^"']*)?)["']/i)?.[1];if(!path)throw Error('Catálogo Tabletop Audio mudou de formato.');
   const scriptURL=new URL(path,'https://tabletopaudio.com/');if(scriptURL.origin!=='https://tabletopaudio.com')throw Error('Catálogo inesperado.');
   const js=await(await remote(scriptURL,{fetcher:this.fetcher})).text();
   const base=js.match(/(?:var |,)e="(https:\/\/[^"\s]+)"\s*,\s*i="Tabletop Audio"/)?.[1]??'https://sounds.tabletopaudio.com/';
   const items=[...js.matchAll(/song_(\d+)\s*:\s*\{title:"((?:\\.|[^"\\])*)",artist:[^,]+,mp3:e\+"([^"\n]+\.mp3)"\}/g)].map(m=>({provider:'tabletop',sourceId:m[1],name:m[2].replace(/\\"/g,'"'),downloadURL:new URL(m[3],base).href,sourceURL:'https://tabletopaudio.com/',author:'Tim / Tabletop Audio',license:'CC-BY-NC-ND-4.0',licenseURL:'https://creativecommons.org/licenses/by-nc-nd/4.0/',kind:'combined',duration:600}));
   const downloadable=new Set([...html.matchAll(/saveAs\(['"]([^'"]+)['"]\)/g)].map(m=>m[1]));const publicItems=items.filter(c=>downloadable.has(decodeURIComponent(new URL(c.downloadURL).pathname.split('/').at(-1)).replace(/\.mp3$/i,'')));
   if(!publicItems.length)throw Error('Catálogo público Tabletop Audio indisponível.');this.ttaCache={at:Date.now(),items:publicItems};
  }
  const words=query.toLowerCase().split(/\s+/).filter(Boolean);
  return this.ttaCache.items.map(c=>({...c,score:words.filter(w=>c.name.toLowerCase().includes(w)).length})).filter(c=>c.score>0).sort((a,b)=>b.score-a.score).slice(0,12);
 }
 async commons(query){
  const merged=new Map();for(const phrase of effectQueries(query)){
   for(const c of await this.commonsExact(phrase))merged.set(c.sourceId,c);if(merged.size>=8)break;
  }return [...merged.values()];
 }
 async commonsExact(query){
  const url=new URL('https://commons.wikimedia.org/w/api.php');url.search=new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:`filetype:audio ${query}`,gsrnamespace:'6',gsrlimit:'35',prop:'imageinfo',iiprop:'url|extmetadata|size|mime'});
  const data=await(await remote(url,{fetcher:this.fetcher})).json();
  if(data.error)throw Error('Pesquisa Commons indisponível.');
  return Object.values(data.query?.pages??{}).flatMap(page=>{const i=page.imageinfo?.[0],m=i?.extmetadata;if(!i||!m||/pronunciation|pronúncia|spoken word|audio transcription/i.test(strip(m.ImageDescription?.value))||/^File:(?:[a-z]{2,3}-[a-z]{2,3}-|LL-|Lingua)/i.test(page.title)||i.size>128*1024*1024||!i.mime?.startsWith('audio/'))return [];
   const license=licenseOf(m.LicenseUrl?.value??m.LicenseShortName?.value??m.UsageTerms?.value);return [{provider:'commons',sourceId:String(page.pageid),name:page.title.replace(/^File:/,''),downloadURL:i.url,sourceURL:i.descriptionurl,author:strip(m.Artist?.value??m.Credit?.value),license,licenseURL:m.LicenseUrl?.value??'',kind:'audio',bytes:i.size}];});
 }
 async freesound(query){
  const key=this.store.secrets.freesoundKey;if(!key)throw Error('Configure uma chave Freesound no programa para pesquisar essa fonte.');
  const url=new URL('https://freesound.org/apiv2/search/');url.search=new URLSearchParams({query,page_size:'20',fields:'id,name,url,username,license,previews,duration,tags'});
  const data=await(await remote(url,{fetcher:this.fetcher,headers:{Authorization:`Token ${key}`}})).json();
  return (data.results??[]).map(c=>({provider:'freesound',sourceId:String(c.id),name:c.name,downloadURL:c.previews?.['preview-hq-mp3'],sourceURL:c.url,author:c.username,license:licenseOf(c.license),licenseURL:c.license,kind:'effect',preview:true,duration:c.duration,tags:c.tags}));
 }
 async search(query,{provider='all'}={}){
  query=String(query??'').trim().slice(0,180);if(!query)throw Error('Informe o som procurado.');
  if(provider==='effects'){const bundled=this.kenney(query);if(bundled.length)return {results:bundled.map(c=>this.remember(c)).filter(Boolean),warnings:[]};}
  const names=provider==='all'?['kenney','tabletop','commons',...(this.store.secrets.freesoundKey?['freesound']:[])]:provider==='effects'?['commons',...(this.store.secrets.freesoundKey?['freesound']:[])]:[provider];
  const warnings=[],results=[];
  await Promise.all(names.map(async name=>{if(!['kenney','tabletop','commons','freesound'].includes(name))throw Error('Fonte inválida.');try{for(const candidate of await this[name](query)){const c=this.remember(candidate);if(c)results.push(c);}}catch(e){warnings.push(`${name}: ${e.message}`);}}));
  return {results:results.slice(0,30),warnings};
 }
 async importBundled(c){
  const entry=PAD_CATALOG.find(p=>p.file===c.sourceId);if(!entry||entry.file.includes('/')||entry.file.includes('\\'))throw Error('Pad incluído inválido.');
  const data=await readFile(new URL('./pads/'+entry.file,import.meta.url)),hash=createHash('sha256').update(data).digest('hex');if(hash!==entry.sha256)throw Error('Integridade do pad incluído inválida.');
  const filename=randomUUID()+'.ogg',path=join(this.store.assetsDir,filename),tmp=path+'.part';
  try{await writeFile(tmp,data,{flag:'wx',mode:0o600});await this.validateAudio(tmp);await rename(tmp,path);return await this.store.addAsset({...c,file:filename,source:c.provider,bytes:data.length,sha256:hash});}catch(e){await unlink(tmp).catch(()=>{});await unlink(path).catch(()=>{});throw e;}
 }

 async importCandidate(id,progress=()=>{}){
  const c=this.candidates.get(id);if(!c||Date.now()-c.cachedAt>3600000)throw Error('Resultado expirou. Pesquise novamente.');if(!allowedAsset(c))throw Error('Licença não autorizada.');
  const existing=this.store.data.assets.find(a=>a.source===c.provider&&a.sourceId===c.sourceId);if(existing)return existing;
  if(c.provider==='kenney')return this.importBundled(c);
  let url=validateDownloadURL(c.downloadURL),response;
  for(let n=0;n<5;n++){response=await this.fetcher(url,{redirect:'manual',headers:{'User-Agent':USER_AGENT},signal:AbortSignal.timeout(90000)});if([301,302,303,307,308].includes(response.status)){url=validateDownloadURL(new URL(response.headers.get('location'),url).href);await response.body?.cancel();continue;}break;}
  if(!response?.ok)throw Error(`Download HTTP ${response?.status}`);
  const ext=extname(url.pathname).toLowerCase();if(!['.mp3','.wav','.ogg','.oga','.opus','.flac','.m4a','.aac','.webm'].includes(ext))throw Error('Formato de áudio não suportado.');
  const filename=randomUUID()+ext,tmp=join(this.store.assetsDir,filename+'.part'),path=join(this.store.assetsDir,filename);const handle=await open(tmp,'wx',0o600);let bytes=0;const hash=createHash('sha256');
  try{
   for await(const chunk of response.body){bytes+=chunk.length;if(bytes>128*1024*1024)throw Error('Áudio excedeu 128 MB.');hash.update(chunk);await handle.write(chunk);progress({bytes,total:Number(response.headers.get('content-length'))||null});}
   await handle.close();if(bytes<32)throw Error('Arquivo de áudio vazio.');await this.validateAudio(tmp);await rename(tmp,path);
   return await this.store.addAsset({...c,file:filename,source:c.provider,bytes,sha256:hash.digest('hex')});
  }catch(e){await handle.close().catch(()=>{});await unlink(tmp).catch(()=>{});await unlink(path).catch(()=>{});throw e;}
 }
}
export async function buildPack(spec,{search,importCandidate,savePack,progress=()=>{}}){
 if(!Array.isArray(spec.slots)||!spec.slots.length||spec.slots.length>20)throw Error('Peça entre 1 e 20 sons por pacote.');
 const slots=[],missing=[];
 for(let i=0;i<spec.slots.length;i++){
  const slot=spec.slots[i];progress({index:i,total:spec.slots.length,name:slot.name,status:'searching'});
  try{
   const found=await search(slot.query,{provider:slot.provider??(slot.bus==='sfx'?'effects':'all')});const candidates=Array.isArray(found)?found:found.results;
   if(!candidates?.length)throw Error('Nenhum resultado com licença suportada.');
   progress({index:i,total:spec.slots.length,name:slot.name,status:'downloading'});const asset=await importCandidate(candidates[0].id);
   slots.push({name:slot.name,assetId:asset.id,bus:slot.bus,loop:slot.loop??slot.bus!=='sfx',volume:slot.volume??.7});progress({index:i,total:spec.slots.length,name:slot.name,status:'ready'});
  }catch(e){missing.push({name:slot.name,query:slot.query,error:e.message});progress({index:i,total:spec.slots.length,name:slot.name,status:'missing',error:e.message});}
 }
 if(!slots.length)throw Error('Nenhum áudio pôde ser preparado: '+missing.map(x=>`${x.name}: ${x.error}`).join('; '));
 const pack=await savePack({name:spec.name,description:spec.description,slots});return {pack,missing};
}
