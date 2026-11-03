# Controle por conversa e descoberta de recursos — 03/11/2026

Implementação local na worktree `C:\Users\Admin2\Documents\pacto-app-telegram`, branch `codex/telegram-autopilot`, sobre `v0.7.3` / `9614d92`. O piloto anterior está no commit `28ed89b`. Nenhum push, merge, mudança de versão ou release desta etapa.

## Interface aprovada e aplicada

Home com tema/formato primeiro, ajustes recolhidos, estado compacto do piloto e três projetos recentes. Biblioteca completa em Conteúdos; piloto na navegação principal. O botão **O que posso fazer no Carrossell?** abre um painel sobre a home, com seis objetivos e destinos reais: criar, encontrar pautas, publicar/organizar, entender resultados, cuidar da marca e usar agentes/CLI.

Claude Code, Gemini CLI e Codex têm acesso à configuração existente. Cards em modelos ou HTML podem ser produzidos no modo agente sem ChatGPT conectado ao app. Imagens por IA dependem das ferramentas do agente. A rotina e o interpretador do Telegram usam o ChatGPT conectado ao Carrossell; não foi criada uma conexão direta de modelo Claude/Gemini no app.

O rascunho da criação permanece ao navegar. Filtros da biblioteca não escondem os recentes da home. Stories têm um espaço que reutiliza o painel existente e funciona a partir do texto, sem exigir primeiro as artes do carrossel nem liberar publicação.

## Conversa no Telegram

Uma conversa privada vinculada pode pedir texto, revisão, aprovação do texto, opções de capa, escolha de capa, cards, mudança da quantidade pela função da 0.7.3, stories/edição/fundo/arte, CTA, Radar/modelagem/replicação, marca/Design Kit, logo/produto, métricas/posts/ranking, prévias e exportação ZIP/PDF. As imagens dos stories podem ser enviadas mesmo antes das artes do carrossel.

Comandos `/ajuda`, `/status`, `/marcas`, `/projetos` e `/cancelar` respondem sem depender do interpretador. A conversa mantém contexto próprio de marca/projeto; a seleção no computador é independente. Nomes duplicados exigem ID. Cancelamento afeta apenas o trabalho da conversa.

O modelo escolhe uma ação validada por pedido. Não recebe ferramentas de shell, arquivos, navegação ou geração de imagem no turno de interpretação. Credenciais, caminhos e imagens da biblioteca não entram no contexto do interpretador. Entrada com chave conhecida/configurada é rejeitada antes da fila/histórico.

Publicação e agendamento passam pela prévia durável já existente e seus botões, com contas escolhidas e fingerprint do conteúdo. Texto da conversa não publica diretamente. Aprovações já salvas têm prioridade sobre novos pedidos de edição. Vínculos expirados não autorizam callback nem despacho. Reinício não repete mutações em andamento; recebimento e dedupe são uma transação da fila.

## Validação executada

- `npm test`: 206/206.
- `npm run build`: aprovado; permanece o aviso de chunk grande da biblioteca de referências.
- `node scripts/ui-phases.mjs`: 46/46.
- `node scripts/renderer-regression.mjs`: 9/9.
- `node scripts/references-proof.mjs`: 16/16.
- `node scripts/discovery-proof.mjs`: 15/15, incluindo 1093×580 no tema escuro com escala 125%, 390×844, seis objetivos acessíveis, foco e estados preservados.
- `node scripts/autopilot-proof.mjs`: 14/14; Electron e IPC reais com transporte Telegram local simulado.
- Revisões independentes de UI e core: nenhum P1/P2 remanescente nos pontos revisados. Regressões reproduzem ambiguidades, expiração de vínculo, prioridade de aprovação, pergunta do Runtime, dedupe atômico e prévia de stories sem artes de carrossel.

Capturas reais e relatório: `C:\Users\Admin2\Documents\Codex\2026-11-02\qual-o-jeito-mais-f-cil\outputs\carrossell-app-atualizado`.

## Limites efetivos

Uma ação por pedido, com continuação em mensagens seguintes. Entrada de anexos PNG/JPEG/WebP até 10 MB; saída ZIP/PDF até 45 MB. Áudio, vídeo, PDF de entrada, login, credenciais, instalação/pastas, fotos de rosto e configurações do sistema continuam no computador. Stories são preparados e enviados para publicação manual.

O processo precisa continuar aberto, inclusive em segundo plano, com computador ligado e sem suspensão. O novo fluxo de conversa foi validado com interpretador/transportes simulados e ações reais do Runtime; não foi executada geração nativa com conta ChatGPT, conversa livre no Telegram real ou publicação Instagram real nesta etapa. O teste real de vínculo/álbum/callback do piloto anterior continua registrado separadamente. Mac físico permanece pendente.
