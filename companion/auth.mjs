import {randomBytes,createHash,createPublicKey,verify} from 'node:crypto';
const ISSUER='https://auth.openai.com',RESOURCE='https://api.openai.com/v1';
const SCOPES='openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
const random=()=>randomBytes(32).toString('base64url');
export async function verifyIdToken(token,{clientId,nonce,jwks}) {
  if(typeof token!=='string')throw Error('ID token ausente.');
  const parts=token.split('.');if(parts.length!==3)throw Error('ID token inválido.');
  const [h,p,s]=parts,header=JSON.parse(Buffer.from(h,'base64url')),payload=JSON.parse(Buffer.from(p,'base64url'));
  if(!['RS256','ES256'].includes(header.alg))throw Error('Algoritmo OIDC inválido.');
  const key=jwks.keys.find(k=>k.kid===header.kid && (!k.alg||k.alg===header.alg));if(!key)throw Error('Chave OIDC desconhecida.');
  const publicKey=createPublicKey({key,format:'jwk'});
  if(!verify('sha256',Buffer.from(`${h}.${p}`),header.alg==='ES256'?{key:publicKey,dsaEncoding:'ieee-p1363'}:publicKey,Buffer.from(s,'base64url')))throw Error('Assinatura OIDC inválida.');
  if(payload.iss!==ISSUER || !(Array.isArray(payload.aud)?payload.aud.includes(clientId):payload.aud===clientId) || payload.nonce!==nonce || typeof payload.sub!=='string' || !payload.sub || !Number.isFinite(payload.exp) || payload.exp<=Date.now()/1000 || (payload.nbf&&payload.nbf>Date.now()/1000+30))throw Error('Identidade, audience, nonce ou validade OIDC inválidos.');
  return payload;
}
export class AuthManager {
  constructor({vault,fetch:fetcher=globalThis.fetch,port=3210}) {this.vault=vault;this.fetch=fetcher;this.port=port;this.pending=new Map();this.refreshing=null;this.mutating=false;}
  async json(url,options={}) {
    const response=await this.fetch(url,{...options,signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error(`Autenticação HTTP ${response.status}. Conecte novamente se a sessão expirou.`);
    return response.json();
  }
  async status(){const data=await this.vault.read();const p=data.profiles.find(x=>x.client_id===data.activeId);return {connected:!!p?.access_token,planEnabled:!!p?.scopes?.includes('chatgpt.tokens.use.direct'),activeId:data.activeId,accounts:data.profiles.map(p=>({id:p.client_id,email:p.email,label:`${p.email??p.subject} · ${p.client_id.slice(-8)}`}))};}
  async begin({profileId,newAccount=false}={}) {
    if(this.mutating)throw Error('Autenticação em andamento.');
    const data=await this.vault.read();const selected=newAccount?null:data.profiles.find(p=>p.client_id===(profileId??data.activeId));
    if(profileId&&!selected)throw Error('Conta não encontrada.');
    const state=random(),nonce=random(),verifier=random(),redirect=`http://127.0.0.1:${this.port}/auth/callback`;
    for(const [k,v]of this.pending)if(Date.now()-v.at>600000)this.pending.delete(k);
    if(this.pending.size>=4)throw Error('Há logins pendentes. Aguarde alguns minutos.');
    this.pending.set(state,{nonce,verifier,redirect,selected,at:Date.now()});
    const url=new URL(`${ISSUER}/api/accounts/authorize`);
    const params={client_id:selected?.client_id??'dynamic_agent_client',ext_agent_host_id:data.hostId,response_type:'code',redirect_uri:redirect,scope:SCOPES,resource:RESOURCE,state,nonce,code_challenge_method:'S256',code_challenge:createHash('sha256').update(verifier).digest('base64url')};
    if(!selected)params.agent_name_hint='Ajudamestre';
    else {if(selected.id_token)params.id_token_hint=selected.id_token;if(selected.email)params.login_hint=selected.email;}
    for(const [k,v]of Object.entries(params))url.searchParams.set(k,v);
    return {url:url.href};
  }
  async callback(url) {
    const state=url.searchParams.get('state'),attempt=this.pending.get(state);
    if(!attempt||Date.now()-attempt.at>600000)throw Error('State inválido ou expirado.');
    this.pending.delete(state);
    if(url.searchParams.has('error'))throw Error('Login recusado.');
    if(this.mutating)throw Error('Outra alteração de conta está em andamento. Tente novamente.');
    this.mutating=true;
    try {
      await this.refreshing;
      const clientId=url.searchParams.get('client_id')??attempt.selected?.client_id;
      if(!clientId||clientId==='dynamic_agent_client'||(attempt.selected&&attempt.selected.client_id!==clientId))throw Error('Client ID de retorno inválido.');
      const code=url.searchParams.get('code');if(!code)throw Error('Código OAuth ausente.');
      const data=await this.vault.read();
      // Retain a new registration even if the one-time code expires.
      if(!data.profiles.some(p=>p.client_id===clientId)){data.profiles.push({client_id:clientId});await this.vault.write(data);}
      const tokens=await this.json(`${ISSUER}/api/accounts/oauth/token`,{method:'POST',body:new URLSearchParams({grant_type:'authorization_code',client_id:clientId,code,code_verifier:attempt.verifier,redirect_uri:attempt.redirect,resource:RESOURCE})});
      const jwks=await this.json(`${ISSUER}/.well-known/jwks.json`);
      const identity=await verifyIdToken(tokens.id_token,{clientId,nonce:attempt.nonce,jwks});
      if(attempt.selected?.subject&&attempt.selected.subject!==identity.sub)throw Error('A conta autenticada não corresponde à selecionada.');
      if(typeof tokens.access_token!=='string'||!tokens.access_token)throw Error('Access token ausente.');
      const profile={client_id:clientId,subject:identity.sub,email:identity.email,issuer:identity.iss,...tokens,scopes:String(tokens.scope??'').split(' '),expiresAt:Date.now()+(Number(tokens.expires_in)||3600)*1000};
      const current=await this.vault.read();current.profiles=current.profiles.filter(p=>p.client_id!==clientId);current.profiles.push(profile);current.activeId=clientId;await this.vault.write(current);
      return {planEnabled:profile.scopes.includes('chatgpt.tokens.use.direct')};
    }finally{this.mutating=false;}
  }
  async select(id) {
    if(this.mutating||this.refreshing)throw Error('Aguarde a autenticação em andamento.');
    const data=await this.vault.read();if(!data.profiles.some(p=>p.client_id===id))throw Error('Conta inexistente.');data.activeId=id;await this.vault.write(data);return this.status();
  }
  async accessToken() {
    if(this.mutating)throw Error('Aguarde a autenticação.');
    if(this.refreshing)return this.refreshing;
    this.refreshing=this.getOrRefresh();try{return await this.refreshing;}finally{this.refreshing=null;}
  }
  async getOrRefresh() {
    const data=await this.vault.read(),p=data.profiles.find(x=>x.client_id===data.activeId);
    if(!p?.access_token)throw Error('Conecte sua conta ChatGPT.');
    if(!p.scopes?.includes('chatgpt.tokens.use.direct'))throw Error('Uso do plano não autorizado. Conecte novamente e autorize o plano.');
    if(p.expiresAt>Date.now()+60000)return p.access_token;
    if(!p.refresh_token)throw Error('Sessão expirada. Conecte novamente.');
    const t=await this.json(`${ISSUER}/api/accounts/oauth/token`,{method:'POST',body:new URLSearchParams({grant_type:'refresh_token',client_id:p.client_id,refresh_token:p.refresh_token,resource:RESOURCE})});
    if(typeof t.access_token!=='string'||!t.access_token)throw Error('Renovação inválida.');
    Object.assign(p,t,{scopes:t.scope?String(t.scope).split(' '):p.scopes,expiresAt:Date.now()+(Number(t.expires_in)||3600)*1000});await this.vault.write(data);
    if(!p.scopes.includes('chatgpt.tokens.use.direct'))throw Error('Permissão do plano revogada.');
    return p.access_token;
  }
  async logout() {
    if(this.mutating)throw Error('Aguarde a autenticação.');this.mutating=true;
    try{
      await this.refreshing;
      const data=await this.vault.read(),p=data.profiles.find(x=>x.client_id===data.activeId);let revoked=true;
      if(p?.refresh_token){try{
        const discovery=await this.json(`${ISSUER}/.well-known/openid-configuration`);
        const endpoint=new URL(discovery.revocation_endpoint);if(endpoint.origin!==ISSUER)throw Error('Endpoint de revogação inválido.');
        let success=false;
        for(let i=0;i<3;i++){const r=await this.fetch(endpoint,{method:'POST',body:new URLSearchParams({token:p.refresh_token,token_type_hint:'refresh_token',client_id:p.client_id}),signal:AbortSignal.timeout(10000)});if(r.ok){success=true;break;}if(r.status<500)break;await new Promise(r=>setTimeout(r,300*(i+1)));}
        revoked=success;
      }catch{revoked=false;}}
      if(p)for(const k of ['access_token','refresh_token','id_token','expiresAt','scope','scopes'])delete p[k];
      data.activeId=null;await this.vault.write(data);return {revoked,message:revoked?'Desconectado.':'Tokens locais removidos; revogação remota não confirmada. Desconecte o aplicativo nas configurações do ChatGPT.'};
    }finally{this.mutating=false;}
  }
}
