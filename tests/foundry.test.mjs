import test from 'node:test';
import assert from 'node:assert/strict';
import {FoundryTools} from '../scripts/tools.js';
import {Audit} from '../scripts/history.js';
import {scrub} from '../scripts/utils.js';
import {translationFields} from '../scripts/adapters.js';
import {protect,restore} from '../scripts/translation.js';
const make=()=>{
 const policies={},pack={collection:'world.items',title:'Items',locked:true,index:new Map(),async configure(v){this.locked=v.locked;},async duplicateCompendium(label){assert.equal(typeof label,'string');return {collection:'world.copy',title:label};}};
 const documents=new Map(); const game={user:{id:'gm',isGM:true},settings:{get:()=>policies},packs:new Map([['world.items',pack]]),system:{id:'dnd5e'},modules:new Map()};
 const entries=[];const store={save:async e=>{const i=entries.findIndex(x=>x.id===e.id);if(i<0)entries.push(structuredClone(e));else entries[i]=structuredClone(e);},list:async()=>structuredClone(entries)};
 const audit=new Audit({store,resolve:async id=>documents.get(id),diff:(a,b)=>b});
 const tools=new FoundryTools({game,canvas:{},resolve:async id=>documents.get(id),getClass:()=>{},confirm:async()=>true,audit});
 return {tools,game,pack,documents,policies,audit,entries};
};
function doc(uuid,source,extras={}) {let data=structuredClone(source);return {uuid,id:uuid.split('.').at(-1),name:source.name,documentName:'Item',pack:'world.items',testUserPermission:()=>true,toObject:()=>structuredClone(data),update:async patch=>{for(const [path,v]of Object.entries(patch)){const parts=path.split('.');let o=data;for(const key of parts.slice(0,-1))o=o[key]??={};o[parts.at(-1)]=v;}},...extras};}

test('read_document preserves scene tokens while filtering actual credential fields',()=>{
 assert.deepEqual(scrub({tokens:[{name:'Goblin'}],prototypeToken:{name:'G'},flags:{apiKey:'secret'},access_token:'secret'}),{tokens:[{name:'Goblin'}],prototypeToken:{name:'G'},flags:{}});
});
test('duplicate_compendium uses Foundry string-label contract',async()=>{const {tools}=make();assert.deepEqual(await tools.execute('duplicate_compendium',{pack:'world.items',label:'Português'}),{id:'world.copy',title:'Português',undo:false});});
test('pack relocks after mutation failure and denied unlock does not mutate',async()=>{
 const {tools,pack,policies}=make();await assert.rejects(()=>tools.withPack(pack,async()=>{throw Error('failed');}));assert.equal(pack.locked,true);
 policies.unlock='deny';let changed=false;await assert.rejects(()=>tools.withPack(pack,async()=>{changed=true;}));assert.equal(changed,false);assert.equal(pack.locked,true);
});
test('translation rejects changed source before writes, leaves pack locked',async()=>{
 const {tools,pack,documents}=make();const d=doc('Compendium.world.items.a',{name:'Fire'});documents.set(d.uuid,d);
 tools.jobs.set('j',{pack:'world.items',at:Date.now(),prepared:new Map([[d.uuid,{name:protect('Fire')} ]])});
 await d.update({name:'New'});await assert.rejects(()=>tools.execute('apply_translation',{jobId:'j',entries:[{uuid:d.uuid,fields:{name:'Fogo'}}]}),/alterad/i);assert.equal(pack.locked,true);assert.equal(d.toObject().name,'New');
});
test('translation records successful first document and stops on failed second write',async()=>{
 const {tools,pack,documents,entries}=make();const a=doc('Compendium.world.items.a',{name:'Fire'}),b=doc('Compendium.world.items.b',{name:'Ice'},{update:async()=>{throw Error('write failed');}});documents.set(a.uuid,a);documents.set(b.uuid,b);
 tools.jobs.set('j',{pack:'world.items',at:Date.now(),prepared:new Map([[a.uuid,{name:protect('Fire')}],[b.uuid,{name:protect('Ice')}]])});
 const r=await tools.execute('apply_translation',{jobId:'j',entries:[{uuid:a.uuid,fields:{name:'Fogo'}},{uuid:b.uuid,fields:{name:'Gelo'}}]});
 assert.equal(r.done.length,1);assert.equal(r.failed.length,1);assert.equal(a.toObject().name,'Fogo');assert.equal(pack.locked,true);assert.deepEqual(r.pending,[b.uuid]);assert.deepEqual(entries.map(e=>e.status),['done','failed']);
});
test('undo refuses to overwrite a later manual edit',async()=>{
 const {audit,documents,entries}=make();const a=doc('Item.a',{name:'Fire'});documents.set(a.uuid,a);await audit.update(a,{name:'Fogo'});await a.update({name:'Manual'});await assert.rejects(()=>audit.undo(entries[0].id),/Conflito/);assert.equal(a.toObject().name,'Manual');
});
test('Daggerheart strings and D&D structured descriptions select only textual fields',()=>{
 const dh={documentName:'Item',type:'weapon',toObject:()=>({name:'Sword',system:{description:'Sharp',damage:'1d8',gmNotes:'Secret lore'}})};
 assert.deepEqual(translationFields(dh,{id:'daggerheart'}),{name:'Sword','system.description':'Sharp','system.gmNotes':'Secret lore'});
 const dd={documentName:'Item',type:'spell',toObject:()=>({name:'Fire',system:{description:{value:'Hot'},damage:{formula:'8d6'}}})};
 assert.deepEqual(translationFields(dd,{id:'dnd5e'}),{name:'Fire','system.description.value':'Hot'});
});
test('translation preserves enrichment commands and original markup order',()=>{
 const p=protect('<p>&Reference[prone] @Embed[Compendium.x.y]{x}</p>');assert.equal(restore(p.text,p),p.source);
 assert.throws(()=>restore(p.text.replace('⟦AM_0⟧','⟦AM_9⟧').replace('⟦AM_3⟧','⟦AM_0⟧').replace('⟦AM_9⟧','⟦AM_3⟧'),p));
});
test('execute_macro does not run code changed while confirmation is open',async()=>{
 const {tools,documents}=make();let executed=false;
 const macro=doc('Macro.a',{name:'Macro'},{documentName:'Macro',pack:null,command:'safe()',execute:async()=>{executed=true;}});documents.set(macro.uuid,macro);
 tools.confirm=async()=>{macro.command='changed()';return true;};
 await assert.rejects(()=>tools.execute('execute_macro',{uuid:macro.uuid}),/alterad/i);assert.equal(executed,false);
});
test('runtime tool schema rejects invalid arguments before modifying documents',async()=>{
 const {tools}=make();await assert.rejects(()=>tools.execute('create_document',{documentType:'Item',data:'invalid'}),/objeto/);
 await assert.rejects(()=>tools.execute('list_documents',{documentType:'Item',limit:500}),/número/);
});
test('read_document can select fields without leaking unrelated data',async()=>{
 const {tools,documents}=make();const a=doc('Item.a',{name:'Fire',system:{description:{value:'Hot'},damage:'8d6'}});documents.set(a.uuid,a);
 assert.deepEqual(await tools.execute('read_document',{uuid:a.uuid,fields:['name','system.description.value']}),{uuid:'Item.a',fields:{name:'Fire','system.description.value':'Hot'}});
});
