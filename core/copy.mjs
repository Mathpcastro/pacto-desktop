// Voz humana para toda copy gerada (cards, legenda, stories, DMs). Adaptado para o português do Brasil
// das skills "copywriting", "copy-editing", "marketing-psychology" e "social" (carousel frameworks) de
// coreyhaines31/marketingskills (MIT) e da skill "humanizer" (MIT, baseada em "Signs of AI writing" da Wikipédia).
// Complementa o Copy Engine + Humanização da Aula 04, sem substituí-lo.
export const VOICE_RULES=`VOZ HUMANA (vale para cards, legenda, stories e DMs; complementa o Copy Engine):
- Escreva como fala: como a pessoa da marca explicaria a um cliente num áudio ou numa conversa, no ritmo e no vocabulário do Contexto Oficial. Frases curtas (a maioria com até 15 palavras), ordem direta (quem faz, o que faz), voz ativa, verbos concretos, palavras do dia a dia de quem compra ("usar", não "utilizar"; "ajudar", não "viabilizar"). Se a frase precisa ser lida duas vezes, reescreva.
- Um nome para cada coisa: chame o mesmo recurso, pessoa ou problema sempre do mesmo jeito. Não comece várias frases seguidas da mesma forma.
- Sem verbo no gerúndio para parecer profundo ("garantindo", "destacando", "refletindo"), sem "serve como", "se destaca por", "conta com" no lugar de "é" e "tem", sem fontes vagas ("especialistas dizem", "estudos mostram") e sem palavras infladas (crucial, fundamental, essencial, robusto, inovador, revolucionário, cenário, ecossistema).
- Proibido: travessão (—); contraste encenado ("não é X, é Y", "não é sobre X, é sobre Y", "não só X, mas Y"); pergunta que você mesmo responde ("O resultado? ...", "O segredo?"); revelação com dois-pontos ("A verdade: ...", "Spoiler: ..."); lista de negações ("sem X, sem Y, sem Z"); aberturas prontas ("No mundo de hoje", "Imagine...", "Vamos lá", "A verdade é que", "Deixa eu te contar"); fechos de efeito ("E isso muda tudo", "E tá tudo bem", "Pense nisso"); palavras de palestra (jornada, desbloquear, potencializar, alavancar, virar a chave, próximo nível, transformador, poderoso, incrível); exclamações em série.
- No máximo uma vez no carrossel inteiro: frase de efeito curta, lista de três itens, sequência de frases-fragmento.
- Teste de cada frase: dá para imaginar a cena? Dá para provar se é verdade? Um concorrente poderia escrever a mesma frase? Se poderia, troque por um detalhe específico do negócio ou corte.
- Varie o tamanho das frases. A maioria é simples e direta; só a capa e um ou dois cards carregam a frase mais forte.
- Sem números, depoimentos ou resultados inventados. Sem prova, use exemplo, passo ou demonstração.`;

// Persuasão do carrossel: clareza antes de esperteza, benefício antes de recurso, dor sentida e risco zero no CTA.
export const PERSUASION_RULES=`PERSUASÃO (simples e honesta):
- Clareza antes de esperteza: se tiver que escolher entre claro e criativo, escolha claro.
- Benefício antes de recurso: cada recurso aparece pelo que muda no dia de quem compra (recurso → o que a pessoa consegue fazer → por que isso importa para ela).
- Fale com a pessoa ("você"), com a dor nas palavras dela, como ela descreveria o problema para um amigo. Mostre o "antes" numa cena curta que ela reconheça.
- Laço aberto: a capa abre uma pergunta ou promessa que só fecha no fim; cada card dá um ganho e deixa um motivo para passar ao próximo. Se houver passos ou itens, diga cedo quantos são.
- Entregue valor antes de pedir algo. O pedido do último card é um só, com verbo de ação e o que a pessoa ganha ("Comenta CHECKLIST que eu te mando"); perto dele, responda a objeção mais provável do Contexto Oficial em uma frase.
- Dose a força: a maioria das frases é simples e informativa; a capa e no máximo um card carregam a frase mais forte.
- Urgência, escassez e prova só se forem reais e estiverem no Contexto Oficial.`;

// Como a continuidade funciona em cada arquitetura do método (Aula 03), cruzado com os carousel frameworks.
export const ARCHITECTURE_FLOW={
  'lista-util':'LISTA ÚTIL: a capa promete uma quantidade exata e um ganho claro; entregue exatamente essa quantidade, sem item de enchimento. Cada item se sustenta sozinho e paga um pedaço da promessa, no mesmo formato (nome, o que faz, quando usar). A continuidade vem da promessa da capa e de uma ponte curta entre itens; a ordem vai do mais fácil ou mais útil ao mais avançado.',
  'tutorial':'TUTORIAL: mostre logo o resultado que a pessoa vai ter e diga quantos passos são. Cada passo começa onde o anterior terminou, com uma ação concreta e o porquê em uma frase. Use o mesmo exemplo do começo ao fim. Feche mostrando como saber que funcionou.',
  'framework':'FRAMEWORK: parta do erro comum (card 2) e apresente o framework como a saída, com um nome curto e fácil de lembrar. Cada pilar tem um nome de duas a quatro palavras e responde ao erro inicial; aplique o mesmo exemplo em todos os pilares. Feche com o framework inteiro resumido numa linha.',
  'estudo-de-caso':'ESTUDO DE CASO: a capa afirma a mudança ou o experimento (só fatos do Contexto Oficial) e o fim fecha esse laço. Conte em ordem: como era, cada decisão com o motivo, o erro ou ajuste, o resultado. Termine com a lição que o leitor pode copiar.',
  'historia-metodo-oferta':'HISTÓRIA → MÉTODO → OFERTA: conte em primeira pessoa, com cena, tensão e virada. O método nasce da virada da história e cada parte dele retoma algo que aconteceu. A oferta só entra se existir no Contexto Oficial e aparece como continuação natural do método.',
};
// Regra de fio condutor do carrossel: geral e da arquitetura escolhida (ou de todas, quando o modelo escolhe).
export function flowRules(architectureId){
  const chosen=ARCHITECTURE_FLOW[architectureId];
  return `FIO CONDUTOR: o carrossel é uma fala só, lida em sequência. Antes de escrever, defina em uma frase a ideia central. Uma ideia por card; quem ler só os títulos em ordem entende o raciocínio. Sem saltos de assunto e sem misturar conselho genérico com exemplo: se usar um exemplo, apresente-o uma vez e siga com ele.\n${chosen?`Na arquitetura escolhida: ${chosen}`:`Aplique a continuidade da arquitetura que você escolher:\n${Object.values(ARCHITECTURE_FLOW).map(r=>`- ${r}`).join('\n')}`}`;
}

// Sinais de texto de IA que dá para achar sem modelo. Cada um tem uma regra em VOICE_RULES.
// O \b do JavaScript não conhece acentos ("é", "só"); (?<!\p{L}) e (?!\p{L}) fazem esse papel.
const TELLS=[
  ['travessão',/—|\s–\s/u],
  ['contraste "não é X, é Y"',/(?<!\p{L})não (?:é|era|foi|se trata de)(?!\p{L})[^.!?\n]{1,70}?[,;.]\s*(?:e sim|mas sim|é|era|se trata)(?!\p{L})/iu],
  ['"não só X, mas Y"',/(?<!\p{L})não (?:só|apenas|somente)(?!\p{L})[^.!?\n]{1,70}?(?<!\p{L})mas(?!\p{L})/iu],
  ['pergunta respondida',/(?<!\p{L})(?:o resultado|o segredo|a verdade|a resposta|o melhor|a pegadinha|o motivo|o problema)\?/iu],
  ['revelação com dois-pontos',/(?<!\p{L})(?:o segredo|a verdade|o melhor de tudo|a real|spoiler|moral da história)\s*:/iu],
  ['lista de negações',/(?<!\p{L})(?:sem|nada de)\s[^.,;\n]{1,30},\s*(?:sem|nada de)\s[^.,;\n]{1,30},\s*(?:e\s+)?(?:sem|nada de)(?!\p{L})/iu],
  ['abertura pronta',/(?<!\p{L})(?:no mundo (?:de hoje|atual)|nos dias de hoje|imagine (?:só|se)|vamos lá|bora lá|a verdade é que|deixa eu te contar)(?!\p{L})/iu],
  ['fecho de efeito',/(?<!\p{L})(?:isso muda tudo|e tá tudo bem|e está tudo bem|pense nisso|simples assim)(?!\p{L})/iu],
  ['palavra de palestra',/(?<!\p{L})(?:jornada|desbloque\p{L}*|potencializ\p{L}*|alavanc\p{L}*|virar a chave|próximo nível|game.?changer)(?!\p{L})/iu],
  ['exclamações em série',/!{2,}|\?!|!\?/u],
];
// Devolve os sinais encontrados, com o trecho, para a correção pedir exatamente o que mudar.
export function aiTells(value){
  const found=[];
  for(const [label,re] of TELLS){const m=re.exec(String(value||''));if(m)found.push({label,match:m[0].trim()});}
  return found;
}
// Os mesmos sinais em vários textos (cards, legenda, stories), com onde cada um apareceu.
export function tellsIn(entries){
  return entries.flatMap(([where,value])=>aiTells(value).map(t=>({...t,where})));
}
