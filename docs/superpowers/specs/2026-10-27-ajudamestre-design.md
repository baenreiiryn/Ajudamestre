# Ajudamestre — primeira versão

Módulo independente para o mestre controlar um mundo Foundry por linguagem natural. O usuário definiu painel exclusivo do mestre, perfil padrão Assistente do mestre com edição ampla, permissões configuráveis, D&D 5e e Daggerheart, tradução livre sem glossário, acesso a módulos e criação de macros.

Escolhas de implementação: JavaScript ESM sem build no módulo, ApplicationV2 e conector Node 22+ local sem dependências. Alvo Foundry 13/14; compatibilidade efetiva requer teste dentro de uma instalação licenciada. Não distribuir material dos sistemas. Descobrir tipos/campos em tempo de execução e acrescentar caminhos específicos de descrição para cada sistema.

O conector usa o fluxo oficial Sign in with ChatGPT OSS: PKCE, state, nonce, validação criptográfica OIDC, registro por conta, renovação serializada, catálogo dinâmico, Responses com store=false/stream=true. Credenciais ficam no perfil local, nunca em configurações do mundo. Um segredo de pareamento específico do conector protege os endpoints e uma lista de origens protege CORS. HTTPS remoto pode exigir autorização de rede local pelo navegador.

Ferramentas: contexto/schema; busca/leitura de documentos; criação/edição/exclusão/duplicação e documentos embutidos; compêndios e importação; tradução em lotes com campos previamente selecionados e marcadores protegidos; cenas, tokens, efeitos, combate, tabelas, pastas, mensagens privadas; consulta a módulos/configurações não secretas; APIs registradas por módulos; macros. APIs de terceiros só por ações explicitamente registradas; não prometer compatibilidade automática com todo módulo.

Política validada antes de cada chamada: somente GM. Categorias read/documents/compendiums/scenes/combat/chat/macros/modules/settings/integrations/delete/execute. Valores deny/confirm/allow, padrão leitura/edição allow e delete/execute/settings confirm. Alterar permissões, usuários e configuração do próprio assistente não é ferramenta da IA. Código de macros é exibido na confirmação de execução; macros podem acessar toda a sessão, e isso é indicado na configuração.

Tradução: nomes, descrições e páginas textuais. Não traduzir chaves mecânicas. Mascarar HTML, UUIDs, links, rolagens e interpolação; aplicar somente campos preparados e se origem não mudou. Restaurar bloqueio do pack em finally; respeitar autorização específica de desbloqueio. Histórico local de operações com snapshots, registro de falhas parciais e reversão de edição/criação com verificação de conflito; exclusão e código não têm reversão automática garantida.

Validação: testes Node reais do protocolo HTTP, OAuth/JWT, SSE, políticas, tradução e fluxo de ferramentas; doubles somente na fronteira da API proprietária Foundry/OpenAI. Não efetuar login nem consumir a conta do usuário sem interação. Incluir roteiro manual D&D/Daggerheart e declarar testes de Foundry e OAuth real pendentes quando indisponíveis.
