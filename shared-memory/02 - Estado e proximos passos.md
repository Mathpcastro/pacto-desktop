# Estado e próximos passos

## Estado atual consolidado — 24/10/2026

Este checkpoint prevalece sobre as descrições históricas abaixo. Projeto documental: **Carrosseis Que Vendem**. Nome comercial do app: **Carrossell**; método: **P.A.C.T.O.** Os registros de site e curso abaixo refletem a verificação de 24/10.

- Landing do app em https://carrosseisquevendem.com.br/app/; a home `/` é outra página. `/app/` e `/mentoria/` responderam HTTP 200 na conferência desta consolidação.
- Instaladores da versão 0.2.0 no GitHub público `Mathpcastro/pacto-releases`; código privado. Windows com atualização automática; Mac sem assinatura Apple e atualização manual.
- ZIP Hostinger `Documents\Método Pacto\hostinger-cqv-app-2026-10-24.zip`: 6.758.805 bytes, inclui `public/app/index.html` e `public/mentoria/index.html`, sem `/download/`.
- Minicurso de oito vídeos criado na Cakto, mais a aula 00 em texto com instalação e três downloads. A aula de mentoria acrescentada ao final deixa o módulo do app com dez aulas.
- Módulo normal do método: oito aulas existentes mais a nova aula de mentoria, total nove. As duas novas aulas de mentoria foram salvas como **rascunho, não visíveis aos alunos**; publicação não confirmada.
- Divulgação: dez mensagens agendadas via Uazapi no grupo WhatsApp autorizado e dez pela conta pessoal no Telegram, somente no Chat Geral. Janela finita: 24/10 às 20h até 29/10 às 10h, horário de Brasília. Não há recorrência diária ilimitada configurada.
- Detalhes e provas: [[20 - Entregas e operacao 2026-10-24]], [[21 - Campanha WhatsApp e Telegram]], [[22 - Mentoria e aulas na Cakto]].

### Próximos passos atuais

- [ ] Revisar e publicar as duas aulas de mentoria na Cakto quando desejar disponibilizá-las aos alunos.
- [ ] Acompanhar a execução dos agendamentos; fila confirmada não equivale a entrega confirmada. Definir nova campanha após o último horário, se desejado.
- [ ] Testar instalação do `.dmg` em Mac físico; testes nos runners GitHub não substituem essa validação.
- [ ] Decidir sobre conta Apple Developer e assinatura/notarização para habilitar atualização automática no Mac.
- [ ] Manter o preço promocional coerente com o checkout; a campanha não cria expiração automática da oferta.

## Histórico de implementação


Checkpoint final desta implementação: 23/10/2026. Primeira versão local 0.1.0 construída e testada. Não houve publicação, push, merge ou mudança no funil original.

## Entregue no computador

- App Electron Windows: `C:\Users\Admin2\Documents\pacto-desktop\desktop\release\PACTO Setup 0.1.0.exe`.
- Executável empacotado: `desktop/release/win-unpacked/PACTO.exe`.
- Código isolado em `C:\Users\Admin2\Documents\pacto-desktop`, branch `codex/pacto-desktop`.
- MCP `pacto` conectado no Codex e no Claude Code; 23 recursos e sete ferramentas, cobrindo método, fontes, busca, briefing, contexto e revisão.
- MCP `obsidian_obsidian_vault` conectado nos dois clientes; Claude confirmou `Connected`.
- Oito transcrições do Pauta, 13 páginas oficiais do Notion, cinco arquiteturas, 34 regras e 19 prompts originais conferidos literalmente.
- Contexto organizado no vault, incluindo fontes, materiais, prompts, decisões, plano, evidências e print.

## Funcionamento validado

- 22 testes passaram: fontes, MCP stdio real, persistência, validações, revisões, cancelamento e preservação de arte.
- Interface real no Electron: onboarding, conta/menu, criar/salvar/reabrir, duplicar/excluir, temas e curso.
- Sete regressões de edição passaram: campos acompanham atualizações externas, rascunhos locais preservados, esconder painel não perde edição, duplicar pede confirmação antes de abandonar rascunho.
- Prova real pela conta ChatGPT existente: plano → imagem nativa → edição por referência → ZIP.
- Prova do Runtime com método/perfil reais: exatamente dois slides, paleta azul própria, imagens separadas, consistência visual, reabertura e ZIP.
- Prova do executável empacotado: reabriu os dois slides reais, mostrou oito aulas, exportou PNGs em **1080×1350**, sem erro de página.
- Revisão independente de código: três achados corrigidos; re-revisão sem problemas materiais restantes.

## Causa da falha de imagens — resolvida

A ferramenta estava exposta, mas o executor sandboxed de code mode estava desabilitado. `features.code_mode_host=true` permite a orquestração de `tools.image_gen__imagegen` por `functions.exec`. Shell e execução de comandos continuam desabilitados. Não foi necessário usar API externa nem fingir outra identificação de cliente.

## Próximos passos de produto

- [ ] Usuário revisar a primeira versão e testar o primeiro login com sua própria conta no app.
- [ ] Testar instalação e primeiro uso em outro Windows limpo e outras contas/planos.
- [ ] Definir identidade/ícone final do aplicativo; este build ainda usa ícone padrão do Electron.
- [ ] Assinar digitalmente o instalador antes de uma distribuição comercial mais ampla.
- [ ] Validar maior variedade de nichos, estilos, carrosséis longos e limites de conta.
- [ ] Definir a distribuição paga e acesso ao download; checkout/licenciamento não foram alterados.

## Qualidade das fontes

O Pauta devolveu as oito falas em inglês, marcadas `asr-en`, sem timestamps. Não chamar de transcrição literal portuguesa. Os materiais originais do Notion estão em português e fornecem os prompts completos. Inconsistências do material foram registradas sem alterar os originais.


## Checkpoint 23/10/2026 — onboarding guiado (Claude)

O onboarding agora repete a instalação do projeto no ChatGPT ensinada no curso, sem formulário fixo:

1. Conectar a conta ChatGPT do comprador.
2. **Contexto Oficial da Marca**: entrevista em rodadas (até 4 perguntas por vez, limite de 12) com o prompt oficial da Aula 02 (`N02-prompt-01`); o documento gerado é revisado e editado antes de aprovar.
3. **Design Kit Oficial**: preset opcional da Aula 05 (recomendado criar o próprio), referências visuais anexadas à IA e entrevista com o prompt `N05-prompt-01`, incluindo prompt-base visual e direção de ilustração.
4. **Projeto instalado**: nome da marca, checagem dos documentos e Prompt Mestre (`N08-prompt-01`) aplicado automaticamente em toda geração.

O formulário antigo continua acessível em "Prefiro preencher em formulário". O novo carrossel escolhe objetivo (alcance, comentários, salvamentos, oferta) e uma das 5 arquiteturas, ou deixa o PACTO escolher. O plano usa Prompt Mestre + Contexto + Design Kit + arquitetura escolhida; as imagens usam o Design Kit explicitamente.

Arquivos: `desktop/src/components/Onboarding.jsx` (novo), `CreateProject.jsx`, `App.jsx`, `usePacto.js`, `styles.css`, `core/runtime.mjs`, `core/store.mjs`, `core/knowledge.mjs`, `electron/preload.cjs`, `tests/runtime.test.mjs`, `scripts/onboarding-proof.mjs` (novo), `scripts/renderer-regression.mjs`.

Pendente: o usuário revisar o fluxo no próprio app; nada foi commitado nesta etapa.


## Checkpoint 23/10/2026 — fluxo do curso no editor (Claude)

Implementado e testado com dados locais. A prova real com IA ficou pendente porque a conta ChatGPT do computador atingiu o limite de uso durante o teste.

- **Pautas** (nova aba): Radar de Pautas (`N02-prompt-03`, 30 pautas e Top 10), Modelador de Referências (`N02-prompt-02`, texto e até 4 prints) e lotes do Replicador. Cada pauta abre "Criar carrossel" já preenchido, com a arquitetura sugerida.
- **Etapa 1 · Texto:** o plano agora envia as fontes oficiais literais (Aula 03, Copy Engine da Aula 04, Anatomia, Swipe File, Aula 07) junto com o Prompt Mestre. Cada card separa função, título, texto final, destaque e ilustração. Se algum card vier com instrução no lugar da copy, o app reescreve automaticamente uma vez. O quadro de texto é todo editável: linha editorial, mascote ou efeito, legenda com o CTA na primeira linha e o checklist de revisão humana da Aula 04, obrigatório para aprovar.
- **Etapa 2 · Capa:** de 2 a 3 opções com composições diferentes, para escolher, gerar outras ou voltar ao texto. A capa escolhida vira a referência de estilo do restante.
- **Etapa 3 · Carrossel:** só gera depois do texto aprovado e da capa escolhida. O prompt de imagem exige título horizontal (no máximo 3 linhas, nunca uma palavra por linha nem texto vertical) e só o texto aprovado na arte. Há também a Correção Visual Rápida (`N05-prompt-02`), com problemas para marcar, e a opção "Trocar capa".
- **CTA → DM → Oferta** (`N07-prompt-02`): palavras-chave, CTAs, material gratuito e as duas DMs; tudo vai no ZIP como `cta-e-dm.txt`.
- **Replicador de Vencedores** (`N09-prompt-01`): registra comentários, salvamentos e vendas e gera 10 ideias divididas em 3+3+2+2 na aba Pautas.
- Projetos antigos com arte são migrados como texto aprovado.

Próximo: rodar `node scripts/flow-proof.mjs <saida> <contexto.md> <design-kit.md>` quando o limite da conta renovar, para comprovar copy, capas e tipografia com geração real. Depois, refazer o instalador. Branding aguarda o usuário.


## Checkpoint 23/10/2026 — prova real do fluxo do curso (Claude)

A prova real ponta a ponta passou com a conta ChatGPT do computador: Radar com 30 pautas e Top 10, Modelador com 10 pautas, carrossel criado a partir de uma pauta do Top 10, texto com 7 cards e copy final em todos eles, 3 opções de capa, capa escolhida, 7 de 7 cards gerados, uma Correção Visual Rápida aplicada (card 2 na versão 2), kit de CTA/DM e carrossel pronto para exportar.

Ajustes feitos depois da prova:
- As 3 capas saíam quase iguais. Agora cada opção recebe um conceito diferente (cena, metáfora, tipografia dominante); a segunda rodada mostrou três composições distintas.
- A copy saía correta, mas cautelosa. Entrou uma segunda passada de "editor-chefe" (Copy Engine, Anatomia e Swipe File com critérios de tensão, micro-recompensa e corte de hesitação, sem inventar fatos) e 3 headlines alternativas de capa, trocáveis com um clique no quadro de texto.
- O destaque passou a exigir palavras inteiras, porque um destaque caiu no meio de "confirma".

Instalador `PACTO Setup 0.1.0.exe` reconstruído (SHA-256 começa com `ee8a0f886c68f31d`), smoke do executável OK. Pendente: o usuário avaliar a copy com o próprio negócio e a própria voz, e o branding.


## Checkpoint 23/10/2026 — valor do app (plano `docs/plans/2026-10-24-valor-do-app.md`, Claude)

As 5 fases foram executadas, cada uma avaliada antes de seguir. Commits locais em `Mathpcastro/pacto-desktop`.

1. **Base:** tamanho do carrossel (Automático, 4, 6, 8 ou 10 cards, servindo de modo econômico); "Marcar como publicado" e "Registrar resultado" sem usar a IA, com Replicar à parte; configurações locais; minuto estimado de cada etapa nas aulas (`resources/pacto/course-moments.json`, aproximado).
2. **Publicar:**
   - tela "Pronto para publicar", com comemoração no primeiro carrossel;
   - QR code pela rede local (link temporário com token, expira em 30 minutos);
   - "Salvar no Google Drive" (pasta `Meu Drive\PACTO`, ou outra pasta à escolha);
   - stories da Aula 08, com arte 9:16 opcional.

   Corrigido: o ZIP recusava `cta-e-dm.txt`.
3. **Hábito:**
   - o Radar roda sozinho depois do onboarding;
   - a biblioteca vazia mostra as oportunidades de conteúdo;
   - aba Ritmo, com meta da semana, carrosséis aguardando resultado, painel de vencedores acima da média e próximas ideias;
   - lembrete diário do Windows quando há resultado pendente.
4. **Curso no lugar certo:** "Ver na aula" em cada etapa. As aulas tocam **dentro do app** (iframe `youtube-nocookie`, que abre no minuto estimado e lista os trechos da aula).
5. **Robustez e nichos:**
   - todas as 5 verificações de robustez passaram;
   - corrigido: a janela não cabia em 1366×768 com 125%;
   - corrigido: sem conta, o botão mostrava "Escrevendo…";
   - 4 nichos reais de ponta a ponta;
   - filmagem real do fluxo da confeiteira.

Instalador reconstruído (SHA-256 começa com `0b075db408b5250a`).

Pendências: o usuário testar num Windows limpo e cronometrar os 30 minutos; branding; assinatura digital.


## Checkpoint 23/10/2026 — videoaula narrada (Claude)

A videoaula v1 "Como usar o PACTO" (1 min 27 s) foi **aprovada pelo usuário**.

- **Imagem:** a filmagem real do fluxo da confeiteira, com cada bloco acelerado para durar o tempo da sua fala.
- **Voz:** clone instantâneo do ElevenLabs, "Matheus Castro · PACTO", criado a partir de 2 min 30 s da Aula 1 do Curso Codex.
- **Narração:** 7 trechos gerados com o Eleven v4.
- **Onde está:** `Evidencias/videoaula/`. Para remontar: `node scripts/videoaula.mjs <filmagem> <pasta-narracao> <saida>`.
- **Chave do ElevenLabs:** fica só no `.env.local`, que está no `.gitignore`. Nunca registrar o valor dela.


## Minicurso "PACTO em 19 minutos" — 23/10/2026

Entregue: 8 aulas narradas com a voz clonada do usuário (ElevenLabs `eleven_v4`), só tela, um nicho por aula, com legenda `.srt`. Total de 19:31. Arquivos em `Evidencias/minicurso/`; roteiros em [[17 - Minicurso roteiros]]. O piloto (aula 01) foi aprovado pelo usuário; as aulas 02 a 08 ainda aguardam a revisão dele.

Para refazer uma aula: `node scripts/minicurso-tts.mjs aula-0N` (só gera as falas novas), depois `node scripts/minicurso/aula-0N.mjs` (grava) e `node scripts/minicurso-montar.mjs aula-0N` (monta). Não rode `npm run build` durante uma gravação: o Vite recarrega a página quando `dist/index.html` muda.

- [ ] Usuário revisar as aulas 02 a 08.
- [ ] Decidir onde o minicurso fica (dentro do app, área de membros ou YouTube não listado).


## Landing do app e atualização automática — 24/10/2026

**Landing `/app/`** (no site estático `Documents/Método Pacto`, ao lado da home, que não mudou): copy v2 aprovada pelo usuário ([[18 - Landing do app (copy v2)]]), vídeo da hero de 40 s e abas com capturas reais do app (exemplo Agendei). Ainda não está publicada: o usuário sobe o build (`npm run build` → `dist/`) na Hostinger.

**Vídeo da hero:** composição `PactoHeroDemo` no projeto Remotion (`src/pactoapp/`), feita a partir de `scripts/minicurso/hero.mjs` (gravação real; 2 das 3 capas geradas ao vivo). Render com `--bundle-cache=false`. Cópia em `Evidencias/landing-app/hero.mp4`.

**Atualização automática** (`electron-updater`, provedor genérico em `https://carrosseisquevendem.com.br/download/`): o app instalado procura versão nova ao abrir e a cada 4 h, baixa em segundo plano, avisa e instala ao fechar (ou no botão "Reiniciar e atualizar"). Para lançar uma versão: subir `version` no package.json → `npm run dist` → `node scripts/publicar-atualizacao.mjs` → build do site → subir na Hostinger. Os compradores que instalarem a partir de agora recebem as próximas versões sozinhos; quem tiver a 0.1.0 antiga (sem updater) precisa instalar uma vez de novo.

- [ ] Usuário enviar o print atual do perfil do Instagram (só abre logado).
- [ ] Confirmar plano ChatGPT mínimo, garantia, Mac, assinatura digital e tempo até o primeiro carrossel.
- [ ] Publicar `/app/` e a pasta `/download/` na Hostinger.


## Versão 0.2.0 para Windows e Mac — 24/10/2026

- Windows: `PACTO-Setup-0.2.0.exe` com atualização automática (provada de 0.1.0 → 0.1.1).
- Mac: builds Apple Silicon e Intel no GitHub Actions (`.github/workflows/build-mac.yml`), ambos abertos e testados nos runners (onboarding carrega, Codex do Mac no pacote). **Sem assinatura da Apple**: o comprador libera na primeira abertura e o Mac não se atualiza sozinho. Com conta Apple Developer (US$ 99/ano), basta cadastrar os segredos CSC_LINK, CSC_KEY_PASSWORD, APPLE_API_KEY, APPLE_API_KEY_ID e APPLE_API_ISSUER no repositório: o workflow passa a assinar e notarizar, e aí publicar com `--mac` sem `--mac-sem-atualizacao`.
- Site: `hostinger-cqv-app-com-downloads-2026-10-24.zip` (785 MB, com instaladores) e `hostinger-cqv-app-2026-10-24.zip` (7 MB, sem). Mesmo formato do deploy anterior (Web App Node: `server.js` + `public/`). Testado extraído com o próprio Express.
- Texto de instalação para a área de membros: [[19 - Instalacao para compradores]].

- [ ] Usuário subir o zip na Hostinger e conferir os 3 links.
- [ ] Decidir sobre a conta Apple Developer.


### Instaladores no GitHub — 24/10/2026 (substitui a pasta /download/ da Hostinger)

A pedido do usuário, os instaladores saíram da Hostinger e foram para o repositório **público** `Mathpcastro/pacto-releases` (só binários; o código segue privado em `pacto-desktop`). A atualização automática do Windows lê as releases de lá (`provider: github`). Links fixos para a área de membros, sempre na versão mais nova:
- Windows: https://github.com/Mathpcastro/pacto-releases/releases/latest/download/PACTO-Windows.exe
- Mac Apple Silicon: https://github.com/Mathpcastro/pacto-releases/releases/latest/download/PACTO-Mac-AppleSilicon.dmg
- Mac Intel: https://github.com/Mathpcastro/pacto-releases/releases/latest/download/PACTO-Mac-Intel.dmg

Para lançar versão: subir `version` → `npm run dist` → rodar o workflow "Build macOS" → baixar o artefato `pacto-mac` → `node scripts/publicar-github.mjs --mac <pasta> --mac-sem-atualizacao` (tirar a flag quando o Mac for assinado). O zip da Hostinger agora é só o site: `hostinger-cqv-app-2026-10-24.zip` (7 MB).


## Reels de tráfego pago do app — 24/10/2026

Três variações em 1080×1920 (mesmo corpo, ganchos diferentes), em `Evidencias/reels/`: **A** prova (40,9 s), **B** dor (37,0 s), **C** anti-tráfego (36,9 s). Narração na voz clonada (ElevenLabs v4, 795 caracteres; restam cerca de 15,1 mil), legenda palavra por palavra pelos timestamps, trilha instrumental gerada no Higgsfield (Sonilo Music, 42 s, 2 créditos). Áudio normalizado em −14 LUFS.

Fontes: `pacto-app/docs/reels/roteiro.json` (roteiro e variações), `pacto-app/scripts/reels-tts.mjs` (narração com tempos), composição `PactoReels-A/B/C` em `Remotion/src/pactoreels/ReelsAd.tsx`. Render: `npx remotion render PactoReels-A out/x.mp4 --bundle-cache=false`, depois `loudnorm`.

- [ ] Usuário escolher o gancho (ou testar os três) e subir no gerenciador com o botão "Saiba mais" apontando para a página /app/.

## Atualização — Carrossell, 24/10/2026

Nome comercial **Carrossell** aprovado pelo usuário, prevalecendo sobre o nome PACTO citado no histórico. Código atual verificado em `Documents\pacto-app`: versão 0.2.1, ainda identificado como PACTO. Foram criados três conceitos de marca, ainda sem escolha visual ou aplicação no app. Consulte [[23 - Carrossell branding]].
## Carrossell — branding aplicado, 24/10/2026

Direção 02 em produção: SVG/PNG/ICO/ICNS, avatares 1080×1080, bio e kit ZIP. App renomeado comercialmente; cores e tema escuro refinados. **Fontes, layout, navegação e botão de tema preservados**, para manter o tutorial gravado válido. 45 testes, 7 regressões, comparação visual e smoke empacotado aprovados; revisão visual PASS. Biblioteca e home Codex históricos preservados em pacto-desktop; appId, package name, IPC, feed e aliases mantidos.

Instalador local: release/Carrossell-Setup-0.2.1.exe (sem publicação). Não houve alteração de Instagram/site. Assets: resources/branding/; guia e validação: docs/branding/. Fonte de verdade no Obsidian: Projetos/Carrosseis Que Vendem/branding/. Código na branch codex/carrossell-branding.

## Release pública Carrossell 0.2.2 — 24/10/2026

- Código enviado à `main` privada `Mathpcastro/pacto-desktop`, commit `d46a9ac`; tag fonte `v0.2.2`.
- Release pública: https://github.com/Mathpcastro/pacto-releases/releases/tag/v0.2.2. Aliases de download Carrossell e links legados PACTO responderam HTTP 200.
- Windows: `Carrossell-Setup-0.2.2.exe`, SHA-256 `167BCD1E10CFE5706A6F15992BC42AE5C812372A8B1E996C07FA8073860DC0F4`. Testes 45/45, renderer 7/7, packaged smoke e brand proof aprovados.
- Mac: DMGs Apple Silicon e Intel construídos e aprovados no workflow [40148827680](https://github.com/Mathpcastro/pacto-desktop/actions/runs/40148827680), incluindo smoke no app empacotado.
- Instaladores sem assinatura de código. Mac sem notarização Apple e com atualização manual; instalação em Mac físico ainda pendente. Windows pode exibir aviso SmartScreen.

## 26/10/2026 — Preferências da interface (implementação local)

No checkout `C:\Users\Admin2\Documents\pacto-app`, branch `codex/carrossell-branding`, foi criado `src/components/PreferencesDialog.jsx` e atualizado `src/App.jsx`/`src/styles.css`. Opções: claro/escuro, paletas Carrossell/Oceano/Floresta/Ametista, fonte original/Arial/Verdana/Georgia e escala de interface 100%–125% em passos de 5%. As escolhas persistem em `carrossell-preferences`, mantendo a chave histórica `pacto-theme`; os PNGs exportados não mudam. O padrão do tutorial permanece.

Build/testes não executados nesta etapa; sem commit, push ou release. Antes de publicar: verificar as paletas em ambos os modos, escala em janela pequena, persistência após reinício e exportação inalterada.


## Checkpoint — 30/10/2026, Analytics

Painel implementado e aplicado na cópia indicada pelo usuário `pacto-app/release/teste/win-unpacked/Carrossell.exe`, deixada aberta em Marca › Conexões › Analytics. Conta @omatheusdaia conectada, leituras reais de 7/30 dias e insights dos posts conferidos. 105 testes, 46 verificações de fases, 8 regressões, prova específica, build e smoke empacotado passaram. Sem release pública ou postagem. Histórico de seguidores começa na primeira coleta. Detalhes, limites e contexto do cofre em [[31 - Analytics do Instagram]].


## Release 0.6.0 publicada — 30/10/2026

[[32 - Release Carrossell 0.6.0]]: Latest com Windows e os dois Macs, workflow aprovado, links HTTP 200, feed Windows 0.6.0 e zero artefatos de Actions. Usuário confirmou publicação real de carrossel pelo app. Agendamento real e Mac físico seguem sem confirmação.


## 02/11/2026 — Stories só de texto, copy anti-IA e roteiro (Claude)

Stories preto/branco no fim do fluxo e voz anti-IA na copy implementados localmente, sem commit. 109/109 testes, build e prova real no Electron (`scripts/stories-proof.mjs`). Automação de comentários, anúncios e login com Claude/Gemini ficaram em pesquisa e plano. Ver [[33 - Roteiro comentarios stories anuncios e provedores]].

- [ ] Usuário avaliar os stories e a copy nova com a própria marca.
- [ ] Testar uma conta ManyChat real antes de integrar a automação de comentários.
- [ ] Decidir formatos e escopo da primeira versão de anúncios.

- [ ] Modo agente (Claude/Gemini pela CLI, sem ChatGPT) implementado localmente: testar com o Gemini CLI instalado e lançar numa versão. Ver [[33 - Roteiro comentarios stories anuncios e provedores]].


## Release 0.7.0 publicada — 02/11/2026

[[34 - Release Carrossell 0.7.0]]: Latest com Windows e os dois Macs, zero artefatos de Actions, links HTTP 200 e feed Windows 0.7.0. Stories de texto, copy anti-IA e modo agente (Claude/Gemini pela CLI) incluídos.

## 02/11/2026 — Piloto automático Telegram: preparação isolada

Usuário autorizou o fluxo de criação e aprovação via Telegram e pediu worktree separada, aguardando biblioteca/seletor (Kimi) e correção do anexo de logotipo (Claude). Worktree criada em `C:\Users\Admin2\Documents\pacto-app-telegram`, branch `codex/telegram-autopilot`, base estável `v0.7.1` / `2987ba7`. Não iniciar a implementação até concluir e consolidar ambas as frentes; não alterar as worktrees dos agentes.

Especificação: `docs/superpowers/specs/2026-11-02-telegram-autopilot-design.md`. Preparação validada: instalação limpa de dependências, 113/113 testes e build aprovados. Após fetch, `origin/main` contém `6a61ce8` (logo), mas ainda não contém a branch `feat/carrossell-reference-templates`, HEAD observado `24c84d0`. Confirmar novamente ao retomar.

Nenhuma funcionalidade Telegram implementada, token cadastrado, conta alterada, mensagem enviada, geração real ou publicação feita. Nenhum push/merge/release desta frente. O piloto exige manutenção do processo em segundo plano, pairing privado e decisões persistidas para evitar cliques repetidos e publicação duplicada; esses pontos estão detalhados na especificação.

Usuário acrescentou a revisão obrigatória das versões 0.7.2 e 0.7.3 após o término das frentes paralelas: conferir diffs, integração, regressões e prontidão da release antes de avançar. Checklist detalhado na especificação do piloto Telegram. Sem autorização adicional de publicação.

## 02/11/2026 — Piloto Telegram implementado localmente sobre 0.7.3

Autorização para retomar recebida após conclusão das duas frentes. Worktree `C:\Users\Admin2\Documents\pacto-app-telegram`, branch `codex/telegram-autopilot`, atualizada para tag `v0.7.3` / `9614d92`. Revisadas as mudanças efetivas .1→.2→.3 e o workflow 41554166253 (sucesso; release 0.7.3 pública). Adaptado ao tamanho 2–10 para publicar, `Runtime.job.done`, assets/logotipo e invalidação de revisões após alterações no Estúdio.

Cliente Telegram, cofre seguro, pairing, config por perfil, motor, agenda própria, segundo plano e interface integrados. Aprovação explícita antes de publicar/agendar; estados incertos não são repetidos automaticamente. Guards para cold start, exclusão de projeto/perfil, callbacks antigos e rascunhos editados após agendamento. Detalhes na especificação e plano em `docs/superpowers/`.

Validação final: 162 testes; build; renderer9; fases46; referências16; pilotoUI14, todos aprovados. Tarefa real Windows / PT0S executou programa marcador e foi removida. Telegram real autorizado confirmou vínculo, álbum de 2 cards manuais renderizados, legenda e callback Descartar; sem geração por IA ou Instagram real. Token removido do cofre temporário e fora de fontes/relatórios. Revisão independente sem P1/P2 remanescentes nos pontos revisados.

Sem push, merge, instalador novo ou release do piloto. Permanece nesta worktree. Faltam validações externas do fluxo completo com conta ChatGPT e postagem real e Mac físico; falhas de publicação ficam incertas para conferência manual porque o Social existente não classifica com segurança uma resposta perdida.


## 03/11/2026 — Conversa Telegram e descoberta no app

Implementação local sobre 0.7.3, branch codex/telegram-autopilot. Ver [[36 - Conversa Telegram e descoberta]] para interface aprovada, ações do bot, limites e validações: 206 testes, build, fases46, renderer9, referências16, descoberta15 e pilotoUI14. Sem push, merge, versão nova ou release. Novo fluxo de conversa validado com fixtures; validação externa de ChatGPT/Telegram/Instagram real e Mac físico permanece pendente.


## 03/11/2026 — Release 0.7.4 publicada

Ver [[37 - Release Carrossell 0.7.4]]. Latest com Windows e dois Macs, workflow 41677450506 aprovado, zero artefatos de Actions, feed 0.7.4 e checksum do instalador publico conferidos. Inclui piloto/conversa Telegram, descoberta de recursos e home simplificada. A autorizacao de publicacao foi recebida nesta etapa.


## 03/11/2026 — Novo layout do piloto implementado

[[38 - Hierarquia do piloto automatico]]: branch codex/pilot-layout, 209 testes e build passaram, provas de interface e revisão independente PASS. Versão continua 0.7.4; esta mudança ainda não foi publicada.


## 03/11/2026 — Release 0.7.5 publicada

[[39 - Release Carrossell 0.7.5]]: novo layout do piloto publicado como Latest, Windows e os dois Macs disponíveis, zero artefatos de Actions. Feed e download completo Windows verificados, SHA-512 confere.


## 04/11/2026 — Release 0.7.6 publicada

[[40 - Release Carrossell 0.7.6]]: copy falada com fio condutor por arquitetura e reagendamento (app, Telegram /agendados e CLI). Latest com Windows e os dois Macs, zero artefatos de Actions. Feed e download completo do Windows verificados.


## 04/11/2026 — Release 0.7.7 publicada

[[41 - Release Carrossell 0.7.7]]: ícone na bandeja do Windows com Abrir, Procurar atualização e Sair. A busca de atualização passou a rodar a cada hora e ao reabrir a janela. Latest com Windows e os dois Macs, zero artefatos de Actions, SHA-512 do instalador público confere.


## 04/11/2026 — Release 0.7.8 publicada

[[42 - Release Carrossell 0.7.8]]: rotina com até 6 horários por dia, lista dos próximos horários com Pular e Voltar a preparar, e um carrossel esperando aprovação por horário. Latest com Windows e os dois Macs, zero artefatos de Actions, SHA-512 do instalador público confere.


## 04/11/2026 — Release 0.7.9 publicada

[[43 - Release Carrossell 0.7.9]]: cada horário da rotina tem o seu tipo de carrossel (arquitetura, estilo e cards). Latest com Windows e os dois Macs, zero artefatos de Actions, SHA-512 do instalador público confere. O perfil Carrossell foi refocado em quem tem SaaS e não vende.


## 05/11/2026 — Release 0.8.0 publicada

[[45 - Release Carrossell 0.8.0]]: o Contexto da Marca passa a ser montado como plano de venda (skills de marketing do Corey). Perfis antigos ganharam o botão Melhorar estratégia. O app também lê avisos do dono ([[44 - Avisos para usuarios]]), e o primeiro aviso já está publicado. Latest com Windows e os dois Macs, zero artefatos, SHA-512 confere.


## 05/11/2026 — Release 0.9.0 publicada

[[47 - Release Carrossell 0.9.0]]: a rotina pode publicar sem revisão, e as prévias podem ser aprovadas no app (Publicar agora ou Agendar). Latest verificada pela skill, SHA-512 confere. O aviso v0-9-0 está publicado.

## 05/11/2026 — Referências visuais da marca (local)

Implementação isolada em pacto-app-visual-refs, branch feat/brand-visual-references. Marca › Referências visuais aceita upload/colar/remover; contexto e referências acompanham novas artes e fotos. 227 testes e build passaram; prova Electron e uma capa nativa de trading conferidas. Sem release. Evidências e limpeza temporária pendente em [[48 - Referencias visuais da marca]].

## 05/11/2026 — Release 0.10.0 publicada

[[49 - Release Carrossell 0.10.0]]: Referências visuais por marca com upload e colar; novas artes ligadas ao contexto de cada negócio. 227 testes, build e prova Electron passaram; uma capa nativa de trading conferida. Latest, feed, downloads e SHA-512 verificados pela skill do Obsidian. Aviso v0-10-0 publicado.

## 06/11/2026 — Telas atuais e CutRoom como upsell (Claude)

[[50 - Telas atuais 2026-11-06]]: 7 capturas reais da janela da 0.10.0 (início, conteúdos, estúdio texto/cards/publicar, marca, piloto automático), substituindo as telas PACTO antigas. [[51 - CutRoom como upsell]]: o CutRoom (R$ 97, página de obrigado) importa a marca pela CLI do Carrossell, usa os cards exportados como prova nos vídeos e vai postar Reels pelo Composio — o Carrossell hoje só posta carrossel de imagens. Nenhuma mudança no código do Carrossell.

## 07/11/2026 — Release 0.10.1 publicada

[[53 - Release Carrossell 0.10.1]]: imagem do card tenta até 3 vezes (ERR_FAILED do cliente Fabio); pedido que falha tenta de novo em 2 minutos; um erro não pausa mais a rotina. 229 testes, build e prova Electron passaram. Latest, feed, downloads e SHA-512 verificados. Aviso importante v0-10-1 publicado.


## 11/11/2026 — Radar na navegação

[[54 - Radar na navegacao]] implementado sobre a 0.10.1, com executável Windows testado em perfil isolado. A alteração está na branch local `codex/radar-navegacao`.


## 11/11/2026 — Release 1.10.2 publicada

[[55 - Release Carrossell 1.10.2]] registra o Radar no menu principal e a publicação para Windows, Mac Apple Silicon e Mac Intel. Links, feed, SHA-512, zero artefatos de Actions e aviso público conferidos.

## 12/11/2026 — Release 1.11.0 publicada

[[56 - Release Carrossell 1.11.0]]: espanhol no menu da conta, com pt-BR de padrão.
Latest, feed, SHA-512 e os cinco jobs do workflow 43147136017 conferidos.
O aviso público não foi gravado: a escrita no pacto-releases respondeu 403.


## 12/11/2026 — Release 1.11.1 publicada

[[57 - Release Carrossell 1.11.1]]: no Mac, abrir o app com o piloto rodando em segundo plano agora mostra a janela; build do Mac com assinatura ad-hoc válida. 234 testes, build e prova em Macs do GitHub Actions (macOS 15 e 26). Latest, feed, downloads e SHA-512 verificados. Aviso v1-11-1 publicado.

## 12/11/2026 — Release 1.12.0 publicada

[[58 - Release Carrossell 1.12.0]]: instalador .deb para Ubuntu, sem mudança na interface de Windows e Mac.
Latest com 14 arquivos, feed Linux, SHA-512 e os seis jobs do workflow 43256976349 conferidos.
O aviso não foi publicado: quem já usa Windows ou Mac não vê diferença.

## 12/11/2026 — Releases 1.13.0 e 1.13.1

[[59 - Release Carrossell 1.13.1]]: a 1.13.0 (Cursor agent) trouxe a ativação da licença por e-mail e a release com 17 arquivos. A 1.13.1 corrige a ativação, que agora sempre mostra o resultado (aceite faltando, e-mail sem compra, ativada), e refaz a janela no visual do app. 246 testes, build e prova Electron passaram. Latest, feeds e SHA-512 verificados. Aviso v1-13-1 publicado. Não testado com o e-mail de um comprador real.
