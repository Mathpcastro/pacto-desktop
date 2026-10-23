# Plano — fazer os R$47 valerem a pena

## Contexto

O fluxo do curso já funciona no app: onboarding guiado, Pautas, texto aprovado, capas e restante do carrossel. Faltam o fim da experiência e o hábito de voltar:
- o carrossel termina com um aviso discreto;
- a biblioteca abre vazia;
- a postagem depende de um ZIP no PC;
- não há rotina nem histórico de resultados;
- o curso fica num menu solto.

O usuário aprovou estes itens e também pediu 4 testes reais de nicho, para servirem de material a um vídeo em motion, e testes de robustez. O trabalho acontece em `C:\Users\Admin2\Documents\pacto-app` (repositório `Mathpcastro/pacto-desktop`).

Decisões já tomadas:
- **Google Drive:** salvar na pasta do Google Drive para computador.
- **Curso:** link para o minuto **estimado** de cada aula, marcado como aproximado.
- **Testes de nicho:** 4 cards por carrossel, com 1 capa.
- **Stories:** o roteiro em texto sempre; a arte 9:16 só quando a pessoa pedir.

## Fase 1 — Base

- **Quantidade de cards.** Criar `cardCount` opcional no projeto (entre 4 e 10; vazio deixa o PACTO decidir). Entra em `store.createProject`, no `saveProject` e em `Runtime.context()`/`copyRules()` como "exatamente N cards". Aparece em `CreateProject.jsx` como "Tamanho: Automático, 4, 6, 8, 10". Também serve de modo econômico.
- **Resultado separado da replicação.** Hoje o `ResultsDialog` sempre chama `replicate`. Passam a existir:
  - a ação `markPublished` (grava `publishedAt`);
  - a ação `recordResults` (grava `results` com comentários, salvamentos, vendas e data, sem usar a IA).

  O `replicate` continua opcional, a partir do resultado registrado.
- **Configurações locais.** Novo `data.settings` no `core/store.mjs`, com `weeklyGoal`, `driveFolder` e `firstCompletedAt`, e as ações `saveSettings` e `bootstrap`.
- **Minutos das aulas.** O script `scripts/course-moments.mjs` gera `resources/pacto/course-moments.json`. Ele procura um trecho-âncora na transcrição de cada aula e estima o minuto pela fórmula `posição do trecho ÷ tamanho do texto × duração` (as durações estão em `manifest.json`). Cada etapa recebe aula, segundos, rótulo e um resumo de 2 linhas.

  Mapeamento: contexto da marca → Aula 02; radar e modelador → Aula 02; arquiteturas → 03; copy → 04; design kit, capa e correção → 05/06; CTA/DM → 07; stories, replicador e desafio → 08. O `loadKnowledge` (`core/knowledge.mjs`) carrega o arquivo, e o diálogo `openCourse` do `electron/main.mjs` passa a aceitar `&t=<segundos>`, validado como número.

## Fase 2 — Depois de pronto: publicar

- **Tela "Pronto para publicar"** (`PublishScreen`, em `src/components/Flow.jsx`). Aparece quando todos os cards têm arte (nova etapa `done` no `projectStage`). Mostra:
  - a grade com todos os cards;
  - a legenda com botão de copiar;
  - um resumo do CTA e da DM;
  - os botões **Enviar para o celular**, **Salvar no Google Drive**, **Exportar ZIP**, **Gerar stories** e **Marcar como publicado**.

  Na primeira vez (`settings.firstCompletedAt` vazio) vem a comemoração: "Seu primeiro Carrossel que Vende está pronto", com uma animação curta dos cards entrando e "Publique hoje". Nos carrosséis seguintes, a mesma tela sem a comemoração.
- **Celular pela rede local** (`core/share.mjs`). Um servidor HTTP mínimo, só de leitura, sobe no IPv4 da rede local, com porta aleatória e um token aleatório de 32 bytes no caminho. Ele serve uma página para celular com:
  - os PNGs em 1080×1350, já normalizados por `normalizeExport`;
  - "Salvar no celular" usando `navigator.share` com arquivos, com download individual como alternativa;
  - a legenda com botão de copiar.

  O link expira em 30 minutos ou quando o diálogo é fechado. O renderer mostra o QR code, gerado pela dependência `qrcode` (MIT) no processo principal, e avisa que o celular precisa estar no mesmo Wi-Fi e que o Windows pode pedir permissão de rede. Novas ações: `shareToPhone` e `stopShare`.
- **Google Drive.** A ação `saveToDrive` procura a pasta `Meu Drive` ou `My Drive` nas letras de unidade do Google Drive para computador (e em `%USERPROFILE%\Google Drive`). Os arquivos vão para `PACTO/<título>/` (`01.png…`, `legenda.txt`, `cta-e-dm.txt`, `stories.txt`), reaproveitando a montagem do `exportZip` (`core/store.mjs`). Se a pasta não for encontrada, o diálogo explica como instalar o Google Drive para computador e deixa escolher uma pasta, que fica salva em `settings.driveFolder`.
- **Stories da Aula 08.** A ação `stories` usa a transcrição da Aula 08, a Aula 07 e o Contexto da Marca para gerar uma sequência alternando caixa de perguntas e oferta. Cada story tem tipo, texto, sticker, CTA e direção visual, e tudo fica em `project.stories`. A ação `generateStoryArt` gera a arte de um story em 9:16 (1024×1792), com o mesmo Design Kit e as mesmas regras de tipografia (`typography()`). O ZIP e a pasta do Drive passam a incluir `stories.txt` e as artes que existirem.

## Fase 3 — Hábito e acervo

- **Biblioteca com oportunidades.** No fim do onboarding (`Onboarding.finish`, com a conta conectada), o Radar roda sozinho. A biblioteca vazia vira "Suas oportunidades de conteúdo", com o Top 10 do último Radar e o botão "Criar carrossel". Se ainda não houver Radar, aparece "Gerar minhas oportunidades". Com projetos na biblioteca, uma faixa mostra as 3 próximas oportunidades. O componente `IdeaCard` sai de `Ideas.jsx` para ser reaproveitado.
- **Aba Ritmo** (`src/components/Rhythm.jsx`):
  - **Meta da semana:** a pessoa escolhe quantos carrosséis por semana; o curso sugere de 3 a 4 por dia na fase de descoberta. A barra mostra os publicados na semana.
  - **Aguardando resultado:** carrosséis publicados há mais de 48 horas sem resultado, com o botão "Registrar".
  - **Painel dos vencedores:** carrosséis com resultado, ordenados por salvamentos, comentários e vendas. Ganha o selo "acima da sua média" quem supera a média da própria pessoa, com o botão "Replicar".
  - **Próximo passo:** as ideias do Replicador, ou do Radar quando não houver vencedor.
- **Lembrete.** Quando o app abre e há resultado pendente, aparece um banner no app e uma notificação do Windows (`Notification` do Electron). Não roda nada em segundo plano com o app fechado.

## Fase 4 — Curso no lugar certo

- **Link para a aula em cada etapa.** O componente `LessonLink` mostra, por exemplo, "▶ Aula 04 · ~1:20 (aprox.)" e abre o YouTube nesse minuto. Ele entra nas entrevistas do onboarding, no Radar e no Modelador, no quadro de texto, nas capas, na correção, no CTA/DM, nos stories e no Ritmo.
- **Menu "O método".** Continua, agora listando os momentos de cada aula.

## Fase 5 — Verificação e material para o vídeo

- **Testes automáticos** (`tests/*.test.mjs`):
  - `cardCount` no prompt;
  - `recordResults` e `markPublished`, e o cálculo de vencedor pela média;
  - stories e arte de story, com o modelo simulado;
  - o servidor de compartilhamento: sem token devolve 404, só serve arquivos do projeto, expira, recusa métodos que não sejam GET;
  - a gravação no Drive numa pasta temporária;
  - os minutos das aulas dentro da duração e o link com `t=`.
- **Regressão:** atualizar `scripts/renderer-regression.mjs` e `scripts/flow-screens.mjs` (tela de publicar, Ritmo, biblioteca com oportunidades).
- **Robustez** (`scripts/robustness-proof.mjs`):
  - matar o Electron no meio de uma geração, reabrir e confirmar que o rascunho foi recuperado;
  - remover o login da pasta temporária e confirmar o pedido para conectar de novo;
  - matar o processo do Codex e confirmar a mensagem de erro e que é possível tentar de novo;
  - janela de 1366×768 e escala de 125% (`--force-device-scale-factor=1.25`), com capturas de todas as telas para conferir cortes.
- **4 testes reais de nicho** (`scripts/niche-proof.mjs`, com a conta do usuário e gravação de vídeo da janela pelo `recordVideo` do Playwright). Cada nicho faz onboarding real com respostas roteirizadas, Radar, a primeira pauta do Top 10, 4 cards, 1 capa e os 3 internos, CTA/DM, stories só em texto e a tela de publicar. São 16 imagens no total.

  | Nicho | Tipo de produto | Preset | Arquitetura |
  |---|---|---|---|
  | Advogada trabalhista | serviço | Editorial | Tutorial |
  | SaaS de agendamento para clínicas | software | Clean SaaS | Framework |
  | Confeiteira | curso | Ilustrado | História → Método → Oferta |
  | Moda fitness | e-commerce de produto físico | Creator/Pessoal | Lista Útil |

  Os textos, as artes, as capturas de cada etapa e o vídeo vão para `Evidencias/nichos/` no Obsidian, organizados para a edição em motion.
- **Fechamento:** `npm run dist`, `scripts/packaged-smoke.mjs`, atualização das notas 02, 09 e 11 e commit no repositório novo.

## Fora deste plano

- Teste em Windows limpo e conta de comprador novo: fica com o usuário.
- Cronometrar os 30 minutos: fica com o usuário.
- Branding: aguarda a decisão do usuário.
- Assinatura digital do instalador.
