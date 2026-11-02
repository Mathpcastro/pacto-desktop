# Validações e evidências

Checkpoint: 23/10/2026. Resultados abaixo foram observados nesta implementação; as provas de inferência usam uma conta existente e não representam um benchmark de todos os planos/estilos.

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Baseline original | 27 testes passaram | Antes de implementar o novo app |
| Novo pacote | 22 testes passaram | `npm test` em `desktop/` |
| MCP real | Inicialização,23 recursos,7 ferramentas,leitura e erros corretos | Cliente SDK stdio em `tests/mcp.test.mjs` |
| Fontes | 8 transcrições,13 páginas,19 prompts literalmente idênticos às fontes | Manifests + asserção de igualdade |
| Renderer | Build passou; avaliação visual PASS | Build Vite + revisão independente |
| Interface Electron | Fluxo básico e tamanho mínimo1000×720 passaram | Smoke real, sem simular API |
| Regressões editor | 7 verificações passaram | `node scripts/renderer-regression.mjs` |
| Conta Codex | Conta existente conectou; modelos disponíveis | Prova privada temporária, autenticação removida depois |
| Imagem nativa/revisão | PNG real + edição por referência + ZIP | `.cache/runtime-proof/report.json`, nativeGeneration=true |
| Runtime completo | 2 slides reais,1122×1402 cada,ZIP e reabertura | `.cache/app-proof/report.json`, completed=true |
| Exportação canônica | PNG1080×1350; proporção errada recusada; originais preservados | Prova real de nativeImage |
| Executável empacotado | Reabertura de arte real + exportação1080×1350,zero page errors | `.cache/packaged-proof/report.json`, completed=true |
| Código | 3 achados corrigidos; re-revisão sem pendências materiais | Cancelamento e rascunhos cobertos por regressões |
| Obsidian e Claude | MCP conectado, notas e anexos gravados/lidos | `claude mcp get` e HTTP MCP |
| Print | Cópia idêntica | SHA-256 em [[04 - Biblioteca oficial]] |
| Instalador | NSIS gerado; assinatura `NotSigned` | Hash e caminho em [[15 - Entrega e provas reais]] |

## Limites da validação

Primeiro login de um comprador novo, instalação em outro Windows limpo e outros planos ainda precisam de teste. A prova de inferência foi feita com autenticação existente copiada apenas para pasta temporária privada e removida ao final, sem alterar o login global. O executável empacotado foi executado e testado; não foi feita instalação silenciosa no sistema do usuário.

Nada foi publicado no Instagram, enviado por DM, implantado na internet ou enviado ao Git remoto.


## Onboarding guiado — 23/10/2026

| Verificação | Resultado | Evidência |
|---|---|---|
| Testes | 25 passaram (3 novos: entrevista de marca, Design Kit + arquitetura no plano, estado após entrevista) | `npm test` |
| Regressões do editor | 7 de 7 | `node scripts/renderer-regression.mjs` |
| Prova real no Electron | Entrevista de marca (3 respostas → documento de 4,4 mil caracteres), Design Kit com preset Ilustrado (2 respostas → 8,1 mil caracteres), perfil salvo, carrossel Lista Útil/Salvamentos com 9 cards e capa ilustrada gerada nativamente | `Evidencias/onboarding/` (telas, documentos, plano, log) |
| Executável empacotado | Instalador reconstruído; smoke: 8 aulas, PNG 1080×1350, zero erros de página | `node scripts/packaged-smoke.mjs` |

Negócio fictício de teste (Ateliê Barro Vivo). Login existente copiado só para pasta temporária, removida ao final. Bug encontrado e corrigido durante a prova: a resposta da entrevista era calculada antes de liberar o job e deixava a tela presa em "preparando"; agora há teste de regressão.


## Fluxo do curso no editor — 23/10/2026

| Verificação | Resultado | Evidência |
|---|---|---|
| Testes | 30 passaram (5 novos em `tests/flow.test.mjs`: travas texto → capa → restante, correção visual, fontes oficiais e reescrita de card-instrução, Radar/Modelador/Replicador/CTA no ZIP, migração) | `npm test` |
| Regressões do editor | 7 de 7, agora com o texto aprovado antes do painel de slide | `node scripts/renderer-regression.mjs` |
| Telas no Electron com dados locais (sem IA) | Pautas, criação pré-preenchida, quadro de texto (aprovar desabilitado até marcar o checklist), seletor de capas, carrossel e diálogo de CTA | `node scripts/flow-screens.mjs` |
| Prova real com IA | **Não concluída:** o Radar recebeu "limite da conta atingido" | Repetir `scripts/flow-proof.mjs` |

Os dados das telas são fixtures escritas à mão. A arte usada nelas é a capa real da prova anterior, ainda com o título empilhado; ela não comprova a nova tipografia.


## Prova real do fluxo do curso — 23/10/2026

| Etapa | Resultado real |
|---|---|
| Radar | 30 pautas, 10 marcadas como Top 10 |
| Modelador | 10 pautas e análise do motivo da referência |
| Texto | 7 cards de copy final, sem nenhum card-instrução; linha editorial e conceito visual sugeridos |
| Capa | 3 opções geradas; na segunda rodada, com três composições distintas |
| Carrossel | 7 de 7 cards; títulos horizontais em 2–3 linhas, acentos corretos |
| Correção visual | card 2 corrigido (versão 2) |
| CTA/DM | palavras-chave ARGILA, LISTA, GUIA… e duas DMs |
| Testes | 30 passaram; 7 regressões do editor; smoke do executável empacotado |

Evidências: `Evidencias/fluxo-curso-real/` (cards, capas, texto, radar, modelador, CTA e log) e a subpasta `segunda-rodada/`, com a revisão de editor-chefe e as capas variadas.

Limite observado: o negócio fictício de teste tem um contexto cheio de ressalvas de segurança, o que deixa a copy prudente. A avaliação final de voz precisa ser feita com um negócio real.


## Valor do app — 23/10/2026

| Verificação | Resultado | Evidência |
|---|---|---|
| Testes | 43 passaram (novos: valor, publicação/compartilhamento/Drive/stories, ritmo) | `npm test` |
| Regressões do editor | 7 de 7 | `node scripts/renderer-regression.mjs` |
| Telas | Publicar com comemoração; QR com link real na rede (página e PNG 200, link para ao fechar); Drive sem pasta; stories; Ritmo; biblioteca com oportunidades | `scripts/flow-screens.mjs`, `Evidencias/telas-valor/` |
| Player das aulas | Toca no modo de desenvolvimento e no executável (`file://`), sem erro 153; "Ver na aula" abre em `start=334` | `scripts/player-check.mjs [--packaged]` |
| Robustez | Sem login; app fechado no meio da geração (rascunho recuperado); Codex encerrado (reconecta com o login salvo); tela 1093×580 a 125% sem corte; lembrete do Windows | `scripts/robustness-proof.mjs`, `Evidencias/robustez/` |
| 4 nichos reais | Advogada (Editorial/Tutorial), SaaS (Clean SaaS/Framework), confeiteira (Ilustrado/História → Método → Oferta), moda fitness (Creator/Lista Útil): onboarding, Radar 30/10, 4 cards, 1 capa, CTA/DM, stories, publicar | `scripts/niche-proof.mjs`, `Evidencias/nichos/` (capturas, cards, textos, vídeo das etapas e filmagem real da confeiteira) |
| Executável empacotado | Smoke OK: 8 aulas, PNG 1080×1350, zero erros de página | `scripts/packaged-smoke.mjs` (precisa de `.cache/app-proof`, gerado por `scripts/app-proof.mjs`) |

Limites:
- A gravação de vídeo do Playwright trava o Electron, e a captura GDI do Windows grava preto. A filmagem real usa quadros do `capturePage`, a cerca de 4 fps e sem cursor.
- Os minutos das aulas são estimados.
- O compartilhamento pelo celular foi testado só pelo próprio computador, não num celular real.


## Videoaula — 23/10/2026

A pronúncia foi conferida transcrevendo dois trechos com o ElevenLabs (o reconhecimento de fala Scribe): o texto voltou igual ao roteiro. A sincronia foi conferida em 8 quadros do vídeo. O usuário aprovou a voz e o ritmo. Limites: o vídeo foi gravado a cerca de 4 quadros por segundo, sem cursor; serve de base para a edição em motion.


## Minicurso — 23/10/2026

| Verificação | Resultado |
|---|---|
| Aulas | 01 2:14 · 02 3:11 · 03 2:08 · 04 3:00 · 05 1:53 · 06 2:27 · 07 3:16 · 08 1:20 = 19:31 |
| Gravação | App real no Electron, cursor desenhado, cerca de 10 quadros por segundo pelo `capturePage`. As gerações (CTA, stories, Radar, Replicador, entrevista) usam a conta ChatGPT de verdade |
| Conferência | Folha de quadros de cada aula revisada: sincronia, molduras, cartelas, nenhum corte de tela |
| Testes depois das correções | 43 testes, 7 de 7 regressões do editor, build ok |

Bugs reais do app encontrados na gravação e corrigidos:
- "Copiar legenda" e os outros botões de copiar não faziam nada: o controle de permissões negava a escrita na área de transferência até para o próprio app. Agora `clipboard-sanitized-write` é liberado só para a página do app; a aula 06 confirma que a legenda chega à área de transferência.
- Na tela Pautas, o link da aula ficava dentro do rótulo do campo e confundia leitores de tela. O link saiu do rótulo.

Limites: os minutos citados das aulas originais são estimados. Os números de resultado da aula 06 (48/156/3 e outros) são de exemplo, para mostrar o painel.


## Landing do app e atualização automática — 24/10/2026

| Verificação | Resultado |
|---|---|
| Página `/app/` | Desktop (1440) e celular (375) sem rolagem lateral; vídeo carrega e toca em loop; rotas `/`, `/app`, `/app/`, `/mentoria/` e o vídeo (com Range) respondem; build do site gera `dist/app` |
| Vídeo da hero | 40,5 s, 4 MB, H.264; capturas reais do app, marcado "acelerado · esperas cortadas" |
| Atualização automática | `scripts/update-proof.mjs`: instalador 0.1.1 servido localmente; app empacotado 0.1.0 encontrou, baixou e mostrou "Reiniciar e atualizar" em 16 s. `app-update.yml` do instalador aponta para `carrosseisquevendem.com.br/download/`. O teste não instala nada e apaga o cache |
| App | 43 testes, 7 de 7 regressões do editor |

Limite: a instalação em si (o NSIS trocando a versão) não foi executada no teste, para não mexer no PACTO instalado do usuário.


## Versão 0.2.0 Windows + Mac — 24/10/2026

| Verificação | Resultado |
|---|---|
| Mac Apple Silicon (macos-15) | Build, 43 testes, app empacotado abre no onboarding, Codex `aarch64-apple-darwin` presente; assinatura ad-hoc |
| Mac Intel (macos-15-intel) | Build, testes, app abre, Codex `x86_64-apple-darwin` presente; sem assinatura |
| Windows | `PACTO-Setup-0.2.0.exe`, `app-update.yml` aponta para `/download/` |
| Zip da Hostinger | Extraído e rodado com o `server.js`: `/`, `/app` (301 → `/app/`), `/mentoria/`, vídeo e os 3 instaladores respondem 206 com Range |

Limite: ninguém instalou o .dmg num Mac real; o teste roda o app já empacotado nos Macs do GitHub.

### Instaladores no GitHub (pacto-releases) — 24/10/2026
- Release `v0.2.0` pública com 8 arquivos; os 3 links fixos (`releases/latest/download/PACTO-Windows.exe`, `PACTO-Mac-AppleSilicon.dmg`, `PACTO-Mac-Intel.dmg`) respondem sem login, com download em partes.
- App Windows 0.2.0 empacotado consultou o feed do GitHub pelo próprio electron-updater: `{"remote":"0.2.0","available":false}`, sem erro. A troca de versão (download + aviso) já estava provada com `scripts/update-proof.mjs`.
- Mac refeito no Actions com o novo `app-update.yml`: os dois apps abrem, Codex presente.

### Reels do app — 24/10/2026
| Verificação | Resultado |
|---|---|
| Formato | 1080×1920, 30 fps, H.264; A 40,9 s · B 37,0 s · C 36,9 s |
| Áudio | −14,0 a −14,2 LUFS, pico −1,2 a −1,6 dBTP (medido com `loudnorm` após a normalização) |
| Conferência | Folha de 16 quadros por variação: gancho, leque de carrosséis reais, print do Insights, dor, 4 cortes do app nas palavras certas, oferta, CTA. Um quadro suspeito (legenda "duplicada") renderizado isolado: era artefato da amostragem |
Limites: trechos do app acelerados (avisado na cartela final); o vídeo não foi testado dentro do gerenciador de anúncios do Meta.

## 24/10/2026 — Site, área de membros e campanhas

- `/app/` e `/mentoria/`: HTTP 200 na consolidação; ZIP Hostinger com as duas rotas e sem `/download/`.
- Cakto: oito vídeos no módulo do app, aula inicial de instalação e duas aulas de mentoria em texto; estas duas reabertas e conferidas como rascunho, sem vídeo e com link da aplicação. Contagens finais: dez aulas app, nove método.
- Uazapi: dez campanhas com grupo, texto, horário e contagem conferidos via API; estado `scheduled` no arquivo de verificação.
- Telegram: dez mensagens somente Chat Geral (tópico 1), texto/preço/link/horário/grupo conferidos; persistência confirmada após recarregar no Web A.
- Evidências em `Evidencias/operacao-2026-10-24/`. Agendar não equivale a confirmar a entrega; publicação das aulas de mentoria e instalação em Mac físico não foram comprovadas.
- A renomeação preservou todos os arquivos existentes; caminhos de sincronização e referências foram ajustados. Ver [[20 - Entregas e operacao 2026-10-24]].


## 30/10/2026 — Analytics com conta real

105/105 testes, 46/46 fases, 8/8 regressões, build, prova específica Electron e smoke Windows empacotado passaram. Leitura real de 7 dias: alcance 193.503, visitas 1.281, contas engajadas 15.271, 22 posts; 30 dias: alcance 1.003.448, visitas 6.121, contas engajadas 93.482, 50 posts (limite explícito). 18.068 seguidores na coleta. Sem testes de postagem/agendamento real ou Mac físico. Ver [[31 - Analytics do Instagram]].


## Release 0.6.0 publicada — 30/10/2026

[[32 - Release Carrossell 0.6.0]]: Latest com Windows e os dois Macs, workflow aprovado, links HTTP 200, feed Windows 0.6.0 e zero artefatos de Actions. Usuário confirmou publicação real de carrossel pelo app. Agendamento real e Mac físico seguem sem confirmação.


## 02/11/2026 — Stories e copy anti-IA

109/109 testes (4 novos: sinais de IA, template de story, stories preto/branco com edição e arte IA preservada, correção de voz no texto). `npm run build` ok. Prova real Electron com a conta ChatGPT: 5 cards no estilo Texto, kit de CTA, 6 stories gerados e renderizados em 1080×1920 nos dois fundos, telas Enviar e Stories capturadas em `.cache/stories-proof/`. Sem empacotado, sem postagem. Ver [[33 - Roteiro comentarios stories anuncios e provedores]].
