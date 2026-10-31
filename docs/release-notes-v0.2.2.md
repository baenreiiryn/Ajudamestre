# v0.2.2 — áudio estável e pads incluídos

Corrige o relógio do mixer no Windows: a versão anterior gerava um bloco por callback e perdia ritmo com o temporizador de cerca de 31 ms. O novo relógio acompanha o tempo monotônico, recupera blocos atrasados com limite e entrega os 48 kHz esperados. O Discord ganha 160 ms de preroll e o monitor local passa a acumular 100 ms antes de tocar.

Inclui 181 efeitos CC0 de Kenney, com licenças e hashes: passos, portas, rangidos, livros, moedas, tecido, armas e impactos. Os pads funcionam sem chave ou internet. Buscas externas simplificam pedidos longos e filtram gravações de pronúncia. Sussurros e respiração ASMR continuam dependendo das fontes externas e não são substituídos por efeitos sem relação.

Validação: 61 testes; reprodução do problema no Windows (5,18 s de PCM em 8,02 s reais); correção medida (8,02 s de PCM em 8,00 s reais, com codificação Opus e nenhum bloco descartado). Teste offline monta quatro pads e valida FFmpeg/créditos. A audição final em call real continua dependendo do ambiente Discord do usuário.

Feche o programa antigo e abra o EXE 0.2.2. Configurações e biblioteca permanecem. Em Buscar sons, escolha Pads incluídos · CC0. Se estiver ouvindo o bot pelo Discord, deixe Ouvir no PC desligado para evitar duas saídas simultâneas.
