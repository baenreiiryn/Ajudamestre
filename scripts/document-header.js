import {targetFromApplication} from './target.js';
const element=value=>value?.querySelector?value:value?.[0];
export function attachDocumentHeader(app,html,{isGM=()=>globalThis.game?.user?.isGM,open,document=globalThis.document,onError=error=>globalThis.ui?.notifications?.error(error.message)}={}) {
  const roots=[element(app?.element),element(html)].filter(Boolean);
  let header;
  for(const root of roots){header=root.matches?.('.window-header')?root:root.querySelector('.window-header')??root.closest?.('.application, .window-app')?.querySelector('.window-header');if(header)break;}
  if(!header)return;
  const existing=header.querySelector('.am-document-button');
  const target=targetFromApplication(app);
  if(!isGM()||!target){existing?.remove();return;}
  if(existing)return;
  const button=document.createElement('button');button.type='button';button.className='am-document-button header-control icon';
  button.title='Abrir este documento no Ajudamestre';button.setAttribute('aria-label',button.title);
  button.innerHTML='<i class="fas fa-hat-wizard" aria-hidden="true"></i>';
  button.addEventListener('click',async event=>{
    event.preventDefault();event.stopPropagation();
    if(!isGM())return;
    try{const current=targetFromApplication(app);if(current)await open(current);}catch(error){onError(error);}
  });
  const title=header.querySelector('.window-title');header.insertBefore(button,title?.parentElement===header?title.nextSibling:header.firstChild);
}
export function registerDocumentHeaders({hooks,isGM,open}) {
  const decorate=(app,html)=>attachDocumentHeader(app,html,{isGM,open});
  // Legacy hooks may both fire. DOM deduplication prevents duplicate icons.
  for(const name of ['renderApplicationV2','renderApplicationV1','renderApplication'])hooks.on(name,decorate);
}
