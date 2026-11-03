# Piloto automático Telegram — plano de implementação

> Executar nesta sessão com superpowers:subagent-driven-development para unidades independentes e revisão. Base efetiva: v0.7.3 / 9614d92. Especificação aprovada pelo pedido do usuário em docs/superpowers/specs/2026-11-02-telegram-autopilot-design.md.

**Goal:** Gerar carrosséis no computador e receber aprovação privada pelo Telegram antes de publicar pelo Composio existente.

**Architecture:** Cliente HTTP injetável, estado durável separado da biblioteca, executor por perfil e actions allowlisted. Usar Runtime.job.done da 0.7.3 e nunca inferir conclusão pelo primeiro retorno da action. Background mantém polling; tarefas do SO reabrem no horário previsto.

**Tech Stack:** Node ESM/fetch, Electron safeStorage, React, node:test e Playwright.

- [x] Atualizar worktree para v0.7.3 e executar baseline (131 testes).
- [x] Cliente e testes em core/telegram.mjs e tests/telegram.test.mjs: JSON/multipart, grupos, texto completo, erros sem token e cancelamento.
- [x] Estado e agenda em core/autopilot-store.mjs, core/autopilot-schedule.mjs; testes em tests/autopilot.test.mjs para validação, escrita serial, recuperação, recorrência local e tarefa independente.
- [x] Motor em core/autopilot.mjs: pairing privado, perfis, Radar, checkpoint de projeto, geração aguardada, prévia completa, revisão congelada, cliques idempotentes, confirmação de data e resultados incertos sem repetição.
- [x] Integrar cofre, Runtime/preload, scheduler e ciclo de vida Electron; testes de integração com conta e Telegram falsos em dados temporários, sem efeito externo.
- [x] Interface em src/components/Autopilot.jsx e integração pontual em Brand.jsx; seguir os componentes/tokens existentes e preservar logotipo/biblioteca/seletor.
- [x] Prova Electron sem serviços externos, regressões renderer, ui-phases, referências, build e testes completos. Revisões independentes de conformidade e qualidade; corrigir achados antes de concluir.
- [x] Registrar evidências e limitações nas notas e outputs. Sem push, merge ou release; teste real com bot/geração e publicação só com conexão autorizada.

## Contrato da interface

Status em state.autopilot: `{hasToken,bot,paired,pairing,connectionError,config,jobs}`. config: `{enabled,time,days,style,cardCount,accounts,nextAt}`. jobs incluem id,projectId,status,title,error,createdAt. pairing inclui código/link/expiração apenas enquanto aguardando o vínculo; nunca token.

Actions: telegramStatus, saveTelegramToken({token}), disconnectTelegram, pairTelegram, saveAutopilot({config}), runAutopilot, retryAutopilot({id}), discardAutopilot({id}). Retornos de mutação incluem estado atualizado do Runtime. Eventos type:'state' respeitam profileId.

## Verificações por etapa

Antes do código novo, gravar cenários de teste e executar `node --test tests/telegram.test.mjs` ou `node --test tests/autopilot.test.mjs` para observar funcionalidade ausente. Após implementação, repetir a suíte relevante. Casos críticos: usuário errado; clique antigo/repetido; projeto modificado após prévia; troca de perfil; reinício durante publicação; falha parcial; geração concorrente; perda de rede; horário após suspensão; pausa e saída.
