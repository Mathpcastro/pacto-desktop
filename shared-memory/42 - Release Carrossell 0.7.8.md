# Release Carrossell 0.7.8

04/11/2026. Publicação autorizada pelo usuário ("Sim, publique 0.7.8"): release sem artefatos de GitHub Actions.

## Problema

A rotina do piloto só tinha um horário por dia. O usuário quer postar quantas vezes quiser e controlar esses posts.

## Conteúdo (`4910a82`)

- **Vários horários** (`core/autopilot-schedule.mjs`): `times` com até 6 horários por dia, sem repetição e em ordem. Cada horário prepara um carrossel e manda a prévia no Telegram. Rotinas antigas que só têm `time` continuam valendo (`times=[time]`).
- **Próximos horários e Pular:** `upcomingRuns` lista os próximos 8. A ação `skipAutopilotRun` ({at, skip}) pula um horário ou devolve, e `nextRun` ignora os pulados. Salvar pela tela mantém os pulos, e os que já passaram são apagados.
- **Limite da fila:** o perfil guarda até 1 carrossel esperando aprovação por horário configurado. Antes eram 1 no total. Passando disso, a rotina registra o motivo e a tela pede para aprovar ou descartar.
- **Tela** (`src/components/Autopilot.jsx`):
  - "Configurar rotina" tem a lista de horários com Adicionar e ×, o aviso de horário repetido e a recomendação de 1 h entre horários;
  - o resumo mostra "às 9h, 13h30 e 19h · 3 carrosséis por dia";
  - a lista "Próximos horários" tem Pular e Voltar a preparar.

## Verificação

- Testes 214/214, com 2 novos: horários, pulos, compatibilidade e limite da fila.
- `scripts/routine-times-proof.mjs`: Electron real com Telegram e Composio falsos e locais. Passou:
  - 3 horários configurados, com o horário repetido bloqueando o salvar;
  - resumo, 8 próximos horários e `nextAt` igual ao primeiro;
  - Pular move `nextAt` para o horário seguinte, e Voltar a preparar devolve;
  - sem rolagem lateral a 390 px e sem erros de página.
- **Não verificado:** uma geração real disparada pelos horários. O botão Ativar com a conta ChatGPT conectada também não foi testado: na prova a rotina foi ativada pelo mesmo comando `saveAutopilot`.

## Publicação verificada

- Workflow `41920651740`: preparar, Windows, Mac arm64, Mac x64 e publicar com sucesso. Zero artefatos de Actions.
- Latest público: https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.7.8 (04/11/2026 22:02:09 UTC), 11 arquivos.
- `latest.yml` aponta para 0.7.8. O instalador público completo (224.831.372 bytes) foi baixado e o SHA-512 `Zun1pvRn…IAVGig==` confere com o feed. Os dois Macs e o alias PACTO-Windows respondem 200.

Quem está na 0.7.7 recebe pela atualização automática (a cada hora ou ao reabrir) ou pela bandeja › Procurar atualização.
