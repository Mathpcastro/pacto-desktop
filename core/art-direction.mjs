// Direção de arte da "Arte com IA". A IA continua desenhando o card inteiro (texto incluído); aqui ficam
// as receitas que deixam o resultado mais bonito: estilo de ilustração, tipografia conforme o negócio
// e um layout com hierarquia para cada tipo de card. A escolha automática lê o Contexto da Marca;
// o usuário pode fixar outra em Marca › Design Kit.

export const ILLUSTRATION_STYLES = [
  { id: 'editorial', label: 'Ilustração editorial', recipe: 'ilustração editorial contemporânea, de revista e aplicativo premium: formas grandes e bem desenhadas, volumes com sombras suaves, textura granulada leve por cima (grão de impressão), traço confiante, poucos elementos e muito capricho em cada um' },
  { id: 'clay3d', label: '3D suave', recipe: 'render 3D estilizado com aparência de massinha fosca (claymorphism): cantos arredondados, iluminação de estúdio suave, sombras de contato, leve profundidade de campo, objetos do negócio fofos e táteis, acabamento de animação premium' },
  { id: 'gouache', label: 'Guache e aquarela', recipe: 'pintura em guache e aquarela de livro ilustrado premium: pinceladas visíveis, papel texturizado, bordas orgânicas, luz quente, personagens expressivos, proporcionais e acolhedores' },
  { id: 'photo', label: 'Foto realista', recipe: 'fotografia realista de estilo de vida e produto, com luz natural lateral, profundidade de campo rasa, cenário real do negócio, pele e materiais com textura verdadeira, cores ajustadas ao Design Kit e nada com cara de banco de imagens' },
  { id: 'collage', label: 'Colagem', recipe: 'colagem editorial: recortes de foto com bordas de papel, formas geométricas em cor chapada, fita adesiva e sobreposições com sombra leve de papel, composição dinâmica e moderna' },
  { id: 'line', label: 'Linha e cor chapada', recipe: 'desenho em linha escura, contínua e elegante sobre manchas de cor chapada levemente deslocadas do traço, estilo de identidade visual moderna, com bastante respiro' },
  { id: 'isometric', label: 'Isométrico', recipe: 'cena isométrica 3D limpa, em miniatura, como um diorama com os objetos e o ambiente do negócio organizados, sombras suaves e materiais bem definidos' },
  { id: 'retro', label: 'Cartaz retrô', recipe: 'ilustração de cartaz retrô de meados do século XX: formas simplificadas, paleta limitada do Design Kit, textura de serigrafia e composição gráfica forte' },
];

export const TYPE_STYLES = [
  { id: 'geometric', label: 'Geométrica forte', recipe: 'títulos em sans geométrica bem pesada, no espírito de Montserrat ExtraBold ou Poppins Bold; subtítulo na mesma família em peso regular' },
  { id: 'grotesk', label: 'Grotesca editorial', recipe: 'títulos em grotesca editorial pesada e levemente compacta, no espírito de Inter Tight Black ou Neue Haas Grotesk; subtítulo em grotesca regular' },
  { id: 'serif', label: 'Serifa elegante', recipe: 'títulos em serifa de alto contraste e elegante, no espírito de Playfair Display ou uma Didone; subtítulo em sans fina, limpa e com espaçamento generoso' },
  { id: 'rounded', label: 'Arredondada amigável', recipe: 'títulos em sans arredondada e cheinha, amigável, no espírito de Nunito Black ou Baloo; subtítulo em arredondada regular' },
  { id: 'humanist', label: 'Humanista acolhedora', recipe: 'títulos em sans humanista calorosa e legível, no espírito de Source Sans Bold ou Lato Black; subtítulo na mesma família em peso regular' },
  { id: 'poster', label: 'Cartaz', recipe: 'títulos em display condensado de cartaz, em caixa alta, no espírito de Bebas Neue ou Oswald; uma palavra de destaque pode vir em manuscrito pincelado; subtítulo em sans simples' },
  { id: 'slab', label: 'Slab robusta', recipe: 'títulos em serifa slab robusta, no espírito de Roboto Slab Black ou Arvo Bold; subtítulo em sans firme' },
  { id: 'handwritten', label: 'Manuscrita charmosa', recipe: 'títulos em letra manuscrita ou lettering legível e charmoso; subtítulo em sans simples e limpa para equilibrar' },
];

// Cada regra soma pontos com as palavras do Contexto da Marca e do Design Kit; vence a mais citada.
const RULES = [
  { illustration: 'gouache', type: 'rounded', words: /(crian|infantil|beb[eê]|maternidade|\bm[aã]es?\b|fam[ií]lia|escola|alfabetiza|igreja|b[ií]bli|\bf[eé]\b|crist[aã]|devocional|evang|pets?\b|cachorr|\bgato|ni[ñn]os?|kids?\b|children|faith|church)/giu },
  { illustration: 'gouache', type: 'handwritten', words: /(confeitaria|bolos?\b|doces?\b|brigadeiro|artesanal|papelaria|croch[eê]|bordado|handmade|craft|bakery)/giu },
  { illustration: 'photo', type: 'serif', words: /(est[eé]tica|beleza|maquiagem|cabelo|sal[aã]o|unhas?\b|moda|joias?|luxo|noivas?\b|casamento|skincare|perfum|beauty|fashion|luxury|wedding)/giu },
  { illustration: 'editorial', type: 'serif', words: /(advoca|advogad|jur[ií]dic|direito|imobili[aá]ri|corretor|arquitet|interiores|lawyer|real estate)/giu },
  { illustration: 'photo', type: 'poster', words: /(padaria|p[aã]es\b|restaurante|gastronom|culin[aá]ria|receitas?\b|caf[eé]\b|pizza|hamb[uú]rguer|chef|delivery|comida|food|cook)/giu },
  { illustration: 'editorial', type: 'humanist', words: /(cl[ií]nica|sa[uú]de|m[eé]dic|odonto|dentist|fisioterap|nutri[cç]|nutricionista|psic[oó]log|terapia|terapeuta|bem-estar|yoga|enfermag|health|therapy|wellness)/giu },
  { illustration: 'collage', type: 'poster', words: /(academia|fitness|treino|personal|crossfit|esporte|eventos?\b|festa|show|m[uú]sica|gym|workout|sports?)/giu },
  { illustration: 'isometric', type: 'slab', words: /(ind[uú]stria|constru[cç][aã]o|obras?\b|engenharia|agro|fazenda|mec[aâ]nic|automotiv|oficina|log[ií]stica|transporte|construction|farm)/giu },
  { illustration: 'clay3d', type: 'geometric', words: /(saas|software|aplicativo|\bapps?\b|tecnologia|startup|intelig[eê]ncia artificial|\bia\b|automa[cç][aã]o|programa[cç][aã]o|no-?code|\btech\b|\bai\b)/giu },
  { illustration: 'editorial', type: 'grotesk', words: /(finan[cç]|invest|trading|trader|bolsa|cripto|cont[aá]bil|contador|consultori|mentoria|neg[oó]cios|empreendedor|lideran[cç]a|vendas|b2b|finance)/giu },
  { illustration: 'editorial', type: 'geometric', words: /(marketing|tr[aá]fego|ag[eê]ncia|lan[cç]amento|infoproduto|instagram|conte[uú]do|social media|copy)/giu },
];
const DEFAULT = { illustration: 'editorial', type: 'geometric' };

export function suggestArtDirection(text = '') {
  let best = null, score = 0;
  for (const rule of RULES) {
    const hits = String(text).match(rule.words)?.length || 0;
    if (hits > score) { best = rule; score = hits; }
  }
  return best ? { illustration: best.illustration, type: best.type } : { ...DEFAULT };
}

const find = (list, id) => list.find((item) => item.id === id);
export function validArtDirection(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Direção de arte inválida.');
  const out = {};
  for (const [key, list] of [['illustration', ILLUSTRATION_STYLES], ['type', TYPE_STYLES]]) {
    const v = value[key];
    if (v === undefined || v === '' || v === 'auto') continue;
    if (!find(list, v)) throw new Error('Direção de arte inválida.');
    out[key] = v;
  }
  return out;
}

// O que vale para a marca: o que o usuário fixou e, no resto, a sugestão pelo negócio.
export function resolveArtDirection(saved, brandText) {
  const auto = suggestArtDirection(brandText);
  const chosen = saved && typeof saved === 'object' ? saved : {};
  return {
    illustration: find(ILLUSTRATION_STYLES, chosen.illustration) ? chosen.illustration : auto.illustration,
    type: find(TYPE_STYLES, chosen.type) ? chosen.type : auto.type,
    fixedIllustration: Boolean(find(ILLUSTRATION_STYLES, chosen.illustration)),
    fixedType: Boolean(find(TYPE_STYLES, chosen.type)),
    auto,
  };
}

// Só comparação de verdade: "antes de ler" não é antes e depois.
const COMPARISON = /(?<!\p{L})(antes\s*(?:e|x|vs\.?|\/)\s*depois|vs\.?|versus|em vez de|ao inv[eé]s de|before\s*(?:and|vs\.?|\/)\s*after|instead of)(?!\p{L})/iu;
const PAIRS = [[/(?<!\p{L})errad[oa]s?(?!\p{L})/iu, /(?<!\p{L})cert[oa]s?(?!\p{L})/iu], [/(?<!\p{L})wrong(?!\p{L})/iu, /(?<!\p{L})right(?!\p{L})/iu]];
const compares = (text) => COMPARISON.test(text) || PAIRS.some(([a, b]) => a.test(text) && b.test(text));
// Layout de cada card: a capa abre forte, o último fecha com a ação e os do meio alternam a composição.
export function cardLayout(index, total, slide = {}) {
  if (index === 0) return 'cover';
  if (index === total - 1) return 'cta';
  if (compares(`${slide.title || ''} ${slide.body || ''}`)) return 'compare';
  return index % 2 ? 'illustration-top' : 'illustration-bottom';
}
const LAYOUTS = {
  cover: 'LAYOUT DE CAPA: o título é o maior elemento do carrossel, com 40% a 50% da altura do card, em até 3 linhas largas. A ilustração é a protagonista, grande (40% a 55% do card), conversando com o título (por trás, ao lado ou saindo dele), com um único ponto focal. O subtítulo, se houver, fica menor, logo abaixo do título. Fundo com profundidade (gradiente sutil, forma grande de cor ou cenário desfocado), nada de elementos soltos pelos cantos.',
  'illustration-top': 'LAYOUT: ilustração grande na metade de cima do card, com cena rica e bem enquadrada. Embaixo, alinhados à esquerda: título grande e, logo abaixo, o subtítulo.',
  'illustration-bottom': 'LAYOUT: título grande alinhado à esquerda no topo, subtítulo logo abaixo; a ilustração ocupa a metade de baixo do card, podendo sangrar até a borda.',
  compare: 'LAYOUT DE COMPARAÇÃO: título no topo; abaixo, o card se divide em dois lados bem distintos (antes e depois, errado e certo), cada um com sua ilustração e cor, separados por uma linha ou mudança de fundo. Marque o lado ruim com tom apagado e o lado bom com a cor de acento.',
  cta: 'LAYOUT DE FECHAMENTO: o título chama para a ação em tamanho grande; a palavra-chave ou ação do destaque aparece dentro de uma etiqueta ou botão desenhado na cor de acento, bem visível. A ilustração é menor, de apoio, e passa sensação de conclusão.',
};

// Bloco de direção de arte que entra no pedido de cada arte.
export function artDirectionPrompt(direction, { layout }) {
  const illustration = find(ILLUSTRATION_STYLES, direction.illustration) || find(ILLUSTRATION_STYLES, DEFAULT.illustration);
  const type = find(TYPE_STYLES, direction.type) || find(TYPE_STYLES, DEFAULT.type);
  const rule = (fixed) => fixed ? 'escolhido pelo usuário: obrigatório' : 'escolhido para este negócio: siga-o; só troque se o Design Kit nomear com todas as letras outro estilo de ilustração ou outra fonte ("limpo", "moderno" ou cores não mudam o estilo)';
  return `DIREÇÃO DE ARTE (vale igual para todos os cards deste carrossel):
- Estilo da ilustração (${rule(direction.fixedIllustration)}): ${illustration.recipe}.
- Tipografia (${rule(direction.fixedType)}): ${type.recipe}. Use a mesma família em todos os cards.
- Hierarquia do texto: o título é muito grande e forte (cada linha com cerca de 8% a 11% da altura do card); o "Subtítulo" é o texto de apoio, com 40% a 50% do tamanho do título, peso regular ou médio, em até 3 linhas; o destaque recebe a cor de acento do Design Kit ou um marca-texto desenhado. Espaço generoso entre título e subtítulo.
- Ilustração caprichada: um assunto principal claro e grande, desenhado com riqueza (volume, luz, textura e detalhes reais do setor), com primeiro plano, plano médio e fundo. Personagens com proporções e rostos consistentes com a capa aprovada.
- Proibido na ilustração: ícones genéricos, fluxogramas de caixinhas, setas soltas, clipart, gráficos vazios, telas com linhas cinzas no lugar de conteúdo, emojis e qualquer texto além do texto do card.
${LAYOUTS[layout] || LAYOUTS['illustration-top']}`;
}
