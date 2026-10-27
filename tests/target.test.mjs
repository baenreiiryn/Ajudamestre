import test from 'node:test';
import assert from 'node:assert/strict';
const target=await import('../scripts/target.js').catch(()=>({}));
const headers=await import('../scripts/document-header.js').catch(()=>({}));
const item={uuid:'Compendium.world.weapons.Item.sword',documentName:'Item',name:'Espada',type:'weapon'};
test('header identifies exact world, embedded and compendium documents in both application generations',()=>{
 assert.equal(typeof target.targetFromApplication,'function');
 assert.deepEqual(target.targetFromApplication({document:item}),{kind:'document',uuid:'Compendium.world.weapons.Item.sword',documentName:'Item',name:'Espada',type:'weapon'});
 assert.equal(target.targetFromApplication({object:{uuid:'Actor.a.Item.b',documentName:'Item',name:'Poção'}}).uuid,'Actor.a.Item.b');
 assert.equal(target.targetFromApplication({document:{uuid:'Folder.f',documentName:'Folder',name:'Armas'}}).uuid,'Folder.f');
 assert.equal(target.targetFromApplication({document:{uuid:'JournalEntry.j.JournalEntryPage.p',documentName:'JournalEntryPage',name:'Página'}}).uuid,'JournalEntry.j.JournalEntryPage.p');
});
test('unsupported documents and unrelated windows do not get a contextual target',()=>{
 assert.equal(typeof target.targetFromApplication,'function');
 assert.equal(target.targetFromApplication({document:{uuid:'User.u',documentName:'User',name:'Jogador'}}),null);
 assert.equal(target.targetFromApplication({object:{name:'Configuração'}}),null);
});
test('compendium window selects the pack itself instead of inventing a document UUID',()=>{
 assert.equal(typeof target.targetFromApplication,'function');
 assert.deepEqual(target.targetFromApplication({collection:{collection:'world.weapons',title:'Armas',getIndex(){},getDocument(){}}}),{kind:'compendium',pack:'world.weapons',name:'Armas'});
});
test('selected document is passed with exact UUID to an otherwise ambiguous editing request',()=>{
 assert.equal(typeof target.targetPrompt,'function');
 const prompt=target.targetPrompt('Mude a descrição.',{kind:'document',...item});
 assert(prompt.includes('Compendium.world.weapons.Item.sword'));assert(prompt.includes('read_document'));assert(prompt.includes('Mude a descrição.'));
 assert.equal(target.targetPrompt('Olá',null),'Olá');
});
// Minimal DOM boundary: exercise insertion, duplicate hooks and click handling.
function dom(){
 const children=[],header={querySelector:s=>s==='.am-document-button'?children.find(x=>x.className?.includes('am-document-button')):null,insertBefore:b=>{children.push(b);b.remove=()=>children.splice(children.indexOf(b),1);},firstChild:null};
 const root={querySelector:s=>s==='.window-header'?header:null};
 const document={createElement:()=>({setAttribute(){},addEventListener(name,fn){this[name]=fn;}})};
 return {root,children,document};
}
test('only GM sees the header icon; duplicate render hooks keep one button and click rechecks role',async()=>{
 assert.equal(typeof headers.attachDocumentHeader,'function');
 const {root,children,document}=dom();let gm=false,opened=[];
 const options={isGM:()=>gm,open:async t=>opened.push(t),document};
 const app={document:item,element:root};
 headers.attachDocumentHeader(app,root,options);assert.equal(children.length,0);
 gm=true;headers.attachDocumentHeader(app,root,options);headers.attachDocumentHeader(app,{0:root},options);assert.equal(children.length,1);
 await children[0].click({preventDefault(){},stopPropagation(){}});assert.equal(opened[0].uuid,item.uuid);
 gm=false;await children[0].click({preventDefault(){},stopPropagation(){}});assert.equal(opened.length,1);
 headers.attachDocumentHeader(app,root,options);assert.equal(children.length,0);
});
test('reused header opens the currently displayed document, not a stale prior target',async()=>{
 assert.equal(typeof headers.attachDocumentHeader,'function');
 const {root,children,document}=dom();let selected;
 const app={document:item,element:root};
 headers.attachDocumentHeader(app,root,{isGM:()=>true,open:async t=>{selected=t;},document});
 app.document={uuid:'Item.other',documentName:'Item',name:'Outra'};
 await children[0].click({preventDefault(){},stopPropagation(){}});assert.equal(selected.uuid,'Item.other');
});
test('legacy inner HTML can use the outer application frame; unrelated windows stay unchanged',()=>{
 const {root,children,document}=dom();
 headers.attachDocumentHeader({document:item,element:{0:root}},{querySelector:()=>null},{isGM:()=>true,open:async()=>{},document});assert.equal(children.length,1);
 const other=dom();headers.attachDocumentHeader({element:other.root},other.root,{isGM:()=>true,document:other.document});assert.equal(other.children.length,0);
});
test('render hook registrations route both legacy and V2 sheets to the same visible control',()=>{
 const callbacks=new Map(),{root,children,document}=dom();
 const previous=globalThis.document;globalThis.document=document;
 try {
  headers.registerDocumentHeaders({hooks:{on:(name,fn)=>callbacks.set(name,fn)},isGM:()=>true,open:async()=>{}});
  assert(callbacks.has('renderApplicationV2'));assert(callbacks.has('renderApplicationV1'));
  callbacks.get('renderApplicationV2')({document:item,element:root},root);
  callbacks.get('renderApplicationV1')({object:item,element:{0:root}},{0:root});assert.equal(children.length,1);
 }finally{globalThis.document=previous;}
});
