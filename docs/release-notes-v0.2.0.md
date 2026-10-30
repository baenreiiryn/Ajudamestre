# v0.2.0 — Audio Studio experimental

Programa Windows portátil com mixer local FFmpeg: música, ambiente, soundpads, loops, volumes, pausa, parada e monitor no PC. O painel Áudio do mestre no Foundry usa o mesmo estado do programa. Um bot configurado pelo usuário envia a mistura para um canal de voz Discord comum, com suporte DAVE pela biblioteca de voz atual.

Biblioteca local e pacotes editáveis; importação de arquivos; busca e download de candidatos licenciados em Tabletop Audio, Wikimedia Commons e Freesound opcional. GPT pode montar pacotes em segundo plano, preservar créditos e informar efeitos ausentes. SoundPads restritos do Tabletop Audio não são baixados. A função não encaminha automaticamente áudio de playlists/outros módulos do Foundry.

Instalação: baixe o EXE, feche o conector antigo, abra o programa, configure a origem Foundry e copie o pareamento para o módulo atualizado. Configure seu bot e clique Entrar na call. Nunca envie tokens no chat.

Validação: 50 testes automatizados, FFmpeg real, interface Electron real com criação de pacote e buscas reais nos catálogos. A conexão com uma call Discord, o login ChatGPT e o painel dentro do Foundry licenciado ainda precisam de validação de integração com as contas e a mesa do usuário. Executável alpha sem assinatura digital; compatibilidade Foundry 13/14 ainda sem campo verified.

Também verificados: download real de Forest: Night (14,4 MB), validação FFmpeg e saída PCM, com limpeza dos dados temporários; codificação PCM → Opus e carregamento DAVE.
