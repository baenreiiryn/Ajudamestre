# Ajudamestre

Assistente privado do mestre para Foundry VTT, inicialmente para **D&D 5e** e **Daggerheart**. Converse em português para criar, editar e organizar seu mundo, traduzir compêndios livremente e preparar macros.

**Versão 0.2.2 — alpha, com Audio Studio para Windows.** Alvo Foundry 13/14. A suíte automatizada cobre as regras do módulo e do conector com doubles na fronteira Foundry/OpenAI; ainda é necessário validar dentro do Foundry licenciado e concluir um login real. O campo `verified` do manifesto foi intencionalmente omitido até essa validação. Este projeto não inclui conteúdo dos sistemas nem é afiliado à Foundry, OpenAI, Wizards of the Coast ou Darrington Press.

## Instalar

1. Baixe `ajudamestre.zip` na [versão v0.2.2](https://github.com/baenreiiryn/Ajudamestre/releases/tag/v0.2.2), extraia em `Data/modules/ajudamestre/` e confirme que `module.json` está diretamente nessa pasta.
2. Alternativamente, após a publicação dos arquivos da versão, instale pelo manifesto: `https://raw.githubusercontent.com/baenreiiryn/Ajudamestre/main/module.json`.
3. Ative **Ajudamestre** em Gerenciar módulos dentro de um mundo D&D 5e ou Daggerheart.
4. O botão **Ajudamestre** aparece somente para o mestre. Também há Configurações → Configurações do módulo → Ajudamestre → Conexão e permissões.

## Conector e Sign in with ChatGPT

O módulo roda no navegador do mestre. O conector roda **no mesmo computador desse navegador**, mesmo quando o Foundry está hospedado em outra máquina. Ele cuida de OAuth e solicitações de IA, sem compartilhar os tokens do ChatGPT com o Foundry ou jogadores.

A opção recomendada no Windows é baixar **Ajudamestre-Audio-Studio-0.2.2.exe** na [release](https://github.com/baenreiiryn/Ajudamestre/releases/tag/v0.2.2) e abrir o programa. Ele já inclui Node, FFmpeg e o conector. É portátil e ainda não tem assinatura digital. Se o conector antigo estiver aberto no terminal, encerre-o com Ctrl+C antes de abrir o aplicativo.

Em **Configurar**, informe o endereço do seu Foundry, por exemplo `https://foundryhidolax.duckdns.org/game`. O programa usa somente `https://foundryhidolax.duckdns.org` como origem autorizada. Mostre o código de pareamento e copie para o módulo; use `http://127.0.0.1:3210` como endereço do conector. Não encaminhe essa porta para a internet.

Alternativa sem interface nativa: instale [Node.js 24.17 ou superior](https://nodejs.org/), clone o repositório (ou extraia `ajudamestre-conector.zip`) e execute na pasta:

```powershell
npm.cmd ci
node companion/server.mjs --origin https://foundryhidolax.duckdns.org
```

Pode repetir `--origin`. O endereço aceita `/game` e normaliza a origem. A porta padrão é 3210; use `--port 3211` e ajuste o módulo se precisar mudar. O Studio também fica disponível em `http://127.0.0.1:3210/studio/` com o código do terminal.

1. Copie o código de pareamento mostrado em Configurar no programa ou no terminal para a configuração do módulo. Esse código autoriza acesso local ao conector; mantenha-o privado.
2. Clique **Continue with ChatGPT**, escolha a conta/workspace e autorize o uso do plano.
3. Se o navegador bloquear a abertura automática, clique no link **Abrir login do ChatGPT** exibido no módulo. Se houver erro de conexão, ele aparece no topo da configuração e em uma notificação; confira pareamento, origem autorizada e permissão de rede local.
4. Volte ao Foundry e clique **Atualizar conexão**.
5. Selecione um modelo retornado para sua conta e salve.
6. Mantenha o programa/conector aberto enquanto usar a IA ou transmitir áudio.

O login segue o [fluxo oficial SIWC para projetos OSS](https://developers.openai.com/siwc/token-sharing-open-source/sign-in). A elegibilidade da conta, os modelos e os limites são determinados pela OpenAI; entrar na conta não garante autorização de uso do plano. Não há troca automática para API paga. Você pode adicionar contas, selecionar registros separados e desconectar. Consulte [uso do plano](https://chatgpt.com/settings/usage).

Navegadores podem pedir permissão de rede local, sobretudo se o Foundry usa HTTPS. Se a conexão for bloqueada, verifique essa autorização e a origem configurada. Não desative a segurança do navegador. O conector não inicia login automaticamente nem reutiliza credenciais do Codex ou de outros aplicativos.

Dados locais do conector: `~/.ajudamestre/credentials.json`, com host estável, registros por conta e tokens. A pasta recebe permissões restritas (ACL no Windows, 0700/0600 no Unix), e o arquivo é substituído atomicamente. Não copie para o diretório público do Foundry nem para Git. Um lock impede dois conectores de renovar os mesmos tokens simultaneamente; após encerramento forçado, remova `~/.ajudamestre/running.lock` somente depois de verificar que o processo anterior terminou.

## Audio Studio: PC, Foundry e Discord

O programa mantém uma biblioteca local, pacotes por cenário e três canais: **trilha sonora**, **ambiente** e **efeitos/soundpads**, além do volume principal. Música e ambientes podem repetir; pads podem ser disparos ou loops. **Iniciar ambiente** toca apenas as trilhas contínuas do pacote. Clique nos pads quando quiser os efeitos. Há pausa e parada geral. Importe seus próprios arquivos ou use **Buscar sons** para baixar e validar antes de tocar.

No Foundry, o botão **Áudio**, disponível ao mestre, abre o mesmo painel. Alterações feitas no programa ou nesse painel compartilham o estado do mixer no PC. O áudio segue do PC para o Discord; os jogadores não precisam carregar os arquivos no Foundry. O PC precisa permanecer ligado e o Discord ainda tem sua própria latência. Esta versão não encaminha automaticamente playlists ou sons de outros módulos: use os controles do Audio Studio. **Ouvir no PC** liga o monitor local; se você também estiver ouvindo o bot, poderá ouvir o áudio duas vezes.

Para configurar o bot:

1. No [Discord Developer Portal](https://discord.com/developers/applications), crie um aplicativo e um bot. Copie o token para **Configurar → Token do bot Discord** no programa. Nunca envie o token no chat.
2. Informe o ID do aplicativo/bot para gerar o link **Convidar bot** e convide-o para seu servidor. Ele precisa somente de **Ver canal, Conectar e Falar** no canal escolhido; não precisa de Administrador nem de acesso às mensagens.
3. Ative o modo de desenvolvedor do Discord, copie o ID do servidor e o ID de um canal de voz comum e salve no programa. Stage e chamadas privadas não são suportados.
4. Clique **Entrar na call**. Só depois de aparecer **Discord na call** o mixer será transmitido. A conexão nunca é automática. **Sair** encerra o bot; o mixer pode continuar no PC. Se a conexão cair, os pads são interrompidos e é necessário reconectar pelo painel.

O token fica em `~/.ajudamestre/audio/secrets.json`, com permissões restritas, e não é retornado pela API, enviado ao GPT ou incluído em pacotes. Arquivos, créditos e pacotes ficam em `~/.ajudamestre/audio/`. O aplicativo reaproveita um conector 0.2.2 compatível já aberto; fechar a janela só encerra o conector quando ela própria o iniciou.

## Preparar pacotes com GPT

Na aba **Assistente GPT**, conecte sua conta, atualize e escolha um modelo. No assistente do Foundry também estão disponíveis as ferramentas de áudio, sujeitas à categoria **Áudio** das permissões. Exemplo:

> Crie um pacote para masmorra com ambiente contínuo, passos, sussurros e respiração estilo ASMR. Use loops nos sons que fizer sentido e deixe os efeitos prontos nos soundpads.

O assistente pesquisa catálogos e inicia uma montagem em segundo plano. Os arquivos são baixados e validados no PC antes de entrar na biblioteca; **Preparação de pacotes** mostra andamento e sons faltantes. As buscas usam metadados, sem análise auditiva: confira o resultado pelo monitor e ajuste o pacote. Um pedido não garante que todos os efeitos gratuitos existam. O pacote pode ficar parcial e os itens ausentes são informados. Você pode complementar com arquivos locais.

Fontes implementadas:

- **Pads incluídos (Kenney, CC0):** 181 efeitos prontos para passos, portas, rangidos, livros, moedas, tecido, armas e impactos. Funcionam sem internet ou chave. Em Buscar sons, escolha **Pads incluídos · CC0**; em **Efeitos gratuitos**, eles são priorizados. Para sussurros e respiração ASMR ainda é necessário encontrar uma gravação adequada nas fontes externas.

- **Tabletop Audio:** faixas públicas com download explícito, música e ambiente combinados, com crédito e licença CC BY-NC-ND 4.0. SoundPads e conteúdo restrito/Patreon não são extraídos, pois não são liberados para uso fora do site. Veja as [condições oficiais](https://tabletopaudio.com/about.html).
- **Wikimedia Commons:** áudios com licenças suportadas CC0, domínio público ou CC BY. A qualidade/relevância depende do acervo.
- **Freesound:** opcional, configure sua chave de API. Importa previews disponíveis na API, identificados como previews, com licenças suportadas. Pode ampliar os resultados para efeitos específicos.

A origem, o autor e a licença acompanham cada áudio. O programa e conector incluem somente os 181 efeitos CC0 de Kenney, com as licenças originais. As faixas externas de música e ambiente não são distribuídas. Respeite as condições de uso, inclusive a restrição não comercial do Tabletop Audio. O GPT só pode importar candidatos encontrados nos catálogos autorizados; não baixa URLs arbitrárias nem faz uma busca irrestrita em qualquer site.

## Abrir o assistente para um documento

Como mestre, abra a janela de um item, ficha de ator/NPC, diário, página de diário, configuração de pasta, cena, tabela ou outro documento suportado e clique no ícone de chapéu do **Ajudamestre** no cabeçalho. Ele fica visível diretamente na barra superior, inclusive em janelas ApplicationV1 e ApplicationV2. Jogadores não recebem o botão.

O painel abre mostrando **Alvo selecionado**, nome e UUID. Basta pedir, por exemplo, “traduza esta descrição” ou “renomeie para Espada da Aurora”. O pedido leva o identificador exato; o assistente é orientado a ler esse documento diretamente, sem procurar por nome. Entradas de compêndios e itens embutidos preservam seu UUID completo. Em uma janela de compêndio, o alvo é o próprio pack.

Clique no X do alvo para voltar à conversa geral. Clique no ícone de outra janela para trocar de alvo; a troca fica bloqueada enquanto há uma tarefa em execução. Abrir o assistente não envia uma mensagem nem modifica dados automaticamente. Modificações ainda obedecem às permissões configuradas.

Integrações também podem usar `game.modules.get('ajudamestre').api.openForDocument(documentoOuUuid)` para abrir o painel com um alvo.

## Ferramentas

- Buscar e ler atores, itens, diários, cenas, tabelas, pastas, macros, combates, playlists e cartas.
- Inspecionar schemas de documentos e modelos do sistema em tempo de execução.
- Criar, editar, duplicar e excluir documentos; criar/editar embutidos, como itens de ator, páginas de diário, efeitos, tokens, paredes, luzes e participantes de combate.
- Listar/copiar compêndios, importar entradas e traduzir nomes/descrições em lotes.
- Visualizar/ativar cenas, enquadrar posições, administrar turnos/rodadas e sortear tabelas.
- Enviar mensagens privadas ao mestre ou públicas quando solicitado.
- Consultar módulos e suas configurações não secretas, alterar configurações autorizadas e chamar integrações registradas.
- Criar e editar macros pelo CRUD de documentos; execução é uma ferramenta separada.

Exemplos:

> Liste os compêndios de armas e traduza o que pertence ao Daggerheart para português brasileiro.
>
> Crie uma pasta Mercadores e três NPCs com descrições curtas. Consulte o schema antes de definir atributos.
>
> Liste os tokens da cena atual e mova os goblins para perto da porta.
>
> Crie uma macro para selecionar os tokens hostis, mas não execute ainda.
>
> Quais módulos estão ativos e quais ferramentas adicionais eles expõem?

## Tradução livre

Sem glossário obrigatório. Campos de texto são selecionados pelo adaptador do sistema e pelos `htmlFields` declarados pelo próprio sistema. Itens/páginas embutidos são incluídos no lote. Valores mecânicos, IDs e chaves de sistema não entram no processo.

HTML, enriquecimentos (`@UUID`, `@Embed`, `&Reference` etc.), links, rolagens e interpolações são mascarados. Os marcadores devem voltar na mesma ordem, sem duplicação/remoção. Textos dentro de rótulos de links protegidos permanecem como estavam. O lote é validado antes de escrever e cada campo é comparado à origem para evitar sobrescrever edição concorrente. Se um documento falhar, o resultado lista concluídos, falha e pendentes; o bloqueio do pack é restaurado em `finally`. Um lote preparado expira em uma hora ou ao recarregar.

A edição do compêndio original pode ser substituída por uma atualização do sistema/módulo que o fornece. Para conservar uma tradução independente, peça primeiro uma cópia. O assistente pode fazer isso por comando. Traduções são privadas ao seu mundo; o projeto não publica os textos.

## Permissões

O padrão **Assistente do mestre** permite consulta e edição ampla. Exclusões, desbloqueio de compêndios, alterações de configuração, execução de integrações e de macros pedem confirmação. Cada categoria pode ser **Permitir**, **Confirmar** ou **Bloquear**. A política é verificada no executor a cada chamada, além da permissão nativa do documento. A IA não recebe ferramenta para modificar suas próprias permissões ou contas de usuários.

Macros e integrações são código executado como mestre e **não ficam isolados** pelas permissões das outras ferramentas. O código da macro é mostrado na confirmação. Permitir execução direta concede acesso amplo à sessão. A IA recebe instrução para não contornar recusas por macros; isso não é um sandbox de JavaScript.

O módulo não instala/desinstala pacotes nem modifica arquivos do servidor. APIs de terceiros requerem registro explícito abaixo. Configurações ocultas, objetos/listas e nomes associados a credenciais são omitidos das ferramentas de configuração; esse filtro não é um cofre para segredos colocados livremente dentro de textos de jogo.

## Histórico e desfazer

Snapshots ficam no IndexedDB do navegador, separados por origem, mundo e usuário. O histórico é gravado antes e depois de cada edição/criação/exclusão de documento, incluindo falhas. **Desfazer** funciona para edição/criação registrada se não houve alteração posterior; a criação é revertida excluindo o documento e respeita essa permissão. Não há restauração automática garantida para exclusões, cópia de compêndio, configurações, mensagens, mudanças de combate, sorteios ou efeitos de macros/integrações.

Limpar dados do navegador remove esse histórico. Não existe limite automático nem sincronização entre dispositivos nesta versão. A conversa fica em memória até recarregar; use **Nova conversa** para reduzir contexto. Ao atingir o limite de etapas, envie “continue”; resultados de ferramentas já concluídas são mantidos no contexto da conversa. Interromper não reverte escritas anteriores.

## Integrações com módulos

Um módulo ativo pode registrar ações depois do hook `ajudamestreReady`, ou consultar a API caso o hook já tenha ocorrido:

```js
const register = api => api.registerIntegration('meu-modulo', {
  description: 'Ferramentas do meu módulo',
  actions: {
    prepararEncontro: {
      description: 'Prepara um encontro pelo nome',
      parameters: {
        type: 'object',
        properties: { nome: { type: 'string' } },
        required: ['nome'], additionalProperties: false
      },
      handler: async ({nome}, {game, canvas}) => {
        // Implementar usando a API pública do seu próprio módulo.
        return { preparado: nome };
      }
    }
  }
});
Hooks.once('ajudamestreReady', register);
if (game.modules.get('ajudamestre')?.api) register(game.modules.get('ajudamestre').api);
```

A integração roda somente se seu módulo continua ativo e a categoria Integrações permite a ação. Parâmetros são validados pelo subconjunto de JSON Schema usado aqui (type, properties, required, enum, min/max, maxItems, additionalProperties). A integração deve validar suas regras de domínio. Métodos arbitrários de `module.api` não são chamados automaticamente.

## Desenvolvimento e verificação

```sh
npm ci
npm test
npm run check
npm run package
npm run build:win
```

O módulo Foundry não tem dependências adicionais. O conector usa as dependências de áudio do `package-lock.json`. Os ZIPs ficam em `dist/` e o executável Windows em `desktop-dist/`; `ajudamestre.zip` contém o módulo e `ajudamestre-conector.zip` contém o conector. A CI executa os mesmos comandos. Veja o [roteiro de teste manual](docs/manual-validation.md) e a [arquitetura](docs/superpowers/specs/2026-10-27-ajudamestre-design.md).

Referências: [Foundry API](https://foundryvtt.com/api/v13/), [D&D 5e](https://github.com/foundryvtt/dnd5e), [Daggerheart](https://github.com/Foundryborne/daggerheart), [SIWC Responses](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference).
