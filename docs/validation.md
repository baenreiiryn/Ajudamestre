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


## Audio Studio 0.2.0

50 testes passaram em Node 24, incluindo FFmpeg real (loop, mistura música+pad, pausa/parada), persistência/créditos, limites de download e licença, API autenticada, estado SSE, comandos repetidos e permissões Foundry. Sintaxe/manifesto verificados. Interface Electron 45 real: sincronização, quatro canais, criação de pacote, configurações e ausência de overflow horizontal. Consultas reais Tabletop Audio e Commons retornaram candidatos licenciados.

Pendente de ambiente/credenciais: login SIWC real, envio à call Discord real e integração visual com Foundry 13/14 e sistemas licenciados. Testes não demonstram qualidade artística dos candidatos encontrados nem garantem disponibilidade dos catálogos.

Também verificados: download real de Forest: Night (14,4 MB), validação FFmpeg e saída PCM, com limpeza dos dados temporários; codificação PCM → Opus e carregamento DAVE.


## Correção SIWC 0.2.1

Reprodução real: response.output_item.done continha audio_build_pack concluída, mas response.completed.output estava vazio. O parser anterior descartava a ferramenta. O novo parser preserva itens concluídos, sua ordem e raciocínio completo, sem executar deltas nem aceitar resposta falha/incompleta.

55 testes automatizados passaram. Teste com conexão ChatGPT real: o mesmo pedido de cidade em ruínas chamou audio_build_pack e recebeu mensagem final. O job criou pacote parcial com dois áudios e seis efeitos faltantes, explicitados no painel. Nenhuma reprodução nem conexão Discord foi iniciada pelo teste.


## Áudio e efeitos 0.2.2

61 testes passaram. A medição no aplicativo antigo do Windows produziu 994560 bytes em 8,0166 s, ou 5,18 s de áudio. O teste do relógio corrigido com codificação Opus produziu 8,02 s de áudio em 8,0022 s reais, 409 pacotes contando preroll e zero blocos descartados. Também há simulação determinística de callbacks a cada 31,25 ms e recuperação limitada após travamento.

Pads: 181 arquivos CC0 originais de Kenney, licenças e SHA256 preservados. O teste offline importa e valida arquivos com FFmpeg e monta pacote com quatro efeitos sem chave. Sussurros/ASMR não existem nessa coleção e continuam sujeitos à disponibilidade das fontes externas.
