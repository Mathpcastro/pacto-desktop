# Release Carrossell 1.11.1

12/11/2026. Publicação autorizada pelo usuário ("Sim publique"), feita com a skill [[46 - Skill publicar-carrossell]]. Release sem artefatos de GitHub Actions.

## Problema

Um cliente com Mac Apple Silicon (chip M5) baixou a atualização pelo app e o Carrossell não abria, mesmo depois de `xattr -dr com.apple.quarantine`.

- **Causa principal:** no Mac, o piloto abre o app em segundo plano (LaunchAgent com `--segundo-plano`, sem janela). Abrir o app pelo Finder, Dock ou Launchpad com ele rodando não cria uma segunda instância; o macOS só reativa o processo (evento `activate`). Não havia tratamento, então nenhuma janela aparecia. Depois de atualizar, a cópia antiga continuava rodando em segundo plano.
- **Defeito extra:** sem certificado, o build pulava a assinatura, e a assinatura do Electron ficava quebrada (`codesign --verify --deep --strict`: "code has no resources but signature indicates they must be present").

## Conteúdo (`330fe75`)

- `electron/main.mjs`: `app.on('activate')` abre a janela quando não há janela aberta.
- `.github/workflows/build-mac.yml`: sem `CSC_LINK`, empacota com `-c.mac.identity=-` (assinatura ad-hoc completa; o `disable-library-validation` já estava nos entitlements).
- `scripts/mac-smoke.mjs`: falha se `codesign --verify --deep --strict` falhar.

## Verificação

- Testes 234/234 e build.
- Prova em GitHub Actions (workflow temporário, removido do commit; cópia no scratchpad da sessão), Apple Silicon, macOS 15.8.2 e 26.7.2, mesmo comando de empacotamento da release:
  - com o app rodando em segundo plano e depois `open`: a 1.11.0 publicada abriu 0 janelas; a corrigida, 1;
  - abertura normal: 1 janela nas duas;
  - assinatura: quebrada na publicada, válida na corrigida.
- No build da release, os dois Macs assinaram com `identityName=-` e o smoke (que agora confere a assinatura) passou.
- **Não verificado:** no Mac M5 do cliente; só em Macs do GitHub Actions.

## Publicação verificada

- Workflow `43233987474`: os 5 jobs com sucesso.
- `verificar-release.sh 1.11.1 43233987474`: tudo OK.
  - Latest em 12/11/2026 14:16:04 UTC, com 11 arquivos e zero artefatos.
  - `latest.yml` aponta para 1.11.1.
  - O instalador público tem 224.901.950 bytes, e o SHA-512 `l+S56GJQ…51Lzrg==` confere com o feed.
  - Os dois Macs e o PACTO-Windows respondem 200.
- Link: https://github.com/Mathpcastro/pacto-releases/releases/tag/v1.11.1

## Aviso publicado

`v1-11-1` (commit `33ea05c` em `pacto-releases`), versão mínima 1.11.1, no sino, sem botão:
- **Título:** "No Mac, o app abre mesmo com o piloto rodando".
- **Texto:** "Se o Carrossell estava rodando em segundo plano, clicar no app agora mostra a janela normalmente."

## Para quem ainda está travado

Quem tem a cópia antiga rodando em segundo plano precisa fechá-la uma vez: no Terminal, `killall Carrossell; sleep 2; open -a Carrossell`.
