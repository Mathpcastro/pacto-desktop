import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Dialog from "./Dialog.jsx";
import { REFERENCES } from "../data/references.js";
import { REFERENCE_IMAGES } from "../data/referenceImages.js";
import { filterReferences } from "../referenceLibrary.js";

const NICHES = [
  ["all", "Todos"],
  ["ia", "IA"],
  ["saas", "SaaS"],
  ["marketing_digital", "Marketing digital"],
  ["direct_response", "Direct response"],
];
// Nichos dos slideshows do TikTok (pacote do plano Completo).
const NICHE_LABELS = {
  apps: "Apps em geral", estudos: "Estudos", produtividade: "Produtividade", financas: "Finanças",
  fitness: "Fitness", bem_estar: "Bem-estar", beleza: "Beleza", negocios: "Negócios",
};
const PLATFORM_LABELS = { tiktok: "TikTok", instagram: "Instagram", linkedin: "LinkedIn" };
// Os nichos da coleção escolhida: os do Instagram de sempre ou os que existem no pacote.
const nichesFor = items => {
  const known = new Set(items.map(item => item.niche));
  const fixed = NICHES.filter(([value]) => value === "all" || known.has(value));
  const extra = [...known].filter(value => value && !NICHES.some(([v]) => v === value)).map(value => [value, NICHE_LABELS[value] || value]);
  return [...fixed, ...extra];
};
const GOALS = [
  ["all", "Todos"],
  ["Alcance", "Alcance"],
  ["Comentários", "Comentários"],
  ["Salvamentos", "Salvamentos"],
  ["Levar para uma oferta", "Oferta"],
];
const compactNumber = new Intl.NumberFormat("pt-BR", { notation: "compact" });

const PAGE_SIZE = 24;
const coverageLabel = item => item.coverage === "full_slides" ? "Sequência multipágina" : "Referência parcial";
const evidenceLabel = item => ({ platform_screenshot: "Print da plataforma", search_result_screenshot: "Print da busca", metrics_text_only: "Métrica textual" })[item.evidence];
const metrics = item => [
  item.views == null ? "" : `${compactNumber.format(item.views)} views`,
  item.saves == null ? "" : `${compactNumber.format(item.saves)} salvos`,
  item.likes == null ? "" : `${compactNumber.format(item.likes)} curtidas`,
  item.comments == null ? "" : `${compactNumber.format(item.comments)} comentários`,
].filter(Boolean).join(" · ") || item.metricText;

function ReferenceCard({ item, onUse, onDetails }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imported = Boolean(item.coverage);
  const image = imported ? item.image : REFERENCE_IMAGES[item.sourceId];
  const headingId = `reference-${item.id}`;

  return (
    <article className="reference-card" aria-labelledby={headingId}>
      <div className="reference-cover">
        {!imageFailed && image ? (
          <img
            src={image}
            alt={`Capa da referência ${item.sourceId}, de ${item.author}`}
            width={360}
            height={450}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="reference-cover-fallback" role="img" aria-label={`Capa da referência ${item.sourceId} indisponível`}>
            <b>{item.sourceId}</b>
            <span>Capa indisponível</span>
          </div>
        )}
      </div>
      <div className="reference-body">
        <div className="reference-heading">
          <h2 className="reference-hook" id={headingId}>{item.hook}</h2>
          <p className="reference-author">por {item.author}</p>
        </div>
        <div className="reference-tags" aria-label="Classificação editorial">
          <span className="chip">{imported ? coverageLabel(item) : item.architecture}</span>
          <span className="chip accent">{imported ? PLATFORM_LABELS[item.platform] || item.platform : item.goal}</span>
        </div>
        {metrics(item) && <p className="reference-metrics">{metrics(item)}</p>}
        {!imported && <div className="reference-reason">
          <b>Por que funcionou</b>
          <p>{item.reason}</p>
        </div>}
        {imported && <button type="button" className="btn" onClick={() => onDetails(item)}>Ver referência</button>}
        {image && <button type="button" className="btn primary reference-use" aria-label={`Usar referência ${item.sourceId}: ${item.hook}`} onClick={() => onUse(item, image)}>
          Usar referência
        </button>}
      </div>
    </article>
  );
}

export default function References({ onUse, request, onImport, importing, revision }) {
  const [query, setQuery] = useState("");
  const [niche, setNiche] = useState("all");
  const [goal, setGoal] = useState("all");
  const [pack, setPack] = useState(null);
  const [source, setSource] = useState("imported");
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState(null);
  const [slide, setSlide] = useState(0);
  const [proof, setProof] = useState(false);
  useEffect(() => {
    let current = true;
    request("referenceCatalog").then(value => {
      if (current && Array.isArray(value?.items)) {
        setPack(value);
        if (revision) setSource(value.packs?.at(-1)?.id || "imported");
      }
    }).catch(() => {});
    return () => { current = false; };
  }, [revision, request]);
  // Cada pacote instalado (Instagram, TikTok) é uma coleção; "builtin" são as 36 que vêm no app.
  const collections = pack ? (pack.packs || [{ id: "kimi-500", title: pack.title, items: pack.items }]) : [];
  const chosen = collections.find(item => item.id === source) || collections[0];
  const imported = Boolean(chosen && source !== "builtin");
  const catalog = imported ? chosen.items : REFERENCES;
  const niches = imported ? nichesFor(catalog) : NICHES;
  const filtered = useMemo(() => filterReferences(catalog, query, niche, imported ? "all" : goal), [catalog, query, niche, imported, goal]);
  const pages = imported ? Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)) : 1;
  const shownPage = Math.min(page, pages);
  const results = imported ? filtered.slice((shownPage - 1) * PAGE_SIZE, shownPage * PAGE_SIZE) : filtered;
  const clearFilters = () => {
    setQuery("");
    setNiche("all");
    setGoal("all");
    setPage(1);
  };
  const select = async (item, image) => {
    try {
      onUse(item, item.coverage ? await request("referenceAttachment", { id: item.id }) : image);
    } catch {}
  };
  const openDetails = async item => {
    try {
      const result = await request("referenceDetails", { id: item.id });
      setSlide(0);
      setProof(false);
      setDetails(result);
    } catch {}
  };

  return (
    <div className="page reference-page">
      <header className="reference-intro">
        <h1 className="page-title">Referências que valem estudar</h1>
        <p className="page-sub">Use a estrutura como ponto de partida e adapte a copy e a arte à sua marca.</p>
      </header>

      <div className="reference-import">
        <span className="hint">Arraste o ZIP do Swipe File para cá.</span>
        <button type="button" className="btn" disabled={importing} onClick={() => onImport()}>Importar Swipe File</button>
        {importing && <span className="hint" role="status">Validando o Swipe File…</span>}
      </div>
      {pack && <div className="seg" role="group" aria-label="Coleções da Biblioteca">
        {collections.map(item => (
          <button type="button" key={item.id} aria-pressed={imported && chosen.id === item.id} onClick={() => { setSource(item.id); clearFilters(); }}>{item.title}</button>
        ))}
        <button type="button" aria-pressed={!imported} onClick={() => { setSource("builtin"); clearFilters(); }}>Referências incluídas</button>
      </div>}
      <section className="reference-toolbar" aria-label="Buscar e filtrar referências">
        <div className="section-head">
          <label className="search-box reference-search">
            <Search size={15} aria-hidden="true" />
            <input aria-label="Buscar referências" placeholder="Buscar por tema, autor ou ideia" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
          </label>
          <span className="meta reference-count" role="status" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "referência" : "referências"}
          </span>
        </div>
        <div className="reference-filters">
          <div className="reference-filter">
            <span className="reference-filter-label" id="reference-niche-label">Nicho</span>
            <div className="seg" role="group" aria-labelledby="reference-niche-label">
              {niches.map(([value, label]) => (
                <button type="button" key={value} aria-pressed={niche === value} onClick={() => { setNiche(value); setPage(1); }}>{label}</button>
              ))}
            </div>
          </div>
          {!imported && <div className="reference-filter">
            <span className="reference-filter-label" id="reference-goal-label">Objetivo</span>
            <div className="seg" role="group" aria-labelledby="reference-goal-label">
              {GOALS.map(([value, label]) => (
                <button type="button" key={value} aria-pressed={goal === value} onClick={() => setGoal(value)}>{label}</button>
              ))}
            </div>
          </div>}
        </div>
      </section>

      {filtered.length ? (
        <section className="reference-grid" aria-label="Referências encontradas">
          {results.map((item) => <ReferenceCard key={item.id} item={item} onUse={select} onDetails={openDetails} />)}
        </section>
      ) : (
        <div className="empty-state reference-empty">
          <span>Nenhuma referência encontrada com esses filtros.</span>
          <button type="button" className="btn" onClick={clearFilters}>Limpar filtros</button>
        </div>
      )}
      {pages > 1 && <nav className="row reference-pagination" aria-label="Paginação da Biblioteca">
        <button type="button" className="btn" disabled={shownPage === 1} onClick={() => setPage(shownPage - 1)}>Anterior</button>
        <span className="hint" role="status">{shownPage} / {pages}</span>
        <button type="button" className="btn" disabled={shownPage === pages} onClick={() => setPage(shownPage + 1)}>Próxima</button>
      </nav>}
      {details && <Dialog title={details.hook} onClose={() => setDetails(null)} wide>
        <div className="reference-detail">
          <p>{details.author} · {coverageLabel(details)} · {evidenceLabel(details)}</p>
          {metrics(details) && <p className="hint">{metrics(details)}</p>}
          {(proof ? details.proof : details.slides[slide]) && <img src={proof ? details.proof : details.slides[slide]} alt={proof ? "Print de engajamento" : "Card da referência"} />}
          <div className="row">
            {details.slides.length > 1 && !proof && <>
              <button type="button" className="btn" disabled={slide === 0} onClick={() => setSlide(slide - 1)}>Anterior</button>
              <span className="hint">{slide + 1} / {details.slides.length}</span>
              <button type="button" className="btn" disabled={slide === details.slides.length - 1} onClick={() => setSlide(slide + 1)}>Próxima</button>
            </>}
            {details.proof && <button type="button" className="btn" aria-pressed={proof} onClick={() => setProof(!proof)}>Print de engajamento</button>}
            <button type="button" className="ghost-btn" onClick={() => request("referenceOpenOriginal", { id: details.id }).catch(() => {})}>Abrir publicação original</button>
          </div>
          {details.caption && <p className="reference-caption">{details.caption}</p>}
        </div>
      </Dialog>}
    </div>
  );
}
