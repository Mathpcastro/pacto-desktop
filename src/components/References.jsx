import { useMemo, useState } from "react";
import { Search } from "lucide-react";
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
const GOALS = [
  ["all", "Todos"],
  ["Alcance", "Alcance"],
  ["Comentários", "Comentários"],
  ["Salvamentos", "Salvamentos"],
  ["Levar para uma oferta", "Oferta"],
];
const compactNumber = new Intl.NumberFormat("pt-BR", { notation: "compact" });

function ReferenceCard({ item, onUse }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = REFERENCE_IMAGES[item.sourceId];
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
          <span className="chip">{item.architecture}</span>
          <span className="chip accent">{item.goal}</span>
        </div>
        <p className="reference-metrics" aria-label={`${item.likes} curtidas e ${item.comments} comentários observados no acervo`}>
          {compactNumber.format(item.likes)} curtidas · {compactNumber.format(item.comments)} comentários
        </p>
        <div className="reference-reason">
          <b>Por que funcionou</b>
          <p>{item.reason}</p>
        </div>
        <button type="button" className="btn primary reference-use" onClick={() => onUse(item, REFERENCE_IMAGES[item.sourceId])}>
          Usar referência
        </button>
      </div>
    </article>
  );
}

export default function References({ onUse }) {
  const [query, setQuery] = useState("");
  const [niche, setNiche] = useState("all");
  const [goal, setGoal] = useState("all");
  const filtered = useMemo(() => filterReferences(REFERENCES, query, niche, goal), [query, niche, goal]);
  const clearFilters = () => {
    setQuery("");
    setNiche("all");
    setGoal("all");
  };

  return (
    <main className="page reference-page">
      <header className="reference-intro">
        <h1 className="page-title">Referências que valem estudar</h1>
        <p className="page-sub">Use a estrutura como ponto de partida: a copy e a arte são adaptadas à sua marca, sem copiar o autor.</p>
      </header>

      <section className="reference-toolbar" aria-label="Buscar e filtrar referências">
        <div className="section-head">
          <label className="search-box reference-search">
            <Search size={15} aria-hidden="true" />
            <input aria-label="Buscar referências" placeholder="Buscar por tema, autor ou ideia" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <span className="meta reference-count" role="status" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "referência" : "referências"}
          </span>
        </div>
        <div className="reference-filters">
          <div className="reference-filter">
            <span className="reference-filter-label" id="reference-niche-label">Nicho</span>
            <div className="seg" role="group" aria-labelledby="reference-niche-label">
              {NICHES.map(([value, label]) => (
                <button type="button" key={value} aria-pressed={niche === value} onClick={() => setNiche(value)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="reference-filter">
            <span className="reference-filter-label" id="reference-goal-label">Objetivo</span>
            <div className="seg" role="group" aria-labelledby="reference-goal-label">
              {GOALS.map(([value, label]) => (
                <button type="button" key={value} aria-pressed={goal === value} onClick={() => setGoal(value)}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {filtered.length ? (
        <section className="reference-grid" aria-label="Referências encontradas">
          {filtered.map((item) => <ReferenceCard key={item.id} item={item} onUse={onUse} />)}
        </section>
      ) : (
        <div className="empty-state reference-empty">
          <span>Nenhuma referência encontrada com esses filtros.</span>
          <button type="button" className="btn" onClick={clearFilters}>Limpar filtros</button>
        </div>
      )}
    </main>
  );
}
