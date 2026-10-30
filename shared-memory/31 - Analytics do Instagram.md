---
project: carrossell
status: implementado-validado-localmente
tags: [carrossell, instagram, analytics]
---
# Analytics do Instagram — 30/10/2026

## Entrega

O usuário pediu implementar o painel proposto no texto anexado, depois de ler as mudanças no Obsidian, mantendo a estrutura visual existente. Implementado em **Marca › Conexões › Analytics**, sem nova navegação principal, com os tokens, temas, paletas e escala do estúdio direção A. Ctrl K abre a seção.

- Conta selecionável e últimos 7/30 dias (UTC, incluindo hoje).
- Alcance único do período, visitas ao perfil, contas engajadas e seguidores atuais. Métricas ausentes são nulas, nunca zero inventado.
- Histórico de seguidores por coletas reais do app, uma por dia UTC, até 90 dias; gráfico a partir de quatro dias medidos e lacunas preservadas. Não reconstrói totais históricos a partir de novos seguidores.
- Ranking por salvamentos, compartilhamentos ou alcance, cinco posts por página, limitado aos 50 mais recentes do período. Os números de cada post são acumulados desde a publicação, diferente dos totais da conta.
- “Usar no Replicador” importa uma referência real e idempotente por conta/mídia/perfil; “Gerar variações” usa a conta ChatGPT. A referência externa contém legenda e medições conhecidas; não inventa texto de cards, imagens ou vendas. Quando existe projeto correspondente no perfil, o Replicador aproveita seu texto.
- Cache por perfil/conta/período por 15 minutos; Atualizar força nova coleta. Estados vazio, sem conexão, erro e disponibilidade parcial; respostas atrasadas não misturam contas/perfis.

## Arquivos

Repositório: `C:\Users\Admin2\Documents\pacto-app`, branch `codex/instagram-analytics`, versão local 0.6.0.

Novos: `core/analytics.mjs`, `src/components/Analytics.jsx`, `tests/analytics.test.mjs`, `scripts/analytics-proof.mjs`, `scripts/analytics-packaged-proof.mjs`, `scripts/secrets-restart-fixture.mjs`, `docs/plans/2026-10-30-instagram-analytics.md`.

Alterados: `core/social.mjs`, `core/store.mjs`, `core/runtime.mjs`, `electron/preload.cjs`, `src/components/Brand.jsx`, `src/App.jsx`, `src/studio.css`, `API.md`. O script `scripts/ui-phases.mjs` foi atualizado para navegar pelas seções da Marca já existentes e considerar os sete controles aprovados da 0.6.0.

## Provas executadas

- `npm test`: **105/105**.
- `npm run build`: passou.
- `node scripts/renderer-regression.mjs`: **8/8**.
- `node scripts/ui-phases.mjs`: **46/46**, saída do comando (o antigo `.cache/ui-phases/log.json` é histórico e não é gerado por esse script).
- `node scripts/analytics-proof.mjs`: oito verificações no Electron com Composio falso; períodos, ranking, importação, cache, resposta atrasada, erro/retentativa, histórico/gráfico com lacunas, desconexão, Ctrl K, tema/paleta/125% em largura 700, sem erros de página ou transbordamento.
- `node scripts/analytics-packaged-proof.mjs`: build Windows abre Analytics e expõe o contrato no preload, com biblioteca isolada.
- Revisão independente encontrou dois P2, corrigidos e reproduzidos antes da correção: coleta parcial apagando o total de seguidores do dia; atualização com menos posts mantendo uma página vazia do ranking. Releitura confirmou os dois resolvidos.
- Teste isolado do cofre, em dois processos normais do Electron, gravou e reabriu apenas um texto fictício; nenhuma chave real foi impressa ou copiada para notas.

## Leitura real — @omatheusdaia

O usuário confirmou que a conexão funciona. A leitura foi efetivamente realizada pelo controle local do próprio app aberto, com a chave já cifrada no app, sem revelá-la:

| Período | Alcance | Visitas | Contas engajadas | Seguidores | Posts lidos |
|---|---:|---:|---:|---:|---:|
| 7 dias | 193.503 | 1.281 | 15.271 | 18.068 | 22 |
| 30 dias | 1.003.448 | 6.121 | 93.482 | 18.068 | 50 (limite explícito) |

As duas consultas retornaram insights dos posts e nenhum aviso de indisponibilidade. São os números devolvidos naquela coleta, não garantias de resultados futuros. Evidências locais: `.cache/analytics-live/report-7.json`, `report-30.json`, `.cache/analytics-proof/` e `.cache/analytics-real-preview/` (esta última exibe dados reais consultados em ambiente isolado). A tela do aplicativo real também foi aberta e conferida por automação nativa.

## App atualizado e contexto do cofre

**Cópia indicada pelo usuário e atualizada:** `C:\Users\Admin2\Documents\pacto-app\release\teste\win-unpacked\Carrossell.exe`. Foi preservado esse executável e atualizado `resources/app.asar` com o painel. O controle de integridade embarcado do asar foi consultado e estava desativado; nenhuma configuração de segurança foi alterada. Backup anterior em `.cache/analytics-upgrade-teste-20261030/app.asar`. O app foi deixado aberto em Analytics com os números reais.

Durante a validação, iniciar o app como processo filho do executor não permitia decifrar a chave já salva. Isso também ocorreu com o build anterior. Abrir o executável pelo Explorer, como o usuário fazia, restaurou a leitura; nenhuma nova chave precisou ser colada. O diagnóstico está limitado a essa diferença observada de contexto de execução; não afirmar que um defeito de criptografia foi corrigido. Preservar o contexto normal do usuário em futuros testes. A cópia `release/teste-b` teve seus arquivos originais restaurados; o build completo novo permanece em `release/analytics/win-unpacked`.

## Limites e publicação

Não houve publicação de release, push, postagem no Instagram, DM ou teste de geração real de variações. A importação foi validada com fixture isolada; o contrato do Replicador foi validado em testes. A leitura real dos analytics foi validada, mas postar/agendar de verdade continua sendo uma pendência anterior. Mac físico não foi testado. O histórico de seguidores começa na primeira coleta de hoje; dias anteriores não foram inventados.
