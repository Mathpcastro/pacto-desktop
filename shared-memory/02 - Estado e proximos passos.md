# Estado e próximos passos

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
