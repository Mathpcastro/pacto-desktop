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

## CLI para agentes

O comando `carrossell` (`cli/carrossell.mjs`) controla o app pelo terminal ou por um agente (Codex, Claude Code). Os modelos montam os cards no app. No UGC, a conta ChatGPT pode gerar as fotos que faltam. O estilo `ia` usa a conta ChatGPT para gerar arte ou aceita PNGs enviados pelo agente. `carrossell ajuda` lista os comandos; `carrossell ajuda --agente` imprime o guia que também é copiado em Marca › Usar com agentes (`core/agent-guide.mjs`). Os comandos de operação escrevem JSON no stdout e progresso no stderr. `carrossell --version` (também `-v` e `versao`) imprime `Carrossell 1.15.0` em texto simples, sem abrir o app. Comandos e opções inválidos são recusados antes da conexão. Códigos de saída: 0 ok, 1 erro, 2 uso incorreto, 3 app indisponível, 4 tempo esgotado. Imagens nunca vão para a saída: aparecem como `[imagem]` ou `image:true`.

O app é sempre o único dono da biblioteca. `core/control.mjs` abre um named pipe (Windows, `\.\pipe\carrossell-<hash da pasta de dados>`) ou socket Unix (`<userData>/control.sock`) e grava um token novo em `<userData>/control.token` a cada início; mensagens são JSON por linha `{id, token, action, args}` → `{id, ok, result|error}`, e `subscribe` passa a receber os eventos do app. Aceita as `ACTIONS` do runtime e as ações da CLI: `ping` (versão, `headless`, `window`), `status`, `projects`, `project`, `brand`, `approveBrand` (aprova os rascunhos do começo rápido como a marca), `ideas` e `exportTo` (`folder` absoluto; grava os mesmos arquivos do ZIP). Todas aceitam `profileId`.

Se nenhum app responde, a CLI abre o executável com `--segundo-plano`: sem janela, só o controle local, fechando sozinho após 10 minutos sem trabalho, sem cliente conectado e sem janela (`PACTO_IDLE_MS` muda isso nos testes). Não usar `--headless`: o Chromium entende essa opção como o modo sem tela dele. O app é de instância única: abrir o Carrossell com o segundo plano rodando mostra a janela nesse mesmo processo, e fechar a janela com a CLI conectada ou trabalho rodando mantém o app em segundo plano até terminar.

Empacotado, `resources/bin/carrossell.cmd` (Windows) e `resources/bin/carrossell` (Mac e Linux) rodam o próprio executável com `ELECTRON_RUN_AS_NODE=1` e o script de dentro do `app.asar`. `cliInfo` informa se o comando está instalado; `installCli` põe `resources\bin` no PATH do usuário (Windows, sem administrador) ou cria `~/.local/bin/carrossell` (Mac e Linux). O terminal precisa ter essa pasta no PATH. O launcher do Linux procura `pacto-desktop`, `carrossell` e `Carrossell` na raiz da instalação.

### Criar a partir de um plano

```sh
carrossell criar --slides plano.json --estilo texto --exportar ~/Carrossell
```

O arquivo segue o `PLAN_SCHEMA` de `core/runtime.mjs`. O [exemplo do guia](src/data/cli-plan.json) inclui todos os campos. O comando usa a mesma gravação e revisão de `texto <id> --arquivo plano.json`, aprova o texto, gera e escolhe a capa e espera pelos outros cards. `--quantas 1-3` e `--capa 1-3` têm padrão 1. A capa escolhida precisa estar entre as opções geradas. O estilo padrão é `texto` e a pauta, se omitida, vem do título ou do primeiro slide. Você também pode usar `--titulo`, `--cards`, `--objetivo`, `--perfil` e `--agente <nome>` (rótulo padrão `agente`).

Os estilos disponíveis nesse fluxo são `tweet`, `texto`, `textopreto`, `fototexto`, `fundo`, `recorte` e `ugc`. `fundo` e `recorte` precisam de uma foto do rosto salva em Marca › Perfil e fotos. Para arte pronta no estilo `ia`, use o fluxo em etapas com `criar --agente`, `texto`, `aprovar` e `card <id> <n> --imagem <arquivo.png>`.

A saída tem `id`, `estilo`, `cards` (quantidade), `capa` (número escolhido), `arquivos` (caminhos absolutos, vazio sem `--exportar`) e `alertas` (sinais de texto de IA, também exibidos no stderr). `--exportar` grava os mesmos `01.png`, `02.png`… e `legenda.txt` de `exportar`. Se uma etapa falhar antes do primeiro arquivo, o projeto é excluído. Se algum arquivo já foi exportado, o erro informa quais arquivos foram gravados e o projeto fica disponível. No `criar --pauta` com ChatGPT, a limpeza preserva projetos com texto gravado.

### UGC com avatar

Em **Marca › Persona UGC**, envie ou gere a foto-âncora, confira a prévia e clique em **Salvar avatar**. A biblioteca de cada perfil guarda o nome, a âncora original e o bloco **MANTER**. Em **Editar**, altere o nome sem trocar o ID. Para usar outra âncora, crie outro avatar. Em **Início › UGC com avatar**, escolha um avatar salvo ou use o ativo para UGC e indique o link ou a imagem do produto.

**Usar como cara do perfil** ativa o avatar para UGC e aplica sua âncora como foto do perfil local do Carrossell. A opção também aparece em **Marca › Perfil**. Remover a foto desvincula a associação e preserva o avatar e a seleção ativa para UGC. Carrosséis com uma escolha explícita continuam usando o avatar escolhido.

```sh
carrossell avatares listar --perfil "Minha marca"
carrossell avatares renomear "<nome ou ID>" --nome "<novo nome>"
carrossell avatares cara-do-perfil "<nome ou ID>"
carrossell avatares apagar "<nome ou ID>"
carrossell persona criar --nome "<nome>" --idade 28 --genero "<gênero>" --etnia "<aparência>" \
  --estilo "<roupa>" --cenario "<lugar>" --nicho "<nicho>" --foto ancora.png --usar
carrossell persona usar "<nome ou ID>"
carrossell persona foto "<rascunho>" --foto ancora.jpg
carrossell persona prompt "<nome ou ID>" --cena "<descrição da cena>" --luz flash
carrossell criar --slides plano.json --estilo ugc --avatar "<nome ou ID>" \
  --produto-imagem tela.png --exportar ./ugc --tiktok
carrossell exportar <id> --pasta ./ugc --tiktok
```

`persona criar` também aceita `--cabelo`, `--olhos`, `--marca`, `--porte` e `--instagram @conta`. Os subcomandos aceitam `--perfil`. `avatares listar` retorna `avatares`, `activePersonaId` e `avatarPersonaId`, com as fotos representadas por `[imagem]`. `persona listar` inclui os rascunhos e os `avisos` de similaridade. `persona foto` adiciona a âncora de um rascunho. Sem `--cena`, `persona prompt` devolve o prompt de âncora. Com `--cena`, devolve o prompt de cena com MANTER e a instrução de anexar a âncora original. A luz aceita `flash`, `ambiente` (padrão) ou `pov`.

O plano aceita `"estilo": "ugc"` e `"persona": "<nome ou ID>"`. As opções `--avatar` e `--persona` são equivalentes e têm precedência sobre a seleção no plano. Se passar uma imagem do produto sem indicar o card, a CLI usa o penúltimo card, depois da capa. Em cada slide, `foto` recebe um caminho relativo à pasta do plano ou um caminho absoluto, e `produto: true` indica o card que vai exibir a tela. `--foto` fornece a foto de capa pela linha de comando. Use `scene` com `acao`, `cenario` e `luz` para orientar a geração. Fotos e imagens passadas à CLI aceitam PNG, JPEG e WebP até 15 MB, identificados pela assinatura. `--produto-link` captura uma página HTTP(S) em uma sessão temporária do Electron. `--produto-imagem` usa o arquivo escolhido.

Com a conta ChatGPT conectada, os cards de cena sem foto usam a âncora original e o bloco MANTER persistido para gerar a imagem. O app aplica o gancho e a copy ao montar os PNGs. Sem a conexão, o slide 1 usa uma foto fornecida ou a âncora da persona selecionada ou ativa. Os demais cards de cena sem foto usam fundo liso. A exportação conserva os PNGs 1080×1350 e `legenda.txt`. `--tiktok` também grava `tiktok.txt` com uma legenda curta e as hashtags.

Ações do runtime disponíveis no preload e no controle local

| Ação | Argumentos | Retorno |
| --- | --- | --- |
| `personas` | `{profileId?}` | `{personas, activePersonaId, avatarPersonaId, avisos}` |
| `savePersona` | `{profileId?, persona, use?}` | Lista, avisos e `persona` salva |
| `usePersona`, `deletePersona` | `{profileId?, id}` | Lista, persona ativa e avisos após a mudança |
| `setProfileAvatar` | `{profileId?, id}` | Lista e IDs atualizados. Persiste a âncora em `media.avatar` e o vínculo em `media.avatarPersonaId` |
| `generatePersonaAnchor` | `{profileId?, persona}` | Prévia `{anchor}` no app. Envie a âncora para `savePersona` ao confirmar |
| `generatePersonaAnchor` | `{profileId?, personaId}` | Lista e avisos após gerar a âncora que falta |
| `generateUgcScene` | `{profileId?, projectId, slideId}` | Projeto com a foto da cena atualizada |

Uma persona tem `id`, `nome`, `idade`, `genero`, `etnia`, `cabelo`, `olhos`, `marcaFixa`, `porte`, `estilo`, `cenario`, `nicho`, `instagram`, `anchor`, `anchorHash`, `keepBlock`, `createdAt` e `updatedAt`. O store guarda a foto original em blob e preenche o bloco MANTER para registros anteriores à biblioteca. O runtime calcula dHash para PNG RGB/RGBA de 8 bits. Nos demais formatos aceita o hash de 16 dígitos hexadecimais em `anchorHash` ou usa o decodificador do Electron. O aviso por imagem usa distância de Hamming de até 10. O aviso por atributos exige gênero e aparência iguais após normalização, idades com diferença de até quatro anos e soma de similaridade por tokens de cabelo, roupa e cenário de pelo menos 2 em 3. Um aviso contém `a`, `b` e `motivo`, com os IDs, nomes e perfis das duas personas.

Para `createProject` com `style: "ugc"`, passe `persona` para fixar a escolha no carrossel. Sem esse campo, vale a persona ativa do perfil. Informe `productLink` ou `productAsset` (data URL) conforme a origem. `generateSlides` com `slideId` e `regeneratePhoto: true` refaz a foto e remonta apenas o card. `export` com `tiktok: true` adiciona o texto ao ZIP. O controle da CLI também aceita `exportTo` com `tiktok: true`.

### Licença pelo terminal

```sh
carrossell licenca status
carrossell licenca ativar --email pessoa@exemplo.com --aceito
```

`licença` também funciona. `--aceito` é obrigatório para ativar. Leia os [Termos de Uso](https://carrosseisquevendem.com.br/termos) e o [Aviso de Privacidade](https://carrosseisquevendem.com.br/privacidade) antes de usar a opção. O socket expõe somente `licenseStatus {}` e `activateLicense {email, accepted, termsVersion}` para a licença. O app valida a versão dos termos com a mesma constante do modal e registra `acceptedAt` no momento da ativação. A resposta inclui apenas `activated`, `emailMasked`, `expiresAt`, `graceUntil` e `code`.

### Skills de geração

`carrossell skills` lista `name`, `description` e `applies_to`. A skill embutida **Ganchos de slideshow** também informa `id: "hooks-slideshow"` e `title`. Ela se aplica a `plan` e entra uma vez no pedido de texto de carrossel, logo depois do Swipe File. O mesmo pedido é usado por `generatePlan` e `carrossell tarefa <id> texto`. Material gratuito e apresentação seguem seus próprios prompts. Para indicar uma categoria na pauta, use por exemplo `--pauta "Pauta para infoprodutores, categoria: chamado"`.

O bloco de referência fica em português também nos pedidos em espanhol. O contrato de idioma do projeto continua valendo para a saída. A versão completa e a fonte ficam na documentação. [Fonte da skill](docs/sources/hooks-slideshow-fonte.md)

Coloque extensões `.md` em `<userData>/skills/` para usar na instalação local, ou em `resources/skills/` para distribuí-las no pacote. A extensão local tem prioridade sobre a extensão distribuída com o mesmo `name`. O identificador `hooks-slideshow` é reservado à skill embutida. O formato aceita frontmatter simples, com um valor por linha e um corpo Markdown.

```md
---
name: voz-da-marca
description: Instruções de abertura para o roteiro
applies_to: plan
---
Escreva aqui as instruções adicionais da skill.
```

O registro em `core/generation-skills.mjs` expõe `listSkills(knowledge)` e `skillContext(kind, { style, knowledge })`. O runtime lê a skill embutida de `resources/pacto/skills/` pela base de conhecimento. As extensões `plan` são anexadas ao final do pedido de texto. O registro também aceita `cover` e `stories` para integração futura.

## Instagram pelo Composio (0.6.0)

O comprador usa a própria conta do Composio (API REST v3.1, `core/composio.mjs`). `saveComposioKey` recebe `key`, testa abrindo uma sessão e guarda a chave cifrada pelo sistema (`safeStorage`) em `<userData>/integrations.json`, fora da biblioteca; ela nunca vai para o estado, a CLI ou logs. O estado traz só `composio.hasKey`. `removeComposioKey` apaga a chave.

Contas: o app lista todas as contas do Instagram ativas no projeto do Composio (`GET /connected_accounts?toolkit_slugs=instagram`), conectadas por qualquer app ou pelo painel, sem reconectar; `syncInstagram` atualiza a lista e busca o @ das novas (`INSTAGRAM_GET_USER_INFO`). Contas pessoais aparecem com `status:'personal'` e a explicação. A lista fica em `integrations.json` (fora da biblioteca) e vai no estado como `composio: {hasKey, accounts, defaults, pending}`. As ferramentas rodam por execução direta (`POST /tools/execute/{ferramenta}` com `connected_account_id`), então servem para qualquer conta do projeto. `connectInstagram` cria um link de conexão (OAuth gerenciado) com um usuário novo no Composio para cada conta, abre no navegador (só `https` de `composio.dev`, `instagram.com` ou `facebook.com`) e acompanha por até 10 minutos; `checkInstagram` confere na hora. `disconnectInstagram` recebe `id` e apaga a conexão no Composio. `openComposio` abre o painel do Composio.

Cada perfil do Carrossell marca as contas padrão com `setInstagramDefaults` (`accounts`: ids); a primeira conta conectada vira padrão se o perfil não tiver nenhuma. `instagramStatus` devolve `{hasKey, accounts, defaults, pending, scheduled}`.

`publishInstagram` recebe `id` e `accounts` (ids; sem eles, as padrão do perfil) e só aceita carrosséis de 2 a 10 cards com todas as artes prontas e legenda de até 2.200 caracteres. Converte os cards para JPEG 1080×1350 (o Instagram só aceita JPEG) e, em cada conta, envia as imagens ao armazenamento do Composio (`/files/upload/request` + `PUT`) e chama `INSTAGRAM_GET_IG_USER_CONTENT_PUBLISHING_LIMIT`, `INSTAGRAM_CREATE_CAROUSEL_CONTAINER` (`child_image_files`), `INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH` e `INSTAGRAM_GET_IG_MEDIA` (link do post). Grava `instagram.posts[]` (`accountId, username, mediaId, permalink, publishedAt, metrics, nextMetricsAt`) e `publishedAt`. Recusa repetir uma conta já postada; se uma conta falha, as outras saem e o erro diz onde foi e onde não foi. Erros do Composio e da Meta viram instruções (chave, conta pessoal, reconectar, limite diário, imagem recusada). `openPermalink` abre o post (só `instagram.com`).

A janela tem o botão "Conectar Instagram" na barra de cima (vira "Instagram" com o número de contas), que abre o modal com o passo a passo, a chave, a lista de contas, as padrão do perfil e "Conectar outra conta". O estúdio escolhe as contas de cada post.

`schedulePost` recebe `id`, `at` e `accounts` (sem eles, as padrão; `at` em ISO ou `2026-11-02 18:00`, de 2 minutos a 120 dias à frente) e registra uma tarefa do sistema (`core/schedule.mjs`): no Windows, `schtasks /Create /XML` como usuário atual, sem administrador, com "executar assim que possível" se o PC estava desligado; no Mac, um LaunchAgent em `~/Library/LaunchAgents`. A tarefa abre o app com `--segundo-plano --publicar-agendados`, que roda `publishDue` em todos os perfis e fecha. O app também roda `publishDue` sempre que abre. Atraso de até 6 horas posta sozinho; acima disso o agendamento fica `late` e espera a pessoa postar ou cancelar. `cancelSchedule` remove a tarefa. `schedule.status`: `scheduled`, `late`, `failed` (com `error`) ou `published`.

`refreshMetrics` (com `id`, ou sem para os que chegaram na data) lê, em cada conta postada, `INSTAGRAM_GET_IG_MEDIA` (curtidas, comentários, salvamentos, compartilhamentos, visualizações) e `INSTAGRAM_GET_IG_MEDIA_INSIGHTS` (alcance; o Instagram só libera para contas com 1.000 seguidores, e sem isso `insights` fica `unavailable`). Comentários e salvamentos de todas as contas, somados, preenchem `results` (com `source:'instagram'`; vendas continuam manuais), usados pelo Ritmo e pelo Replicador. O app atualiza sozinho 1, 3 e 7 dias após postar (checagem a cada 30 minutos com o app aberto). `instagramPosts` (`limit`, `account`) lista os posts recentes de uma conta.

CLI: `carrossell instagram [contas|conectar|padrao @a,@b]`, `postar <id> --confirmar [--contas @a,@b] [--em "..."]` (exige `--confirmar`, porque publica), `agendados`, `cancelar-agendamento <id>`, `metricas [<id>]` e `posts-instagram [--conta @a]`. Em desenvolvimento, `PACTO_COMPOSIO_URL=http://127.0.0.1:<porta>` aponta para um Composio falso local (`scripts/instagram-proof.mjs`) e o link de conexão não abre o navegador; o app instalado ignora essa variável.
## Analytics do Instagram

`instagramAnalytics({account, days:7|30, refresh?:boolean})` retorna totais da conta, seguidores atuais, coletas diárias do app, posts no período e avisos de disponibilidade. Cache por perfil/conta/período por 15 minutos. `refresh:true` força nova coleta. Datas dos filtros e do histórico em UTC, incluindo hoje. Alcance é o total único do período, nunca a soma de dias. Ranking limitado aos 50 posts mais recentes; métricas dos posts acumuladas desde a publicação. Ausência é `null`.

`importInstagramPost({account,mediaId,days})` salva uma referência real de legenda/métricas do relatório, sem criar projeto ou inventar cards. A importação é idempotente por conta/mídia dentro do perfil. `replicateInstagram` aceita os mesmos campos e usa a referência no Replicador. Requer conexão ChatGPT para gerar; vendas desconhecidas continuam ausentes. Interface em Marca › Conexões › Analytics e Ctrl K.
