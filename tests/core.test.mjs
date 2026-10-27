import test from 'node:test';
import assert from 'node:assert/strict';
const policy = await import('../scripts/policy.js').catch(() => ({}));
const translation = await import('../scripts/translation.js').catch(() => ({}));
const agent = await import('../scripts/agent.js').catch(() => ({}));

test('player cannot invoke tools even if policy allows writes', async () => {
  assert.equal(typeof policy.authorize, 'function');
  await assert.rejects(() => policy.authorize({isGM:false, category:'documents', policies:{documents:'allow'}}), /mestre/i);
});
test('denied confirmation never executes action', async () => {
  assert.equal(typeof policy.authorize, 'function');
  await assert.rejects(() => policy.authorize({isGM:true, category:'execute', policies:{}, confirm:async()=>false}), /cancelad/i);
});
test('unknown category is denied and read-only overrides mutation', async () => {
  assert.equal(typeof policy.authorize, 'function');
  await assert.rejects(()=>policy.authorize({isGM:true,category:'unknown',policies:{}}));
  await assert.rejects(()=>policy.authorize({isGM:true,category:'documents',policies:{documents:'deny'}}));
});
test('translation round-trip protects HTML, UUID and dice while allowing free text', () => {
  assert.equal(typeof translation.protect, 'function');
  const source = '<p>Fire @UUID[Compendium.a.b]{Fireball} [[/r 2d6]] ${actor.name}</p>';
  const p = translation.protect(source);
  assert.equal(translation.restore(p.text.replace('Fire ', 'Fogo '), p), '<p>Fogo @UUID[Compendium.a.b]{Fireball} [[/r 2d6]] ${actor.name}</p>');
  assert.throws(()=>translation.restore(p.text.replace(/⟦AM_0⟧/,''),p));
  assert.throws(()=>translation.restore(p.text+'⟦AM_0⟧',p));
  assert.throws(()=>translation.restore(p.text+'⟦AM_999⟧',p));
});
test('translation only accepts prepared fields and rejects changed source', () => {
  assert.equal(typeof translation.validateTranslation, 'function');
  const prepared = {name:translation.protect('Fire'), 'system.description.value':translation.protect('<p>Hot</p>')};
  const original = {name:'Fire',system:{description:{value:'<p>Hot</p>'}}};
  assert.deepEqual(translation.validateTranslation(prepared,{name:'Fogo'},original), {name:'Fogo'});
  assert.throws(()=>translation.validateTranslation(prepared,{'system.damage':'10d20'},original));
  assert.throws(()=>translation.validateTranslation(prepared,{name:'Fogo'},{...original,name:'Changed'}), /alterad/i);
});
test('agent resumes after tool results and only executes completed response calls', async () => {
  assert.equal(typeof agent.runAgent,'function');
  let calls=0; const effects=[];
  const result=await agent.runAgent({input:[{role:'user',content:'Oi'}],tools:[], request:async ({input}) => {
    calls++; if(calls===1)return {output:[{type:'function_call',call_id:'c1',name:'write',arguments:'{"name":"Goblin"}'}]};
    assert.equal(input.at(-1).type,'function_call_output');
    return {output:[{type:'message',content:[{type:'output_text',text:'Feito'}]}]};
  },execute:async(name,args)=>{effects.push(args.name);return {ok:true};}});
  assert.equal(result.text,'Feito'); assert.deepEqual(effects,['Goblin']);
});
test('agent returns tool errors to model and obeys step limit', async () => {
  assert.equal(typeof agent.runAgent,'function');
  let n=0;
  await assert.rejects(()=>agent.runAgent({input:[],tools:[],maxSteps:2,request:async()=>({output:[{type:'function_call',call_id:String(n++),name:'bad',arguments:'{}'}]}),execute:async()=>{throw Error('No permission');}}),/limite/i);
  assert.equal(n,2);
});
test('agent does not execute tools when a response stream fails',async()=>{
 let executed=false;
 await assert.rejects(()=>agent.runAgent({input:[],tools:[],request:async()=>{throw Error('stream incomplete');},execute:async()=>{executed=true;}}),/stream incomplete/);
 assert.equal(executed,false);
});
test('cancelled agent does not start another tool after cancellation',async()=>{
 const c=new AbortController();let calls=0;
 await assert.rejects(()=>agent.runAgent({input:[],tools:[],signal:c.signal,request:async()=>({output:[{type:'function_call',call_id:'a',name:'a',arguments:'{}'},{type:'function_call',call_id:'b',name:'b',arguments:'{}'}]}),execute:async()=>{calls++;c.abort();return {ok:true};}}));
 assert.equal(calls,1);
});
test('agent shows model refusal instead of reporting a successful empty response',async()=>{
 const result=await agent.runAgent({input:[],tools:[],request:async()=>({output:[{type:'message',content:[{type:'refusal',refusal:'Não posso fazer essa ação.'}]}]}),execute:async()=>{throw Error('No tools expected');}});
 assert.equal(result.text,'Não posso fazer essa ação.');
});
