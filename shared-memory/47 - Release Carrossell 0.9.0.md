# Release Carrossell 0.9.0

05/11/2026. Publicação autorizada pelo usuário ("Publique"), feita com a skill [[46 - Skill publicar-carrossell]]. Release sem artefatos de GitHub Actions.

## Pedido

No piloto automático, dar a opção de publicar sem revisão, também para quem já tem rotina ativa, ou com revisão pelo Telegram e pelo app.

## Conteúdo (`66f8173`)

- **Configuração:** `approval` vale `review` (padrão) ou `auto`. Rotinas salvas antes desta versão continuam com revisão até a pessoa mudar.
- **Sem revisão:**
  - `preview()` manda os cards, a legenda e os stories ao Telegram como registro, com "Rotina sem revisão: publicando agora", e marca o trabalho como `approved` com `auto: true`;
  - o laço do piloto publica em seguida;
  - um projeto alterado depois da prévia continua bloqueando a publicação (fingerprint);
  - pedidos com `origin: 'conversation'` (feitos na conversa do Telegram) sempre esperam revisão.
- **Aprovação pelo app:** a ação `approveAutopilot {id, at?}` (`Autopilot.approve`):
  - aceita só prévias `ready` com o projeto sem mudança;
  - é atômica contra uma resposta no Telegram;
  - com `at`, agenda (`parseWhen`, de 2 min até 120 dias à frente);
  - apaga os botões da prévia no Telegram e manda "aprovado no app".
- **Tela:**
  - "Antes de publicar" em Configurar rotina, com um alerta no modo sem revisão;
  - o resumo mostra o modo;
  - em "Para revisar", os botões Publicar agora e Agendar, ambos com confirmação.

## Verificação

- Testes 222/222. Os 3 novos cobrem:
  - o modo sem revisão publicando e a edição bloqueando;
  - o pedido da conversa continuando com revisão;
  - a aprovação pelo app (publicar, agendar, data inválida, segunda aprovação recusada e projeto alterado recusado).
- `scripts/approval-proof.mjs`: Electron real. Passou:
  - a escolha salva, com o alerta e o resumo;
  - Publicar agora com confirmação, chamando `approveAutopilot {id}`;
  - Agendar mandando a data;
  - sem rolagem lateral a 390 px e sem erros de página.
- `routine-times-proof` passou de novo.
- **Não verificado:** uma publicação real no Instagram no modo sem revisão (os testes usam um Instagram falso).

## Publicação verificada

- Workflow `41956266770`: os 5 jobs com sucesso.
- `verificar-release.sh 0.9.0 41956266770`: tudo OK.
  - Latest em 05/11/2026 02:41:28 UTC, com 11 arquivos e zero artefatos.
  - `latest.yml` aponta para 0.9.0.
  - O instalador público tem 224.838.199 bytes, e o SHA-512 `6ONoe25o…iWH/2Q==` confere com o feed.
  - Os dois Macs e o PACTO-Windows respondem 200.
- Link: https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.9.0

## Aviso publicado

`v0-9-0` (commit `54e394d` em `pacto-releases`), versão mínima 0.9.0, no sino, com o botão "Abrir piloto":
- **Título:** "Rotina que publica sem revisão".
- **Texto:** "Em Piloto automático › Configurar rotina, escolha publicar direto ou revisar antes. As prévias também podem ser aprovadas no app, com Publicar agora ou Agendar."
