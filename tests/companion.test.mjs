import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {request as rawRequest} from 'node:http';
const protocol=await import('../companion/protocol.mjs').catch(()=>({}));
const auth=await import('../companion/auth.mjs').catch(()=>({}));
const http=await import('../companion/server.mjs').catch(()=>({}));
const stream=chunks=>new Response(new ReadableStream({start(c){chunks.forEach(s=>c.enqueue(new TextEncoder().encode(s)));c.close();}}));

test('SSE requires completed event even after receiving text', async()=>{
  assert.equal(typeof protocol.readResponse,'function');
  await assert.rejects(()=>protocol.readResponse(stream(['data: {"type":"response.output_text.delta","delta":"Oi"}\n\n'])),/incomplet|interromp/i);
  const r=await protocol.readResponse(stream(['data: {"type":"response.com','pleted","response":{"output":[]}}\r\n\r\n']));
  assert.deepEqual(r,{output:[]});
});
test('SSE rejects failed response after a delta',async()=>{
  assert.equal(typeof protocol.readResponse,'function');
  await assert.rejects(()=>protocol.readResponse(stream(['data: {"type":"response.output_text.delta","delta":"Oi"}\n\ndata: {"type":"response.failed","response":{"error":{"code":"subscription_sharing_usage_limit_exceeded"}}}\n\n'])),/subscription_sharing_usage_limit_exceeded/);
});
test('JWT verifies signature, audience, nonce and expiry',async()=>{
  assert.equal(typeof auth.verifyIdToken,'function');
  const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
  const h=b64({alg:'RS256',kid:'test'}),p=b64({iss:'https://auth.openai.com',aud:'client',sub:'user',nonce:'nonce',exp:Math.floor(Date.now()/1000)+60});
  const token=`${h}.${p}.${sign('RSA-SHA256',Buffer.from(`${h}.${p}`),privateKey).toString('base64url')}`;
  const jwks={keys:[{...publicKey.export({format:'jwk'}),kid:'test'}]};
  assert.equal((await auth.verifyIdToken(token,{clientId:'client',nonce:'nonce',jwks})).sub,'user');
  await assert.rejects(()=>auth.verifyIdToken(token,{clientId:'wrong',nonce:'nonce',jwks}));
  await assert.rejects(()=>auth.verifyIdToken(token,{clientId:'client',nonce:'wrong',jwks}));
  await assert.rejects(()=>auth.verifyIdToken(token.slice(0,-12)+'aaaaaaaaaaaa',{clientId:'client',nonce:'nonce',jwks}));
});
test('OAuth rejects wrong state before exchanging a code and uses issued client ID',async()=>{
  assert.equal(typeof auth.AuthManager,'function');
  let saved={hostId:'urn:uuid:test',profiles:[]}, exchanged=0;
  const manager=new auth.AuthManager({vault:{read:async()=>structuredClone(saved),write:async x=>{saved=structuredClone(x);}},fetch:async()=>{exchanged++;throw Error('Should not reach token endpoint');},port:3210});
  const {url}=await manager.begin(); const u=new URL(url);
  assert.equal(u.searchParams.get('client_id'),'dynamic_agent_client');
  assert.equal(u.searchParams.get('redirect_uri'),'http://127.0.0.1:3210/auth/callback');
  await assert.rejects(()=>manager.callback(new URL('http://127.0.0.1:3210/auth/callback?state=bad&code=secret')),/state/i);
  assert.equal(exchanged,0);
});
test('local HTTP server blocks wrong origin, wrong host, missing pairing secret',async t=>{
  assert.equal(typeof http.createBridge,'function');
  const app=http.createBridge({auth:{status:async()=>({connected:false})},pairingKey:'test-key',origins:['http://localhost:30000']});
  await new Promise(r=>app.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>app.close(r)));
  const base=`http://127.0.0.1:${app.address().port}`;
  assert.equal((await fetch(base+'/status')).status,401);
  assert.equal((await fetch(base+'/status',{headers:{Authorization:'Bearer test-key',Origin:'https://evil.test'}})).status,403);
  const badHost=await new Promise((resolve,reject)=>{const req=rawRequest(base+'/status',{headers:{Authorization:'Bearer test-key',Host:'evil.test'}},r=>{r.resume();resolve(r.statusCode);});req.on('error',reject);req.end();});
  assert.equal(badHost,403);
  const r=await fetch(base+'/status',{headers:{Authorization:'Bearer test-key',Origin:'http://localhost:30000'}});
  assert.equal(r.status,200);assert.deepEqual(await r.json(),{connected:false});
});
test('OAuth completes with issued client ID, validates identity and refreshes only once concurrently',async()=>{
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 const jwks={keys:[{...publicKey.export({format:'jwk'}),kid:'oauth'}]};
 const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
 const jwt=nonce=>{const h=b64({alg:'RS256',kid:'oauth'}),p=b64({iss:'https://auth.openai.com',aud:'oaiapp_test',sub:'u1',email:'gm@example.test',nonce,exp:Math.floor(Date.now()/1000)+600});return `${h}.${p}.${sign('RSA-SHA256',Buffer.from(`${h}.${p}`),privateKey).toString('base64url')}`;};
 let saved={hostId:'urn:uuid:test',profiles:[]},nonce,refreshes=0;
 const manager=new auth.AuthManager({vault:{read:async()=>structuredClone(saved),write:async d=>{saved=structuredClone(d);}},fetch:async(url,options)=>{
   if(url.endsWith('jwks.json'))return Response.json(jwks);
   assert.equal(options.body.get('client_id'),'oaiapp_test');
   if(options.body.get('grant_type')==='authorization_code'){assert.equal(options.body.get('code'),'once');return Response.json({id_token:jwt(nonce),access_token:'access',refresh_token:'refresh',scope:'openid resource.invoke chatgpt.tokens.use.direct',expires_in:3600});}
   refreshes++;return Response.json({access_token:'rotated',refresh_token:'rotated-refresh',expires_in:3600});
 }});
 const {url}=await manager.begin();const query=new URL(url).searchParams;nonce=query.get('nonce');
 await manager.callback(new URL(`http://127.0.0.1:3210/auth/callback?state=${query.get('state')}&code=once&client_id=oaiapp_test`));
 assert.equal((await manager.status()).planEnabled,true);assert.equal(saved.activeId,'oaiapp_test');assert.equal(saved.profiles[0].subject,'u1');
 saved.profiles[0].expiresAt=0;
 assert.deepEqual(await Promise.all([manager.accessToken(),manager.accessToken(),manager.accessToken()]),['rotated','rotated','rotated']);assert.equal(refreshes,1);assert.equal(saved.profiles[0].refresh_token,'rotated-refresh');
 await assert.rejects(()=>manager.callback(new URL(`http://127.0.0.1:3210/auth/callback?state=${query.get('state')}&code=once&client_id=oaiapp_test`)),/State/);
});
test('identity-only session cannot use plan inference',async()=>{
 const manager=new auth.AuthManager({vault:{read:async()=>({activeId:'c',profiles:[{client_id:'c',access_token:'a',scopes:['openid'],expiresAt:Date.now()+600000}]})}});
 await assert.rejects(()=>manager.accessToken(),/plano não autorizado/);
});
