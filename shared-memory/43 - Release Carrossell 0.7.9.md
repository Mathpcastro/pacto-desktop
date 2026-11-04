# Release Carrossell 0.7.9

04/11/2026. Publicação autorizada pelo usuário ("Sim, publique 0.7.9"): release sem artefatos de GitHub Actions.

## Pedido

Permitir tipos de carrossel diferentes na rotina, em horários diferentes.

## Conteúdo (`e22c93f`)

- **Configuração** (`core/autopilot-schedule.mjs`):
  - a rotina tem `slots`, com até 6 horários: `{time, style, cardCount, architectureId}`;
  - `architectureId` vazio deixa o tipo para a pauta; os ids válidos são as 5 arquiteturas de `ARCHITECTURE_FLOW`;
  - rotinas antigas (`times` da 0.7.8 ou só `time`) viram horários com o mesmo estilo e a mesma quantidade de cards;
  - `time/times/style/cardCount` continuam espelhando o primeiro horário, para o código que lê o formato antigo;
  - `slotFor(config, at)` acha o horário de uma ocorrência.
- **Piloto** (`core/autopilot.mjs`):
  - `enqueue(profileId, at)` grava o tipo daquele horário no trabalho (`job.config.style/cardCount/architectureId/slot`);
  - o horário que venceu usa o seu próprio tipo;
  - o projeto é criado com `architectureId`;
  - "Gerar agora" (`runAutopilot {at}`) usa o tipo do próximo horário.
- **Tela** (`src/components/Autopilot.jsx`):
  - cada horário em "Configurar rotina" tem Tipo de carrossel, Estilo e Cards, em duas linhas;
  - um horário novo começa com o tipo do anterior;
  - o resumo lista o tipo de cada horário, e "Próximos horários" também mostra o tipo.

## Verificação

- Testes 215/215. O teste novo cobre:
  - a ordem dos horários e a compatibilidade com rotinas antigas;
  - a rejeição de tipo, estilo ou quantidade de cards inválidos;
  - o trabalho e o projeto criados com o estilo, a arquitetura e os cards do horário que venceu.
- `scripts/routine-times-proof.mjs`: Electron real com Telegram e Composio falsos. Passou:
  - 3 horários configurados com tipos diferentes;
  - o resumo com os 3 tipos, os `slots` salvos e o tipo na lista de próximos horários;
  - Pular e Voltar a preparar;
  - sem rolagem lateral a 390 px e sem erros de página.
- **Não verificado:** uma geração real disparada por um horário da rotina.

## Publicação verificada

- Workflow `41935492609`: preparar, Windows, os dois Macs e publicar com sucesso. Zero artefatos de Actions.
- Latest: https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.7.9 (04/11/2026 23:45:53 UTC), 11 arquivos.
- `latest.yml` aponta para 0.7.9. O instalador público completo (224.832.886 bytes) foi baixado e o SHA-512 `idKIJy6A…xrV0KQ==` confere com o feed. Os dois Macs e o alias PACTO-Windows respondem 200.

## Na mesma sessão, fora do código

O perfil Carrossell do usuário recebeu um novo Contexto da Marca, pela CLI `marca salvar`. O Design Kit foi mantido.
- **Público:** quem criou um SaaS e não sabe vender, em busca da primeira assinatura.
- **Formato:** estilo tweet, com uns 5 cards.
- **Último card:** vende o Carrossell, com o CTA "Comenta CARROSSEL que eu te mando o link".
- **Teste:** "Como pedir o primeiro pagamento pelo seu SaaS", com o exemplo de um app de agenda para clínicas, acertou o público.
