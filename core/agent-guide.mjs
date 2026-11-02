// Guia para agentes (Codex, Claude Code, Gemini CLI): a CLI imprime com "carrossell ajuda --agente" e a página Marca copia.
export const AGENT_GUIDE=`# Carrossell para agentes

Você controla o app Carrossell pelo comando \`carrossell\`. Toda saída é JSON; progresso vai para stderr. Há dois jeitos de trabalhar:
- **Com a conta ChatGPT conectada no app** (\`account.connected\` verdadeiro em \`carrossell status\`): o app escreve e gera as artes. Siga o "Fluxo recomendado".
- **Sem a conta ChatGPT (modo agente)**: você, o agente, escreve o texto e desenha os cards seguindo a estrutura do app, e o app guarda, valida, monta, exporta e posta. Siga o "Modo agente".

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
- Um trabalho por vez no app inteiro. Se der "Aguarde ou cancele", use \`esperar\` ou \`cancelar\`.
- Não invente provas, números, depoimentos ou preços: o método P.A.C.T.O. proíbe.
- Postar é público e não dá para desfazer pelo Carrossell: só use \`postar --confirmar\` quando a pessoa pediu para publicar aquele carrossel.
- Use \`--perfil <nome>\` para trabalhar na marca certa quando houver vários perfis; isso não muda o que a janela mostra.
- Gerar artes leva de 1 a 3 minutos por card. O padrão de espera é 15 minutos (\`--timeout\`).`;
