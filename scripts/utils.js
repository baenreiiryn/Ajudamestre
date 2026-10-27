export const ID='ajudamestre';
export const clone = value => structuredClone(value);
export const escapeHTML = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function getPath(object,path) { return path.split('.').reduce((v,k)=>v?.[k],object); }
export function assertSafe(value) {
  if(!value || typeof value!=='object') return;
  for(const [key,v] of Object.entries(value)) {
    if(key.split('.').some(k=>['__proto__','constructor','prototype'].includes(k))) throw Error('Chave de dados inválida.');
    assertSafe(v);
  }
}
export function sanitizeUpdate(data) {
  assertSafe(data);
  for(const key of Object.keys(data)) {
    if(['_id','_stats','ownership','permission'].some(k=>key===k||key.startsWith(k+'.')))
      throw Error(`Campo protegido: ${key}`);
    if(key==='flags' || key==='flags.ajudamestre' || key.startsWith('flags.ajudamestre.')) throw Error('Flags do assistente são protegidas.');
    if(key==='system' && (data[key]===null||typeof data[key]!=='object')) throw Error('Dados de sistema inválidos.');
  }
  return data;
}
export const summary = doc => ({uuid:doc.uuid,id:doc.id,name:doc.name,type:doc.type,documentName:doc.documentName,folder:doc.folder?.id??null});
export const serialize = doc => doc.toObject();
export function scrub(value) {
  if(Array.isArray(value)) return value.map(scrub);
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).filter(([k])=>!/(secret|password|credential|api.?key|authorization|cookie|^(?:access[_-]?token|refresh[_-]?token|id[_-]?token|token)$)/i.test(k)).map(([k,v])=>[k,scrub(v)]));
  return value;
}
export function stable(value) {
  if(Array.isArray(value))return value.map(stable);
  if(value && typeof value==='object')return Object.fromEntries(Object.keys(value).filter(k=>k!=='_stats').sort().map(k=>[k,stable(value[k])]));
  return value;
}
export const equal = (a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));

export function validateArguments(value,schema,path='args') {
  if(schema.type==='object') {
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error(`${path}: objeto esperado.`);
    for(const key of schema.required??[])if(!Object.hasOwn(value,key))throw Error(`${path}.${key}: obrigatório.`);
    for(const [k,v]of Object.entries(value)){
      if(schema.additionalProperties===false&&!Object.hasOwn(schema.properties??{},k))throw Error(`${path}.${k}: parâmetro desconhecido.`);
      if(schema.properties?.[k])validateArguments(v,schema.properties[k],`${path}.${k}`);
    }
  }else if(schema.type==='array') {
    if(!Array.isArray(value)||(schema.maxItems!==undefined&&value.length>schema.maxItems))throw Error(`${path}: lista inválida.`);
    if(schema.items)value.forEach((v,i)=>validateArguments(v,schema.items,`${path}[${i}]`));
  }else if(schema.type==='integer'||schema.type==='number') {
    if(typeof value!=='number'||!Number.isFinite(value)||(schema.type==='integer'&&!Number.isInteger(value))||(schema.minimum!==undefined&&value<schema.minimum)||(schema.maximum!==undefined&&value>schema.maximum))throw Error(`${path}: número inválido.`);
  }else if(schema.type && typeof value!==schema.type)throw Error(`${path}: tipo inválido.`);
  if(schema.enum&&!schema.enum.includes(value))throw Error(`${path}: valor inválido.`);
}
