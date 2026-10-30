// Guia para agentes (Codex, Claude Code): a CLI imprime com "carrossell ajuda --agente" e a página Marca copia.
export const AGENT_GUIDE=`# Carrossell para agentes

Você controla o app Carrossell pelo comando \`carrossell\`. As artes são geradas pelo próprio app, com a conta ChatGPT conectada nele (o agente não precisa gerar imagens). Toda saída é JSON; progresso vai para stderr.

## Fluxo recomendado
1. \`carrossell status\` — confira \`account.connected\` (se falso, peça à pessoa para conectar no app) e \`brand\`.
2. Sem marca: \`carrossell marca configurar --link <site>\` e depois \`carrossell marca aprovar\`. Com marca: \`carrossell marca\` para ler Contexto e Design Kit antes de propor pautas.
3. \`carrossell criar --pauta "<tema e ângulo>" --cards 8\` → espera o texto. Leia \`lastReply\`: se o modelo fez perguntas, responda com \`carrossell mensagem <id> "..."\`.
4. Revise os cards (\`carrossell projeto <id>\`). Ajuste com \`mensagem\` ou \`editar\`. Depois \`carrossell aprovar <id>\`.
5. \`carrossell capas <id>\` → \`carrossell escolher-capa <id> <n>\` → \`carrossell gerar <id>\`.
6. \`carrossell exportar <id> --pasta <caminho absoluto>\`.

## Regras
- Um trabalho por vez no app inteiro. Se der "Aguarde ou cancele", use \`esperar\` ou \`cancelar\`.
- Não invente provas, números, depoimentos ou preços: o método P.A.C.T.O. proíbe.
- Use \`--perfil <nome>\` para trabalhar na marca certa quando houver vários perfis; isso não muda o que a janela mostra.
- Gerar artes leva de 1 a 3 minutos por card. O padrão de espera é 15 minutos (\`--timeout\`).`;
