import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {Vault} from './vault.mjs';
import {AuthManager} from './auth.mjs';
import {readResponse} from './protocol.mjs';
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
const same=(a,b)=>{const x=Buffer.from(a??''),y=Buffer.from(b??'');return x.length===y.length&&timingSafeEqual(x,y);};
async function body(req) {const chunks=[];let bytes=0;for await(const c of req){bytes+=c.length;if(bytes>12*1024*1024)throw Error('Requisição excedeu 12 MB. Inicie nova conversa.');chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}
export function createBridge({auth,pairingKey,origins,fetch:fetcher=globalThis.fetch}) {
  let busy=false;
  return createServer(async(req,res)=>{
    const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort();});
    try {
      const port=req.socket.localPort;
      if(req.headers.host!==`127.0.0.1:${port}`){json(res,403,{error:'Host não permitido. Use 127.0.0.1.'});return;}
      const origin=req.headers.origin;
      if(origin&&!origins.includes(origin)){json(res,403,{error:'Origem não autorizada. Inicie o conector com --origin URL_DO_FOUNDRY.'});return;}
      if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
      res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Private-Network','true');
      if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
      const url=new URL(req.url,`http://127.0.0.1:${port}`);
      if(url.pathname==='/auth/callback'&&req.method==='GET'){
        try {const result=await auth.callback(url);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'"});res.end(`<h1>Ajudamestre conectado</h1><p>${result.planEnabled?'Volte ao Foundry e clique em Atualizar conexão.':'A identidade foi conectada, mas o uso do plano não foi autorizado. Reconecte para habilitá-lo.'}</p>`);}
        catch{json(res,400,{error:'Login não concluído. Reinicie o login pelo Foundry.'});}return;
      }
      if(!same(req.headers.authorization,`Bearer ${pairingKey}`)){json(res,401,{error:'Código de pareamento ausente ou incorreto.'});return;}
      const data=req.method==='POST'?await body(req):{};
      switch(`${req.method} ${url.pathname}`){
        case 'GET /status':json(res,200,await auth.status());break;
        case 'POST /auth/start':json(res,200,await auth.begin(data));break;
        case 'POST /auth/select':json(res,200,await auth.select(data.id));break;
        case 'POST /auth/logout':json(res,200,await auth.logout());break;
        case 'GET /models':{
          const token=await auth.accessToken();const r=await fetcher('https://api.openai.com/v1/models',{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(30000)});
          if(!r.ok)throw Error(`Catálogo de modelos HTTP ${r.status}`);const catalog=await r.json();
          json(res,200,{models:(catalog.models??[]).filter(m=>m.visibility==='list').map(m=>({slug:m.slug,display_name:m.display_name}))});break;
        }
        case 'POST /responses':{
          if(busy){json(res,409,{error:'Há uma resposta em andamento neste conector.'});break;}
          if(typeof data.model!=='string'||!Array.isArray(data.input)||!Array.isArray(data.tools))throw Error('Requisição de inferência inválida.');
          busy=true;
          try{
            const token=await auth.accessToken();
            const response=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({model:data.model,input:data.input,tools:data.tools,instructions:data.instructions,store:false,stream:true,include:['reasoning.encrypted_content']}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(300000)])});
            json(res,200,await readResponse(response));
          }finally{busy=false;}break;
        }
        default:json(res,404,{error:'Endpoint inexistente.'});
      }
    }catch(error){if(!res.headersSent&&!res.destroyed)json(res,400,{error:error.name==='AbortError'?'Solicitação cancelada.':error.message});}
  });
}
async function main() {
  const args=process.argv.slice(2),origins=['http://localhost:30000','http://127.0.0.1:30000'];let port=3210;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--origin'){const u=new URL(args[++i]);if(!['http:','https:'].includes(u.protocol))throw Error('Origem deve ser HTTP/HTTPS.');origins.push(u.origin);}
    else if(args[i]==='--port'){port=Number(args[++i]);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Porta inválida.');}
    else throw Error(`Argumento desconhecido: ${args[i]}`);
  }
  const vault=new Vault();await vault.initialize();
  try{
    const data=await vault.read(),auth=new AuthManager({vault,port});
    const server=createBridge({auth,pairingKey:data.pairingKey,origins});
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
    console.log(`Ajudamestre: http://127.0.0.1:${port}\nCódigo de pareamento (somente no seu navegador GM): ${data.pairingKey}\nOrigens autorizadas: ${origins.join(', ')}\nMantenha este processo aberto enquanto usar a IA.`);
    const close=()=>{server.close();server.closeAllConnections();vault.close().finally(()=>process.exit());};
    process.once('SIGINT',close);process.once('SIGTERM',close);
  }catch(error){await vault.close();throw error;}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
