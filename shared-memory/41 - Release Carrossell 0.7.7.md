# Release Carrossell 0.7.7

04/11/2026. Publicação autorizada pelo usuário ("Sim, publique 0.7.7"): release sem artefatos de GitHub Actions.

## Problema

O usuário não recebia a 0.7.6 e não tinha como sair do app. Com o piloto ligado (`keepAlive`), fechar a janela deixa o processo rodando sem janela e sem ícone. O menu "Janela › Sair" fica escondido no Windows (`autoHideMenuBar` e barra de título oculta). A busca de atualização só acontecia 15 s depois de abrir e a cada 4 h, então quem deixa o app aberto o dia todo demorava a receber a versão nova.

## Conteúdo (`ec1a32b`)

- **Bandeja do Windows** (`electron/tray.mjs`): o ícone `carrossell.ico` abre o app com um clique. O menu tem Abrir o Carrossell, Procurar atualização e Sair do Carrossell.
- **Aviso ao fechar:** no primeiro fechamento com o app continuando em segundo plano, uma notificação diz onde fica o Sair.
- **Atualização** (`electron/updater.mjs`): busca a cada 1 h, ao reabrir a janela (se a última busca tem mais de 10 min) e sob pedido pela bandeja. A busca manual avisa se já está na última versão, se está baixando, se já baixou ou se deu erro. O Mac (manual) recebeu o mesmo `check`/`refresh`.

## Verificação

- Testes 212/212; `npm run dist` e `scripts/packaged-smoke.mjs`: ZIP 1080×1350, modelo, PDF e curso, sem erros de página.
- App empacotado no Windows do usuário, com perfil temporário: o ícone apareceu nos ícones ocultos, o clique abriu a janela, e fechar sem piloto encerrou o app e removeu o ícone. O log do atualizador mostrou "0.7.6 is not available (latest 0.7.6)".
- **Não verificado:** o menu do botão direito (a ferramenta não permite clique direito na bandeja) e o aviso ao fechar com o piloto ligado.

## Publicação verificada

- Workflow `41905859521` com sucesso em preparar, Windows, Mac arm64, Mac x64 e publicar. Zero artefatos de Actions.
- Latest público: https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.7.7 (04/11/2026 20:28:05 UTC), 11 arquivos.
- `latest.yml` aponta para 0.7.7. O instalador público completo (224.829.925 bytes) foi baixado e o SHA-512 confere com o feed. Os aliases Windows Carrossell/PACTO e os dois Macs respondem.

Quem está na 0.7.5 ou na 0.7.6 com o piloto ligado precisa sair uma vez pelo Gerenciador de Tarefas, ou instalar o Carrossell-Windows.exe por cima. A partir da 0.7.7, sair é pela bandeja.
