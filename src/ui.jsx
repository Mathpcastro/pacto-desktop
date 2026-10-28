import { useEffect, useLayoutEffect, useRef, useState } from "react";
import archivo500 from "@fontsource/archivo/files/archivo-latin-500-normal.woff2?inline";
import archivo800 from "@fontsource/archivo/files/archivo-latin-800-normal.woff2?inline";

// Fontes dos modelos embutidas na prévia: o iframe não depende de rede nem de CORS.
export const TEMPLATE_FONTS = { archivo500, archivo800 };

export const copyText = (value) =>
  navigator.clipboard?.writeText(value || "").catch(() => {});

// Menu suspenso simples: fecha ao clicar fora ou com Esc.
export function usePopover() {
  const [open, setOpen] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !ref.current?.contains(event.target) && !event.target.closest?.(".pop-anchor")) setOpen(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  return { open, setOpen, ref, toggle: (key) => setOpen((v) => (v === key ? null : key)) };
}

// Caixa de texto que cresce com o conteúdo: nunca rola por dentro.
export function Grow({ value, onChange, className = "", inputRef, ...props }) {
  const ref = useRef(null);
  const attach = (el) => {
    ref.current = el;
    if (inputRef) inputRef.current = el;
  };
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return <textarea ref={attach} rows={1} value={value} onChange={onChange} className={className} {...props} />;
}

// Mostra o HTML de um modelo (card ou página) no tamanho real, reduzido para caber.
export function TemplateFrame({ html, width, height, title = "Prévia" }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const measure = () => setScale(el.clientWidth / width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);
  return (
    <div className="tpl" ref={box}>
      {scale > 0 && (
        <iframe
          title={title}
          srcDoc={html}
          sandbox="allow-same-origin"
          tabIndex={-1}
          aria-hidden="true"
          width={width}
          height={height}
          style={{ transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}

// Markdown dos documentos da marca, lido sem HTML cru (títulos, listas, negrito).
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}
export function Markdown({ text, clamp = false }) {
  const blocks = [];
  let list = null;
  for (const raw of String(text || "").split("\n")) {
    const line = raw.trimEnd();
    const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      if (!list) {
        list = [];
        blocks.push({ type: "list", items: list });
      }
      list.push(item[1]);
      continue;
    }
    list = null;
    if (!line.trim()) continue;
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) blocks.push({ type: heading[1].length <= 2 ? "h3" : "h4", text: heading[2] });
    else blocks.push({ type: "p", text: line });
  }
  return (
    <div className={`doc-view ${clamp ? "clamp" : ""}`}>
      {blocks.map((b, i) =>
        b.type === "list" ? (
          <ul key={i}>
            {b.items.map((it, j) => (
              <li key={j}>{inline(it)}</li>
            ))}
          </ul>
        ) : b.type === "p" ? (
          <p key={i}>{inline(b.text)}</p>
        ) : b.type === "h3" ? (
          <h3 key={i}>{inline(b.text)}</h3>
        ) : (
          <h4 key={i}>{inline(b.text)}</h4>
        ),
      )}
    </div>
  );
}

export function Spinner() {
  return <i className="spinner" role="status" aria-label="Carregando" />;
}

export const FORMAT_LABEL = { carrossel: "Carrossel", material: "Material gratuito", apresentacao: "Apresentação" };
export const STYLE_LIST = [
  ["ia", "Arte com IA", "Ilustração e layout gerados para cada card"],
  ["tweet", "Tweet", "Moldura de post do X com seu nome e @"],
  ["texto", "Só texto · branco", "Fundo branco e texto no centro"],
  ["textopreto", "Só texto · preto", "Fundo preto e texto no centro"],
  ["fototexto", "Texto + foto", "Texto em cima e uma foto simples embaixo"],
  ["fundo", "Foto de fundo", "Uma foto sua ocupando o card inteiro"],
  ["recorte", "Capa com sua foto", "Você sobre a cor da marca"],
];
export const STYLE_SHORT = { ia: "Arte com IA", tweet: "Tweet", texto: "Texto branco", textopreto: "Texto preto", fototexto: "Texto + foto", fundo: "Foto de fundo", recorte: "Sua foto" };
export const statusLabels = {
  draft: "Rascunho",
  planning: "Escrevendo",
  ready: "Em criação",
  generating: "Gerando",
  complete: "Pronto",
  error: "Precisa de atenção",
};
export function firstLine(text, max = 80) {
  const line = String(text || "").split("\n").map((l) => l.trim()).find(Boolean) || "";
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}
