# Plano Audio Studio

Goal: programa Windows e módulo Foundry controlando um mixer local transmitido por bot Discord, com biblioteca e pacotes montados pelo GPT.
Architecture: conector local compartilhado + Electron, FFmpeg/PCM, SSE e adaptador de voz Discord.
Spec: ../specs/2026-10-30-audio-studio.md

- [x] Store de biblioteca, pacotes e segredos com escrita atômica; testes de licença e caminhos.
- [x] Catálogos Tabletop Audio/Commons/Freesound, cache e jobs de montagem; testes e consultas reais.
- [x] Mixer com FFmpeg, canais, pads, volumes e parada; testes reais PCM.
- [x] Adaptador Discord DAVE e configuração/convite; testes sem credenciais reais.
- [x] HTTP autenticado, SSE/monitor e ferramentas de áudio GPT; testes de acesso e estado.
- [x] Interface compartilhada do programa/Foundry, GPT e monitor local.
- [x] Electron, empacotamento Windows, dependências e notas de uso.
- [x] Suíte, compilação e validação; commit/push e release experimental.

Foco de revisão: segredos nunca retornam; pad não depende de download na hora; estado único evita dois players; efeitos e música coexistem; licenças restritas não viram download; falhas de fonte aparecem como slots faltantes; desconectar fecha stream/processos; uso do bot requer configuração explícita.

Verificação realizada: 50 testes, manifesto/sintaxe, Electron real, FFmpeg, codec Opus/DAVE e busca/download real. Integração com call Discord, SIWC e Foundry do usuário permanece no roteiro manual por exigir contas/mesa reais.
