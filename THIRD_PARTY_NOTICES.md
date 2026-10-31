# Dependências de áudio e desktop

Este projeto usa dependências externas distribuídas com seus próprios avisos e licenças. Os arquivos LICENSE/NOTICE das dependências permanecem no pacote do programa.

- Electron: MIT. https://github.com/electron/electron
- discord.js / @discordjs/voice: Apache-2.0. https://github.com/discordjs/discord.js
- @snazzah/davey: protocolo DAVE e binários nativos; consulte a licença incluída na dependência. https://github.com/Snazzah/davey
- opusscript: MIT; Opus inclui licenças e avisos próprios. https://github.com/abalabahaha/opusscript
- ffmpeg-static: pacote GPL-3.0-or-later, com binário FFmpeg obtido pelos distribuidores indicados no projeto. Fonte do empacotador e instruções de origem dos binários: https://github.com/eugeneware/ffmpeg-static . Código-fonte FFmpeg: https://ffmpeg.org/download.html . Preserve os avisos/licenças ao redistribuir.

O mixer chama o executável FFmpeg em um processo separado. O código do Ajudamestre é MIT; as licenças de terceiros não são substituídas por essa licença.

O programa inclui 181 efeitos originais de Kenney: RPG Audio e Impact Sounds, sob CC0 1.0. Origem: https://kenney.nl/assets/rpg-audio e https://kenney.nl/assets/impact-sounds . As licenças originais e os hashes por arquivo ficam em companion/audio/pads. As demais gravações de áudio não fazem parte da distribuição. Cada arquivo importado pelo usuário mantém licença, autor e origem em sua biblioteca local. SoundPads e versões de Patreon do Tabletop Audio não são fornecidos. Os previews do Freesound são identificados como previews, não como originais completos.
