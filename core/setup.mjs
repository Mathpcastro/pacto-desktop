// Começo rápido do onboarding: "O que você vende?" por link ou descrição.
// Três caminhos: gerar com a conta conectada, copiar um prompt para o ChatGPT/Claude da
// pessoa (e colar a resposta de volta) ou responder à entrevista completa.

import { BRAND_STRATEGY_RULES } from './brand-strategy.mjs';

// Aceita "https://...", "http://..." e domínios digitados sem protocolo ("meusaas.com.br/oferta").
export function asUrl(input) {
  const value = String(input || "").trim();
  if (!value || /\s/.test(value) || value.length > 2000) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(value) ? `https://${value}` : null;
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

// Marcadores fixos que separam a resposta colada nos dois documentos.
export const SECTIONS = { name: "NOME DA MARCA", brand: "CONTEXTO DA MARCA", design: "DESIGN KIT" };

// Prompt para a IA pessoal da pessoa: o que ela vende vai no começo e prende a resposta
// àquele produto; a memória e as conversas da IA dela completam o resto.
export function setupPrompt(input, { brandPrompt = "", designPrompt = "" } = {}) {
  const what = String(input || "").trim();
  if (!what) throw new Error("Escreva o link ou uma frase sobre o que você vende.");
  if (what.length > 2000) throw new Error("Use até 2.000 caracteres.");
  const link = asUrl(what);
  return `Vou configurar o Carrossell, um app que cria carrosséis de Instagram para vender ${link ? `o produto deste link: ${link}` : `isto: ${what}`}

Tudo abaixo é sobre ESSE produto, não sobre outro que eu venda ou já tenha vendido.

COMO RESPONDER
1. Use o que você já sabe sobre mim e sobre esse negócio: memória, projetos e conversas anteriores.${link ? `\n2. Se você consegue navegar, abra o link e leia a página: promessa, para quem é, preço, oferta, diferenciais e perguntas frequentes.` : ""}
${link ? "3" : "2"}. Se faltar algo essencial que você não saiba, me faça no máximo 3 perguntas curtas antes. Depois entregue tudo de uma vez.
${link ? "4" : "3"}. Não invente números, depoimentos, resultados, clientes ou preços. Fato que você não souber, escreva com a palavra HIPÓTESE para eu conferir.
${link ? "5" : "4"}. Responda em português do Brasil.

PARTE 1 — CONTEXTO DA MARCA (siga este roteiro, mas sem me entrevistar rodada por rodada: responda você mesmo com o que sabe)
${brandPrompt.trim()}

${BRAND_STRATEGY_RULES}

PARTE 2 — DESIGN KIT (mesma regra: responda você mesmo; use as cores e o estilo que o produto já tem)
${designPrompt.trim()}

FORMATO DA ENTREGA (obrigatório: eu vou colar a sua resposta no app, e ele separa as partes por estas linhas)
=== ${SECTIONS.name} ===
(só o nome da marca ou do produto)
=== ${SECTIONS.brand} ===
(o documento CONTEXTO OFICIAL DA MARCA completo, em Markdown)
=== ${SECTIONS.design} ===
(o documento DESIGN KIT OFICIAL completo, em Markdown, terminando com o prompt-base visual)`;
}

// Lê a resposta colada: devolve nome, contexto e Design Kit, ou explica o que faltou.
export function parseSetup(text) {
  const raw = String(text || "").replace(/\r\n/g, "\n").replace(/^\s*```[a-z]*\s*$/gim, "");
  if (raw.length > 120000) throw new Error("A resposta é longa demais. Cole só a parte final, com os três títulos.");
  const marker = /^[ \t>*_#]*={3}\s*(NOME DA MARCA|CONTEXTO (?:OFICIAL )?DA MARCA|DESIGN KIT(?: OFICIAL)?)\s*={3}[ \t*_]*$/gim;
  const found = [...raw.matchAll(marker)];
  const take = (pattern) => {
    const at = found.findIndex((m) => pattern.test(m[1].toUpperCase()));
    if (at < 0) return "";
    const start = found[at].index + found[at][0].length;
    const end = found[at + 1]?.index ?? raw.length;
    return raw.slice(start, end).trim();
  };
  const brand = take(/^CONTEXTO/), design = take(/^DESIGN KIT/);
  const name = take(/^NOME/).split("\n")[0].replace(/[*_#`]/g, "").trim().slice(0, 160);
  if (!brand && !design) throw new Error(`Não encontrei as partes da resposta. Ela precisa ter as linhas "=== ${SECTIONS.brand} ===" e "=== ${SECTIONS.design} ===".`);
  if (brand.length < 200) throw new Error("O Contexto da Marca veio vazio ou curto demais. Peça para a IA completar essa parte e cole de novo.");
  if (design.length < 150) throw new Error("O Design Kit veio vazio ou curto demais. Peça para a IA completar essa parte e cole de novo.");
  return { name, brand: brand.slice(0, 40000), design: design.slice(0, 40000) };
}

// Texto útil de uma página lida pelo app, limitado para caber no pedido.
export function pageSummary(page) {
  if (!page) return "";
  const lines = [
    page.title && `Título: ${page.title}`,
    page.description && `Descrição: ${page.description}`,
    page.url && `Endereço: ${page.url}`,
    page.colors?.length ? `Cores mais usadas no site: ${page.colors.join(", ")}` : "",
    page.text && `Texto da página:\n${String(page.text).slice(0, 18000)}`,
  ];
  return lines.filter(Boolean).join("\n");
}
