# Release Carrossell 0.10.1

07/11/2026. Publicação autorizada pelo usuário ("Sim publique"), feita com a skill [[46 - Skill publicar-carrossell]]. Release sem artefatos de GitHub Actions.

## Problema

Um cliente (Fabio) recebeu `ERR_FAILED (-2) loading 'file:///C:\Users\Fabio\AppData\Roaming\pacto-desktop\render\<uuid>.html'` num pedido do piloto às 21:00, e a rotina parou.

- O card era montado abrindo um HTML temporário uma única vez. A falha ao abrir provavelmente vem de antivírus ou do Windows travando um arquivo recém-criado.
- Qualquer erro de um pedido desativava a rotina inteira (`enabled:false`), então todos os horários seguintes paravam.

## Conteúdo (`aa09a02`)

- **`electron/render.mjs`:** até 3 tentativas por card, cada uma com arquivo e janela novos. A última usa `os.tmpdir()/carrossell-render`. Só falhas de abertura são repetidas, com pausas de 500 ms × tentativa. A mensagem final cita o antivírus. `failFirst` simula falhas, só em desenvolvimento.
- **`core/autopilot.mjs`:**
  - um pedido que falha ao preparar volta para `queued` com `retryAt` 2 minutos depois (1 nova tentativa, `RETRIES=1`), retomando o mesmo projeto;
  - na segunda falha, o pedido fica em `error` com Retomar;
  - a rotina **nunca** é desativada por erro: `runError` diz que ela continua ativa, e o Telegram também.
- **`electron/main.mjs`:** `PACTO_RENDER_FAIL_FIRST` e o gancho `__pactoCreateRenderer`, os dois só fora do app empacotado.

## Verificação

- Testes 229/229, com 2 novos:
  - uma falha que se resolve na nova tentativa, com a rotina ativa e o mesmo projeto;
  - duas falhas, com o pedido em erro, a rotina ativa, `runError`, o Telegram e o Retomar funcionando.
- Build OK.
- `scripts/render-retry-proof.mjs` (Electron real):
  - PNG sem falha;
  - PNG depois de 2 falhas forçadas;
  - mensagem clara com 3 falhas;
  - nenhum arquivo temporário sobrando.
- **Não verificado:** a causa real no computador do Fabio, que não foi reproduzida. A prova simula a falha de abertura.

## Publicação verificada

- Workflow `42434431446`: os 5 jobs com sucesso.
- `verificar-release.sh 0.10.1 42434431446`: tudo OK.
  - Latest em 08/11/2026 01:34:22 UTC, com 11 arquivos e zero artefatos.
  - `latest.yml` aponta para 0.10.1.
  - O instalador público tem 224.840.445 bytes, e o SHA-512 `VHRNnjGY…fQ6oyg==` confere com o feed.
  - Os dois Macs e o PACTO-Windows respondem 200.
- Link: https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.10.1

## Aviso publicado

`v0-10-1` (commit `1ab747a` em `pacto-releases`), versão mínima 0.10.1, **importante** (faixa no topo), com o botão "Abrir piloto":
- **Título:** "A rotina não pausa mais quando algo falha".
- **Texto:** "Se a sua rotina pausou sozinha, ative de novo em Piloto automático. Agora, quando um carrossel falha, o app tenta de novo sozinho e os próximos horários continuam."
