import {ID} from './utils.js';
import {CATEGORIES,DEFAULT_POLICIES} from './policy.js';
export function registerSettings(Configuration) {
  game.settings.register(ID,'permissions',{name:'Permissões do assistente',scope:'world',config:false,type:Object,default:DEFAULT_POLICIES});
  game.settings.register(ID,'maxSteps',{name:'Etapas por solicitação',hint:'Ao atingir o limite, envie continuar. Traduções grandes podem exigir várias solicitações.',scope:'world',config:true,type:Number,default:30,range:{min:5,max:100,step:5}});
  game.settings.registerMenu(ID,'configuration',{name:'Configurar Ajudamestre',label:'Conexão e permissões',hint:'Login do ChatGPT, conector local e acesso às ferramentas.',icon:'fas fa-hat-wizard',type:Configuration,restricted:true});
}
export const permissionRows=()=>Object.entries(CATEGORIES).map(([key,label])=>({key,label,modes:['allow','confirm','deny'].map(value=>({value,label:({allow:'Permitir',confirm:'Confirmar',deny:'Bloquear'})[value],selected:(game.settings.get(ID,'permissions')[key]??DEFAULT_POLICIES[key])===value}))}));
