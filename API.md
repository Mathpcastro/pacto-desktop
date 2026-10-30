# Desktop API

`window.pacto.request(action,args)` and `window.pacto.onEvent(callback)` implement the contract in the desktop plan. Inference actions return immediately after the project is persisted with `planning` or `generating`; durable progress arrives as project events. A single inference operation may run at a time. Cancellation preserves completed images and previous image versions.

Profiles also accept optional string fields `freebie`, `differentiators`, `territories`. Slide indexes are 1-based. `versions` is read-only metadata for preserved native image revisions; the renderer cannot inject image bytes through `saveProject`. References enter through `importReference` and profile validation.

`PACTO_USER_DATA` overrides the app data folder for integration tests. `PACTO_DEV_URL` accepts only a local `http://127.0.0.1` URL in unpackaged development. Neither setting bypasses authentication. The app uses its own CODEX_HOME; account connect/logout never changes the global Codex login. Browser OAuth opens in the user's default browser (only `https` OpenAI/ChatGPT auth hosts are accepted); Codex's local callback completes the login and the app window is brought back to front.

Export is refused until every slide has a real PNG matching its current copy; edited content marks art as `outdated` until regenerated. The Electron save flow normalizes exported copies to 1080 × 1350 pixels using native raster resizing; source aspect ratio must be within 0.02 of 4:5. Images outside that tolerance require regeneration rather than cropping. Raw native originals and all revisions remain unchanged. The native save dialog returns `cancelled:true` when dismissed. Output contains `01.png` etc. plus `legenda.txt`.

`generateSlides` without a `slideId` generates only missing or outdated images; an explicit `slideId` regenerates that slide and preserves older revisions. Conversational replies and Radar requests can return no new slides without changing an existing approved plan. Missing briefing details should produce concise questions before a plan is invented.

Codex runs in a private home, with OS shell, inherited plugins/MCPs and host skills disabled. Native `image_gen.imagegen` is invoked through the sandboxed `functions.exec` wrapper when the selected model requires code-mode. That wrapper host must remain enabled for image generation; it is separate from OS shell execution.

## Formatos, estilos e marca (estúdio, 28/10/2026)

`createProject` aceita `format` (`carrossel`, `material`, `apresentacao`), `style` (`ia`, `tweet`, `texto`, `textopreto`, `fototexto`, `fundo`, `recorte`; documentos ficam sempre em `ia`) e `sourceId` (carrossel de origem de um material gratuito). `saveProject` aceita `style`; trocar de estilo apaga as artes atuais (as versões ficam no histórico) e a capa volta a ser escolhida. Cards e páginas também aceitam `photo` (id de cena aprovada ou de foto do rosto), `layout` (`cover`, `text`, `checklist`, `quote`, `steps`, `cta`) e `asset` (id da imagem que aparece no card: anexo do projeto ou imagem da marca; mudar deixa a arte desatualizada). `createProject` e `saveProject` aceitam `attachments` (até 6 imagens `{id?, name, dataUrl}`): o texto recebe as imagens e escolhe em `asset` o card de cada uma; a Arte com IA recebe a imagem do card com legenda, o logo da marca e os anexos não usados como referência; os estilos prontos mostram a imagem no próprio card.

Estilos de modelo e documentos não chamam a IA para a arte: `generateCovers` devolve 3 opções renderizadas (`coverOptions[].variant` 0–2), `chooseCover` grava a variante em `styleVariant` e, nos carrosséis, já monta todos os cards; `generateSlides` refaz os cards desatualizados na hora. Os PNGs saem do mesmo HTML da prévia (`core/templates.mjs`), renderizado numa janela oculta (`electron/render.mjs`) em 1080 × 1350.

`generatePlan` em documentos usa `DOC_SCHEMA` (páginas com `layout`). `exportPdf` salva o PDF do documento (A4 ou 16:9, texto selecionável) ou o PDF do carrossel pronto, uma página por card; com `drive:true`, grava na pasta do Google Drive.

`saveMedia` atualiza por partes o perfil e as fotos da marca: `displayName`, `handle`, `verified` (padrão ligado), `avatar`, `addFaces`/`removeFace` (até 10), `addScenes`/`scene` (`pending`, `approved`, `rejected`)/`removeScene`, `addAssets`/`asset` (`name`, `kind`: `logo`, `produto`, `outro`)/`removeAsset` (até 12 imagens da marca). `suggestScenes` pede 6 cenas sem rostos ao modelo; `sceneImage` gera a foto de uma cena (aprova a cena); `faceOnColor` recorta uma foto do rosto sobre a cor do card. O estado traz `media` e `brandInfo` (nome, @, selo, foto e paleta extraída do Design Kit).

## Começo rápido e feedback (0.3.4)

`quickSetup` recebe `input` (link ou descrição de até 2.000 caracteres). Com link, o app lê a página numa janela oculta e isolada (`electron/page.mjs`: texto, título, descrição, cores e print do topo) e, com a conta conectada, monta o Contexto Oficial da Marca (prompt da Aula 02) e o Design Kit (Aula 05, com o print como referência) sem perguntas. Lacunas viram HIPÓTESE. Os dois documentos ficam como rascunho em `onboarding.brand` e `onboarding.design`; o perfil só é salvo quando a pessoa aprova na tela final. `setupPrompt` devolve `{prompt}` para a pessoa colar no ChatGPT ou Claude dela, já com o que ela vende e as duas entrevistas oficiais. `importSetup` recebe `text` (a resposta colada) e separa nome, contexto e Design Kit pelas linhas `=== NOME DA MARCA ===`, `=== CONTEXTO DA MARCA ===` e `=== DESIGN KIT ===`.

`addFeedback` recebe `text` (3 a 600 caracteres), `area` (`texto`, `visual` ou `geral`) e `projectId` opcional; `removeFeedback` recebe `id`. O estado traz `feedback` (até 40). Feedback de texto e geral entra no contexto de toda geração de texto (`brandContext`); visual e geral entram nas artes (`imageContext`), como PREFERÊNCIAS DO USUÁRIO.

## Perfis (multicontas, 0.4.0)

Cada perfil é uma biblioteca separada (marca, Design Kit, entrevistas, fotos, feedback, ideias, carrosséis e configurações). A biblioteca anterior aos perfis vira o perfil `principal` e continua em `library/` sem mover arquivos; os novos ficam em `library/profiles/<id>/`, com o índice em `library/profiles.json`. A conta ChatGPT é a mesma para todos.

`profiles` devolve `{active, profiles}`. `createProfile` recebe `name` (até 60 caracteres) e, salvo `activate:false`, já troca para ele (recusa com trabalho em andamento). `renameProfile` recebe `id` e `name`. `switchProfile` recebe `id` e recusa com trabalho em andamento. `deleteProfile` recebe `id`, apaga a pasta do perfil e volta ao `principal`, que não pode ser excluído. Essas ações emitem `{type:'profile', state}`, que a janela sempre segue.

Qualquer ação aceita `profileId` opcional: ela roda naquele perfil (inclusive o trabalho em segundo plano que iniciar), sem mudar o perfil ativo. Eventos saem marcados com `profileId`; a janela envia o perfil que está mostrando em cada pedido e ignora eventos e respostas de outro perfil. O estado traz `profileId` e `profiles`.

## CLI para agentes (0.5.0)

O comando `carrossell` (`cli/carrossell.mjs`) controla o app pelo terminal ou por um agente (Codex, Claude Code). As artes continuam sendo geradas pelo app, com a conta ChatGPT conectada nele. `carrossell ajuda` lista os comandos; `carrossell ajuda --agente` imprime o guia que também é copiado em Marca › Usar com agentes (`core/agent-guide.mjs`). Saída em JSON no stdout, progresso no stderr; códigos de saída 0 ok, 1 erro, 2 uso incorreto, 3 app indisponível, 4 tempo esgotado. Imagens nunca vão para a saída: aparecem como `[imagem]` ou `image:true`.

O app é sempre o único dono da biblioteca. `core/control.mjs` abre um named pipe (Windows, `\.\pipe\carrossell-<hash da pasta de dados>`) ou socket Unix (`<userData>/control.sock`) e grava um token novo em `<userData>/control.token` a cada início; mensagens são JSON por linha `{id, token, action, args}` → `{id, ok, result|error}`, e `subscribe` passa a receber os eventos do app. Aceita as `ACTIONS` do runtime e as ações da CLI: `ping` (versão, `headless`, `window`), `status`, `projects`, `project`, `brand`, `approveBrand` (aprova os rascunhos do começo rápido como a marca), `ideas` e `exportTo` (`folder` absoluto; grava os mesmos arquivos do ZIP). Todas aceitam `profileId`.

Se nenhum app responde, a CLI abre o executável com `--segundo-plano`: sem janela, só o controle local, fechando sozinho após 10 minutos sem trabalho, sem cliente conectado e sem janela (`PACTO_IDLE_MS` muda isso nos testes). Não usar `--headless`: o Chromium entende essa opção como o modo sem tela dele. O app é de instância única: abrir o Carrossell com o segundo plano rodando mostra a janela nesse mesmo processo, e fechar a janela com a CLI conectada ou trabalho rodando mantém o app em segundo plano até terminar.

Empacotado, `resources/bin/carrossell.cmd` (Windows) e `resources/bin/carrossell` (Mac) rodam o próprio executável com `ELECTRON_RUN_AS_NODE=1` e o script de dentro do `app.asar`. `cliInfo` informa se o comando está instalado; `installCli` põe `resources\bin` no PATH do usuário (Windows, sem administrador) ou cria `~/.local/bin/carrossell` (Mac).
