# Release Carrossell 1.12.0

12/11/2026. Publicação autorizada pelo usuário ("faça uma versão .deb pra linux ubuntu e crie o release lá no repo pacto-releases ... sem mexer nas releases existentes"). Release sem artefatos de GitHub Actions. Sem aviso no `notices.json`: quem já usa Windows ou Mac não vê diferença.

## Problema

O Carrossell só tinha instalador de Windows e Mac. Faltava um `.deb` para Ubuntu, com nome estável e feed de atualização, publicado na 1.12.0 sem republicar as releases anteriores.

## Conteúdo (`3095aff`)

Tag `v1.12.0` no commit `0b4bb5e`.

- `package.json`: target `deb`, ícone `resources/branding/icon-512.png`, categoria `Office`, maintainer Matheus Castro, arquivo `Carrossell-${version}-linux.deb`.
- `.github/workflows/build-mac.yml`: job `linux` (`ubuntu-latest`) gera o `.deb` e o `latest-linux.yml`, copia o alias `Carrossell-Linux.deb` e sobe os três no rascunho. O job `publish` só libera a Latest quando esses arquivos também estão presentes. A nota da release passa a citar Linux.
- Nenhuma tela, fluxo de Windows ou de Mac foi alterado. O app abre no Linux. O piloto continua só no Agendador do Windows e no LaunchAgent do Mac: no Linux, ativar a rotina responde que o agendamento não está disponível e o app não fecha. A bandeja segue só no Windows. O cofre de chaves usa o chaveiro do sistema; nesta sessão sem chaveiro o Electron ficou em `basic_text` e guardar a chave do Composio ou do Telegram é recusado.

## Verificação

- Testes 234/234 e `npm run build`.
- `.deb` local da 1.11.1 (mesmo empacotamento, antes do bump): `sudo apt install` em Ubuntu 24.04.5 LTS, uma janela visível, `pt-BR`, troca para Español (`¿Qué vamos a crear hoy?`, pedido com espanhol latinoamericano) e volta para `pt-BR`, sem erro de página.
- O `.deb` público da 1.12.0 foi baixado, instalado por cima e aberto de novo sob xvfb: pacote `pacto-desktop` 1.12.0, `app.getVersion()` 1.12.0, uma janela "Carrossell · Estúdio de carrosséis", o mesmo caminho de idioma, sem erro de página. O comando instalado é `/usr/bin/pacto-desktop`.
- Provas em `scripts/*-proof.mjs` que rodam no Linux sem conta ChatGPT, Instagram ou Telegram real: passaram `agents`, `approval`, `brand`, `cli`, `discovery`, `i18n`, `notices`, `pilot-layout`, `profiles`, `radar-navigation`, `references`, `references-packaged`, `render-retry` e `visual-references`.
- `agent-mode-proof` abriu o diálogo de agentes e parou no botão de nome exato "Gemini"; a tela mostra "Gemini CLI". Não é falha do pacote.
- `analytics-proof` e `routine-times-proof` pararam em "O sistema não ofereceu um cofre para guardar a chave com segurança." `autopilot-proof` chamou o Telegram falso (`getMe` e `getWebhookInfo`) e o nome do bot não apareceu, no mesmo ambiente sem chaveiro.

## O que não foi verificado

- Ubuntu com sessão GNOME e chaveiro desbloqueado (Instagram/Composio e token do Telegram).
- Atualização automática do `.deb` pelo `electron-updater`, do começo ao fim.
- Associação do ícone no dock (`desktopName` não está no `package.json`; o electron-builder avisou).
- Geração com conta ChatGPT, publicação no Instagram e instalação fora desta VM.
- As provas que exigem Windows, Mac ou conta real não foram executadas.

## Publicação verificada

- Workflow [43256976349](https://github.com/Mathpcastro/pacto-desktop/actions/runs/43256976349): `prepare-release`, `windows`, `mac (arm64, macos-15)`, `mac (x64, macos-15-intel)`, `linux` e `publish` com sucesso. Zero artefatos de Actions.
- Latest em 12/11/2026 16:24:03 UTC, não é rascunho nem pré-release, com 14 arquivos:
  - `Carrossell-Setup-1.12.0.exe`, `Carrossell-Setup-1.12.0.exe.blockmap`, `latest.yml`, `Carrossell-Windows.exe`, `PACTO-Windows.exe`
  - `Carrossell-1.12.0-mac-arm64.dmg`, `Carrossell-1.12.0-mac-x64.dmg`, `Carrossell-Mac-AppleSilicon.dmg`, `Carrossell-Mac-Intel.dmg`, `PACTO-Mac-AppleSilicon.dmg`, `PACTO-Mac-Intel.dmg`
  - `Carrossell-1.12.0-linux.deb`, `Carrossell-Linux.deb`, `latest-linux.yml`
- `latest.yml` aponta para 1.12.0. O `Carrossell-Windows.exe` público tem 224.901.942 bytes e SHA-512 `3CI1XJJc…3Fj6Q==`, igual ao feed.
- `latest-linux.yml` aponta para 1.12.0 e para `Carrossell-1.12.0-linux.deb`. O `Carrossell-Linux.deb` público tem 225.821.404 bytes e SHA-512 `0Bz1VG0F…imXjWw==`, igual ao feed.
- Apple Silicon, Intel, `PACTO-Windows.exe` e `Carrossell-Linux.deb` responderam HTTP 200 em `releases/latest/download`.
- As releases `v1.11.1`, `v1.11.0`, `v1.10.2` e `v0.10.0` continuam com os mesmos 11 arquivos, os mesmos SHA-256 e as mesmas datas de publicação.
- Link: https://github.com/Mathpcastro/pacto-releases/releases/tag/v1.12.0

## Aviso

Não publicado. A 1.12.0 não muda o que quem já usa Windows ou Mac vê. O `notices.json` não foi alterado.
