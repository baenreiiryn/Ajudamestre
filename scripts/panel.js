import {ID,escapeHTML} from './utils.js';
import {runAgent} from './agent.js';
import {TOOL_DEFINITIONS} from './tools.js';
import {permissionRows} from './settings.js';
import {beginLogin} from './login.js';
const {ApplicationV2,HandlebarsApplicationMixin,DialogV2}=foundry.applications.api;
export class AssistantPanel extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS={id:'ajudamestre-panel',classes:['ajudamestre'],window:{title:'Ajudamestre',icon:'fas fa-hat-wizard',resizable:true},position:{width:620,height:740}};
  static PARTS={body:{template:'modules/ajudamestre/templates/panel.hbs'}};
  constructor({bridge,executor,...options}){super(options);this.bridge=bridge;this.executor=executor;this.messages=[];this.history=[];this.busy=false;this.status='Conecte sua conta nas configurações.';this.connection=null;this.models=[];this.draft='';}
  _canRender(){return game.user?.isGM;}
  async _prepareContext(){return {messages:this.messages,busy:this.busy,status:this.status,model:this.bridge.config.model,connected:this.connection?.connected,account:this.connection?.accounts?.find(a=>a.id===this.connection.activeId)?.label};}
  _onRender(context,options){
    super._onRender(context,options);
    const el=this.element;
    el.querySelector('[data-action="settings"]').onclick=()=>this.openConfig();
    el.querySelector('[data-action="refresh"]').onclick=()=>this.refresh();
    el.querySelector('[data-action="history"]').onclick=()=>this.showHistory();
    el.querySelector('[data-action="stop"]').onclick=()=>{this.abort?.abort();this.status='Cancelando: alterações já concluídas permanecem no histórico.';this.render();};
    el.querySelector('[data-action="clear"]').onclick=async()=>{if(this.busy)return;if(await DialogV2.confirm({window:{title:'Nova conversa'},content:'Limpar a conversa? O histórico de alterações será preservado.',rejectClose:false})){this.history=[];this.messages=[];this.render();}};
    const textarea=el.querySelector('textarea');textarea.value=this.draft;textarea.oninput=()=>{this.draft=textarea.value;};
    textarea.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();this.send();}};
    el.querySelector('form').onsubmit=e=>{e.preventDefault();this.send();};
    const log=el.querySelector('.am-messages');log.scrollTop=log.scrollHeight;
  }
  openConfig(){new AssistantConfiguration({panel:this,bridge:this.bridge}).render({force:true});}
  async refresh(){
    try{this.connection=await this.bridge.call('/status');
      if(this.connection.connected&&this.connection.planEnabled){const {models}=await this.bridge.call('/models');this.models=models;if(!models.some(m=>m.slug===this.bridge.config.model)){this.bridge.save({...this.bridge.config,model:models[0]?.slug??''});}this.status=models.length?'Conectado. Assistente pronto.':'Sua conta não retornou modelos disponíveis.';}
      else this.status=this.connection.connected?'Conta conectada, mas uso do plano não autorizado. Reconecte.':'Conector disponível. Faça login em Continue with ChatGPT.';
    }catch(error){this.status=`Conexão: ${error.message}. Verifique conector, código e origem autorizada.`;}
    if(this.rendered)this.render();
  }
  async send(){
    if(this.busy||!game.user?.isGM)return;
    const text=this.draft.trim();if(!text)return;
    if(!this.bridge.config.model){ui.notifications.warn('Configure a conexão e selecione um modelo.');return;}
    this.busy=true;this.abort=new AbortController();this.messages.push({role:'user',label:'Mestre',text});this.history.push({role:'user',content:text});this.draft='';this.render();
    try{
      const result=await runAgent({input:this.history,tools:TOOL_DEFINITIONS,request:r=>this.bridge.request(r),execute:(name,args)=>this.executor.execute(name,args),signal:this.abort.signal,maxSteps:game.settings.get(ID,'maxSteps'),onCheckpoint:h=>{this.history=h;},onProgress:p=>{this.status=p.type==='tool'?`Etapa ${p.step}: ${p.name}`:`Etapa ${p.step}: analisando…`;if(this.rendered)this.render();}});
      this.history=result.history;this.messages.push({role:'assistant',label:'Ajudamestre',text:result.text||'Solicitação concluída.'});this.status='Pronto.';
    }catch(error){this.messages.push({role:'error',label:'Aviso',text:error.name==='AbortError'?'Solicitação interrompida. Alterações concluídas permanecem no histórico.':error.message});this.status='Solicitação interrompida. Confira o histórico antes de continuar.';}
    finally{this.busy=false;this.abort=null;if(this.rendered)this.render();}
  }
  async showHistory(){
    try{
      const entries=await this.executor.execute('history');
      const content=document.createElement('div');content.className='am-history';
      for(const entry of entries){const row=document.createElement('div');const text=document.createElement('p');text.textContent=`${new Date(entry.at).toLocaleString()} · ${entry.action} · ${entry.uuid??'—'} · ${entry.status}`;row.append(text);
        if(['done','failed'].includes(entry.status)&&['update','translate','create'].includes(entry.action)){const b=document.createElement('button');b.type='button';b.textContent='Desfazer';b.onclick=async()=>{b.disabled=true;try{await this.executor.execute('undo',{historyId:entry.id});text.textContent+=' · desfeito';}catch(error){ui.notifications.error(error.message);b.disabled=false;}};row.append(b);}content.append(row);}
      const dialog=new DialogV2({window:{title:'Histórico local de alterações'},position:{width:720},content:'<div class="am-history-mount"></div>',buttons:[{action:'close',label:'Fechar'}]});
      dialog.addEventListener('render',()=>dialog.element.querySelector('.am-history-mount').replaceChildren(content),{once:true});dialog.render({force:true});
    }catch(error){ui.notifications.error(error.message);}
  }
}
export class AssistantConfiguration extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS={id:'ajudamestre-config',classes:['ajudamestre'],window:{title:'Ajudamestre — conexão e permissões',resizable:true},position:{width:640,height:750}};
  static PARTS={body:{template:'modules/ajudamestre/templates/config.hbs'}};
  constructor({panel,bridge,...options}={}){super(options);this.panel=panel??game.modules.get(ID)?.api?.panel;this.bridge=bridge??this.panel.bridge;this.notice='';this.authUrl=null;}
  _canRender(){return game.user?.isGM;}
  async _prepareContext(){return {url:this.bridge.config.url,pairingKey:this.bridge.config.pairingKey,permissions:permissionRows(),notice:this.notice,authUrl:this.authUrl,accounts:this.panel.connection?.accounts?.map(a=>({...a,selected:a.id===this.panel.connection.activeId})),models:this.panel.models.map(m=>({...m,selected:m.slug===this.bridge.config.model}))};}
  saveConnection(){const el=this.element;this.bridge.save({url:el.querySelector('[name="url"]').value,pairingKey:el.querySelector('[name="pairingKey"]').value.trim(),model:el.querySelector('[name="model"]').value});}
  async startLogin(options) {
    if(this.loginPending)return;
    this.saveConnection();this.authUrl=null;this.loginPending=true;
    const buttons=[...this.element.querySelectorAll('[data-action="connect"], [data-action="new-account"]')];
    buttons.forEach(b=>{b.disabled=true;});
    const notice=this.element.querySelector('[role="status"]');if(notice)notice.textContent='Preparando o login pelo conector local…';
    try {
      const result=await beginLogin({bridge:this.bridge,options});this.authUrl=result.url;
      this.notice=result.popupOpened?'Conclua o login na aba aberta e depois clique em Atualizar conexão.':'O navegador bloqueou a abertura automática. Clique em Abrir login do ChatGPT abaixo.';
    }finally{this.loginPending=false;buttons.forEach(b=>{b.disabled=false;});}
  }
  _onRender(context,options){super._onRender(context,options);const el=this.element;
    const action=(name,fn)=>{el.querySelector(`[data-action="${name}"]`).onclick=async()=>{try{await fn();}catch(error){this.notice=error.message;ui.notifications.error(error.message);}if(this.rendered)this.render();};};
    el.querySelector('form').onsubmit=async e=>{e.preventDefault();try{this.saveConnection();const permissions=Object.fromEntries([...el.querySelectorAll('[data-permission]')].map(x=>[x.dataset.permission,x.value]));await game.settings.set(ID,'permissions',permissions);this.notice='Configurações salvas.';await this.panel.refresh();this.render();}catch(error){ui.notifications.error(error.message);}};
    action('connect',()=>this.startLogin({profileId:el.querySelector('[name="account"]').value||undefined}));
    action('new-account',()=>this.startLogin({newAccount:true}));
    action('refresh',async()=>{this.saveConnection();await this.panel.refresh();this.notice=this.panel.status;});
    action('select',async()=>{this.saveConnection();await this.bridge.call('/auth/select',{id:el.querySelector('[name="account"]').value});await this.panel.refresh();this.notice=this.panel.status;});
    action('logout',async()=>{const result=await this.bridge.call('/auth/logout',{});await this.panel.refresh();this.notice=result.message;});
    action('reset',async()=>{const {DEFAULT_POLICIES}=await import('./policy.js');await game.settings.set(ID,'permissions',DEFAULT_POLICIES);this.notice='Perfil Assistente do mestre restaurado.';});
  }
}
export const confirmAction=detail=>DialogV2.confirm({window:{title:'Autorizar ação do Ajudamestre'},content:`<p>Revise a ação solicitada:</p><pre class="am-confirm">${escapeHTML(detail)}</pre>`,rejectClose:false,modal:true});
