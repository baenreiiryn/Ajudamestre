export const CATEGORIES = {
  audio:'Áudio no PC e Discord', read:'Consultar mundo', documents:'Criar e editar documentos', compendiums:'Editar compêndios',
  scenes:'Cenas e elementos do mapa', combat:'Combate', chat:'Mensagens', macros:'Criar e editar macros',
  modules:'Consultar módulos', settings:'Alterar configurações de módulos', integrations:'Executar APIs de módulos',
  delete:'Excluir documentos', execute:'Executar macros (acesso amplo à sessão)', unlock:'Desbloquear compêndios'
};
export const DEFAULT_POLICIES = Object.fromEntries(Object.keys(CATEGORIES).map(k=>[k,
  ['delete','execute','settings','integrations','unlock'].includes(k)?'confirm':'allow']));
export async function authorize({isGM, category, policies={}, confirm, detail=''}) {
  if(!isGM) throw Error('Apenas o mestre pode usar o Ajudamestre.');
  const mode = policies[category] ?? DEFAULT_POLICIES[category] ?? 'deny';
  if(mode === 'deny' || !['allow','confirm'].includes(mode)) throw Error(`Permissão bloqueada: ${category}`);
  if(mode === 'confirm' && !(await confirm?.(detail))) throw Error('Ação cancelada pelo mestre. Não tente contornar a recusa.');
}
