# Validação da alpha 0.1.0

- Suíte Node: 28 testes de comportamento, incluindo OAuth com assinatura RSA verificável e endpoints HTTP locais reais. Chamadas externas OpenAI e documentos proprietários Foundry são simulados nas respectivas fronteiras.
- Execução da suíte em Linux e Windows com Node 24; CI configurada para Node 22.
- Manifesto, caminhos e sintaxe dos 20 arquivos JavaScript verificados.
- Templates reais compilados com Handlebars 4.7.8; verificados escape de conteúdo, campo de pareamento e seletores de permissão. Isto não é teste visual dentro do Foundry.
- ZIPs gerados sem dependências e verificados com leitor ZIP independente.
- Não foi realizado login com a conta do usuário, nem chamada de inferência real.
- Não foi realizado teste em uma instalação licenciada Foundry 13/14. Compatibilidade declarada é alvo de implementação; `verified` só será preenchido depois do roteiro manual.
- A tentativa de iniciar o teste visual simulado com Playwright encontrou ausência do binário Chromium neste ambiente; o teste visual não foi executado. Nenhuma configuração do navegador do usuário foi alterada.

Consulte manual-validation.md para os passos pendentes.

## Correção 0.1.1

31 testes passando; regressão do login cobre falha do conector sem abrir aba vazia, popup bloqueado com link manual e rejeição de endereço de autorização inválido. Falhas de pareamento/rede passam a ser visíveis na interface. Login real pelo navegador do usuário continua pendente.

## Seleção contextual 0.1.2

42 testes automatizados passando. Novos testes exercitam os hooks V1/V2, botão exclusivo do mestre, deduplicação, seleção de documento/pack, preservação de UUIDs embutidos/compêndios, troca/remoção de alvo e bloqueio durante uma tarefa. A fronteira DOM/Foundry é simulada; inspeção visual no Foundry real ainda não foi executada. A conversa recebe metadados do alvo apenas quando o mestre envia o pedido.
