# Ajudamestre

Assistente privado do mestre para Foundry VTT, inicialmente para **D&D 5e** e **Daggerheart**. Converse em português para criar, editar e organizar seu mundo, traduzir compêndios livremente e preparar macros.

**Versão 0.1.0 — alpha.** Alvo Foundry 13/14. A suíte automatizada cobre as regras do módulo e do conector com doubles na fronteira Foundry/OpenAI; ainda é necessário validar dentro do Foundry licenciado e concluir um login real. O campo `verified` do manifesto foi intencionalmente omitido até essa validação. Este projeto não inclui conteúdo dos sistemas nem é afiliado à Foundry, OpenAI, Wizards of the Coast ou Darrington Press.

## Instalar

1. Baixe `ajudamestre.zip` na [versão v0.1.0](https://github.com/baenreiiryn/Ajudamestre/releases/tag/v0.1.0), extraia em `Data/modules/ajudamestre/` e confirme que `module.json` está diretamente nessa pasta.
2. Alternativamente, após a publicação dos arquivos da versão, instale pelo manifesto: `https://raw.githubusercontent.com/baenreiiryn/Ajudamestre/main/module.json`.
3. Ative **Ajudamestre** em Gerenciar módulos dentro de um mundo D&D 5e ou Daggerheart.
4. O botão **Ajudamestre** aparece somente para o mestre. Também há Configurações → Configurações do módulo → Ajudamestre → Conexão e permissões.

## Conector e Sign in with ChatGPT

O módulo roda no navegador do mestre. O conector roda **no mesmo computador desse navegador**, mesmo quando o Foundry está hospedado em outra máquina. Ele cuida de OAuth e solicitações de IA, sem compartilhar os tokens do ChatGPT com o Foundry ou jogadores.

Instale [Node.js 22 ou superior](https://nodejs.org/) e use uma das opções:

- Clone este repositório e, na pasta do projeto, execute `npm start`.
- Baixe `ajudamestre-conector.zip`, extraia e execute `node companion/server.mjs`. Não exige `npm install`.

No Windows também é possível abrir o PowerShell na pasta e rodar:

```powershell
node companion/server.mjs
```

Para um Foundry acessado por endereço diferente do padrão local, autorize a **origem exata** usada no navegador (protocolo, domínio e porta; sem caminho):

```powershell
node companion/server.mjs --origin https://minha-mesa.exemplo.com
```

Pode repetir `--origin`. Nunca abra a porta do conector para a internet: ele escuta somente em `127.0.0.1`. A porta padrão é 3210; altere com `--port 3211` e atualize o endereço no módulo.

1. Copie o código de pareamento mostrado no terminal para a configuração do módulo. Esse código autoriza acesso local ao conector; mantenha-o privado.
2. Clique **Continue with ChatGPT**, escolha a conta/workspace e autorize o uso do plano.
3. Volte ao Foundry e clique **Atualizar conexão**.
4. Selecione um modelo retornado para sua conta e salve.
5. Mantenha o conector aberto enquanto usar a IA.

O login segue o [fluxo oficial SIWC para projetos OSS](https://developers.openai.com/siwc/token-sharing-open-source/sign-in). A elegibilidade da conta, os modelos e os limites são determinados pela OpenAI; entrar na conta não garante autorização de uso do plano. Não há troca automática para API paga. Você pode adicionar contas, selecionar registros separados e desconectar. Consulte [uso do plano](https://chatgpt.com/settings/usage).

Navegadores podem pedir permissão de rede local, sobretudo se o Foundry usa HTTPS. Se a conexão for bloqueada, verifique essa autorização e a origem configurada. Não desative a segurança do navegador. O conector não inicia login automaticamente nem reutiliza credenciais do Codex ou de outros aplicativos.

Dados locais do conector: `~/.ajudamestre/credentials.json`, com host estável, registros por conta e tokens. A pasta recebe permissões restritas (ACL no Windows, 0700/0600 no Unix), e o arquivo é substituído atomicamente. Não copie para o diretório público do Foundry nem para Git. Um lock impede dois conectores de renovar os mesmos tokens simultaneamente; após encerramento forçado, remova `~/.ajudamestre/running.lock` somente depois de verificar que o processo anterior terminou.

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
npm test
npm run check
npm run package
```

Não há dependências de execução. Os ZIPs ficam em `dist/`; `ajudamestre.zip` contém o módulo e `ajudamestre-conector.zip` contém o conector. A CI executa os mesmos comandos. Veja o [roteiro de teste manual](docs/manual-validation.md) e a [arquitetura](docs/superpowers/specs/2026-10-27-ajudamestre-design.md).

Referências: [Foundry API](https://foundryvtt.com/api/v13/), [D&D 5e](https://github.com/foundryvtt/dnd5e), [Daggerheart](https://github.com/Foundryborne/daggerheart), [SIWC Responses](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference).
