import { useState } from "react";
import {
  ArrowRight,
  ImagePlus,
  LoaderCircle,
  Radar,
  ScanSearch,
  Square,
  Star,
  Trash2,
  Trophy,
} from "lucide-react";
import { LessonLink } from "../course.jsx";

const sources = {
  radar: { label: "Radar de Pautas", icon: Radar },
  modelador: { label: "Modelador de Referências", icon: ScanSearch },
  replicador: { label: "Replicador de Vencedores", icon: Trophy },
};

export function IdeaCard({ idea, onCreate }) {
  return (
    <article className={`idea-card ${idea.top ? "top" : ""}`}>
      <header>
        {idea.top && (
          <span className="idea-badge">
            <Star size={11} /> Top 10
          </span>
        )}
        {idea.group && idea.group !== "Radar" && (
          <span className="idea-badge muted">{idea.group}</span>
        )}
        {idea.architecture && (
          <span className="idea-arch">{idea.architecture}</span>
        )}
      </header>
      <h3>{idea.hook || idea.theme}</h3>
      {idea.hook && <p className="idea-theme">{idea.theme}</p>}
      <dl>
        {idea.why && (
          <>
            <dt>Por que para</dt>
            <dd>{idea.why}</dd>
          </>
        )}
        {idea.deliverable && (
          <>
            <dt>Entrega</dt>
            <dd>{idea.deliverable}</dd>
          </>
        )}
        {idea.reason && (
          <>
            <dt>{idea.top ? "Por que testar primeiro" : "O que preserva"}</dt>
            <dd>{idea.reason}</dd>
          </>
        )}
      </dl>
      <button className="button secondary full" onClick={() => onCreate(idea)}>
        Criar carrossel <ArrowRight size={14} />
      </button>
    </article>
  );
}

export default function Ideas({ state, request, isPending, onCreate }) {
  const [tab, setTab] = useState("radar");
  const [focus, setFocus] = useState("");
  const [reference, setReference] = useState("");
  const [images, setImages] = useState([]);
  const [onlyTop, setOnlyTop] = useState(false);
  const batches = state.ideas || [];
  const working = state.working;
  const busy =
    Boolean(working) ||
    isPending("radar") ||
    isPending("modelReference") ||
    isPending("replicate");
  const connected = Boolean(state.account?.connected);
  const addImage = async () => {
    try {
      const ref = await request("importReference");
      if (ref?.dataUrl)
        setImages((list) =>
          [...list, { name: ref.name, dataUrl: ref.dataUrl }].slice(0, 4),
        );
    } catch {}
  };
  return (
    <main className="ideas page-enter">
      <header className="library-heading ideas-heading">
        <div>
          <span className="eyebrow">P · PAUTA</span>
          <h1>
            De onde vem
            <br />
            <em>a próxima ideia.</em>
          </h1>
          <p>
            Não tente prever o vencedor. Produza rápido o suficiente para
            encontrá-lo.
          </p>
        </div>
      </header>
      <div className="ideas-tools">
        <div className="tabs" role="tablist">
          {["radar", "modelador"].map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {sources[id].label}
            </button>
          ))}
        </div>
        {tab === "radar" ? (
          <form
            className="ideas-form"
            onSubmit={(e) => {
              e.preventDefault();
              request("radar", { focus: focus.trim() }).catch(() => {});
            }}
          >
            <label className="field">
              <span>
                Foco desta rodada <span className="muted">· opcional</span>
              </span>
              <input
                value={focus}
                maxLength={300}
                placeholder="Ex.: dúvidas de quem está começando, ferramentas, erros comuns"
                onChange={(e) => setFocus(e.target.value)}
              />
            </label>
            <p className="field-hint">
              Usa o seu Contexto Oficial da Marca para gerar 30 pautas e marcar
              as 10 mais fortes para testar primeiro.
            </p>
            <LessonLink step="radar" />
            <button className="button primary" disabled={busy || !connected}>
              {working === "radar" ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Radar size={15} />
              )}
              {working === "radar" ? "Gerando 30 pautas…" : "Gerar 30 pautas"}
            </button>
          </form>
        ) : (
          <form
            className="ideas-form"
            onSubmit={(e) => {
              e.preventDefault();
              request("modelReference", {
                text: reference.trim(),
                references: images,
              }).catch(() => {});
            }}
          >
            <label className="field">
              <span>
                Referência que performou bem{" "}
                <LessonLink step="modelador" compact />
              </span>
              <textarea
                rows={4}
                value={reference}
                placeholder="Cole o texto dos cards, a legenda ou descreva o post. Copie o motivo pelo qual funcionou, não o conteúdo."
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
            <div className="ideas-images">
              <button
                type="button"
                className="reference-add"
                onClick={addImage}
                disabled={images.length >= 4}
              >
                <ImagePlus size={18} />
                <span>
                  Anexar print
                  <small>Até 4 imagens do carrossel de referência</small>
                </span>
              </button>
              {images.map((img, i) => (
                <figure key={`${img.name}-${i}`}>
                  <img src={img.dataUrl} alt={img.name} />
                  <button
                    type="button"
                    aria-label={`Remover ${img.name}`}
                    onClick={() =>
                      setImages((list) => list.filter((_, j) => j !== i))
                    }
                  >
                    <Trash2 size={12} />
                  </button>
                </figure>
              ))}
            </div>
            <button
              className="button primary"
              disabled={
                busy || !connected || (!reference.trim() && !images.length)
              }
            >
              {working === "modelador" ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <ScanSearch size={15} />
              )}
              {working === "modelador"
                ? "Analisando a referência…"
                : "Modelar sem copiar"}
            </button>
          </form>
        )}
        {busy && (
          <div className="assistant-working" role="status">
            <LoaderCircle size={14} className="spin" />
            <span>Isso leva um ou dois minutos.</span>
            <button
              className="text-button"
              type="button"
              onClick={() => request("cancelWork").catch(() => {})}
            >
              <Square size={11} /> Parar
            </button>
          </div>
        )}
        {!connected && (
          <p className="field-hint">
            Conecte sua conta ChatGPT para gerar pautas.
          </p>
        )}
      </div>
      {batches.length > 0 && (
        <label className="only-top">
          <input
            type="checkbox"
            checked={onlyTop}
            onChange={(e) => setOnlyTop(e.target.checked)}
          />
          Mostrar só o Top 10 do Radar
        </label>
      )}
      {batches.map((batch) => {
        const Icon = sources[batch.source]?.icon || Radar;
        const ideas = onlyTop
          ? batch.ideas.filter((i) => i.top || batch.source !== "radar")
          : batch.ideas;
        return (
          <section className="idea-batch" key={batch.id}>
            <header>
              <div>
                <span className="eyebrow">
                  <Icon size={12} /> {sources[batch.source]?.label} ·{" "}
                  {new Date(batch.createdAt).toLocaleDateString("pt-BR")}
                </span>
                <h2>{batch.title}</h2>
                {batch.analysis && <p>{batch.analysis}</p>}
              </div>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  request("deleteIdeas", { batchId: batch.id }).catch(() => {})
                }
              >
                <Trash2 size={13} /> Remover
              </button>
            </header>
            <div className="idea-grid">
              {ideas.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} onCreate={onCreate} />
              ))}
            </div>
          </section>
        );
      })}
      {!batches.length && (
        <p className="ideas-empty">
          Suas pautas aparecem aqui. Comece pelo Radar ou modele uma referência
          que você viu funcionar.
        </p>
      )}
    </main>
  );
}
