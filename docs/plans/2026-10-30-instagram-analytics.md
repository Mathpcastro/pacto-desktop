# Analytics do Instagram — implementação

**Objetivo:** aplicar o painel solicitado em Marca › Conexões › Analytics, preservando o estúdio direção A e as preferências de tema, paleta e escala.

**Desenho:** seletor de conta, últimos 7/30 dias, cartões de alcance/visitas/engajamento/seguidores, histórico de seguidores coletado pelo app, ranking por salvamentos/compartilhamentos/alcance e uso de posts antigos no Replicador. Uma rolagem da página; nenhum modal ou nova navegação principal. Ctrl K abre a seção.

**Arquitetura:** `core/analytics.mjs` normaliza a API Composio; `core/social.mjs` controla contas, cache e referências importadas por perfil; Store persiste cache/histórico/fontes; Runtime e preload expõem ações permitidas; `Analytics.jsx` e CSS reutilizam os tokens atuais. Não modificar autenticação nem publicar posts.

- [x] Escrever e executar testes de intervalo, totais únicos, métricas ausentes, paginação limitada, cache, isolamento entre perfis e importação idempotente.
- [x] Implementar coleta da conta com `INSTAGRAM_GET_USER_INSIGHTS`, métrica individual e `metric_type=total_value`. Nunca somar alcance diário. Visitas indisponíveis continuam nulas.
- [x] Coletar os até 50 posts mais recentes do período com paginação e insights por post; identificar truncamento e deixar claro que números dos posts são acumulados desde a publicação.
- [x] Persistir histórico real de seguidores (uma coleta por dia UTC, 90 dias), relatórios por conta/período (15 minutos) e fontes importadas, tudo por perfil. Não reconstruir totais históricos a partir de novos seguidores.
- [x] Integrar fontes reais de posts ao Replicador sem inventar títulos de cards, artes ou vendas. Reutilizar projetos existentes quando corresponderem à mesma conta e mídia.
- [x] Implementar estados desconectado, carregando, vazio, erro e resultado parcial. Proteger contra respostas atrasadas ao trocar conta/período/perfil.
- [x] Validar npm test, build, regressões, fases e prova Electron com Composio falso (contas, filtros, ranking, importação, temas, escala e largura estreita).
- [x] Gerar build Windows de teste em pasta separada e registrar provas/limites nas notas atuais do Obsidian e no repositório. Não publicar release.

Fonte do contrato consultada em 30/10/2026: https://docs.composio.dev/toolkits/instagram (versão 20261014_00). O problema de conexão da conta real é uma pendência anterior e não é considerado resolvido por testes simulados.
