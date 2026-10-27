# Validação manual — alpha 0.1.0

Ainda não executada dentro de um mundo Foundry real ou com conta ChatGPT real. Testes automatizados simulam a fronteira Foundry/OpenAI.

Execute em mundos de teste, um D&D 5e e um Daggerheart, nas versões Foundry 13/14 correspondentes aos sistemas instalados.

1. Instalar/ativar: manifesto carrega; botão/configuração aparecem como GM. Entrar como jogador e verificar ausência do painel/API.
2. Parear conector: origem e segredo errados falham. Tokens não aparecem no mundo/navegador, somente o segredo de pareamento.
3. Continue with ChatGPT: concluir consentimento, atualizar conexão, ver conta/workspace e catálogo. Testar recusa de uso do plano, adicionar/selecionar conta e desconectar.
4. Consultar schema, criar NPC/pasta/item, editar, criar item embutido/efeito nos dois sistemas.
5. Traduzir cópia de compêndio com item, ator com itens e diário com páginas. Incluir HTML, @UUID, @Embed, &Reference e rolagens. Verificar dados mecânicos e bloqueio restaurado.
6. Editar manualmente após preparar tradução: rejeitar conflito. Simular falha de escrita: conferir concluídos/pendentes e histórico.
7. Criar/mover token/luz/parede; ativar/view/pan. Criar combate e Combatant; avançar turno/rodada. Tabela selfroll e chat privado não aparecem aos jogadores.
8. Criar macro sem executar; executar exibindo código. Recusar e bloquear execução. Modificar macro durante confirmação: rejeitar.
9. Consultar módulos sem credenciais; alterar configuração pública de módulo de teste. Registrar integração; confirmar parâmetros, executar; desativar módulo e verificar recusa.
10. Desfazer edição/criação; edição manual posterior gera conflito. Reabrir e verificar histórico. Exclusões não têm restauração automática.
11. Parar conector/revogar acesso: erro sem repetição automática de escritas. Verificar permissão de rede local do navegador, inclusive origem HTTPS.
12. Registrar versões e erros de console. Só preencher compatibility.verified após essa validação.
