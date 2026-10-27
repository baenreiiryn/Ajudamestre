# Plano de implementação Ajudamestre

Objetivo: primeira versão instalável, com conector SIWC local e ferramentas para mestre.
Arquitetura: módulo ESM ApplicationV2, executor no cliente GM, conector Node sem dependências.
Especificação: ../specs/2026-10-27-ajudamestre-design.md.
Método: execução nesta sessão, testes antes dos componentes críticos.

- [x] Testes de permissões: jogador negado, confirmação recusada, chamadas desconhecidas negadas.
- [x] Testes de tradução: preservar referências/HTML/rolagens, rejeitar marcadores ausentes, adulterados e duplicados; rejeitar edição concorrente.
- [x] Implementar utilitários, adaptadores, executor e histórico com snapshots e conflito.
- [x] Testar loop: múltiplas ferramentas, erro individual, cancelamento e limite de passos.
- [x] Testar SSE/JWT/OAuth/HTTP: stream incompleto, state errado, JWT adulterado, escopo ausente, origem/host/segredo errados.
- [x] Implementar conector protegido e fluxo oficial de login/renovação/logout.
- [x] Criar painel, opções de permissões, modelos/contas, pareamento, histórico e progresso.
- [x] Empacotar módulo e conector; documentação e roteiro manual nos dois sistemas.
- [x] Executar suíte e verificação sintática; transferir para checkout do usuário e publicar commit no GitHub.

Riscos de revisão: referência quebrada na tradução; código de macro que contorna permissões; módulos que escondem segredos em configurações; falha de stream após saída parcial; escrita parcial em lote. Cobrir com validação, escopo de ferramenta, confirmação de execução, filtros de configurações e registro por documento.

A integração real com Foundry e login de usuário permanece pendente conforme docs/manual-validation.md. Publicação do commit e arquivos da alpha acompanha esta execução.
