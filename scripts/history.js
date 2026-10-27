import {equal,clone} from './utils.js';
export class HistoryStore {
  constructor(scope) {this.scope=scope;this.db=null;}
  async open() {
    if(this.db)return this.db;
    this.db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open('ajudamestre-history',1);
      req.onupgradeneeded=()=>req.result.createObjectStore('operations',{keyPath:'id'});
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });return this.db;
  }
  async save(entry) {
    const db=await this.open();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('operations','readwrite');
      tx.objectStore('operations').put({...clone(entry),scope:this.scope});
      tx.oncomplete=()=>resolve(entry);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
  }
  async list() {
    const db=await this.open();
    const all=await new Promise((resolve,reject)=>{const r=db.transaction('operations').objectStore('operations').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    return all.filter(x=>x.scope===this.scope).sort((a,b)=>b.at-a.at);
  }
}
export class Audit {
  constructor({store,resolve,getClass,diff}) {Object.assign(this,{store,resolve,getClass,diff});}
  async update(doc,data,action='update') {
    const entry={id:crypto.randomUUID(),at:Date.now(),action,uuid:doc.uuid,before:doc.toObject(),status:'pending'};
    await this.store.save(entry);
    try { await doc.update(data);entry.after=doc.toObject();entry.status='done'; }
    catch(error){entry.after=doc.toObject();entry.status='failed';entry.error=error.message;throw error;}
    finally{await this.store.save(entry);}
    return {uuid:doc.uuid,historyId:entry.id};
  }
  async create(factory,data,context={}) {
    const entry={id:crypto.randomUUID(),at:Date.now(),action:'create',status:'pending'};
    await this.store.save(entry);
    try {const doc=await factory(data,context);entry.uuid=doc.uuid;entry.after=doc.toObject();entry.status='done';return {uuid:doc.uuid,historyId:entry.id};}
    catch(error){entry.status='failed';entry.error=error.message;throw error;}
    finally{await this.store.save(entry);}
  }
  async remove(doc) {
    const entry={id:crypto.randomUUID(),at:Date.now(),action:'delete',uuid:doc.uuid,before:doc.toObject(),status:'pending'};
    await this.store.save(entry);
    try {await doc.delete();entry.status='done';}
    catch(error){entry.status='failed';entry.error=error.message;throw error;}
    finally{await this.store.save(entry);}
    return {deleted:entry.uuid,historyId:entry.id,undo:false};
  }
  async undo(id) {
    const entry=(await this.store.list()).find(x=>x.id===id);
    if(!entry||!['done','failed'].includes(entry.status)||!entry.after||entry.action==='delete')throw Error('Esta operação não tem reversão automática.');
    const doc=await this.resolve(entry.uuid);
    if(!doc||!equal(doc.toObject(),entry.after))throw Error('Conflito: documento alterado depois desta operação.');
    if(entry.action==='create')await doc.delete();
    else await doc.update(this.diff(doc.toObject(),entry.before),{diff:false});
    entry.status='undone';await this.store.save(entry);
    return {undone:entry.id,uuid:entry.uuid};
  }
}
