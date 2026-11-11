# Radar na navegação

Implementado em 11/11/2026 sobre a base publicada 0.10.1 (`ab9cc35`). Branch local `codex/radar-navegacao` em `C:/Users/Admin2/Documents/pacto-app-radar`. Prévia local para Windows, sem release publicada.

## Navegação aprovada

- O menu principal tem Início, Conteúdos, Radar e Marca. O Radar abre Para revisar se o perfil atual tiver prévias prontas. Com a fila zerada, abre Ideias.
- Ideias mantém Radar de Pautas, Referências e Vencedores. Para revisar exibe as prévias prontas e ações de ver, agendar, publicar ou descartar. Pedidos em andamento, incertos ou com erro aparecem em Outros pedidos, com as ações previstas para cada estado.
- Piloto automático reúne rotina, conexão com o Telegram, agendados e histórico. Os atalhos diretos de piloto abrem essa aba.
- O Início mostra uma linha com o total a revisar enquanto houver prévias aguardando aprovação no perfil aberto. A navegação conserva o rascunho de criação.

## Verificação

- 229 testes automatizados, 46 verificações de interface por fase, 9 regressões do renderer e 15 verificações de descoberta passaram.
- As provas de navegação, aprovação, horários e layout conferiram contador, troca de perfil, atalhos, teclado, confirmação para publicar ou agendar, horários múltiplos, prévia com imagem persistida e estados vazios. A aprovação usou dados de teste e a rotina usou servidores locais simulados.
- Executável conferido no Electron empacotado, com perfil isolado, sem publicar no Instagram. Pasta do build em `C:/Users/Admin2/Documents/pacto-app-radar/release/radar/win-unpacked`. Abra `Carrossell.exe` nessa pasta.
- Capturas da interface e do executável em `C:/Users/Admin2/Documents/pacto-app-radar/.cache/radar-navigation-proof`.
