// Modelos de card e de página montados pelo próprio app (sem gerar imagem com IA).
// As mesmas funções servem à prévia no editor e à renderização em PNG/PDF no
// processo principal, para que o arquivo exportado seja idêntico ao que a pessoa viu.

export const STYLES = ["ia", "tweet", "texto", "textopreto", "fototexto", "fundo", "recorte"];
export const TEMPLATE_STYLES = STYLES.filter((s) => s !== "ia");
export const PHOTO_STYLES = ["fototexto", "fundo", "recorte"];
export const FACE_STYLES = ["fundo", "recorte"];
export const FORMATS = ["carrossel", "material", "apresentacao"];
export const LAYOUTS = ["cover", "text", "checklist", "quote", "steps", "cta"];
export const SIZES = {
  carrossel: { width: 1080, height: 1350 },
  material: { width: 794, height: 1123 },
  apresentacao: { width: 1280, height: 720 },
  story: { width: 1080, height: 1920 },
};
// Stories só de texto, como quem digita no Instagram: fundo liso preto ou branco.
export const STORY_THEMES = {
  preto: { bg: "#000000", fg: "#ffffff" },
  branco: { bg: "#ffffff", fg: "#111111" },
};

const FALLBACK = { accent: "#ff5a36", ink: "#191919", paper: "#ffffff", soft: "#f4f1ec" };

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function saturation(hex) {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
// Paleta do Design Kit: as cores em hexadecimal que a entrevista registrou.
// Mais escura = texto, mais clara = fundo, mais saturada = destaque.
export function palette(designKit = "") {
  const found = [...new Set((String(designKit).match(/#[0-9a-f]{6}\b/gi) || []).map((h) => h.toLowerCase()))];
  if (found.length < 2) return { ...FALLBACK };
  const byLight = [...found].sort((a, b) => luminance(a) - luminance(b));
  const ink = luminance(byLight[0]) < 0.2 ? byLight[0] : FALLBACK.ink;
  const paper = luminance(byLight.at(-1)) > 0.7 ? byLight.at(-1) : "#ffffff";
  const rest = found.filter((h) => h !== ink && h !== paper);
  const accent = [...rest].sort((a, b) => saturation(b) - saturation(a))[0] || FALLBACK.accent;
  const soft = rest.filter((h) => h !== accent && luminance(h) > 0.6)[0] || (paper === "#ffffff" ? "#f4f2ee" : "#ffffff");
  return { accent, ink, paper, soft };
}
// Texto sobre a cor de destaque: escolhe o que tiver mais contraste.
function onColor(bg, ink) {
  return contrast(bg, "#ffffff") >= contrast(bg, ink) ? "#ffffff" : ink;
}
// Destaques do método: trechos inteiros separados por ponto e vírgula.
export function marked(text, emphasis = "") {
  let html = esc(text);
  for (const part of String(emphasis).split(";").map((p) => p.trim()).filter(Boolean)) {
    const safe = esc(part).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${safe})(?=$|[^\\p{L}\\p{N}])`, "iu");
    if (re.test(html) && !html.includes(`<mark>${esc(part)}</mark>`)) html = html.replace(re, "$1<mark>$2</mark>");
  }
  return html;
}
// Tamanho de fonte que cabe: textos curtos ficam grandes, longos diminuem.
export function fit(text, big, small, short = 24, long = 120) {
  const n = String(text || "").length;
  if (n <= short) return big;
  if (n >= long) return small;
  return Math.round(big - ((n - short) / (long - short)) * (big - small));
}
function fontFaces(fonts = {}) {
  return [
    fonts.archivo500 && `@font-face{font-family:"Archivo Studio";font-weight:500;src:url("${fonts.archivo500}") format("woff2")}`,
    fonts.archivo800 && `@font-face{font-family:"Archivo Studio";font-weight:800;src:url("${fonts.archivo800}") format("woff2")}`,
  ].filter(Boolean).join("");
}
const DISPLAY = `"Archivo Studio","Arial Black","Segoe UI",Arial,sans-serif`;
const SYSTEM = `"Segoe UI Variable Text","Segoe UI",-apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif`;
function documentShell({ width, height, css, body, fonts, title = "Carrossell", page }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${fontFaces(fonts)}
*{box-sizing:border-box;margin:0;padding:0}html,body{width:${width}px;${page ? "" : `height:${height}px;`}background:#fff;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
${page ? `@page{size:${width}px ${height}px;margin:0}` : ""}
mark{background:none;color:inherit}${css}</style></head><body>${body}</body></html>`;
}
const VERIFIED = `<svg viewBox="0 0 24 24" width="1em" height="1em" aria-label="verificado"><path fill="#1d9bf0" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"/><path fill="#fff" d="m10.54 16.2-3.74-3.75 1.42-1.41 2.32 2.33 5.29-5.3 1.42 1.42z"/></svg>`;
function avatar(brand, size) {
  const initial = esc((brand.name || "?").trim().charAt(0).toUpperCase());
  return brand.avatar
    ? `<img class="avatar" src="${esc(brand.avatar)}" alt="" style="width:${size}px;height:${size}px">`
    : `<span class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px">${initial}</span>`;
}
function who(brand, size, nameColor, handleColor) {
  return `<div class="who">${avatar(brand, size)}<div><b style="color:${nameColor}">${esc(brand.name || "Sua marca")}${brand.verified ? VERIFIED : ""}</b><small style="color:${handleColor}">@${esc((brand.handle || "seuperfil").replace(/^@/, ""))}</small></div></div>`;
}
function photoTag(src, label) {
  return src
    ? `<img class="photo" src="${esc(src)}" alt="">`
    : `<div class="photo empty"><span>${esc(label)}</span></div>`;
}
// Foto do card no estilo Texto + foto: o mesmo ambiente em fotos diferentes, uma por card.
// slide.photo pode ser o id da cena ou "id#n" para escolher a foto n da série.
export function scenePhoto(media = {}, choice = "", index = 0) {
  const scenes = (media.scenes || []).filter((s) => s.status === "approved" && (s.images?.length || s.image));
  const [id, n] = String(choice || "").split("#");
  const scene = scenes.find((s) => s.id === id) || scenes[0];
  if (!scene) return "";
  const list = scene.images?.length ? scene.images : [scene.image];
  const k = n !== undefined && n !== "" ? Number(n) : index;
  return list[((k % list.length) + list.length) % list.length] || "";
}
const SLIDE_CSS = (p) => `
body{font-family:${SYSTEM};overflow:hidden}
.card{position:relative;width:1080px;height:1350px;overflow:hidden;display:flex;flex-direction:column}
.who{display:flex;align-items:center;gap:22px}.who div{display:grid;gap:4px;line-height:1.1}
.who b{display:inline-flex;align-items:center;gap:10px;font-size:38px;font-weight:700}.who small{font-size:32px}
.avatar{border-radius:50%;object-fit:cover;display:grid;place-items:center;background:${p.accent};color:${onColor(p.accent, p.ink)};font-weight:700;flex:none}
.photo{display:block;width:100%;height:100%;object-fit:cover}
.photo.empty{display:grid;place-items:center;background:repeating-linear-gradient(135deg,#00000010 0 18px,#0000 18px 36px),#d9d4cc;color:#00000080;font:600 30px ${SYSTEM}}
h1{font-family:${DISPLAY};font-weight:800;letter-spacing:-0.025em;line-height:1.04;text-wrap:balance}
p.body{line-height:1.38;white-space:pre-line;text-wrap:pretty}
.pill{display:inline-flex;align-items:center;gap:14px;border:3px solid currentColor;border-radius:999px;padding:16px 34px;font:700 32px ${SYSTEM}}
.media{display:block;width:100%;min-height:0;flex:0 1 auto;max-height:560px;object-fit:cover;border-radius:28px}
.media.contain{object-fit:contain;background:#ffffff;padding:36px}`;

// Um card 1080×1350. variant muda o esquema de cor ou a composição (opções de capa).
export function slideHtml({ style, slide, index = 0, total = 1, brand = {}, media = {}, variant = 0, fonts }) {
  const p = brand.palette || FALLBACK;
  const cover = index === 0;
  const title = slide.title || "";
  const body = slide.body || "";
  const titleHtml = marked(title, slide.emphasis);
  // Imagem escolhida para o card (produto, logo, print): aparece inteira e sem cortes quando é logo.
  const asset = slide.assetImage || "";
  const mediaTag = (h) => (asset ? `<img class="media ${slide.assetKind === "logo" ? "contain" : ""}" style="max-height:${h}px" src="${esc(asset)}" alt="">` : "");
  let css = "", html = "";
  if (style === "tweet") {
    const scheme = [
      { bg: "#ffffff", fg: "#0f1419", sub: "#536471" },
      { bg: "#000000", fg: "#e7e9ea", sub: "#71767b" },
      { bg: p.soft, fg: p.ink, sub: p.ink + "b3" },
    ][variant % 3];
    const text = body ? `${title}\n\n${body}` : title;
    css = `.card{background:${scheme.bg};color:${scheme.fg};justify-content:center;padding:0 96px;gap:${asset ? 36 : 44}px}.tw{font-size:${asset ? fit(text, 52, 34, 60, 320) : fit(text, 68, 44, 60, 320)}px;line-height:1.36;white-space:pre-line;font-weight:400}.media{border:2px solid ${scheme.sub}40}`;
    html = `${who(brand, 104, scheme.fg, scheme.sub)}<p class="tw">${esc(text)}</p>${mediaTag(560)}`;
  } else if (style === "texto" || style === "textopreto") {
    const order = style === "texto" ? [0, 1, 2] : [1, 0, 2];
    const scheme = [
      { bg: "#ffffff", fg: "#111111", hl: p.accent },
      { bg: "#0b0b0b", fg: "#ffffff", hl: p.accent },
      { bg: p.accent, fg: onColor(p.accent, p.ink), hl: p.ink },
    ][order[variant % 3]];
    css = `.card{background:${scheme.bg};color:${scheme.fg};justify-content:center;align-items:center;text-align:center;padding:0 110px;gap:40px}
h1{font-family:${SYSTEM};font-weight:800;font-size:${asset ? fit(title, 76, 48, 30, 140) : fit(title, 92, 56, 30, 140)}px;line-height:1.16;letter-spacing:-0.015em}
mark{${variant % 3 === 2 ? `background:${p.ink};color:${p.paper};padding:0 .12em;border-radius:.08em;-webkit-box-decoration-break:clone;box-decoration-break:clone` : `color:${scheme.hl}`}}p.body{font-size:38px;opacity:.72}`;
    html = `<h1>${titleHtml}</h1>${body ? `<p class="body">${esc(body)}</p>` : ""}${mediaTag(520)}`;
  } else if (style === "fototexto") {
    const photo = asset || scenePhoto(media, slide.photo, index);
    const scheme = [
      { bg: p.soft, fg: p.ink, top: true },
      { bg: p.soft, fg: p.ink, top: false },
      { bg: p.ink, fg: "#ffffff", top: true },
    ][variant % 3];
    css = `.card{background:${scheme.bg};color:${scheme.fg};flex-direction:${scheme.top ? "column" : "column-reverse"}}
.txt{flex:1;display:flex;flex-direction:column;justify-content:center;gap:30px;padding:90px 96px 60px}
h1{font-size:${fit(title, 82, 54, 28, 130)}px}mark{color:${p.accent}}p.body{font-size:36px;opacity:.85}
.ph{height:46%;flex:none}${asset && slide.assetKind === "logo" ? ".ph .photo{object-fit:contain;background:#fff;padding:60px}" : ""}`;
    html = `<div class="txt"><h1>${titleHtml}</h1>${body ? `<p class="body">${esc(body)}</p>` : ""}</div><div class="ph">${photoTag(photo, "Cena aprovada")}</div>`;
  } else if (style === "fundo") {
    const face = (media.faces || []).find((f) => f.id === slide.photo) || (media.faces || [])[index % Math.max(1, (media.faces || []).length)];
    const align = ["center", "flex-end", "flex-start"][variant % 3];
    css = `.card{background:#111;color:#fff}.bg{position:absolute;inset:0}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,#000a 0%,#0000 38%,#0000 55%,#000c 100%)}
.ov{position:relative;z-index:1;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:${align === "flex-end" ? "flex-end" : align === "flex-start" ? "flex-start" : "flex-start"};text-align:center;padding:90px 80px;gap:30px}
.ov.left{align-items:flex-start;text-align:left}
h1{font-size:${fit(title, 96, 60, 24, 120)}px;text-shadow:0 4px 30px #0008}mark{color:${luminance(p.accent) > 0.15 ? p.accent : "#7fd9ff"}}
p.body{font-size:38px;text-shadow:0 2px 18px #000a}.spacer{flex:1}`;
    const pills = `<span class="pill" style="font-size:30px;padding:12px 30px">@${esc((brand.handle || "seuperfil").replace(/^@/, ""))}</span>`;
    const end = cover ? `<span class="pill">arrasta pro lado ›</span>` : "";
    html = `<div class="bg">${photoTag(asset || face?.dataUrl, "Sua foto")}</div><div class="shade"></div><div class="ov ${variant % 3 === 2 ? "left" : ""}">${pills}${variant % 3 === 1 ? '<div class="spacer"></div>' : ""}<h1>${titleHtml}</h1>${body ? `<p class="body">${esc(body)}</p>` : ""}${variant % 3 === 1 ? "" : '<div class="spacer"></div>'}${end}</div>`;
  } else if (style === "recorte") {
    const face = (media.faces || []).find((f) => f.id === slide.photo) || (media.faces || [])[0];
    const scheme = [
      { bg: p.accent, fg: onColor(p.accent, p.ink), hl: p.ink, src: face?.onColor?.[p.accent] },
      { bg: p.ink, fg: "#ffffff", hl: p.accent, src: face?.onColor?.[p.ink] },
      { bg: p.soft, fg: p.ink, hl: p.accent, src: face?.onColor?.[p.soft] },
    ][variant % 3];
    const src = scheme.src || face?.dataUrl;
    css = `.card{background:${scheme.bg};color:${scheme.fg};padding:80px 84px}
.person{position:absolute;right:${scheme.src ? "-40px" : "84px"};${scheme.src ? "bottom:0" : "top:220px"};width:${scheme.src ? "720px" : "380px"};height:${scheme.src ? "1050px" : "380px"};${scheme.src ? "" : "border-radius:50%;overflow:hidden;border:10px solid " + scheme.fg + "30;"}}
.who{position:relative;z-index:2}h1{position:relative;z-index:2;margin-top:auto;font-size:${fit(title, cover ? 130 : 96, 64, 18, 110)}px;line-height:.95;letter-spacing:-0.04em;text-shadow:0 6px 30px #0003}
mark{background:${scheme.hl};color:${scheme.bg};padding:0 .1em;border-radius:.08em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
p.body{position:relative;z-index:2;margin-top:28px;font-size:36px;max-width:780px}.pill{position:relative;z-index:2;margin-top:44px;align-self:flex-start}`;
    html = `${who(brand, 92, scheme.fg, scheme.fg + "b3")}${src ? `<div class="person">${photoTag(src, "")}</div>` : ""}<h1>${titleHtml}</h1>${body ? `<p class="body">${esc(body)}</p>` : ""}${cover ? `<span class="pill">→ Deslize para aprender</span>` : ""}`;
  } else {
    css = `.card{background:${p.paper};color:${p.ink};padding:110px 96px;gap:36px}h1{font-size:84px}mark{color:${p.accent}}p.body{font-size:38px}`;
    html = `<h1>${titleHtml}</h1>${body ? `<p class="body">${esc(body)}</p>` : ""}`;
  }
  return documentShell({ ...SIZES.carrossel, fonts, css: SLIDE_CSS(p) + css, body: `<main class="card" data-index="${index + 1}" data-total="${total}">${html}</main>` });
}

// Páginas de documento (material gratuito A4 e apresentação 16:9).
const PAGE_CSS = (p, wide) => `
body{font-family:${SYSTEM};color:${p.ink}}
.page{position:relative;width:${wide ? 1280 : 794}px;height:${wide ? 720 : 1123}px;overflow:hidden;display:flex;flex-direction:column;gap:${wide ? 22 : 24}px;padding:${wide ? "64px 84px 48px" : "86px 76px 56px"};background:${p.paper};page-break-after:always;break-after:page}
.page:last-child{page-break-after:auto;break-after:auto}
.eb{font:700 ${wide ? 15 : 13}px ${SYSTEM};letter-spacing:.16em;text-transform:uppercase;color:${p.accent}}
h1{font-family:${DISPLAY};font-weight:800;letter-spacing:-.02em;line-height:1.06;text-wrap:balance}
h1 mark{background:${p.accent};color:${onColor(p.accent, p.ink)};padding:0 .12em;border-radius:.08em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
p.body{font-size:${wide ? 24 : 18}px;line-height:1.6;color:${p.ink}d9;white-space:pre-line;max-width:${wide ? 940 : 640}px}
ul{list-style:none;display:grid;gap:${wide ? 14 : 12}px;${wide ? "grid-template-columns:1fr 1fr;" : ""}}
li{display:flex;gap:16px;align-items:flex-start;font-size:${wide ? 22 : 18}px;line-height:1.45;padding:${wide ? "16px 18px" : "14px 16px"};border:1.5px solid ${p.ink}1f;border-radius:10px;background:#ffffffaa}
li::before{content:"";width:20px;height:20px;border:3px solid ${p.accent};border-radius:5px;flex:none;margin-top:3px}
.quote{background:${p.soft};border-left:6px solid ${p.accent};padding:24px 28px;border-radius:10px;font-size:${wide ? 22 : 17}px;line-height:1.65;white-space:pre-line}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:${wide ? 22 : 14}px}
.steps div{border:1.5px solid ${p.ink}1f;border-radius:12px;padding:${wide ? "24px" : "18px"};font-size:${wide ? 19 : 15}px;line-height:1.5;color:${p.ink}cc;background:#ffffffaa}
.steps i{display:block;font:800 ${wide ? 44 : 34}px ${DISPLAY};color:${p.accent};font-style:normal}.steps b{display:block;font:800 ${wide ? 22 : 17}px ${DISPLAY};color:${p.ink};margin:6px 0}
.foot{margin-top:auto;display:flex;justify-content:space-between;font:700 ${wide ? 13 : 11}px ${SYSTEM};letter-spacing:.2em;text-transform:uppercase;opacity:.5}
.page.cover h1{margin-top:auto;font-size:${wide ? 76 : 64}px}.page.cover .bar{margin-top:28px;height:10px;width:32%;border-radius:99px;background:${p.accent}}
.page.cover.v0{background:${p.ink};color:#fff}.page.cover.v0 p.body{color:#ffffffc7}
.page.cover.v1{background:${p.paper}}.page.cover.v1 .bar{background:${p.ink}}
.page.cover.v2,.page.cta{background:${p.accent};color:${onColor(p.accent, p.ink)}}
.page.cover.v2 p.body,.page.cta p.body,.page.cover.v2 .eb,.page.cta .eb{color:${onColor(p.accent, p.ink)}}
.page.cover.v2 h1 mark,.page.cta h1 mark{background:${p.ink};color:${p.paper}}.page.cover.v2 .bar{background:${p.ink}}`;
function pageBody(page, i, total, wide, brand, coverVariant) {
  const layout = LAYOUTS.includes(page.layout) ? page.layout : i === 0 ? "cover" : "text";
  const h = (size) => `<h1 style="font-size:${size}px">${marked(page.title, page.emphasis)}</h1>`;
  const lines = String(page.body || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const foot = `<div class="foot"><span>${esc(brand.name || "")}</span><span>${i + 1} / ${total}</span></div>`;
  const eb = `<span class="eb">${esc(page.role || "")}</span>`;
  if (layout === "cover")
    return `<section class="page cover v${coverVariant % 3}">${page.role && !/^capa$/i.test(page.role.trim()) ? eb : `<span class="eb">${esc(brand.name || "")}</span>`}<h1>${marked(page.title, page.emphasis)}</h1>${page.body ? `<p class="body">${esc(page.body)}</p>` : ""}<div class="bar"></div></section>`;
  if (layout === "checklist")
    return `<section class="page">${eb}${h(wide ? 46 : 38)}<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>${foot}</section>`;
  if (layout === "quote")
    return `<section class="page">${eb}${h(wide ? 46 : 38)}<div class="quote">${esc(page.body)}</div>${foot}</section>`;
  if (layout === "steps") {
    const steps = lines.slice(0, 6).map((l, n) => {
      const [t, ...d] = l.split(/\s+[—–-]\s+/);
      return `<div><i>${n + 1}</i><b>${esc(t)}</b>${esc(d.join(" — "))}</div>`;
    });
    return `<section class="page">${eb}${h(wide ? 46 : 38)}<div class="steps">${steps.join("")}</div>${foot}</section>`;
  }
  if (layout === "cta")
    return `<section class="page cta">${eb}${h(wide ? 60 : 48)}<p class="body">${esc(page.body)}</p>${foot}</section>`;
  return `<section class="page">${eb}${h(wide ? 52 : 40)}<p class="body">${esc(page.body)}</p>${foot}</section>`;
}
export function documentHtml({ format, pages, brand = {}, coverVariant = 0, fonts, only = null }) {
  const wide = format === "apresentacao";
  const p = brand.palette || FALLBACK;
  const list = only === null ? pages : [pages[only]];
  const body = list.map((page) => pageBody(page, pages.indexOf(page), pages.length, wide, brand, coverVariant)).join("");
  return documentShell({ ...SIZES[format], fonts, css: PAGE_CSS(p, wide), body, page: only === null, title: pages[0]?.title });
}
// Story 1080×1920 só de texto. O texto fica fora das faixas que o Instagram cobre (topo e rodapé);
// com sticker (enquete ou caixa de perguntas), sobe e deixa a metade de baixo livre para colar o sticker.
export function storyHtml({ story, theme = "preto", fonts }) {
  const t = STORY_THEMES[theme] || STORY_THEMES.preto;
  const text = String(story?.text || "").trim();
  const sticker = Boolean(String(story?.sticker || "").trim());
  const css = `body{font-family:${SYSTEM};overflow:hidden}
.story{width:1080px;height:1920px;background:${t.bg};color:${t.fg};display:flex;flex-direction:column;justify-content:${sticker ? "flex-start" : "center"};padding:${sticker ? 360 : 300}px 112px ${sticker ? 960 : 420}px}
p{font-size:${fit(text, 84, 54, 40, 220)}px;line-height:1.24;font-weight:700;letter-spacing:-0.01em;white-space:pre-line;text-wrap:pretty}`;
  return documentShell({ ...SIZES.story, fonts, css, body: `<div class="story"><p>${esc(text)}</p></div>`, title: "Story" });
}
// O carrossel pronto como PDF de várias páginas (LinkedIn aceita PDF como carrossel).
export function imagesPdfHtml(images, title = "Carrossel") {
  const body = images.map((src) => `<section style="width:1080px;height:1350px;break-after:page;page-break-after:always"><img src="${esc(src)}" style="display:block;width:1080px;height:1350px"></section>`).join("");
  return documentShell({ ...SIZES.carrossel, css: "section:last-child{break-after:auto;page-break-after:auto}", body, page: true, title });
}
