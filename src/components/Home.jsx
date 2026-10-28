import { useMemo, useState } from "react";
import {
  ChevronDown,
  Copy,
  ImagePlus,
  Minus,
  MoreHorizontal,
  Plus,
  Radar,
  ScanSearch,
  Search,
  Sparkles,
  Square,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { rhythm } from "../../core/rhythm.mjs";
import Dialog from "./Dialog.jsx";
import { FORMAT_LABEL, Grow, STYLE_LIST, Spinner, firstLine, statusLabels, usePopover } from "../ui.jsx";

const FORMATS = [
  ["carrossel", "Carrossel", "Instagram · 4:5"],
  ["material", "Material gratuito", "PDF A4 para entregar na DM"],
  ["apresentacao", "Apresentação", "PDF 16:9 · proposta, pitch, empresa"],
];
const SIZES = [
  [0, "Automático", "O Carrossell decide"],
  [4, "4", "Gasta menos do limite da conta"],
  [6, "6", ""],
  [8, "8", ""],
  [10, "10", ""],
];
const PLACEHOLDER = {
  carrossel: "Escreva o tema, cole uma ideia ou descreva uma referência…",
  material: "Que material a pessoa recebe? Ex.: checklist da confirmação para quem comentar CHECKLIST",
  apresentacao: "Para quem é a apresentação e o que ela precisa mostrar?",
};
const SOURCES = [
  ["radar", "Radar"],
  ["modelador", "Referências"],
  ["replicador", "Vencedores"],
];
const unit = (format, n) => `${n} ${format === "carrossel" ? "cards" : format === "material" ? "páginas" : "slides"}`;

function Ring({ value, goal }) {
  const c = 2 * Math.PI * 26;
  const pct = Math.min(1, value / Math.max(1, goal));
  return (
    <svg className="ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle className="track" cx="32" cy="32" r="26" />
      <circle className="fill" cx="32" cy="32" r="26" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 32 32)" />
      <text x="32" y="37" textAnchor="middle">{`${value}/${goal}`}</text>
    </svg>
  );
}

function Measure({ project, request, onDone }) {
  const [m, setM] = useState({ comments: "", saves: "", sales: "" });
  const [busy, setBusy] = useState("");
  const values = { id: project.id, comments: Number(m.comments) || 0, saves: Number(m.saves) || 0, sales: Number(m.sales) || 0 };
  return (
    <form
      className="pending-item"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy("save");
        try {
          await request("recordResults", values);
          onDone("Resultado salvo.");
        } catch {
        } finally {
          setBusy("");
        }
      }}
    >
      <div className="metrics">
        {[
          ["comments", "Comentários"],
          ["saves", "Salvamentos"],
          ["sales", "Vendas"],
        ].map(([k, l]) => (
          <label className="fld" key={k}>
            <span>{l}</span>
            <input type="number" min="0" inputMode="numeric" value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      <div className="row">
        <span className="spacer" />
        <button type="button" className="ghost-btn" onClick={() => onDone("")}>
          Cancelar
        </button>
        <button className="btn small primary" disabled={Boolean(busy)}>
          {busy === "save" ? "Salvando…" : "Salvar resultado"}
        </button>
      </div>
    </form>
  );
}

export default function Home({ state, request, isPending, onOpen, onNotice, composerRef, connected }) {
  const pop = usePopover();
  const [text, setText] = useState("");
  const [format, setFormat] = useState("carrossel");
  const [style, setStyle] = useState("ia");
  const [goal, setGoal] = useState("");
  const [size, setSize] = useState(0);
  const [architectureId, setArchitectureId] = useState("");
  const [more, setMore] = useState(false);
  const [editorialLine, setEditorialLine] = useState("");
  const [visualConcept, setVisualConcept] = useState("");
  const [creating, setCreating] = useState(false);
  const [source, setSource] = useState("radar");
  const [allIdeas, setAllIdeas] = useState(false);
  const [openIdea, setOpenIdea] = useState(null);
  const [tool, setTool] = useState(null);
  const [focus, setFocus] = useState("");
  const [reference, setReference] = useState("");
  const [images, setImages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [measuring, setMeasuring] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const architectures = state.architectures || [];
  const goals = state.goals || [];
  const data = rhythm(state.projects, state.settings);
  const working = state.working;
  const ideaBusy = ["radar", "modelador", "replicador"].includes(working) || isPending("radar") || isPending("modelReference") || isPending("replicate");
  const batch = (state.ideas || []).find((b) => b.source === source);
  const ideas = (batch?.ideas || []).filter((i) => allIdeas || source !== "radar" || i.top);
  const projects = useMemo(
    () =>
      [...state.projects]
        .filter((p) => (filter === "all" ? true : filter === "done" ? p.status === "complete" : p.status !== "complete"))
        .filter((p) => `${p.title} ${p.brief}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")))
        .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt))),
    [state.projects, search, filter],
  );
  const visible = showAll || search ? projects : projects.slice(0, 8);
  const archName = architectures.find((a) => a.id === architectureId)?.name || "Automático";
  const useIdea = (idea) => {
    setFormat("carrossel");
    setText(
      [idea.hook || idea.theme, idea.theme && idea.hook && `Tema: ${idea.theme}`, idea.deliverable && `Entrega: ${idea.deliverable}`, idea.connection && `Conexão com a oferta: ${idea.connection}`]
        .filter(Boolean)
        .join("\n"),
    );
    setArchitectureId(architectures.find((a) => a.name === idea.architecture)?.id || "");
    composerRef.current?.focus();
    composerRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  const create = async () => {
    if (!text.trim()) {
      composerRef.current?.focus();
      return;
    }
    setCreating(true);
    try {
      const project = await request("createProject", {
        title: firstLine(text) || FORMAT_LABEL[format],
        brief: text.trim(),
        format,
        style: format === "carrossel" ? style : "ia",
        goal: format === "carrossel" ? goal : "",
        cardCount: size,
        architectureId: format === "carrossel" ? architectureId : "",
        editorialLine: more ? editorialLine.trim() : "",
        visualConcept: more ? visualConcept.trim() : "",
        attachments: format === "carrossel" ? attachments : [],
      });
      if (connected) await request("generatePlan", { id: project.id }).catch(() => {});
      setText("");
      setAttachments([]);
      onOpen(project.id);
    } catch {
    } finally {
      setCreating(false);
    }
  };
  const menu = (key, label, value, options, onPick) => (
    <div className="pop-anchor">
      <button type="button" className="pill" aria-haspopup="true" aria-expanded={pop.open === key} onClick={() => pop.toggle(key)}>
        <i>{label}</i> {value} <ChevronDown size={14} />
      </button>
      {pop.open === key && (
        <div className="popover" role="menu">
          {options.map(([v, l, d]) => (
            <button
              key={String(v)}
              type="button"
              role="menuitemradio"
              className="opt"
              aria-checked={l === value || v === value}
              onClick={() => {
                onPick(v);
                pop.setOpen(null);
              }}
            >
              <b>{l}</b>
              {d && <small>{d}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
  // Imagens do carrossel: referência ou algo que deve aparecer num card (produto, logo, print).
  const attach = async () => {
    try {
      const ref = await request("importReference");
      if (ref?.dataUrl) setAttachments((list) => [...list, { name: ref.name, dataUrl: ref.dataUrl }].slice(0, 6));
    } catch {}
  };
  const addImage = async () => {
    try {
      const ref = await request("importReference");
      if (ref?.dataUrl) setImages((list) => [...list, { name: ref.name, dataUrl: ref.dataUrl }].slice(0, 4));
    } catch {}
  };
  return (
    <main className="page" ref={pop.ref}>
      <h1 className="page-title">O que vamos publicar hoje?</h1>
      <section className="composer" aria-label="Criar">
        <Grow
          inputRef={composerRef}
          aria-label="Tema ou ideia"
          placeholder={PLACEHOLDER[format]}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) create();
          }}
        />
        {format === "carrossel" && (
          <div className="attach-row">
            <button type="button" className="ghost-btn" onClick={attach} disabled={attachments.length >= 6}>
              <ImagePlus size={16} /> Anexar foto de referência ou o que você quer que vá no carrossel
            </button>
            {attachments.length > 0 && (
              <div className="attach-list" aria-label="Imagens anexadas">
                {attachments.map((img, i) => (
                  <figure key={`${img.name}-${i}`} title={img.name}>
                    <img src={img.dataUrl} alt={img.name} />
                    <button type="button" aria-label={`Remover ${img.name}`} onClick={() => setAttachments((l) => l.filter((_, j) => j !== i))}>
                      <X size={12} />
                    </button>
                  </figure>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="row">
          {menu("format", "Formato", FORMAT_LABEL[format], FORMATS, setFormat)}
          {format === "carrossel" && menu("style", "Estilo", STYLE_LIST.find((s) => s[0] === style)[1], STYLE_LIST, setStyle)}
          {format === "carrossel" && goals.length > 0 && menu("goal", "Objetivo", goal || "Livre", [["", "Livre", "Sem objetivo específico"], ...goals.map((g) => [g, g, ""])], setGoal)}
          {menu("size", "Tamanho", size ? unit(format, size) : "Automático", SIZES.map(([v, l, d]) => [v, v ? unit(format, v) : l, d]), setSize)}
          {format === "carrossel" && architectures.length > 0 &&
            menu("arch", "Tipo", archName, [["", "Automático", "O Carrossell escolhe a arquitetura"], ...architectures.map((a) => [a.id, a.name, a.useWhen])], setArchitectureId)}
          {format === "carrossel" && (
            <button type="button" className="pill" aria-pressed={more} onClick={() => setMore(!more)}>
              {more ? "Menos opções" : "Mais opções"}
            </button>
          )}
          <span className="spacer" />
          <button className="btn primary" disabled={creating || !text.trim()} onClick={create} title="Ctrl + Enter">
            {creating ? <Spinner /> : <Sparkles size={16} />}
            {creating ? "Criando…" : format === "carrossel" ? "Criar carrossel" : format === "material" ? "Criar material" : "Criar apresentação"}
          </button>
        </div>
        {more && format === "carrossel" && (
          <div className="composer-more">
            <label className="fld">
              <span>
                Linha editorial <small>opcional</small>
              </span>
              <Grow value={editorialLine} maxLength={600} placeholder="Vazio: o Carrossell sugere" onChange={(e) => setEditorialLine(e.target.value)} />
            </label>
            <label className="fld">
              <span>
                Mascote, desenho ou efeito <small>opcional</small>
              </span>
              <Grow value={visualConcept} maxLength={600} placeholder="Vazio: o Carrossell sugere pelo Design Kit" onChange={(e) => setVisualConcept(e.target.value)} />
            </label>
          </div>
        )}
        {!connected && <p className="hint">Conecte sua conta ChatGPT no menu do avatar para o Carrossell escrever e gerar as artes.</p>}
      </section>
      <div className="home-grid">
        <section className="section" aria-label="Ideias">
          <div className="section-head">
            <h2>Ideias para testar</h2>
            <div className="seg" style={{ margin: 0 }} role="tablist">
              {SOURCES.map(([k, l]) => (
                <button key={k} role="tab" aria-selected={source === k} aria-pressed={source === k} onClick={() => setSource(k)}>
                  {l}
                </button>
              ))}
            </div>
            <span className="spacer" />
            {source === "radar" && batch && (
              <button className="ghost-btn" onClick={() => setAllIdeas(!allIdeas)}>
                {allIdeas ? "Só Top 10" : `Ver todas (${batch.ideas.length})`}
              </button>
            )}
            {source !== "replicador" && (
              <button className="btn small" disabled={ideaBusy} onClick={() => setTool(tool === source ? null : source)}>
                {source === "radar" ? <Radar size={15} /> : <ScanSearch size={15} />}
                {source === "radar" ? "Gerar pautas" : "Modelar referência"}
              </button>
            )}
          </div>
          {tool === "radar" && source === "radar" && (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                setTool(null);
                request("radar", { focus: focus.trim() }).catch(() => {});
              }}
            >
              <label className="fld">
                <span>
                  Foco desta rodada <small>opcional</small>
                </span>
                <input value={focus} maxLength={300} placeholder="Ex.: dúvidas de quem está começando" onChange={(e) => setFocus(e.target.value)} />
              </label>
              <div className="row">
                <span className="hint">30 pautas a partir do seu Contexto da Marca, com as 10 mais fortes marcadas.</span>
                <span className="spacer" />
                <button className="btn small primary" disabled={!connected}>
                  Gerar 30 pautas
                </button>
              </div>
            </form>
          )}
          {tool === "modelador" && source === "modelador" && (
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                setTool(null);
                request("modelReference", { text: reference.trim(), references: images }).catch(() => {});
              }}
            >
              <label className="fld">
                <span>Referência que performou bem</span>
                <Grow value={reference} placeholder="Cole o texto dos cards ou descreva o post. O Carrossell copia o motivo, não o conteúdo." onChange={(e) => setReference(e.target.value)} />
              </label>
              <div className="row">
                <button type="button" className="btn small" onClick={addImage} disabled={images.length >= 4}>
                  <ImagePlus size={15} /> Anexar print
                </button>
                <div className="attach-list">
                  {images.map((img, i) => (
                    <figure key={`${img.name}-${i}`}>
                      <img src={img.dataUrl} alt={img.name} />
                      <button type="button" aria-label={`Remover ${img.name}`} onClick={() => setImages((l) => l.filter((_, j) => j !== i))}>
                        <X size={12} />
                      </button>
                    </figure>
                  ))}
                </div>
                <span className="spacer" />
                <button className="btn small primary" disabled={!connected || (!reference.trim() && !images.length)}>
                  Modelar sem copiar
                </button>
              </div>
            </form>
          )}
          {ideaBusy && (
            <div className="work-strip" role="status">
              <Spinner />
              <span>{working === "modelador" ? "Analisando a referência…" : working === "replicador" ? "Replicando o vencedor…" : "Gerando pautas…"} Leva um ou dois minutos.</span>
              <button className="ghost-btn" onClick={() => request("cancelWork").catch(() => {})}>
                <Square size={12} /> Parar
              </button>
            </div>
          )}
          {ideas.length ? (
            <div className="idea-list">
              {ideas.map((idea) => (
                <div className="idea" key={idea.id}>
                  <div className="idea-top">
                    <button className="title" aria-expanded={openIdea === idea.id} onClick={() => setOpenIdea(openIdea === idea.id ? null : idea.id)}>
                      {idea.hook || idea.theme}
                    </button>
                    {idea.top && <span className="chip accent">Top 10</span>}
                    {idea.group && !["Radar", "Modelador"].includes(idea.group) && <span className="chip">{idea.group}</span>}
                    {idea.architecture && <span className="chip">{idea.architecture}</span>}
                    <button className="btn small" onClick={() => useIdea(idea)}>
                      Usar
                    </button>
                  </div>
                  {openIdea === idea.id && (
                    <div className="idea-more">
                      <div>
                        <b>Por que para</b>
                        {idea.why || idea.theme}
                      </div>
                      <div>
                        <b>Entrega</b>
                        {idea.deliverable || "—"}
                      </div>
                      {idea.reason && (
                        <div style={{ gridColumn: "1 / -1" }}>
                          <b>{idea.top ? "Por que testar primeiro" : "O que preserva"}</b>
                          {idea.reason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !ideaBusy && (
              <div className="empty-state">
                <span>
                  {source === "radar"
                    ? "O Radar lê o seu Contexto da Marca e sugere 30 pautas."
                    : source === "modelador"
                      ? "Cole um post que funcionou e o Carrossell cria 10 pautas no mesmo princípio."
                      : "Registre o resultado de um carrossel para gerar variações do vencedor."}
                </span>
                {source !== "replicador" && (
                  <button className="btn small primary" disabled={!connected} onClick={() => (source === "radar" ? request("radar", {}).catch(() => {}) : setTool("modelador"))}>
                    {source === "radar" ? "Gerar minhas pautas" : "Modelar referência"}
                  </button>
                )}
              </div>
            )
          )}
        </section>
        <div className="section">
          <section className="card-box week" aria-label="Meta da semana">
            <div className="week-top">
              <Ring value={data.publishedThisWeek} goal={data.goal} />
              <div>
                <b>
                  {data.publishedThisWeek} de {data.goal} publicados
                </b>
                <span className="hint">Meta desta semana</span>
              </div>
              <div className="stepper">
                <button className="icon-only" aria-label="Diminuir meta" onClick={() => request("saveSettings", { weeklyGoal: Math.max(1, data.goal - 1) }).catch(() => {})}>
                  <Minus size={16} />
                </button>
                <button className="icon-only" aria-label="Aumentar meta" onClick={() => request("saveSettings", { weeklyGoal: Math.min(50, data.goal + 1) }).catch(() => {})}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
            {data.pending.slice(0, 3).map((p) => (
              <div className="pending-item" key={p.id}>
                <div className="pending-row">
                  {p.slides[0]?.image ? <img src={p.slides[0].image} alt="" /> : <span className="thumb-ph" />}
                  <div>
                    <b>{p.title}</b>
                    <br />
                    <span className="hint">Publicado em {new Date(p.publishedAt).toLocaleDateString("pt-BR")} · já dá para medir</span>
                  </div>
                  {measuring !== p.id && (
                    <button className="btn small" onClick={() => setMeasuring(p.id)}>
                      Registrar
                    </button>
                  )}
                </div>
                {measuring === p.id && (
                  <Measure
                    project={p}
                    request={request}
                    onDone={(msg) => {
                      setMeasuring(null);
                      if (msg) onNotice(msg);
                    }}
                  />
                )}
              </div>
            ))}
            {data.winners.length > 0 && (
              <div className="pending-item">
                <span className="hint">
                  <Trophy size={13} /> Seus melhores resultados
                </span>
                <div className="winners">
                  {data.winners.slice(0, 3).map((w) => (
                    <div className="winner" key={w.id}>
                      <span>{w.title}</span>
                      <em>
                        {w.results.saves} salv. · {w.results.comments} com.
                      </em>
                      {w.aboveAverage && (
                        <button
                          className="link-btn"
                          disabled={!connected || ideaBusy}
                          onClick={() => {
                            setSource("replicador");
                            request("replicate", { id: w.id }).catch(() => {});
                          }}
                        >
                          Replicar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!data.pending.length && !data.winners.length && <p className="hint">Marque um carrossel como publicado e, em 2 ou 3 dias, registre o resultado aqui.</p>}
          </section>
        </div>
      </div>
      <section className="section" aria-label="Seus projetos">
        <div className="section-head">
          <h2>Seus projetos</h2>
          <span className="meta">{state.projects.length}</span>
          <span className="spacer" />
          <div className="lib-tools">
            <div className="seg" style={{ margin: 0 }}>
              {[
                ["all", "Todos"],
                ["open", "Em criação"],
                ["done", "Prontos"],
              ].map(([k, l]) => (
                <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>
                  {l}
                </button>
              ))}
            </div>
            <label className="search-box">
              <Search size={15} />
              <input aria-label="Buscar projetos" placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
          </div>
        </div>
        {visible.length ? (
          <div className="lib-grid">
            {visible.map((p) => {
              const cover = p.slides?.[0]?.image;
              return (
                <article className="lib-item" key={p.id}>
                  <button className="lib-open" aria-label={`Abrir ${p.title}`} onClick={() => onOpen(p.id)}>
                    <div className={`lib-cover ${p.format && p.format !== "carrossel" ? "doc" : ""}`}>{cover ? <img src={cover} alt="" /> : <span className="ph">{p.title}</span>}</div>
                    <b>{p.title}</b>
                    <small>
                      {p.format !== "carrossel" && <span className="chip">{FORMAT_LABEL[p.format]}</span>}
                      {["planning", "generating"].includes(p.status) && <Spinner />}
                      {p.publishedAt ? "Publicado" : statusLabels[p.status] || "Rascunho"} · {unit(p.format || "carrossel", p.slides?.length || 0)}
                    </small>
                  </button>
                  <div className="lib-menu pop-anchor">
                    <button className="icon-only" aria-label={`Ações para ${p.title}`} onClick={() => pop.toggle(`lib-${p.id}`)}>
                      <MoreHorizontal size={16} />
                    </button>
                    {pop.open === `lib-${p.id}` && (
                      <div className="popover right">
                        <button
                          className="opt"
                          onClick={async () => {
                            pop.setOpen(null);
                            try {
                              const copy = await request("duplicate", { id: p.id });
                              if (copy?.id) onOpen(copy.id);
                            } catch {}
                          }}
                        >
                          <b>
                            <Copy size={15} /> Duplicar
                          </b>
                        </button>
                        <button
                          className="opt"
                          onClick={() => {
                            pop.setOpen(null);
                            setDeleting(p);
                          }}
                        >
                          <b>
                            <Trash2 size={15} /> Excluir
                          </b>
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">{search ? "Nenhum projeto com esse nome." : "Seus carrosséis e PDFs aparecem aqui."}</div>
        )}
        {!showAll && !search && projects.length > 8 && (
          <button className="ghost-btn" style={{ justifySelf: "center" }} onClick={() => setShowAll(true)}>
            Ver todos os {projects.length} projetos
          </button>
        )}
      </section>
      {deleting && (
        <Dialog title="Excluir este projeto?" eyebrow="SEUS PROJETOS" onClose={() => setDeleting(null)}>
          <p className="dialog-copy">“{deleting.title}” será removido deste computador.</p>
          <div className="dialog-footer">
            <button className="btn" onClick={() => setDeleting(null)}>
              Manter
            </button>
            <button
              className="btn primary"
              onClick={async () => {
                try {
                  await request("delete", { id: deleting.id });
                  setDeleting(null);
                  onNotice("Projeto excluído.");
                } catch {}
              }}
            >
              Excluir
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
