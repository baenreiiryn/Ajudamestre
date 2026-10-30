import test from 'node:test';
import assert from 'node:assert/strict';
import {readResponse} from '../companion/protocol.mjs';
import {runAgent} from '../scripts/agent.js';
const stream=events=>new Response(events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join(''));
const done=(index,item)=>({type:'response.output_item.done',output_index:index,item});
const completed=output=>({type:'response.completed',response:{status:'completed',output}});
const message=text=>({id:'m1',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text}]});
test('completed streamed items survive an empty final output and execute audio action once',async()=>{
 const call={id:'f1',type:'function_call',status:'completed',call_id:'c1',name:'audio_build_pack',arguments:'{"name":"Cidade em ruínas","slots":[{"name":"Vento","query":"wind","bus":"ambience"}]}'};
 let turn=0;const actions=[];
 const result=await runAgent({input:[{role:'user',content:'crie um pacote para uma cidade em ruinas abandonada'}],tools:[],request:async()=>readResponse(stream(++turn===1?[done(0,call),completed([])]:[done(0,message('Preparação iniciada: job-1.')),completed([])])),execute:async(name,args)=>{actions.push({name,args});return {jobId:'job-1',status:'running'};}});
 assert.equal(result.text,'Preparação iniciada: job-1.');assert.equal(actions.length,1);assert.equal(actions[0].name,'audio_build_pack');assert.equal(actions[0].args.name,'Cidade em ruínas');
});
test('done events supply complete reasoning and do not duplicate final tool items',async()=>{
 const call={id:'f1',type:'function_call',status:'completed',call_id:'c1',name:'audio_library',arguments:'{}'};
 const reasoning={id:'r1',type:'reasoning',encrypted_content:'complete',summary:[]};
 const r=await readResponse(stream([done(1,call),done(0,reasoning),done(1,call),completed([{...reasoning,encrypted_content:'partial'},call])]));
 assert.deepEqual(r.output,[reasoning,call]);
});
test('done tool items never escape a failed or uncompleted response',async()=>{
 const call={id:'f1',type:'function_call',status:'completed',call_id:'c1',name:'audio_library',arguments:'{}'};
 await assert.rejects(()=>readResponse(stream([done(0,call)])),/incomplet|interromp/i);
 await assert.rejects(()=>readResponse(stream([done(0,call),{type:'response.failed',response:{error:{code:'failed-test'}}}])),/failed-test/);
});
test('uncompleted tool items cannot become executable output',async()=>{
 const call={id:'f1',type:'function_call',status:'incomplete',call_id:'c1',name:'audio_library',arguments:'{'};
 await assert.rejects(()=>readResponse(stream([done(0,call),completed([call])])),/incomplet/i);
});
test('text deltas alone never become a completed message',async()=>{
 const r=await readResponse(stream([{type:'response.output_text.delta',delta:'parcial'},completed([])]));assert.deepEqual(r.output,[]);
});
