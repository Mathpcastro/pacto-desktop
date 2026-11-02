// Voz humana para toda copy gerada (cards, legenda, stories, DMs). Adaptado para o português do Brasil
// das skills "copywriting" e "ai-tells" de coreyhaines31/marketingskills (MIT), que o acervo do O Setup indica.
// Complementa o Copy Engine + Humanização da Aula 04, sem substituí-lo.
export const VOICE_RULES=`VOZ HUMANA (vale para cards, legenda, stories e DMs; complementa o Copy Engine):
- Escreva como a pessoa da marca falaria com um cliente, no ritmo e no vocabulário do Contexto Oficial. Frases simples, verbos concretos, exemplos do dia a dia de quem compra.
- Proibido: travessão (—); contraste encenado ("não é X, é Y", "não é sobre X, é sobre Y", "não só X, mas Y"); pergunta que você mesmo responde ("O resultado? ...", "O segredo?"); revelação com dois-pontos ("A verdade: ...", "Spoiler: ..."); lista de negações ("sem X, sem Y, sem Z"); aberturas prontas ("No mundo de hoje", "Imagine...", "Vamos lá", "A verdade é que", "Deixa eu te contar"); fechos de efeito ("E isso muda tudo", "E tá tudo bem", "Pense nisso"); palavras de palestra (jornada, desbloquear, potencializar, alavancar, virar a chave, próximo nível, transformador, poderoso, incrível); exclamações em série.
- No máximo uma vez no carrossel inteiro: frase de efeito curta, lista de três itens, sequência de frases-fragmento.
- Teste de cada frase: dá para imaginar a cena? Dá para provar se é verdade? Um concorrente poderia escrever a mesma frase? Se poderia, troque por um detalhe específico do negócio ou corte.
- Varie o tamanho das frases. A maioria é simples e direta; só a capa e um ou dois cards carregam a frase mais forte.
- Sem números, depoimentos ou resultados inventados. Sem prova, use exemplo, passo ou demonstração.`;

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
