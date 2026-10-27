import {ID} from './utils.js';
import {INSTRUCTIONS} from './agent.js';
export class BridgeClient {
  constructor(scope) {this.key=`${ID}:connection:${scope}`;this.load();}
  load(){try {this.config=JSON.parse(localStorage.getItem(this.key)||'{}');}catch{this.config={};}this.config.url??='http://127.0.0.1:3210';}
  save(config){const u=new URL(config.url);if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('Use http://127.0.0.1:PORTA para o conector local.');this.config={...config,url:u.origin};localStorage.setItem(this.key,JSON.stringify(this.config));}
  async call(path,data,signal) {
    const response=await fetch(this.config.url+path,{method:data===undefined?'GET':'POST',headers:{Authorization:`Bearer ${this.config.pairingKey??''}`,...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)}),signal:signal??AbortSignal.timeout(35000),credentials:'omit',cache:'no-store'});
    const body=await response.json();if(!response.ok)throw Error(body.error??`Conector HTTP ${response.status}`);return body;
  }
  request({input,tools,signal}) {return this.call('/responses',{model:this.config.model,input,tools,instructions:INSTRUCTIONS},signal??AbortSignal.timeout(310000));}
}
