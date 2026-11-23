# Carrossell 1.15.0

Versão local na branch `feat/cli-onboarding-provedor`. Validação e empacotamento descritos abaixo.

## O que mudou

- **Geração pelo terminal.** `carrossell criar --slides plano.json` importa e revisa a copy pelo mesmo caminho de `texto --arquivo`, aprova o texto, gera e escolhe a capa e monta os cards. Os padrões são estilo `texto`, uma opção de capa e rótulo `agente`. `--exportar` grava os PNGs e a legenda. Falhas anteriores à primeira exportação descartam o projeto desse comando. Se já houver arquivos exportados, a CLI informa os caminhos e preserva o projeto. No fluxo de ChatGPT, projetos com texto gravado são preservados.
- **Licença.** `licenca status` consulta a licença e `licenca ativar --email <e-mail> --aceito` chama o serviço usado pelo modal. O socket exige a versão vigente dos termos e registra o horário do aceite. A resposta contém só estado, e-mail mascarado, validade e código de resultado. Falhas de rede retornam `offline`. Se o servidor aprova a ativação ou a renovação e o cofre local falha ao guardar o token, o retorno é `storage_unavailable` e o app orienta a ativar o chaveiro do sistema no Linux.
- **Instalação e uso.** O launcher Unix encontra o executável do pacote Linux, lida com symlinks e informa quando o app está ausente. Mac e Linux usam `~/.local/bin`. Argumentos inválidos falham antes da conexão com o app. `--version`, `-v` e `versao` mostram `Carrossell 1.15.0` em texto simples.
- **Onboarding e menus.** A escolha entre ChatGPT e terminal fica no topo, mesmo quando há um aviso de licença. Concluir o guia da CLI abre o estúdio sem exigir uma conta ChatGPT. A preferência é salva por perfil. O menu do avatar consulta a instalação da CLI abaixo de **Conta ChatGPT** e abre o mesmo guia do menu de perfis, com instalação, status, comandos, prompt e plano copiáveis.
- **Ganchos de slideshow.** O roteiro de carrossel do ChatGPT e a tarefa de texto do agente incluem a mesma skill compacta, logo após o Swipe File. A capa usa uma das oito categorias e deixa o produto para depois do gancho. Os slides 2–4 começam a cumprir a promessa da capa. `carrossell skills` lista `hooks-slideshow` como `plan` junto com as extensões instaladas. O bloco de referência fica em português também nos pedidos em espanhol. [Fonte e skill completa](docs/sources/hooks-slideshow-fonte.md)
- **Fundo dos stories.** Argumentos inválidos voltam a receber a mensagem de uso original. `fundo-stories` volta a mostrar `preto|branco`.

## UGC com avatar

- Em **Marca › Persona UGC**, cadastre personas por perfil, escolha a ativa, associe um @ e envie ou gere uma foto-âncora. O app avisa quando atributos ou fotos coincidem entre personas, inclusive de perfis diferentes.
- O estilo **UGC com avatar** começa com a foto e um gancho sobreposto. Os cards seguintes entregam a promessa, mostram a imagem do produto quando fornecida e fecham com um CTA. O produto pode vir de um arquivo ou de uma captura HTTP(S) em uma sessão isolada do Electron.
- O Estúdio permite revisar a copy antes de montar os cards, refazer a foto de uma cena e exportar para TikTok ou publicar pelo fluxo do Instagram. As cenas usam sempre a âncora original como referência.
- A CLI aceita `persona`, `criar --slides plano.json --estilo ugc` e `--tiktok` na exportação. Offline, a capa usa a foto do plano, a opção `--foto` ou a âncora da persona. O ZIP ou a pasta exportada inclui os PNGs 1080×1350 e `legenda.txt`, com `tiktok.txt` quando solicitado. [Comandos e contrato](API.md#ugc-com-avatar)
- **Ajustes pós-prova UGC.** O link do produto captura a primeira dobra em viewport móvel de 390×844 a 3×, sem barras e com limite de 20 s. O card usa moldura de celular em retrato ou tela larga conforme a imagem. O editor de persona tem grade de 3, 2 ou 1 coluna e indica a persona ativa. O `tiktok.txt` usa a primeira frase em até 150 caracteres e preserva as hashtags da legenda ou cria de 3 a 5 a partir do nicho e do título.

Validação UGC em Node e Vite

- `npm test` teve 32 arquivos aprovados e 4 com falhas. A execução detalhada teve 296 testes aprovados, 13 falhas e 1 ignorado. Houve EPERM nos sockets Unix de `agent.test.mjs` (4) e `control.test.mjs` (6), EPERM em 127.0.0.1 de `publish.test.mjs` (2) e `Connection closed` no stdio de `mcp.test.mjs` (1).
- `npx vite build` passou com aviso de chunks acima de 500 kB. O fluxo de geração, renderização e captura foi testado com dublês. A conferência visual, a captura de página com Electron, o login e a geração pela conta real, a postagem no Instagram e a validação em instaladores continuam pendentes.

## Arquivos

- `cli/arguments.mjs`, `cli/carrossell.mjs`, `cli/bin/carrossell` e `electron/cli-install.mjs` — comandos, validação e instalação.
- `core/control.mjs`, `core/runtime.mjs`, `core/store.mjs`, `core/license.mjs`, `core/generation-skills.mjs` e `electron/main.mjs` — fluxo de geração, limpeza, exportação, estado, licença e registro de skills.
- `src/App.jsx`, `src/components/Onboarding.jsx`, `src/components/ProfileSwitcher.jsx`, `src/components/CliGuide.jsx`, `src/data/cli-plan.json`, `src/studio.css` e `core/i18n-es.json` — escolha de provedor, guia e interface.
- `electron/license.mjs`, `src/components/LicenseDialog.jsx` e `tests/license.test.mjs` — retorno e mensagem para falhas no cofre durante a ativação ou renovação.
- `API.md` e `core/agent-guide.mjs` — documentação. `tests/cli-onboarding.test.mjs` cobre os fluxos em Node. `package.json` e `package-lock.json` registram a versão local.
- `core/knowledge.mjs` carrega `resources/pacto/skills/hooks-slideshow.md`. `tests/knowledge.test.mjs` e `tests/runtime.test.mjs` conferem o tamanho, as categorias e os prompts. O plano de exemplo de seis cards está em `/workspace/pacto-desktop-cli-notes/plano-hooks.json`, com a categoria Chamado registrada no arquivo `plano-hooks-categoria.txt`.

## Como testar

1. De um perfil novo, confira o título e os cards no topo da etapa **Como você quer gerar?**. Selecione **Claude ou Gemini — pelo terminal (CLI)**, copie o plano do guia e clique em **Concluir**. Confira se o estúdio abre com o ChatGPT desconectado. Abra o guia novamente pelos menus do avatar e de perfis.
2. No app instalado, confira o status no menu do avatar e use **Abrir configuração da CLI** para instalar a CLI. Reabra o menu e confira **CLI instalada**. Em um terminal com o comando no PATH, rode `carrossell --version` e `carrossell status`.
3. Rode `carrossell criar --slides plano.json --estilo texto --quantas 2 --capa 2 --exportar ./carrossel`. Confira os caminhos no JSON, os PNGs numerados, a legenda e o projeto no estúdio.
4. Rode `carrossell licenca status`. Em uma ativação real, use o e-mail da compra e `--aceito` após ler os termos. Confira que a resposta mostra o e-mail mascarado.
5. Confira `hooks-slideshow` com `carrossell skills`. Crie um carrossel no modo agente com `--pauta "Dúvidas da turma, categoria: chamado"` e abra o pedido de `carrossell tarefa <id> texto`. Para testar extensões, use o exemplo de frontmatter em `API.md`.

## Validação executada e pendências

- `npx vite build` passou com o aviso de chunks acima de 500 kB.
- Os testes em Node confirmaram as mensagens de fundo inválido antes da conexão, o registro sem duplicação e o mesmo prompt para ChatGPT e modo agente. Os testes de i18n e direção de arte passaram. O plano de exemplo passou na validação do `PLAN_SCHEMA`.
- O `npm test` registrou 30 arquivos aprovados e 4 com falhas. A execução com `node --test --test-isolation=none --test-reporter=tap tests/*.test.mjs` registrou **278 aprovados, 13 falhas e 1 ignorado**. Os quatro casos de `agent.test.mjs` e os seis de `control.test.mjs` encontraram `EPERM` ao abrir o socket Unix. Os dois casos de compartilhamento em `publish.test.mjs` encontraram `EPERM` ao escutar em `127.0.0.1`. O caso de `mcp.test.mjs` recebeu `Connection closed` no stdio do filho.
- A suíte de licença teve **13 aprovados e 1 ignorado** pela ausência do Worker no checkout. O novo teste simula a falha de gravação no cofre na ativação e na renovação, verifica o código público e a ausência do token no retorno, e confirma que a renovação preserva a licença anterior.
- O Chrome headless foi bloqueado pelo sandbox antes de carregar a interface, com `Operation not permitted` em `setsockopt` e, na segunda tentativa, em `shutdown`. A verificação visual no app instalado, a geração com conta real, a ativação pelo serviço real e a validação dos instaladores Linux, macOS e Windows estão pendentes.
