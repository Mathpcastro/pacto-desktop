// Estratégia de venda no Contexto Oficial da Marca. Adaptado para o português do Brasil das skills
// "product-marketing" (ICP, jobs to be done, quatro forças, anti-persona, linguagem do cliente),
// "content-strategy" (estágios de compra, conteúdo útil antes do pedido), "social" (pilares e a
// fatia pequena de conteúdo promocional) e "customer-research" de coreyhaines31/marketingskills (MIT).
// Mantém a estrutura de 7 seções do prompt oficial da Aula 02: a estratégia entra dentro delas.
export const BRAND_STRATEGY_RULES=`ESTRATÉGIA DE VENDA (o documento é o mapa de como vender pelo conteúdo, não um resumo da página):
- Escreva como estrategista de marketing de produto. A página de vendas descreve o produto para quem já está decidindo; o contexto precisa descrever quem compra ANTES de conhecer o produto e como o conteúdo chega até essa pessoa.
- Público (seção 2): um cliente ideal concreto, não uma categoria. Diga quem é, em que momento está (o gatilho que faz procurar uma solução agora), o que já tentou e por que não resolveu, o que ela "contrata" o produto para fazer e o custo de continuar como está. Inclua quem NÃO é o público (anti-persona), para as pautas não fugirem dele.
- Dores e desejos nas palavras do cliente, como ele contaria a um amigo, entre aspas. Cubra as quatro forças: o que empurra para mudar, o que atrai na solução, o hábito que prende ao jeito atual e o medo de trocar. As objeções vêm com a resposta honesta em uma frase.
- Territórios (seção 3): pilares sobre o problema do cliente, do mais amplo ao mais perto da compra (entender o problema, jeitos de resolver, escolher a solução). No máximo dois territórios falam do produto em si. Nunca liste recursos do produto como territórios.
- Ativos (seção 4): primeiro o que já existe e dá para mandar hoje (link da página, teste grátis, demonstração, plano gratuito, amostra). Depois, materiais a preparar, marcados "a preparar".
- Regras de conteúdo (seção 6) precisam incluir a estratégia: a mistura de posts (cerca de 70% ensinam algo útil sobre o problema do cliente, 20% mostram bastidores, prova ou o produto em uso, 10% são oferta direta); onde o produto aparece (no último card, ligado à dica do post); o CTA principal, com uma palavra-chave e o que a pessoa recebe na DM; e o teste da pauta ("isso ajuda o cliente ideal a resolver o problema dele?").
- Resumo operacional (seção 7): diga para quem falar, o ângulo principal, onde o produto entra e o CTA principal.
- HIPÓTESE só para fatos que os dados não confirmam (números, preços, prazos, clientes, depoimentos, recursos). Escolhas de estratégia (público prioritário, ângulo, mistura, CTA) são recomendações: escreva com clareza, sem HIPÓTESE. Frases de cliente deduzidas vão como "frases prováveis" numa linha só, sem inventar depoimento.
- Seja específico: um exemplo concreto vale mais que três adjetivos. Corte o que serviria para qualquer marca.
- Escreva enxuto: frases curtas e diretas, cerca de 7 mil caracteres no documento inteiro. Cada ressalva (não garantir resultado, requisitos, revisão humana) aparece uma vez só, nas regras de conteúdo, e não se repete nas outras seções.
- Copie nomes, palavras-chave e preços exatamente como estão nos dados.`;

// Reescrever um Contexto já salvo com o mesmo olhar, sem perder fatos.
export const BRAND_IMPROVE_RULES=`TAREFA: reescreva o CONTEXTO OFICIAL DA MARCA abaixo aplicando a ESTRATÉGIA DE VENDA.
- Mantenha a estrutura de 7 seções do prompt oficial.
- Preserve todos os fatos do documento atual: produto, preço, oferta, números, provas, limites e regras do dono da marca. Não acrescente fato novo.
- Mude o que é estratégia: público, dores nas palavras do cliente, territórios, ativos, regras de conteúdo e resumo.
- Se o documento atual já tiver um público ou um formato escolhido pelo dono (por exemplo "estilo tweet" ou "último card vende o produto"), respeite essa escolha.
- Responda em português do Brasil. JSON conforme o esquema: complete=true, document com o documento novo em Markdown, brandName com o nome da marca, reply com até 3 frases dizendo o que mudou.`;
