# v0.2.1 — correção da resposta do ChatGPT

Corrige o erro “O modelo concluiu sem mensagem ou ferramenta” ao preparar pacotes de áudio e em pedidos do Foundry. O parser preserva os itens concluídos enviados por response.output_item.done, mesmo quando response.completed traz output vazio. Argumentos de ferramentas e raciocínio completo são mantidos em ordem, sem duplicar chamadas.

Respostas interrompidas, falhas e itens incompletos continuam bloqueados; deltas parciais não são executados. Cinco testes de regressão reproduzem esses casos.

Feche o Audio Studio/conector anterior, abra o novo executável e atualize o módulo. As configurações e a biblioteca local são preservadas. O novo programa exige conector 0.2.1 para evitar reutilizar o parser antigo.
