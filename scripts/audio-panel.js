import {ID} from './utils.js';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
export class AudioPanel extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={id:'ajudamestre-audio',classes:['ajudamestre','am-audio-window'],window:{title:'Ajudamestre · Audio Studio',resizable:true,icon:'fas fa-headphones'},position:{width:1120,height:800}};
 static PARTS={body:{template:'modules/ajudamestre/templates/audio.hbs'}};
 constructor({bridge,...options}){super(options);this.bridge=bridge;}
 _canRender(){return game.user?.isGM;}
 async _prepareContext(){const config=this.bridge.config,url=new URL('/studio/',config.url);url.hash=new URLSearchParams({key:config.pairingKey??'',embed:'1'}).toString();return {url:url.href,configured:!!config.pairingKey,origin:location.origin};}
 _onRender(context,options){super._onRender(context,options);this.element.querySelector('[data-audio-reload]').onclick=()=>this.render({force:true});this.element.querySelector('[data-audio-open]').onclick=()=>{const popup=window.open(context.url,'_blank');if(popup)popup.opener=null;};}
}
