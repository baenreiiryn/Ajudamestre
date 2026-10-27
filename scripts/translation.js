import {getPath} from './utils.js';
// Protect syntax, not vocabulary: translation is free-form, without a glossary.
const SYNTAX = /<(?:(?:"[^"]*")|(?:'[^']*')|[^'">])*>|(?:@[A-Za-z][\w.:-]*|&Reference)\[[^\]]*\](?:\{[^}]*\})?|\[\[[\s\S]*?\]\]|\$\{[^}]*\}|https?:\/\/[^\s<>"']+|\{\{[^}]*\}\}|⟦AM_\d+⟧/g;
export function protect(source) {
  const tokens=[];
  const text=source.replace(SYNTAX,token=>{tokens.push(token);return `⟦AM_${tokens.length-1}⟧`;});
  return {source,text,tokens};
}
export function restore(text,prepared) {
  if(typeof text!=='string'||text.length>Math.max(2000,prepared.source.length*5)) throw Error('Texto traduzido inválido.');
  const seen=[...text.matchAll(/⟦AM_(\d+)⟧/g)].map(m=>Number(m[1]));
  if(seen.length!==prepared.tokens.length || prepared.tokens.some((_,i)=>seen[i]!==i)) throw Error('Tradução alterou marcadores protegidos.');
  // Reject new executable markup or mechanics; all original syntax is masked.
  if(/<[^>]*>|\[\[|@(?:UUID|Compendium)\[|\$\{/.test(text)) throw Error('Tradução introduziu sintaxe não autorizada.');
  const result=text.replace(/⟦AM_(\d+)⟧/g,(_,i)=>prepared.tokens[Number(i)]);
  return result;
}
export function validateTranslation(prepared,fields,current) {
  if(!fields||typeof fields!=='object'||Array.isArray(fields)||!Object.keys(fields).length)throw Error('Campos traduzidos vazios.');
  const update={};
  for(const [path,text] of Object.entries(fields)) {
    if(!Object.hasOwn(prepared,path))throw Error(`Campo não preparado: ${path}`);
    if(getPath(current,path)!==prepared[path].source)throw Error(`O campo ${path} foi alterado após a preparação. Prepare novamente.`);
    update[path]=restore(text,prepared[path]);
  }
  return update;
}
