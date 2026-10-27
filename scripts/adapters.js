import {getPath} from './utils.js';
const FALLBACK = {
  dnd5e:['system.description.value','system.description.chat','system.description.unidentified','system.details.biography.value'],
  daggerheart:['system.description','system.gmNotes','system.notes','system.biography.background','system.biography.connections','system.questions']
};
export function translationFields(doc,system) {
  const source=doc.toObject();
  const paths=new Set(['name',...(FALLBACK[system.id]??[])]);
  const declared=system.documentTypes?.[doc.documentName]?.[doc.type]?.htmlFields??[];
  declared.forEach(p=>paths.add(`system.${p}`));
  if(doc.documentName==='JournalEntryPage' && doc.type==='text')paths.add('text.content');
  if(doc.documentName==='RollTable')paths.add('description');
  return Object.fromEntries([...paths].filter(p=>typeof getPath(source,p)==='string' && getPath(source,p).trim()).map(p=>[p,getPath(source,p)]));
}
export function describeSchema(value,depth=0) {
  if(depth>5)return {type:'object',note:'profundidade limitada'};
  if(!value)return null;
  const fields=value.fields??value.schema?.fields;
  if(fields)return Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,describeSchema(v,depth+1)]));
  const result={type:value.constructor?.name??typeof value};
  for(const k of ['required','nullable','choices','min','max','integer','initial']) {
    if(value[k]!==undefined && typeof value[k]!=='function') {
      try { result[k]=JSON.parse(JSON.stringify(value[k])); } catch { /* Dynamic defaults are omitted. */ }
    }
  }
  if(value.element)result.element=describeSchema(value.element,depth+1);
  return result;
}
