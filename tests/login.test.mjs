import test from 'node:test';
import assert from 'node:assert/strict';
const login=await import('../scripts/login.js').catch(()=>({}));
test('failed connector request never opens and closes an empty tab',async()=>{
 assert.equal(typeof login.beginLogin,'function');let opened=0;
 await assert.rejects(()=>login.beginLogin({bridge:{call:async()=>{throw Error('Código incorreto');}},open:()=>{opened++;}}),/Código incorreto/);
 assert.equal(opened,0);
});
test('successful login opens official authorization URL and provides fallback when blocked',async()=>{
 assert.equal(typeof login.beginLogin,'function');const url='https://auth.openai.com/api/accounts/authorize?state=test';let target;
 const result=await login.beginLogin({bridge:{call:async(path,data)=>{assert.equal(path,'/auth/start');assert.deepEqual(data,{newAccount:true});return {url};}},options:{newAccount:true},open:u=>{target=u;return null;}});
 assert.equal(target,url);assert.deepEqual(result,{url,popupOpened:false});
});
test('login refuses a returned URL outside the official authorization endpoint',async()=>{
 assert.equal(typeof login.beginLogin,'function');let opened=false;
 await assert.rejects(()=>login.beginLogin({bridge:{call:async()=>({url:'https://evil.test'})},open:()=>{opened=true;}}),/inválid/i);assert.equal(opened,false);
});
