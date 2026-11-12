# Release Carrossell 1.13.1

12/11/2026. Publicação autorizada pelo usuário ("Yes, publish 1.13.1"), feita com a skill [[46 - Skill publicar-carrossell]].

## Contexto: 1.13.0 (sem nota própria)

A 1.13.0 entrou pelos PRs #1 (`feat/license-activation`, commits `b313b58` e `6a8f795`) e #2 (`chore/release-workflow-no-artifacts`), feitos pelo Cursor agent.
- **PR #1:** ativação da licença pelo e-mail da compra, com aceite dos termos, sem bloquear o app.
  - API: `https://carrossell-license.carrossell-matheus.workers.dev`, com `/license/activate` e `/license/revalidate`.
  - Token guardado no cofre (`safeStorage`); estado em `license-state.json`.
  - Migração de 60 dias: de 12/11/2026 a 11/01/2027.
- **PR #2:** os instaladores sobem direto na release. Ela passou a ter 17 arquivos, com os `.zip` do Mac e o `latest-mac.yml`.

## Problema

O usuário relatou que, ao preencher o e-mail, a ativação "não ia pra lugar algum" e que a janela ficou feia.
- O botão Ativar ficava apagado até marcar a caixa dos termos, sem nenhum aviso. Enter também não fazia nada.
- O servidor real responde HTTP 200 com `{"ok":false,"code":"activation_failed"}` para um e-mail sem compra (conferido com um e-mail inventado). O app gravava o código, e a janela voltava ao mesmo texto de migração, sem mostrar o erro.
- A janela usava classes que não existem no CSS (`check`, `hint`), e os campos ficavam sem estilo.

## Conteúdo (`1b7a427`)

- `src/components/LicenseDialog.jsx` (novo):
  - o botão está sempre ativo, e o envio explica o que falta: e-mail inválido ou termos não aceitos;
  - cada resultado tem a sua mensagem: `not_found`/`activation_failed`, `device_limit`, `rate_limited` e `offline`;
  - no sucesso, mostra "Licença ativada" com o e-mail mascarado e fecha em cerca de 1,8 s.
- `src/App.jsx`: usa o componente, e o estado de e-mail e aceite saiu do App.
- `src/styles.css`: estilos `license-*` com os tokens do app.
- `core/i18n-es.json`: traduções em espanhol.
- `scripts/license-proof.mjs`: prova Electron contra um servidor de licença falso local.

## Verificação

- Testes 246 de 247 passando (1 pulado, como antes) e build OK.
- `license-proof` passou:
  - a janela abre sozinha com o foco no e-mail;
  - Enter sem aceite mostra o aviso e não chama o servidor;
  - um e-mail sem compra mostra "Não encontramos uma compra…";
  - com um e-mail de compra, a licença fica ativa, a janela fecha e a faixa some;
  - sem erros de página.
- **Não verificado:** o servidor real com o e-mail de um comprador (não temos nenhum). Se um comprador real vir "Não encontramos", o problema está na base do servidor de licenças.

## Publicação verificada

- Workflow `43321710823`: os 6 jobs com sucesso, incluindo o Linux.
- `verificar-release.sh 1.13.1 43321710823`: tudo OK depois de corrigir o script.
  - Latest em 12/11/2026 22:45:20 UTC, com 17 arquivos e zero artefatos.
  - `latest.yml` e `latest-linux.yml` apontam para 1.13.1.
  - O SHA-512 confere: Windows com 227.060.066 bytes e .deb com 225.427.188 bytes.
  - Os downloads respondem 200.
- O script esperava 14 arquivos e foi atualizado para 17, na skill instalada, na cópia do Obsidian (`Skills/publicar-carrossell`) e na nota 46.
- Link: https://github.com/Mathpcastro/pacto-releases/releases/tag/v1.13.1

## Aviso publicado

`v1-13-1` (commit `46dd871` em `pacto-releases`), versão mínima 1.13.1, no sino, sem botão:
- **Título:** "Ativação da licença mais clara".
- **Texto:** "Agora a janela de ativação sempre diz o que aconteceu: licença ativada, e-mail sem compra ou o que falta marcar. Use o mesmo e-mail do pagamento."
