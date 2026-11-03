---
project: carrossell
status: publicada
tags: [carrossell, release]
---
# Release Carrossell 0.7.3 — 02/11/2026

O usuário testou o build local e aprovou a publicação, pedindo somente remover a mensagem "Gasta menos do limite da conta" da opção de 4 cards. A mensagem foi removida no commit `3ba15e7`. A correção de anexar logotipo na entrevista de marca/design, enviada separadamente à `main` em `6a61ce8`, foi incorporada pelo merge `5cf0078`.

## Novidades

- Biblioteca de Referências com 36 modelos, miniaturas WebP, busca, filtros, carregamento lazy e integração ao composer.
- Quantidade de cards Automática ou de 1 a 10 no composer e seletor Tamanho no Estúdio.
- Alteração do tamanho durante escrita e geração de arte pela ação `resizeCarousel`, com cancelamento seguro da operação anterior, adaptação da copy e retomada somente das artes pendentes.
- Carrossel de um card permitido do texto à exportação; documentos continuam exigindo ao menos duas páginas.
- Opção de 4 cards sem a antiga mensagem sobre limite da conta.
- Correção remota preservada: anexar logotipo e outras imagens na entrevista de marca/design.

## Evidências da versão integrada

- Suíte completa: 131/131 testes aprovados após integrar `origin/main`.
- Build Vite concluído com `package.json` e lockfile em 0.7.3.
- Regressões do renderer: 9/9 aprovadas.
- Fases da interface: 46/46 aprovadas.
- Provas de Referências/Tamanho: 16/16 aprovadas.
- Revisão final independente: `APPROVED FOR RELEASE`.
- `git diff --check` sem erros.

## Validação do build local de teste 0.7.3

- `npm run dist` concluiu com `--publish never`: `release/Carrossell-Setup-0.7.3.exe`, 226944563 bytes, SHA-256 `bf9a460571c92a3422b109f2b9de253035ca6d5c45e3c35a3bfa91e35ec30728`. Esse build antecedeu apenas a remoção da mensagem e a integração da correção remota; os binários públicos serão produzidos pelo workflow da tag final.
- ASAR conferido com package 0.7.3, 36 IDs e 36 miniaturas WebP embutidas.
- `scripts/packaged-smoke.mjs` aprovado: ZIP com dois PNGs 1080×1350 e legenda, modelo 1080×1350, PDF válido e zero erros de página.

## Resultado publicado e verificado

- Código e tag `v0.7.3` enviados a `Mathpcastro/pacto-desktop` no commit `9614d92`.
- Workflow [41554166253](https://github.com/Mathpcastro/pacto-desktop/actions/runs/41554166253) concluído com sucesso em preparação, Windows, Mac x64, Mac ARM64 e publicação. Smoke dos dois Macs aprovado nos runners.
- Release pública Latest: https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.7.3, sem rascunho nem prerelease, com 11 assets.
- Windows `Carrossell-Setup-0.7.3.exe`: 224794038 bytes. Mac ARM64: 271515088 bytes. Mac x64: 286584373 bytes.
- Feed `latest.yml`: `version: 0.7.3`, instalador e tamanho corretos.
- Links `latest/download` de Windows, Mac Apple Silicon, Mac Intel e `latest.yml` responderam HTTP 200.
- API do workflow confirmou `total_count: 0`: nenhum artefato de Actions.
- Release de referência sem binários: https://github.com/Mathpcastro/pacto-desktop/releases/tag/v0.7.3, com links diretos para os três instaladores.

## Limites

- A troca de tamanho durante processamento foi validada com mocks e interface, sem uma nova prova ponta a ponta com IA real nesta etapa.
- Não houve teste de atualização completa em dispositivo físico nem instalação em Mac físico; builds de macOS foram testados nos runners.
- Instaladores sem assinatura de código; macOS segue sem notarização Apple e com atualização manual.
