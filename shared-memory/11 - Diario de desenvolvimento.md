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


## 23/10/2026 — fazer os R$47 valerem (Claude)

Executado o plano de valor em 5 fases, com uma avaliação ao fim de cada uma. Pedido extra durante o trabalho: as aulas tocam dentro do app, num iframe. Os bugs encontrados pelos próprios testes estão em [[09 - Validacoes e evidencias]].


## 23/10/2026 — videoaula com a voz do usuário (Claude)

Instalado o MCP do ElevenLabs (o endereço certo é `api.us.elevenlabs.io/v1/mcp`). O conector não clona voz, então o clone foi feito pela API, com uma chave obtida pela CLI oficial. Na primeira tentativa a chave veio sem a permissão de criar vozes; o usuário liberou `voices_write`. A v1 foi aprovada.


## 23/10/2026 — minicurso em 8 aulas (Claude)

O usuário pediu o método resumido em cerca de 19 minutos, só com tela e a voz dele, um nicho por aula. Pediu sem pausas silenciosas, com uma aula completa sobre problemas e uma mini-aula dizendo que o curso é opcional, mas vale a pena. O piloto foi aprovado e as aulas 2 a 8 foram gravadas, narradas e montadas. Dois bugs reais do app apareceram durante a gravação (área de transferência e o link dentro do rótulo) e estão em [[09 - Validacoes e evidencias]]. Restam cerca de 15,9 mil caracteres de crédito no ElevenLabs.


## 24/10/2026 — landing do app e atualização automática (Claude)

O usuário pediu uma landing para o app reaproveitando a prova da página atual, com copy pela skill Revenue-Centric Design e um vídeo na hero. A v1 tratava o curso como dificuldade; o usuário corrigiu: vender o app como facilidade, a dor é não saber como conseguir o primeiro assinante, e mais prova social (32 mil no YouTube, 3,4 mil → 18 mil no Instagram). A v2 foi aprovada e virou a página `/app/`. No meio do trabalho o usuário pediu atualização automática para quem baixar o app; foi feita com `electron-updater` e provada de ponta a ponta.


## 24/10/2026 — Reels de tráfego pago (Claude)

O usuário pediu um anúncio em Reels mostrando o app por dentro com a copy da página. Roteiro aprovado com três ganchos para teste. Narração gerada com timestamps por palavra (a legenda e os cortes do app seguem a fala), trilha pelo Higgsfield CLI a pedido do usuário. Primeira passada de quadros mostrou o recorte do app sem aplicar e o print do Instagram cortado; corrigidos antes do render final.

## 24/10/2026 — Operação comercial e novo nome

Nesta conversa foram organizadas as oito aulas do app na Cakto e acrescentada a aula 00 de instalação, com links fixos Windows/Mac. Foram programadas dez mensagens na Uazapi e dez no Telegram, somente Chat Geral, de 24/10 às 20h a 29/10 às 10h, com a oferta R$97 → R$47 e link da landing do app. As filas foram verificadas.

Depois, criadas duas aulas textuais de mentoria: uma ao final do módulo do app e outra ao final do método normal. Copy explica o trabalho direto de Matheus no funil personalizado e os possíveis ajustes de aquisição/conversão no SaaS, com CTA para aplicação. Ambas foram salvas como rascunho.

O usuário pediu registrar tudo no Obsidian e renomear o projeto para **Funil CQV**. Pasta, índice, estado, referências e script de sincronização ajustados; adicionadas notas 20/21/22 e provas locais selecionadas, sem credenciais. Os históricos do aplicativo, materiais, minicurso e reels foram preservados.


## 30/10/2026 — Analytics (Codex)

Lidas as mudanças atuais do Obsidian e o texto anexado; painel integrado à Marca preservando o design. Usuário confirmou Instagram conectado e indicou a cópia `release/teste`. Após conferir o contexto de abertura pelo Explorer, as leituras reais de 7/30 dias funcionaram; painel aplicado e aberto nessa cópia. Provas e limitações em [[31 - Analytics do Instagram]].
