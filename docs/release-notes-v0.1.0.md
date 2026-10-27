Primeira alpha do Ajudamestre para Foundry VTT, com adaptadores de D&D 5e e Daggerheart.

- Painel exclusivo do mestre e permissões configuráveis por categoria.
- Ferramentas de documentos, compêndios, tradução livre em lotes, cenas, combate, configurações de módulos, integrações registradas e macros.
- Conector local Sign in with ChatGPT com PKCE, validação OIDC, renovação e seleção de contas/modelos.
- Histórico local e reversão de edições/criações com detecção de conflito.
- 28 testes automatizados, verificação de sintaxe e compilação dos templates.

Esta é uma versão alpha. O teste em um mundo Foundry real e o login com conta elegível ainda precisam ser concluídos. Compatibilidade alvo: Foundry 13/14; `verified` não declarado. Macros e integrações executam como mestre e não são um sandbox.

Instale `ajudamestre.zip` no Foundry e execute `node companion/server.mjs` na pasta extraída de `ajudamestre-conector.zip`. Siga o README para pareamento e autorização da origem do Foundry.
