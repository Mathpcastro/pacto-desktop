// Guia para agentes (Codex, Claude Code, Gemini CLI): a CLI imprime com "carrossell ajuda --agente" e a página Marca copia.
export const AGENT_GUIDE=`# Carrossell para agentes

Você controla o app Carrossell pelo comando \`carrossell\`. Os comandos de operação respondem em JSON e enviam progresso para stderr. Confira a instalação com \`carrossell --version\` (texto simples). Há dois jeitos de trabalhar:
- **Com a conta ChatGPT conectada no app** (\`account.connected\` verdadeiro em \`carrossell status\`): o app escreve e gera as artes. Siga o "Fluxo recomendado".
- **Sem a conta ChatGPT (modo agente)**: você, o agente, escreve o texto e desenha os cards seguindo a estrutura do app, e o app guarda, valida, monta, exporta e posta. Siga o "Modo agente".

## Criar e exportar um plano pronto
Com um \`plano.json\` no mesmo esquema de \`tarefa <id> texto\`, rode \`carrossell criar --slides plano.json --estilo texto --exportar ./carrossel\`. O app grava, aprova, gera a capa e os cards e exporta os PNGs e a legenda. Mostre o texto antes de rodar se a pessoa quiser revisar antes da aprovação automática. A saída traz \`id\`, \`estilo\`, \`cards\`, \`capa\`, \`arquivos\` e \`alertas\`. Confira os sinais de texto de IA em \`alertas\`.
- Padrões: estilo \`texto\`, uma opção de capa e a primeira escolhida. Para escolher outra, passe \`--quantas 3 --capa 2\`. Use \`--agente claude\` ou \`--agente gemini\` para rotular o projeto.
- Modelos disponíveis: \`tweet\`, \`texto\`, \`textopreto\`, \`fototexto\`, \`fundo\` e \`recorte\`. Fundo e recorte exigem uma foto do rosto em Marca › Perfil e fotos. O estilo \`ia\` pede ChatGPT para gerar a capa. Se o agente já tem a arte, siga o modo em etapas e use \`card --imagem\`.
- \`carrossell skills\` lista as skills. As de plano aparecem no pedido de \`tarefa <id> texto\`.
- A capa segue a skill de ganchos de slideshow, e você pode indicar a categoria na pauta com \`--pauta "…, categoria: chamado"\`.

## UGC com avatar
- Use \`carrossell avatares listar --perfil "<perfil>"\` para ver os avatares salvos, o ativo no UGC e a cara do perfil. \`carrossell persona listar\` também mostra rascunhos e avisos de semelhança. Cadastre com \`persona criar --nome "<nome>" --idade 28 --genero "<gênero>" --etnia "<aparência>" --estilo "<roupa>" --cenario "<lugar>" --nicho "<nicho>" --foto ancora.png --usar\`.
- Use \`persona usar <id|nome>\` para selecionar o ativo ou \`avatares cara-do-perfil <id|nome>\` para ativá-lo e usar sua âncora como foto do perfil no app. Use \`avatares renomear <id|nome> --nome "<novo>"\` ou \`avatares apagar <id|nome>\` para gerenciar a biblioteca. \`persona foto <id|nome> --foto <arquivo>\` salva a primeira âncora de um rascunho.
- Para preparar um gerador externo, use \`persona prompt <id|nome>\` ou acrescente \`--cena "<descrição>" --luz flash|ambiente|pov\` e anexe a âncora original com o bloco MANTER.
- No slide 1, escreva um gancho em primeira pessoa com até 12 palavras. Pague o gancho nos próximos cards, use \`"produto": true\` no card com a tela do produto e deixe o CTA no último. Informe \`"foto": "fotos/capa.png"\` para usar uma foto relativa ao plano, ou descreva a cena em \`scene\` com \`acao\`, \`cenario\` e \`luz\`.
- Rode \`carrossell criar --slides plano.json --estilo ugc --avatar "<nome ou ID>" --produto-imagem tela.png --exportar ./ugc --tiktok\`. \`--persona\` é um sinônimo de \`--avatar\`. O plano também aceita \`"estilo": "ugc"\` e \`"persona"\`. Use \`--produto-link\` para capturar a tela da página. Sem a conta ChatGPT, o slide 1 usa a foto informada ou a âncora, e os outros cards sem foto usam fundo liso. Com a conta conectada, o app gera as cenas pendentes com a âncora original e o bloco MANTER salvo.
- \`carrossell exportar <id> --pasta ./ugc --tiktok\` grava os PNGs de 1080×1350, a legenda e \`tiktok.txt\` com uma legenda curta e hashtags.

## Modo agente (Claude, Gemini ou outro agente)
1. Marca: \`carrossell marca\`. Se não houver Contexto e Design Kit, entreviste a pessoa (o que vende, para quem, dores, tom, cores em hexadecimal, estilo visual), escreva os dois documentos em Markdown e grave com \`carrossell marca salvar --contexto contexto.md --design design.md --nome "<marca>"\`.
2. \`carrossell criar --pauta "<tema e ângulo>" --cards 8 --agente claude\` (ou \`--agente gemini\`, conforme quem você é) cria o carrossel sem escrever o texto. Ele aparece no Início do app com o seu nome.
3. \`carrossell tarefa <id> texto\` grava o pedido completo (método P.A.C.T.O., fontes do curso, Contexto da Marca, voz humana) e o esquema JSON. Leia o arquivo do pedido inteiro e escreva a resposta seguindo o pedido e o esquema à risca: é o mesmo que o app manda para a conta ChatGPT.
4. \`carrossell texto <id> --arquivo resposta.json\` grava. Se aparecerem "sinais de texto de IA", corrija esses trechos e grave de novo. Mostre os cards para a pessoa e só então \`carrossell aprovar <id>\`.
5. Arte, um dos dois caminhos:
   - Modelos do app (sem desenhar nada): crie com \`--estilo texto\`, \`textopreto\` ou \`tweet\` e rode \`carrossell capas <id>\`, \`carrossell escolher-capa <id> <n>\` e \`carrossell gerar <id>\`.
   - Arte própria: \`carrossell tarefa <id> arte\` traz o Design Kit e o texto de cada card. Faça um HTML de 1080×1350 por card (CSS no arquivo, sem JavaScript; Google Fonts funciona) e grave com \`carrossell card <id> <n> --html card-n.html\`. Se você gera imagens, mande um PNG com \`--imagem card-n.png\`.
6. Opcional: \`carrossell tarefa <id> cta\` → \`carrossell cta <id> --arquivo cta.json\`; \`carrossell tarefa <id> stories\` → \`carrossell stories <id> --arquivo stories.json\` (o app monta os PNGs em fundo preto ou branco).
7. Antes de mostrar à pessoa, \`carrossell revisar <id>\` aponta sinais de texto de IA (travessão, "não é X, é Y", palavras de palestra…) nos cards, legenda, DMs e stories. Corrija e grave de novo.
8. Exporte ou poste como no fluxo abaixo (passos 6 e 7). O ZIP e a pasta exportada levam os stories em \`stories/\`.

## Stories e CTA com a conta ChatGPT
Depois do texto, \`carrossell stories <id> --fundo preto\` escreve e monta os stories, e \`carrossell cta <id>\` monta palavras-chave, CTAs e DMs. \`carrossell fundo-stories <id> branco\` troca o fundo.

## Fluxo recomendado (com a conta ChatGPT no app)
1. \`carrossell status\` — confira \`account.connected\` (se falso, use o modo agente ou peça à pessoa para conectar no app) e \`brand\`.
2. Sem marca: \`carrossell marca configurar --link <site>\` e depois \`carrossell marca aprovar\`. Com marca: \`carrossell marca\` para ler Contexto e Design Kit antes de propor pautas.
3. \`carrossell criar --pauta "<tema e ângulo>" --cards 8\` → espera o texto. Leia \`lastReply\`: se o modelo fez perguntas, responda com \`carrossell mensagem <id> "..."\`.
4. Revise os cards (\`carrossell projeto <id>\`). Ajuste com \`mensagem\` ou \`editar\`. Depois \`carrossell aprovar <id>\`.
5. \`carrossell capas <id>\` → \`carrossell escolher-capa <id> <n>\` → \`carrossell gerar <id>\`.
6. \`carrossell exportar <id> --pasta <caminho absoluto>\`, ou poste no Instagram: \`carrossell instagram\` lista as contas e as padrão do perfil; \`carrossell postar <id> --confirmar --contas @conta1,@conta2\` publica agora (sem \`--contas\`, vai nas padrão) e com \`--em "2026-11-02 18:00"\` agenda (o computador precisa estar ligado na hora, o app pode estar fechado).
7. Dias depois, \`carrossell metricas <id>\` traz curtidas, comentários, salvamentos e alcance. Use os melhores no Replicador: \`carrossell chamar replicate --json '{"id":"<id>"}'\`.

## Regras
- Para conferir a licença, use \`carrossell licenca status\`. A ativação usa \`carrossell licenca ativar --email <e-mail> --aceito\` depois que a pessoa ler e aceitar os termos.
- Um trabalho por vez no app inteiro. Se der "Aguarde ou cancele", use \`esperar\` ou \`cancelar\`.
- Não invente provas, números, depoimentos ou preços: o método P.A.C.T.O. proíbe.
- Postar é público e não dá para desfazer pelo Carrossell: só use \`postar --confirmar\` quando a pessoa pediu para publicar aquele carrossel.
- Use \`--perfil <nome>\` para trabalhar na marca certa quando houver vários perfis; isso não muda o que a janela mostra.
- Gerar artes leva de 1 a 3 minutos por card. O padrão de espera é 15 minutos (\`--timeout\`).`;
