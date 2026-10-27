export async function readResponse(response) {
  if(!response.ok){let code;try {const body=await response.json();code=body.error?.code??body.error?.type;}catch {}throw Error(`OpenAI HTTP ${response.status}${code?`: ${code}`:''}`);}
  if(!response.body)throw Error('Stream sem corpo.');
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',completed=null,total=0;
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
        if(event.type==='response.completed')completed=event.response;
      }
    }
  }finally{reader.releaseLock();}
  if(!completed)throw Error('Stream interrompido ou incompleto: nenhuma ação foi executada a partir desta resposta.');
  return completed;
}
