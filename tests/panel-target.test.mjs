import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.foundry={applications:{api:{ApplicationV2:class{render(){return Promise.resolve(this);}},HandlebarsApplicationMixin:c=>c,DialogV2:{}}}};
globalThis.game={user:{isGM:true},settings:{get:()=>5}};
globalThis.ui={notifications:{warn(){}}};
const {AssistantPanel}=await import('../scripts/panel.js');
const item={kind:'document',uuid:'Actor.a.Item.potion',documentName:'Item',name:'Poção',type:'consumable'};
const make=()=>{const requests=[];return {requests,panel:new AssistantPanel({bridge:{config:{model:'test'},request:async p=>{requests.push(structuredClone(p));return {output:[{type:'message',content:[{type:'output_text',text:'Feito'}]}]};}},executor:{execute:async()=>{throw Error('unexpected');}}})};};
test('panel keeps selected target visible and sends the UUID with the request',async()=>{
 const {panel,requests}=make();assert.equal(typeof panel.setTarget,'function');panel.setTarget(item);assert.equal((await panel._prepareContext()).target.name,'Poção');
 panel.draft='Modifique a descrição';await panel.send();assert(requests[0].input.at(0).content.includes('Actor.a.Item.potion'));assert.equal(panel.messages[0].targetName,'Poção');
});
test('switching targets uses only the latest UUID; clearing returns to general chat',async()=>{
 const {panel,requests}=make();assert.equal(typeof panel.setTarget,'function');panel.setTarget(item);panel.setTarget({...item,uuid:'Item.new',name:'Espada'});panel.draft='Edite';await panel.send();
 assert(requests[0].input[0].content.includes('Item.new'));assert(!requests[0].input[0].content.includes('Actor.a.Item.potion'));
 panel.setTarget(null);panel.draft='Olá';await panel.send();assert.equal(requests[1].input.at(-1).content,'Olá');
});
test('busy panel cannot switch to another target and players cannot set a target',()=>{
 const {panel}=make();assert.equal(typeof panel.setTarget,'function');panel.setTarget(item);panel.busy=true;
 assert.throws(()=>panel.setTarget({...item,uuid:'Item.other'}),/conclu|execuç/i);assert.equal(panel.target.uuid,item.uuid);
 game.user.isGM=false;try{assert.throws(()=>panel.setTarget(item),/mestre/i);}finally{game.user.isGM=true;}
});
