export async function readResponse(response) {
  if(!response.ok){let code;try {const body=await response.json();code=body.error?.code??body.error?.type;}catch {}throw Error(`OpenAI HTTP ${response.status}${code?`: ${code}`:''}`);}
  if(!response.body)throw Error('Stream sem corpo.');
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',completed=null,total=0;const items=new Map();
  try {
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      total+=value.length;if(total>32*1024*1024)throw Error('Resposta excedeu o limite de 32 MB.');
      buffer+=decoder.decode(value,{stream:true});
      let match;
      while((match=/\r?\n\r?\n/.exec(buffer))){
        const block=buffer.slice(0,match.index);buffer=buffer.slice(match.index+match[0].length);
        const data=block.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');
        if(!data||data==='[DONE]')continue;
        const event=JSON.parse(data);
        if(['response.failed','response.incomplete','error'].includes(event.type))throw Error(event.response?.error?.code??event.error?.code??event.code??`Resposta ${event.type}`);
        if(event.type==='response.output_item.done'&&Number.isInteger(event.output_index)&&event.output_index>=0&&event.item){
          if(['in_progress','incomplete'].includes(event.item.status))throw Error('Item de resposta incompleto: nenhuma ação foi executada a partir desta resposta.');
          items.set(event.output_index,event.item);
        }
        if(event.type==='response.completed')completed=event.response;
      }
    }
  }finally{reader.releaseLock();}
  if(!completed)throw Error('Stream interrompido ou incompleto: nenhuma ação foi executada a partir desta resposta.');
  if(completed.status&&completed.status!=='completed')throw Error('Resposta incompleta.');
  // SIWC may leave final output empty; done items contain the authoritative
  // messages, complete tool arguments and encrypted reasoning. Never use deltas.
  const output=new Map((completed.output??[]).map((item,index)=>[index,item]));
  for(const [index,item]of items)output.set(index,item);
  if([...output.values()].some(item=>['in_progress','incomplete'].includes(item?.status)))throw Error('Item de resposta incompleto.');
  if(items.size)completed={...completed,output:[...output].sort(([a],[b])=>a-b).map(([,item])=>item)};
  return completed;
}
