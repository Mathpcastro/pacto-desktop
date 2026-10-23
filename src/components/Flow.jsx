import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Save,
  Sparkles,
  Trophy,
  WandSparkles,
} from "lucide-react";
import Dialog from "./Dialog.jsx";

// Etapas do fluxo do curso (Aula 06): texto aprovado → capa escolhida → restante.
export function projectStage(project) {
  const slides = project.slides || [];
  if (!slides.length) return "start";
  if (!project.textApproved) return "text";
  if (!slides[0].image) return "cover";
  return "slides";
}

export function StageBar({ stage }) {
  const steps = [
    ["text", "Texto"],
    ["cover", "Capa"],
    ["slides", "Carrossel"],
  ];
  const order = ["start", "text", "cover", "slides"];
  const current = order.indexOf(stage);
  return (
    <ol className="stage-bar" aria-label="Etapas do carrossel">
      {steps.map(([id, label], i) => {
        const position = order.indexOf(id);
        const state =
          position < current ? "done" : position === current ? "current" : "";
        return (
          <li key={id} className={state}>
            <span>{state === "done" ? <Check size={11} /> : i + 1}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

const checklist = [
  "A capa faria você parar?",
  "O card 2 paga a promessa ou enrola?",
  "Cada card tem uma ideia principal e utilidade concreta?",
  "Não há frases que você jamais falaria?",
  "O texto está específico para o seu público?",
  "O último card deixa claro o que a pessoa recebe e o que fazer?",
];
const words = (value) => (value.trim() ? value.trim().split(/\s+/).length : 0);
const fromProject = (project) => ({
  editorialLine: project.editorialLine || "",
  visualConcept: project.visualConcept || "",
  caption: project.caption || "",
  slides: (project.slides || []).map((s) => ({
    id: s.id,
    role: s.role || "",
    title: s.title || "",
    body: s.body || "",
    emphasis: s.emphasis || "",
    visual: s.visual || "",
    prompt: s.prompt || "",
  })),
});

export function ProjectDirection({ project, request, busy, onGenerate }) {
  const [form, setForm] = useState({
    editorialLine: project.editorialLine || "",
    visualConcept: project.visualConcept || "",
  });
  return (
    <div className="direction-form">
      <label className="field">
        <span>
          Linha editorial <span className="muted">· opcional</span>
        </span>
        <textarea
          rows={2}
          placeholder="Ex.: direto, com humor leve, sempre mostrando o erro e o jeito certo. Vazio: o PACTO sugere."
          value={form.editorialLine}
          onChange={(e) => setForm({ ...form, editorialLine: e.target.value })}
        />
      </label>
      <label className="field">
        <span>
          Mascote, desenho ou efeito <span className="muted">· opcional</span>
        </span>
        <textarea
          rows={2}
          placeholder="Ex.: a tigelinha de barro sorridente aparece em todos os cards. Vazio: o PACTO sugere pelo seu Design Kit."
          value={form.visualConcept}
          onChange={(e) => setForm({ ...form, visualConcept: e.target.value })}
        />
      </label>
      <button
        className="button primary"
        disabled={busy}
        onClick={async () => {
          try {
            await request("saveProject", { id: project.id, ...form });
            onGenerate();
          } catch {}
        }}
      >
        {busy ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <WandSparkles size={16} />
        )}
        {busy ? "Escrevendo o texto…" : "Gerar o texto do carrossel"}
      </button>
    </div>
  );
}

export function CopyBoard({
  project,
  request,
  busy,
  selectedId,
  onDirtyChange,
  onAskAssistant,
}) {
  const [draft, setDraft] = useState(() => fromProject(project));
  const [baseline, setBaseline] = useState(() => fromProject(project));
  const [checked, setChecked] = useState([]);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => {
    const incoming = fromProject(project);
    if (JSON.stringify(incoming) === JSON.stringify(baseline)) return;
    setBaseline(incoming);
    // Keep local edits; adopt the new version only when nothing is pending.
    if (!dirty) setDraft(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.updatedAt]);
  useEffect(() => {
    if (selectedId)
      document
        .getElementById(`card-${selectedId}`)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [selectedId]);
  const edit = (id, key, value) =>
    setDraft((d) => ({
      ...d,
      slides: d.slides.map((s) => (s.id === id ? { ...s, [key]: value } : s)),
    }));
  const save = async () => {
    setSaving(true);
    try {
      await request("saveProject", {
        id: project.id,
        editorialLine: draft.editorialLine,
        visualConcept: draft.visualConcept,
        caption: draft.caption,
        slides: project.slides.map((s) => ({
          ...s,
          ...draft.slides.find((d) => d.id === s.id),
        })),
      });
      setBaseline(draft);
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };
  const approve = async () => {
    if (dirty && !(await save())) return;
    request("approveText", { id: project.id }).catch(() => {});
  };
  const allChecked = checked.length === checklist.length;
  return (
    <div className="copy-board">
      <header className="copy-board-head">
        <div>
          <span className="eyebrow">ETAPA 1 · TEXTO DO CARROSSEL</span>
          <h2>Revise antes de virar arte.</h2>
          <p>
            Edite o que quiser. A arte só é gerada depois que você aprovar o
            texto. {project.architecture && <em>{project.architecture}</em>}
          </p>
        </div>
      </header>
      <div className="copy-direction">
        <label className="field">
          <span>Linha editorial</span>
          <textarea
            rows={2}
            value={draft.editorialLine}
            onChange={(e) =>
              setDraft({ ...draft, editorialLine: e.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Mascote, desenho ou efeito recorrente</span>
          <textarea
            rows={2}
            value={draft.visualConcept}
            onChange={(e) =>
              setDraft({ ...draft, visualConcept: e.target.value })
            }
          />
        </label>
      </div>
      <div className="copy-cards">
        {draft.slides.map((s, i) => {
          const count = words(s.title) + words(s.body);
          return (
            <article className="copy-card" id={`card-${s.id}`} key={s.id}>
              <header>
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                <input
                  aria-label={`Função do card ${i + 1}`}
                  className="copy-role"
                  value={s.role}
                  placeholder={i === 0 ? "Capa" : "Função do card"}
                  onChange={(e) => edit(s.id, "role", e.target.value)}
                />
                <span className={`word-count ${count > 45 ? "over" : ""}`}>
                  {count} palavras
                </span>
              </header>
              <label className="field">
                <span>Título</span>
                <textarea
                  rows={2}
                  className="copy-title"
                  value={s.title}
                  onChange={(e) => edit(s.id, "title", e.target.value)}
                />
              </label>
              {i === 0 && project.coverHooks?.length > 0 && (
                <div className="hook-options">
                  <span>Outras headlines de capa</span>
                  <div className="goal-chips">
                    {project.coverHooks.map((hook) => (
                      <button
                        type="button"
                        key={hook}
                        className={s.title === hook ? "selected" : ""}
                        aria-pressed={s.title === hook}
                        onClick={() => edit(s.id, "title", hook)}
                      >
                        {hook}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label className="field">
                <span>Texto do card</span>
                <textarea
                  rows={3}
                  value={s.body}
                  onChange={(e) => edit(s.id, "body", e.target.value)}
                />
              </label>
              <div className="copy-card-extra">
                <label className="field">
                  <span>Destaque</span>
                  <input
                    value={s.emphasis}
                    onChange={(e) => edit(s.id, "emphasis", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Ilustração do card</span>
                  <textarea
                    rows={2}
                    value={s.visual}
                    onChange={(e) => edit(s.id, "visual", e.target.value)}
                  />
                </label>
              </div>
            </article>
          );
        })}
      </div>
      <label className="field copy-caption">
        <span>Legenda (CTA na primeira linha)</span>
        <textarea
          rows={4}
          value={draft.caption}
          onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
        />
      </label>
      <section className="review-checklist" aria-label="Revisão humana">
        <span className="eyebrow">REVISÃO HUMANA · AULA 04</span>
        <p>A IA acelera a escrita. Seu julgamento decide se vale publicar.</p>
        {checklist.map((item) => (
          <label key={item}>
            <input
              type="checkbox"
              checked={checked.includes(item)}
              onChange={(e) =>
                setChecked((c) =>
                  e.target.checked ? [...c, item] : c.filter((x) => x !== item),
                )
              }
            />
            {item}
          </label>
        ))}
      </section>
      <footer className="copy-board-footer">
        <button className="text-button" type="button" onClick={onAskAssistant}>
          <MessageCircle size={14} /> Pedir ajuste ao assistente
        </button>
        <div>
          <button
            className="button secondary"
            disabled={!dirty || saving || busy}
            onClick={save}
          >
            {saving ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Save size={15} />
            )}
            {dirty ? "Salvar texto" : "Texto salvo"}
          </button>
          <button
            className="button primary"
            disabled={!allChecked || saving || busy}
            title={
              allChecked
                ? "Aprovar e seguir para a capa"
                : "Confira a revisão humana para aprovar"
            }
            onClick={approve}
          >
            <CheckCircle2 size={15} /> Aprovar texto e criar a capa
          </button>
        </div>
      </footer>
    </div>
  );
}

export function CoverPicker({ project, request, busy, connected }) {
  const [total, setTotal] = useState(3);
  const options = project.coverOptions || [];
  const generating = busy && project.status === "generating";
  return (
    <div className="cover-picker">
      <header>
        <span className="eyebrow">ETAPA 2 · CAPA</span>
        <h2>Escolha a capa que faria você parar.</h2>
        <p>
          A capa escolhida vira a referência de estilo dos outros cards.
          {project.slides[0] && (
            <>
              {" "}
              Título: <strong>{project.slides[0].title}</strong>
            </>
          )}
        </p>
      </header>
      <div className="cover-options">
        {options.map((option, i) => (
          <figure key={option.id}>
            <img src={option.image} alt={`Opção de capa ${i + 1}`} />
            <button
              className="button primary full"
              disabled={busy}
              onClick={() =>
                request("chooseCover", {
                  id: project.id,
                  optionId: option.id,
                }).catch(() => {})
              }
            >
              <Check size={15} /> Usar esta capa
            </button>
          </figure>
        ))}
        {generating && (
          <figure className="cover-placeholder" role="status">
            <LoaderCircle className="spin" size={22} />
            <span>Desenhando…</span>
          </figure>
        )}
      </div>
      <footer>
        <button
          className="text-button"
          disabled={busy}
          onClick={() =>
            request("approveText", { id: project.id, approved: false }).catch(
              () => {},
            )
          }
        >
          <ArrowLeft size={14} /> Voltar ao texto
        </button>
        <div className="cover-generate">
          <span>Opções</span>
          {[2, 3].map((n) => (
            <button
              key={n}
              className={total === n ? "selected" : ""}
              onClick={() => setTotal(n)}
              aria-pressed={total === n}
            >
              {n}
            </button>
          ))}
          <button
            className="button primary"
            disabled={busy || !connected}
            onClick={() =>
              request("generateCovers", { id: project.id, count: total }).catch(
                () => {},
              )
            }
          >
            {generating ? (
              <LoaderCircle className="spin" size={15} />
            ) : options.length ? (
              <RefreshCw size={15} />
            ) : (
              <Sparkles size={15} />
            )}
            {options.length ? "Gerar outras opções" : "Gerar opções de capa"}
          </button>
        </div>
      </footer>
    </div>
  );
}

export function FixDialog({ project, slide, problems, request, onClose }) {
  const [chosen, setChosen] = useState([]);
  const [note, setNote] = useState("");
  return (
    <Dialog
      title="O que precisa corrigir?"
      eyebrow={`CORREÇÃO VISUAL RÁPIDA · CARD ${slide.index}`}
      onClose={onClose}
    >
      <div className="dialog-fields">
        <p className="field-hint">
          O PACTO corrige só o que você marcar e preserva personagens, cores e
          composição que já funcionam.
        </p>
        <div className="goal-chips">
          {problems.map((item) => (
            <button
              key={item}
              type="button"
              className={chosen.includes(item) ? "selected" : ""}
              aria-pressed={chosen.includes(item)}
              onClick={() =>
                setChosen((c) =>
                  c.includes(item) ? c.filter((x) => x !== item) : [...c, item],
                )
              }
            >
              {item}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Detalhe (opcional)</span>
          <textarea
            rows={3}
            value={note}
            placeholder="Ex.: o título está cortado na direita"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
      </div>
      <div className="dialog-footer">
        <button className="button ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="button primary"
          disabled={!chosen.length && !note.trim()}
          onClick={async () => {
            try {
              await request("generateSlides", {
                id: project.id,
                slideId: slide.id,
                fix: { problems: chosen, note: note.trim() },
              });
              onClose();
            } catch {}
          }}
        >
          <WandSparkles size={15} /> Corrigir este card
        </button>
      </div>
    </Dialog>
  );
}

export function CtaDialog({ project, request, busy, onClose }) {
  const kit = project.ctaKit;
  const [working, setWorking] = useState(false);
  const copy = (value) => navigator.clipboard?.writeText(value).catch(() => {});
  return (
    <Dialog
      title="Comentário → DM → Oferta"
      eyebrow="ESTRATÉGIA DE CTA · AULA 07"
      onClose={onClose}
      wide
    >
      {kit ? (
        <div className="cta-kit">
          <div>
            <span className="eyebrow">PALAVRAS-CHAVE</span>
            <div className="architecture-chips">
              {kit.keywords.map((k) => (
                <span key={k}>{k}</span>
              ))}
            </div>
          </div>
          {[
            ["CTA do primeiro card", kit.firstCardCta],
            ["CTA do último card", kit.lastCardCta],
            ["Material gratuito", kit.freebie],
            ["DM 1 — entrega", kit.dm1],
            ["DM 2 — ponte para a oferta", kit.dm2],
          ].map(([label, value]) => (
            <div className="cta-item" key={label}>
              <header>
                <span className="eyebrow">{label.toUpperCase()}</span>
                <button className="text-button" onClick={() => copy(value)}>
                  <Copy size={12} /> Copiar
                </button>
              </header>
              <p>{value}</p>
            </div>
          ))}
          <p className="field-hint">
            Vai junto no ZIP exportado (cta-e-dm.txt). O PACTO não envia DMs nem
            publica: configure a automação na sua ferramenta.
          </p>
        </div>
      ) : (
        <p className="dialog-copy">
          Gere palavras-chave, CTAs do primeiro e do último card, a ideia de
          material gratuito e as duas mensagens de DM, a partir do texto deste
          carrossel e do seu Contexto Oficial da Marca.
        </p>
      )}
      <div className="dialog-footer">
        <button className="button ghost" onClick={onClose}>
          Fechar
        </button>
        <button
          className="button primary"
          disabled={busy || working}
          onClick={async () => {
            setWorking(true);
            try {
              await request("ctaKit", { id: project.id });
            } catch {
            } finally {
              setWorking(false);
            }
          }}
        >
          {working ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <Sparkles size={15} />
          )}
          {kit ? "Gerar de novo" : "Gerar estratégia"}
        </button>
      </div>
    </Dialog>
  );
}

export function ResultsDialog({ project, request, busy, onClose, onIdeas }) {
  const [metrics, setMetrics] = useState({
    comments: project.results?.comments ?? "",
    saves: project.results?.saves ?? "",
    sales: project.results?.sales ?? "",
  });
  const [working, setWorking] = useState("");
  const values = {
    id: project.id,
    comments: Number(metrics.comments) || 0,
    saves: Number(metrics.saves) || 0,
    sales: Number(metrics.sales) || 0,
  };
  return (
    <Dialog
      title="Como este carrossel foi?"
      eyebrow="RESULTADO · VOLUME → SINAL → REPETIÇÃO"
      onClose={onClose}
    >
      <div className="dialog-fields">
        <p className="field-hint">
          Registre comentários, salvamentos e vendas para acompanhar seus
          vencedores na aba Ritmo. Se ele foi acima da média, o Replicador gera
          10 ideias preservando o motivo: 3 variações próximas, 3 novos ângulos,
          2 mais específicas e 2 adjacentes.
        </p>
        <div className="metric-fields">
          {[
            ["comments", "Comentários"],
            ["saves", "Salvamentos"],
            ["sales", "Vendas ou leads"],
          ].map(([key, label]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                type="number"
                min="0"
                value={metrics[key]}
                onChange={(e) =>
                  setMetrics({ ...metrics, [key]: e.target.value })
                }
              />
            </label>
          ))}
        </div>
      </div>
      <div className="dialog-footer">
        <button className="button ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="button secondary"
          disabled={busy || Boolean(working)}
          onClick={async () => {
            setWorking("save");
            try {
              await request("recordResults", values);
              onClose();
            } catch {
            } finally {
              setWorking("");
            }
          }}
        >
          {working === "save" ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <Check size={15} />
          )}
          Salvar resultado
        </button>
        <button
          className="button primary"
          disabled={busy || Boolean(working)}
          onClick={async () => {
            setWorking("replicate");
            try {
              await request("replicate", values);
              onIdeas();
            } catch {
            } finally {
              setWorking("");
            }
          }}
        >
          {working === "replicate" ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <Trophy size={15} />
          )}
          {working === "replicate"
            ? "Analisando o vencedor…"
            : "Salvar e replicar"}
        </button>
      </div>
    </Dialog>
  );
}
