# Release Carrossell 1.13.2

12/11/2026. Publicação autorizada pelo usuário ("Sim, publique"), feita com a skill [[46 - Skill publicar-carrossell]].

## Problema

Uma cliente recebeu no Telegram "Observação do cuidado com a criação: não foi possível concluir. Tempo de espera do Telegram esgotado." Antes disso, a rotina postava um carrossel e depois parava. Reconectar a conta no Composio não resolvia.

Diagnóstico, reproduzido em teste com o `Autopilot` real e um Telegram falso:
- **Prévia grande demais:** os 9 cards iam em PNG, cerca de 1,5 MB cada (13,3 MB no total), num álbum só, com limite fixo de 40 s. Em upload de 2 Mbps o álbum chegava, mas o app desistia antes da resposta. A legenda e os botões não iam, e o trabalho virava erro antes de publicar.
- **Três falhas que paravam a rotina sem aviso no Telegram:**
  - **Conta reconectada:** a reconexão no Composio cria uma conta com outro id, e a rotina guardava o antigo. Todo horário falhava com "Conta do Instagram não encontrada".
  - **Prévia sem resposta:** uma prévia não aprovada nem descartada bloqueava todos os horários seguintes.
  - **ChatGPT desconectado:** a rotina esperava em silêncio.
- **Tela do piloto:** qualquer erro da rotina aparecia como "Conexão precisa de atenção".

## Conteúdo

- `061ef77`: a prévia vai ao Telegram em JPEG 88 (cards, stories e capas), e os 13,3 MB viram 1,6 MB. Envios de arquivo ganham tempo proporcional ao tamanho: 50 KB/s, até 10 min. A publicação no Instagram não mudou.
- `c263abb`:
  - todo horário que não começa avisa no Telegram com o motivo, e a prévia pendente é citada pelo título;
  - a rotina guarda `accountUsers` (id do Instagram e @) e reencontra a conta reconectada; com uma única conta conectada, usa essa;
  - a espera pelo ChatGPT avisa depois de 3 min, uma vez;
  - `status()` separa `routineError` de `connectionError`, e o erro aparece em "Sua rotina";
  - um 409 do Telegram vira "bot usado em outro computador".
- `d50c6e5`: versão 1.13.2.

## Verificação

- 253 testes passando (1 pulado), com 7 novos, e build OK.
- `scripts/telegram-preview-proof.mjs` (Electron, 9 cards reais, Telegram falso a 2 Mbps): antes, "Tempo de espera do Telegram esgotado" em 40 s; depois, a prévia chega em 6,7 s.
- `scripts/pilot-routine-error-proof.mjs` (Electron): o erro aparece em "Sua rotina", e a conexão não é marcada como problema.
- **Não verificado:**
  - bot real e o computador da cliente;
  - `scripts/autopilot-proof.mjs`, que já estava desatualizado (rótulos antigos e a janela da licença cobrindo a tela).
- **Não feito:** descarte automático de prévias velhas, que fica para o usuário decidir.

## Publicação verificada

- Workflow `43347992321`: os 6 jobs com sucesso.
- `verificar-release.sh 1.13.2 43347992321`: tudo OK.
  - Latest em 13/11/2026 01:57:24 UTC, com 17 arquivos e zero artefatos.
  - `latest.yml` e `latest-linux.yml` apontam para 1.13.2.
  - O SHA-512 confere: Windows com 227.061.544 bytes e .deb com 225.426.044 bytes.
  - Os downloads respondem 200.
- Link: https://github.com/Mathpcastro/pacto-releases/releases/tag/v1.13.2

## Aviso publicado

`v1-13-2` (commit `89e61bc` em `pacto-releases`), versão mínima 1.13.2, no sino, com o botão "Abrir piloto" (abre o piloto):
- **Título:** "Piloto automático mais confiável".
- **Texto:** "A prévia chega mais rápido no Telegram, e quando um horário não sai o bot avisa o motivo. Se você reconectou o Instagram, a rotina passa a usar a conta nova sozinha."
