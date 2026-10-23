# Diário de desenvolvimento

## Pedidos e respostas do usuário

1. Criar app Electron Windows inspirado no CutRoom, focado em gerar e gerenciar carrosséis pelo P.A.C.T.O.; venda por R$47, curso opcional e MCP reutilizável.
2. Transcrever todas as aulas, com Pauta como opção de provedor.
3. Enviou oito links do YouTube, na ordem das aulas.
4. Aprovou explicitamente a estrutura e a conexão da própria conta ChatGPT do comprador.
5. Pediu adicionar MCP Obsidian, criar vault para compartilhar memória com Claude e depois iniciar.
6. Enviou link da Biblioteca Oficial do Notion, com prompts e materiais completos.
7. Enviou print da biblioteca e pediu salvá-lo no vault.
8. Pediu todo o contexto do trabalho organizado no vault.

## Execução e descobertas

- Inspeção encontrou CutRoom atual 0.6.0 com Electron e Codex 0.163.0. A geração de imagens é desativada no CutRoom, portanto não pode ser copiada sem ajuste.
- Projeto original tem alterações alheias em andamento; criada worktree isolada `codex/pacto-desktop`.
- O Pauta aceitou oito links. Aula05 não retornou texto no primeiro job; nova tentativa recuperou a transcrição. Todas vieram em inglês, sem timestamps.
- A Biblioteca Oficial do Notion resolveu o conteúdo que a fala apenas menciona ou mostra na tela. Treze páginas recuperadas e preservadas.
- Obsidian configurado com variável de ambiente; CLI Codex antiga falhou por schema de tier, então registro foi feito com versão moderna já existente, sem mudar a configuração global.
- Vault do projeto registrado e notas gravadas/lidas pelo MCP. Claude Code configurado e testado conectado ao mesmo endpoint.
- Print salvo e hash comparado.
- Planejamento e implementação iniciados. Renderer compila; núcleo e ponte Codex em desenvolvimento.
- Autenticação real Codex funcionou. Disponibilidade da geração nativa exige diagnóstico; até este checkpoint não houve pixels reais no teste do novo app.

Datas de notas refletem o checkpoint de desenvolvimento, não mudança retroativa nas fontes do curso. Materiais originais trazem datas próprias em seus manifestos.

## Continuação e resultado

A falha de imagem foi resolvida habilitando apenas o executor de orquestração. Geração e revisão nativas passaram, assim como o Runtime com dois slides reais e identidade própria. A revisão de código encontrou três problemas de rascunho/cancelamento, todos corrigidos com regressões;22 testes e sete verificações do editor passaram. O executável empacotado reabriu os slides reais e exportou PNG1080×1350 sem erro de página. O instalador NSIS0.1.0 foi gerado sem assinatura digital. Ver estado atual e entrega para limites e caminhos finais.



## 23/10/2026 — onboarding igual ao do curso (Claude)

Pedido: o app deve guiar o preenchimento como o ChatGPT faz no curso e permitir escolher entre as 5 arquiteturas. Fontes lidas no vault: Aula 02 (Contexto Oficial da Marca), Aula 05 (Design Kit e presets) e Aula 08 (Prompt Mestre), com transcrições correspondentes. Implementadas entrevistas guiadas pelos prompts oficiais, revisão editável dos documentos, presets e referências visuais, seletor de arquitetura e objetivo, e contexto do Prompt Mestre nas gerações. Prova real ponta a ponta concluída; detalhes em [[09 - Validacoes e evidencias]].


## 23/10/2026 — fluxo texto → capa → carrossel (Claude)

O usuário decidiu que a IA desenha tudo, mas só depois de o texto ser gerado, editado e aprovado, e de a capa ser escolhida entre 2 ou 3 opções. Pediu também Radar, Modelador e o restante do curso. Diagnóstico anterior: os cards traziam instruções no lugar da copy e o Copy Engine não era enviado. Implementado conforme o checkpoint em [[02 - Estado e proximos passos]]. A prova real foi interrompida pelo limite de uso da conta ChatGPT.
