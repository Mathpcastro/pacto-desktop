---
project: carrossell
status: publicada
tags: [carrossell, release]
---
# Release Carrossell 0.7.0 — 02/11/2026

Pedido do usuário: "vamos fazer o release sem artefatos no github, to sem espaço no actions". O workflow `Build and publish releases` envia os instaladores direto para o rascunho da release em `Mathpcastro/pacto-releases` e não cria artefatos de Actions.

## Antes de publicar (local)

- 113/113 testes; `npm run dist` gerou `Carrossell-Setup-0.7.0.exe` (226364378 bytes).
- `scripts/packaged-smoke.mjs` no executável empacotado: projeto reaberto, ZIP com 1080×1350, modelo e PDF, sem erros de página.
- CLI do app empacotado (`release/win-unpacked/resources/bin/carrossell.cmd`), pasta de dados temporária: guia do modo agente, marca salvar, criar --agente, texto, stories em fundo branco com 2 PNGs, revisar sem sinais de IA, exportar --so-stories.
- Commit `dd468a6` enviado à `main` de `Mathpcastro/pacto-desktop` (avanço direto de `fc06e2b`); tag `v0.7.0`. Arquivos de outros trabalhos não commitados ficaram de fora (scripts do minicurso, `landing-clips.py`, `docs/branding/whatsapp-community/`, nota 23).

## Novidades

Stories só de texto (preto/branco) no fim do fluxo, copy com voz humana e detector de sinais de IA, modo agente para Claude/Gemini pela CLI sem a conta ChatGPT, caminho Claude/Gemini dentro do app e carrosséis do agente no Início com etiqueta, comandos de stories/CTA/revisão na CLI e MCP P.A.C.T.O. com as regras novas. Ver [[33 - Roteiro comentarios stories anuncios e provedores]].

## Resultado verificado

- Publicada e Latest: https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.7.0
- Workflow https://github.com/Mathpcastro/pacto-desktop/actions/runs/41489508330 com sucesso em preparar, Mac arm64, Mac x64, Windows e publicar (testes nas três plataformas e smoke dos dois Macs). **Zero artefatos de Actions** (API do run: total_count 0).
- 11 arquivos; aliases com o mesmo digest dos instaladores. Os 7 links `latest/download` (Carrossell e PACTO, Windows e Macs, latest.yml) responderam HTTP 200.
- `latest.yml` público: versão 0.7.0, `Carrossell-Setup-0.7.0.exe`, 224211832 bytes. Atualização automática do Windows preservada.

| Arquivo | Bytes | Digest |
|---|---:|---|
| Carrossell-Setup-0.7.0.exe (= Carrossell-Windows.exe, PACTO-Windows.exe) | 224211832 | sha256:84669e4d4bc36d1e42a2e843e33a0df274c573531dd6d040c60e4a9d3160b878 |
| Carrossell-0.7.0-mac-arm64.dmg (= aliases Apple Silicon) | 270961338 | sha256:07ea84a953402fbd8ea0c539e432d77f31209edf8a189bd8ded1d11bc68d49a7 |
| Carrossell-0.7.0-mac-x64.dmg (= aliases Intel) | 285982611 | sha256:07dab3e6c994139fd483e86ef2bfcec8c5df794c0cfc89d3995537166658fe22 |

## Limites que permanecem

Instaladores sem assinatura de código; Mac sem notarização e com atualização manual. Mac físico, Gemini CLI real e agendamento real com o app fechado não foram testados nesta versão. Texto da release no GitHub é o genérico do workflow.
