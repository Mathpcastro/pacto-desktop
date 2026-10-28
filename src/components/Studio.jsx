import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FileText,
  GraduationCap,
  ImagePlus,
  MoreHorizontal,
  PlayCircle,
  Search,
  Send,
  Smartphone,
  Sparkles,
  Square,
  WandSparkles,
  X,
} from "lucide-react";
import { CourseContext } from "../course.jsx";
import { documentHtml, slideHtml, SIZES, TEMPLATE_STYLES, LAYOUTS } from "../../core/templates.mjs";
import Dialog from "./Dialog.jsx";
import { FORMAT_LABEL, Grow, STYLE_SHORT, Spinner, TEMPLATE_FONTS, TemplateFrame, copyText, usePopover } from "../ui.jsx";

export function stageOf(p) {
  const s = p.slides || [];
  if (!s.length) return "start";
  if (!p.textApproved) return "text";
  if (!s[0].image) return "cover";
  if ((p.format || "carrossel") !== "carrossel") return "done";
  if (s.every((x) => x.image && x.state === "complete")) return "done";
  return "slides";
}
const ORDER = ["texto", "capa", "carrossel", "publicar"];
const REACHED = { start: 0, text: 0, cover: 1, slides: 2, done: 3 };
const LESSON_STEP = { texto: "copy", capa: "cover", carrossel: "correction", publicar: "cta" };
const LAYOUT_LABEL = { cover: "Capa", text: "Texto", checklist: "Checklist", quote: "Modelo para copiar", steps: "Passo a passo", cta: "Próximo passo" };
const CHECKLIST = [
  "A capa faria você parar?",
  "O card 2 paga a promessa ou enrola?",
  "Cada card tem uma ideia principal e utilidade concreta?",
  "Não há frases que você jamais falaria?",
  "O texto está específico para o seu público?",
  "O último card deixa claro o que a pessoa recebe e o que fazer?",
];
const reviewed = new Map();
const FIELDS = ["role", "title", "body", "emphasis", "visual", "prompt", "photo", "layout"];
const pick = (p) => ({
  caption: p.caption || "",
  editorialLine: p.editorialLine || "",
  visualConcept: p.visualConcept || "",
  slides: (p.slides || []).map((s) => Object.fromEntries([["id", s.id], ...FIELDS.map((k) => [k, s[k] || ""])])),
});

// Rascunho local com salvamento automático. Campos que a pessoa não tocou seguem
// as atualizações do runtime; o que ela editou fica até ser salvo.
function useDraft(project, request, busy) {
  const [draft, setDraft] = useState(() => pick(project));
  const [baseline, setBaseline] = useState(() => pick(project));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  useEffect(() => {
    const incoming = pick(project);
    setBaseline((old) => {
      if (JSON.stringify(old) === JSON.stringify(incoming)) return old;
      setDraft((d) => {
        const merged = { ...incoming };
        for (const k of ["caption", "editorialLine", "visualConcept"]) if (d[k] !== old[k]) merged[k] = d[k];
        merged.slides = incoming.slides.map((s) => {
          const mine = d.slides.find((x) => x.id === s.id),
            before = old.slides.find((x) => x.id === s.id);
          if (!mine || !before) return s;
          return Object.fromEntries(Object.keys(s).map((k) => [k, mine[k] !== before[k] ? mine[k] : s[k]]));
        });
        return merged;
      });
      return incoming;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.updatedAt, project.slides?.length]);
  const save = useCallback(async () => {
    if (!dirty) return true;
    setSaving(true);
    try {
      await request("saveProject", {
        id: project.id,
        caption: draft.caption,
        editorialLine: draft.editorialLine,
        visualConcept: draft.visualConcept,
        slides: project.slides.map((s) => ({ ...s, ...(draft.slides.find((d) => d.id === s.id) || {}) })),
      });
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [dirty, draft, project.id, project.slides, request]);
  useEffect(() => {
    if (!dirty || busy || saving) return undefined;
    const t = setTimeout(save, 900);
    return () => clearTimeout(t);
  }, [dirty, busy, saving, save, draft]);
  const edit = (id, key, value) => setDraft((d) => ({ ...d, slides: d.slides.map((s) => (s.id === id ? { ...s, [key]: value } : s)) }));
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  return { draft, edit, set, save, dirty, saving };
}

function Marked({ text, emphasis }) {
  const parts = String(emphasis || "")
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return text;
  const re = new RegExp(`(${parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "i");
  return String(text)
    .split(re)
    .map((piece, i) => (re.test(piece) && parts.some((p) => p.toLowerCase() === piece.toLowerCase()) ? <mark key={i}>{piece}</mark> : piece));
}

function Chat({ project, request, busy, connected, placeholder }) {
  const [text, setText] = useState("");
  const [all, setAll] = useState(false);
  const messages = project.messages || [];
  const shown = all ? messages : messages.slice(-2);
  return (
    <div className="chat">
      {messages.length > 2 && (
        <button className="link-btn" onClick={() => setAll(!all)}>
          {all ? "Mostrar só as últimas" : `Ver conversa inteira (${messages.length})`}
        </button>
      )}
      {shown.map((m) => (
        <p key={m.id} className={`bubble ${m.role}`}>
          {m.text}
        </p>
      ))}
      <form
        className="ask"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim() || busy || !connected) return;
          const sent = text.trim();
          setText("");
          try {
            await request("sendMessage", { id: project.id, text: sent });
          } catch {
            setText(sent);
          }
        }}
      >
        <Grow
          aria-label="Pedido para o assistente"
          placeholder={connected ? placeholder : "Conecte sua conta para pedir ajustes"}
          value={text}
          disabled={!connected}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form.requestSubmit();
            }
          }}
        />
        <button className="icon-only" aria-label="Enviar pedido" disabled={!text.trim() || busy || !connected}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function Share({ project, request }) {
  const [shared, setShared] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    request("shareToPhone", { id: project.id })
      .then((r) => alive && setShared(r))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      request("stopShare").catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (failed) return <p className="hint">Não foi possível abrir o link local. Confira se o computador está no Wi-Fi.</p>;
  if (!shared)
    return (
      <div className="work-strip">
        <Spinner />
        <span>Preparando o link para o celular…</span>
      </div>
    );
  return (
    <div className="box">
      <div className="qr">
        <img src={shared.qr} alt="QR code para abrir o carrossel no celular" />
        <ol>
          <li>Conecte o celular ao mesmo Wi-Fi.</li>
          <li>Aponte a câmera para o QR code.</li>
          <li>Salve as imagens e copie a legenda.</li>
          <li className="hint">O link expira em 30 minutos.</li>
        </ol>
      </div>
    </div>
  );
}

export default function Studio({ project, state, request, pending, activity, onBack, onOpen, onNotice, onCommands, onBrand }) {
  const course = useContext(CourseContext);
  const pop = usePopover();
  const format = project.format || "carrossel";
  const doc = format !== "carrossel";
  const template = doc || TEMPLATE_STYLES.includes(project.style);
  const connected = Boolean(state.account?.connected);
  const busy =
    ["planning", "generating"].includes(project.status) ||
    pending.some((p) => ["generatePlan", "generateSlides", "generateCovers", "chooseCover", "sendMessage", "cancel", "ctaKit", "stories", "approveText"].includes(p.action));
  const exporting = pending.some((p) => ["exportPdf", "export", "saveToDrive"].includes(p.action));
  const { draft, edit, set, save, dirty, saving } = useDraft(project, request, busy);
  const stage = stageOf(project);
  const natural = stage === "done" ? (doc ? "carrossel" : "publicar") : ORDER[REACHED[stage]];
  const [view, setView] = useState(natural);
  // Ao concluir os cards, a pessoa revisa o carrossel antes de publicar; ao reabrir um projeto pronto, vai direto a Publicar.
  const lastStage = useRef(stage);
  useEffect(() => {
    setView(natural === "publicar" && lastStage.current !== "done" ? "carrossel" : natural);
    lastStage.current = stage;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural]);
  const reached = REACHED[stage];
  const [sel, setSel] = useState(null);
  const [cur, setCur] = useState(0);
  const [cover, setCover] = useState(null);
  const [tab, setTab] = useState("enviar");
  const [sharing, setSharing] = useState(false);
  const [drive, setDrive] = useState(null);
  const [fixes, setFixes] = useState([]);
  const [note, setNote] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [teaching, setTeaching] = useState(false);
  const [lesson, setLesson] = useState({ text: "", area: "texto" });
  const [checks, setChecks] = useState(() => reviewed.get(project.id) || []);
  const [title, setTitle] = useState(project.title);
  const titleFocused = useRef(false);
  useEffect(() => {
    if (!titleFocused.current) setTitle(project.title);
  }, [project.title]);
  useEffect(() => {
    reviewed.set(project.id, checks);
  }, [checks, project.id]);
  const slides = project.slides || [];
  const drafts = draft.slides;
  const brand = state.brandInfo || {};
  const media = state.media || { faces: [], scenes: [] };
  const labels = doc ? ["Roteiro", "Capa", format === "material" ? "Páginas" : "Slides", "Exportar"] : ["Texto", "Capa", "Carrossel", "Publicar"];
  const unit = doc ? (format === "material" ? "página" : "slide") : "card";
  const pendingImages = slides.filter((s) => !s.image || s.state !== "complete").length;
  // Imagens que podem aparecer num card: anexos deste carrossel e imagens da marca.
  const allAssets = [...(project.attachments || []).map((a) => ({ ...a, kind: "anexo" })), ...(media.assets || [])];
  const withAsset = (s) => {
    const a = s.asset && allAssets.find((x) => x.id === s.asset);
    return a ? { ...s, assetImage: a.dataUrl, assetKind: a.kind } : s;
  };
  const approvedScenes = media.scenes.filter((s) => s.status === "approved" && (s.images?.length || s.image)).map((s) => ({ ...s, images: s.images?.length ? s.images : [s.image] }));
  const sceneInUse = approvedScenes.find((s) => s.id === String(drafts.find((d) => d.photo)?.photo || "").split("#")[0]) || approvedScenes[0];
  const outdated = slides.filter((s) => s.image && s.state === "outdated").length;
  const allChecked = checks.length === CHECKLIST.length;
  const sources = state.projects.filter((p) => p.sourceId === project.id);
  const source = project.sourceId ? state.projects.find((p) => p.id === project.sourceId) : null;
  const moment = (course.moments || []).find((m) => m.step === LESSON_STEP[view]);
  const infer = (action, args = {}) => request(action, { id: project.id, ...args }).catch(() => null);
  const go = async (next) => {
    if (dirty) await save();
    setSel(null);
    setView(next);
  };
  const renderSlide = (s, i, variant = project.styleVariant || 0) =>
    slideHtml({ style: project.style, slide: withAsset(s), index: i, total: drafts.length, brand, media, variant, fonts: TEMPLATE_FONTS });
  const pageHtml = (i, variant = project.styleVariant || 0) =>
    documentHtml({ format, pages: drafts, brand, coverVariant: variant, fonts: TEMPLATE_FONTS, only: i });
  // Envia uma imagem nova para este carrossel e a coloca no card aberto.
  const attachToCard = async (slideId) => {
    if (dirty) await save();
    const ref = await request("importReference").catch(() => null);
    if (!ref?.dataUrl) return;
    const saved = await infer("saveProject", { attachments: [...(project.attachments || []), { name: ref.name, dataUrl: ref.dataUrl }] });
    const added = saved?.attachments?.at(-1);
    if (added) edit(slideId, "asset", added.id);
  };
  const approve = async () => {
    if (!(await save())) return;
    const ok = await infer("approveText");
    if (!ok) return;
    if (template || connected) await infer("generateCovers", { count: 3 });
    setView("capa");
  };
  const chooseCover = async () => {
    const option = (project.coverOptions || []).find((o) => o.id === cover) || project.coverOptions?.[0];
    if (!option) return;
    const result = await infer("chooseCover", { optionId: option.id });
    if (!result) return;
    if (!template && connected) await infer("generateSlides");
    setSel(null);
    setCur(0);
    setView(doc ? "carrossel" : "carrossel");
  };
  const exportZip = async () => {
    const r = await infer("export");
    if (r && !r.cancelled) onNotice(`${r.count} imagens exportadas${r.path ? ` para ${r.path}` : ""}.`);
  };
  const exportPdf = async (extra = {}) => {
    if (dirty) await save();
    const r = await infer("exportPdf", extra);
    if (!r) return;
    if (r.needsFolder) {
      setDrive({ missing: true });
      return;
    }
    if (r.folder) {
      setDrive({ folder: r.folder });
      onNotice("PDF salvo na pasta do Google Drive.");
    } else if (!r.cancelled) onNotice(`PDF salvo${r.path ? ` em ${r.path}` : ""}.`);
  };
  const saveDrive = async () => {
    const r = await infer("saveToDrive");
    if (!r) return;
    if (r.needsFolder) setDrive({ missing: true });
    else {
      setDrive({ folder: r.folder });
      onNotice("Carrossel salvo na pasta do Google Drive.");
    }
  };
  const createMaterial = async () => {
    const kit = project.ctaKit;
    try {
      const m = await request("createProject", {
        title: kit?.freebie ? kit.freebie.split(/[.:\n]/)[0].slice(0, 80) : `Material de ${project.title}`.slice(0, 80),
        brief: [`Material gratuito para quem comentar ${kit?.keywords?.[0] || "a palavra-chave"} no carrossel “${project.title}”.`, kit?.freebie && `Ideia do material: ${kit.freebie}`, kit?.dm1 && `DM de entrega: ${kit.dm1}`].filter(Boolean).join("\n"),
        format: "material",
        sourceId: project.id,
      });
      if (connected) await request("generatePlan", { id: m.id }).catch(() => {});
      onOpen(m.id);
    } catch {}
  };
  const setStyle = async (style) => {
    if (style === project.style) return;
    if (dirty) await save();
    const r = await infer("saveProject", { style });
    if (!r) return;
    setCover(null);
    if (r.textApproved && (TEMPLATE_STYLES.includes(style) || connected)) {
      await infer("generateCovers", { count: 3 });
      setView("capa");
    }
  };
  const step = (n) => setCur((c) => Math.max(0, Math.min(slides.length - 1, c + n)));
  useEffect(() => {
    if (view !== "carrossel" && view !== "publicar") return undefined;
    const key = (e) => {
      if (e.target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "Escape") setSel(null);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  useEffect(() => {
    if (sel !== null && view === "carrossel") setCur(sel);
  }, [sel, view]);
  // Ações deste projeto no Ctrl+K.
  useEffect(() => {
    onCommands?.([
      { id: "p-text", label: `Ir para ${labels[0]}`, hint: project.title, run: () => go("texto") },
      { id: "p-cover", label: "Ir para a capa", disabled: reached < 1, run: () => go("capa") },
      { id: "p-cards", label: `Ir para ${labels[2]}`, disabled: reached < 2, run: () => go("carrossel") },
      { id: "p-pub", label: `Ir para ${labels[3]}`, disabled: reached < 3, run: () => go("publicar") },
      ...(doc
        ? [{ id: "p-pdf", label: "Baixar PDF", hint: FORMAT_LABEL[format], disabled: !project.textApproved, run: () => exportPdf() }]
        : [
            { id: "p-zip", label: "Baixar ZIP deste carrossel", hint: "PNGs, legenda e DMs", disabled: stage !== "done", run: exportZip },
            { id: "p-pdfli", label: "Baixar carrossel em PDF", hint: "Para o LinkedIn", disabled: stage !== "done", run: () => exportPdf() },
            { id: "p-phone", label: "Enviar para o celular", hint: "QR code", disabled: stage !== "done", run: () => (setView("publicar"), setTab("enviar"), setSharing(true)) },
            { id: "p-cta", label: "Gerar CTA, DM e oferta", hint: "Aula 07", disabled: !slides.length, run: () => (setView(reached >= 3 ? "publicar" : view), setTab("dm"), infer("ctaKit")) },
            { id: "p-mat", label: "Criar o material gratuito deste CTA", hint: "PDF A4", disabled: !slides.length, run: createMaterial },
          ]),
      { id: "p-redo", label: doc ? "Refazer o roteiro" : "Refazer o texto", hint: "Usa a sua conta", disabled: !connected || busy, run: () => infer("generatePlan") },
      { id: "p-dup", label: "Duplicar projeto", run: async () => { const c = await infer("duplicate"); if (c?.id) onOpen(c.id); } },
    ]);
    return () => onCommands?.([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.updatedAt, view, stage, connected, busy]);

  const primary = (() => {
    if (busy) return { label: project.status === "planning" ? "Escrevendo…" : project.status === "generating" ? "Gerando…" : "Aguarde…", disabled: true };
    if (view === "texto") {
      if (!slides.length) return { label: doc ? "Gerar o roteiro" : "Gerar o texto", disabled: !connected, run: async () => { await save(); infer("generatePlan"); } };
      if (project.textApproved) return { label: "Ir para a capa", run: () => go(reached >= 1 ? "capa" : "texto") };
      if (doc) return { label: "Aprovar roteiro", run: approve };
      return { label: allChecked ? "Aprovar e criar capas" : `Revisão ${checks.length}/${CHECKLIST.length}`, disabled: !allChecked, run: approve, title: allChecked ? "" : "Marque a revisão humana no painel ao lado" };
    }
    if (view === "capa") {
      if (!project.coverOptions?.length) return { label: "Gerar opções de capa", disabled: !template && !connected, run: () => infer("generateCovers", { count: 3 }) };
      return { label: "Usar esta capa", run: chooseCover };
    }
    if (view === "carrossel") {
      if (doc) return { label: "Ir para exportar", run: () => go("publicar") };
      if (pendingImages) return { label: outdated && outdated === pendingImages ? `Atualizar ${outdated} ${outdated > 1 ? "cards" : "card"}` : `Gerar ${pendingImages} ${pendingImages > 1 ? "cards" : "card"}`, disabled: !template && !connected, run: () => infer("generateSlides") };
      return { label: "Ir para publicar", run: () => go("publicar") };
    }
    if (doc) return { label: "Concluir", run: () => (onNotice(`${FORMAT_LABEL[format]} salvo nos seus projetos.`), onBack()) };
    if (!project.publishedAt) return { label: "Marquei como publicado", run: async () => { if (await infer("markPublished")) { onNotice("Marcado como publicado. Registre o resultado em 2 ou 3 dias."); setTab("resultado"); } } };
    return { label: "Registrar resultado", run: () => setTab("resultado") };
  })();

  const selected = sel !== null ? drafts[sel] : null;
  const selectedSlide = sel !== null ? slides[sel] : null;
  const curDraft = drafts[cur];
  const curSlide = slides[cur];
  const frameClass = doc ? (format === "material" ? "a4" : "wide") : "";
  const statusText = busy ? activity || (project.status === "planning" ? "Escrevendo…" : "Gerando…") : saving ? "Salvando…" : dirty ? "Alterações não salvas" : "Salvo";

  const preview = (i) => {
    const s = slides[i],
      d = drafts[i];
    if (!d) return null;
    if (doc) return <TemplateFrame html={pageHtml(i)} {...SIZES[format]} title={`Página ${i + 1}`} />;
    if (s?.state === "generating") return <div className="shimmer"><Spinner />Gerando…</div>;
    if (template && (!s?.image || s.state === "outdated")) return <TemplateFrame html={renderSlide(d, i)} {...SIZES.carrossel} title={`Card ${i + 1}`} />;
    if (s?.image) return <img src={s.image} alt={`Card ${i + 1}: ${d.title}`} />;
    return (
      <div className="text-card">
        <span>{i === 0 ? "Capa" : `Card ${i + 1}`} · arte ainda não gerada</span>
        <b>{d.title}</b>
        {d.body && <span>{d.body}</span>}
      </div>
    );
  };

  return (
    <div className="shell-studio" style={{ display: "contents" }}>
      <header className="topbar" ref={pop.ref}>
        <button className="icon-only" aria-label="Voltar ao início" onClick={async () => { if (dirty) await save(); onBack(); }}>
          <ArrowLeft size={18} />
        </button>
        <div className="proj">
          <input
            aria-label="Nome do projeto"
            value={title}
            maxLength={200}
            onFocus={() => (titleFocused.current = true)}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              titleFocused.current = false;
              if (title.trim() && title !== project.title) infer("saveProject", { title: title.trim() });
              else setTitle(project.title);
            }}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
          <small aria-live="polite">
            {statusText} · {doc ? FORMAT_LABEL[format] : STYLE_SHORT[project.style || "ia"]} · {slides.length} {unit}
            {slides.length === 1 ? "" : "s"}
          </small>
        </div>
        <span className="spacer" />
        <nav className="steps" aria-label="Etapas">
          {ORDER.map((k, i) => (
            <button key={k} className={i < reached && k !== view ? "done" : ""} aria-current={view === k ? "step" : undefined} disabled={i > reached || (doc && k === "publicar" && reached < 3)} onClick={() => go(k)}>
              {labels[i]}
            </button>
          ))}
        </nav>
        {moment && course.play && (
          <button className="icon-only" aria-label={`Ver esta etapa na aula (~${Math.floor(moment.seconds / 60)}:${String(moment.seconds % 60).padStart(2, "0")})`} title="Ver esta etapa na aula" onClick={() => course.play({ lessonId: moment.lessonId, seconds: moment.seconds, step: moment.step })}>
            <PlayCircle size={18} />
          </button>
        )}
        <span className="spacer" />
        <div className="pop-anchor">
          <button className="icon-only" aria-label="Mais ações do projeto" onClick={() => pop.toggle("more")}>
            <MoreHorizontal size={18} />
          </button>
          {pop.open === "more" && (
            <div className="popover right">
              <button className="opt" onClick={async () => { pop.setOpen(null); const c = await infer("duplicate"); if (c?.id) onOpen(c.id); }}>
                <b><Copy size={15} /> Duplicar</b>
              </button>
              <button className="opt" onClick={() => { pop.setOpen(null); setTeaching(true); }}>
                <b><GraduationCap size={15} /> Ensinar o Carrossell</b>
                <small>O que mudar nos próximos carrosséis</small>
              </button>
              <button className="opt" disabled={!connected || busy || !slides.length} onClick={() => { pop.setOpen(null); infer("generatePlan"); setView("texto"); }}>
                <b><WandSparkles size={15} /> {doc ? "Refazer o roteiro" : "Refazer o texto"}</b>
                <small>Substitui o texto atual</small>
              </button>
              {doc ? (
                <button className="opt" disabled={!project.textApproved} onClick={() => { pop.setOpen(null); exportPdf(); }}>
                  <b><Download size={15} /> Baixar PDF</b>
                </button>
              ) : (
                <button className="opt" disabled={stage !== "done"} onClick={() => { pop.setOpen(null); exportZip(); }}>
                  <b><Download size={15} /> Baixar ZIP</b>
                  <small>PNGs 1080×1350, legenda e DMs</small>
                </button>
              )}
              <hr />
              <button className="opt" onClick={() => { pop.setOpen(null); setDeleting(true); }}>
                <b><X size={15} /> Excluir</b>
              </button>
            </div>
          )}
        </div>
        <button className="btn primary" disabled={primary.disabled} title={primary.title} onClick={primary.run}>
          {busy && <Spinner />}
          {primary.label}
        </button>
      </header>
      {busy || project.error ? (
        <div className={busy ? "work-strip" : "notice-strip error"} role={busy ? "status" : "alert"}>
          {busy ? <Spinner /> : null}
          <span>{busy ? activity || "Trabalhando no seu projeto…" : project.error}</span>
          {busy && ["planning", "generating"].includes(project.status) && (
            <button className="ghost-btn" disabled={pending.some((p) => p.action === "cancel")} onClick={() => infer("cancel")}>
              <Square size={12} /> Cancelar
            </button>
          )}
        </div>
      ) : (
        <div />
      )}
      <main className="shell-main fixed">
        <div className="studio-body">
          <section className="canvas" aria-label={labels[ORDER.indexOf(view)]} onMouseDown={(e) => { if (e.target === e.currentTarget && view === "carrossel") setSel(null); }}>
            {view === "texto" &&
              (!slides.length ? (
                busy ? (
                  <div className="loading">
                    <Spinner />
                    <b>{doc ? "Escrevendo o roteiro" : "Escrevendo o texto"}</b>
                    <span>Prompt Mestre + seu Contexto da Marca{doc ? "" : " + Copy Engine"}. Leva um ou dois minutos.</span>
                  </div>
                ) : (
                  <div className="center-card">
                    <h2>{doc ? `Vamos escrever ${format === "material" ? "o material" : "a apresentação"}` : "Primeiro o texto, depois a arte"}</h2>
                    <label className="fld">
                      <span>Sobre o que é</span>
                      <Grow value={project.brief} readOnly onChange={() => {}} />
                    </label>
                    {!doc && (
                      <>
                        <label className="fld">
                          <span>Linha editorial <small>opcional</small></span>
                          <Grow value={draft.editorialLine} placeholder="Vazio: o Carrossell sugere" onChange={(e) => set("editorialLine", e.target.value)} />
                        </label>
                        <label className="fld">
                          <span>Mascote, desenho ou efeito <small>opcional</small></span>
                          <Grow value={draft.visualConcept} placeholder="Vazio: o Carrossell sugere pelo Design Kit" onChange={(e) => set("visualConcept", e.target.value)} />
                        </label>
                      </>
                    )}
                    <p className="hint">{connected ? "Use o botão no topo para gerar." : "Conecte sua conta ChatGPT no menu do avatar para gerar."}</p>
                  </div>
                )
              ) : (
                <div className="outline">
                  <div className="outline-head">
                    <h2>Roteiro</h2>
                    <span className="hint">
                      {slides.length} {unit}s{project.architecture ? ` · ${project.architecture}` : ""} · clique para editar
                    </span>
                  </div>
                  {drafts.map((d, i) => (
                    <button key={d.id} className="outline-row" aria-pressed={sel === i} onClick={() => setSel(sel === i ? null : i)}>
                      <span className="n">{String(i + 1).padStart(2, "0")}</span>
                      <span>
                        <span className="role">{doc ? `${LAYOUT_LABEL[d.layout] || "Texto"}${d.role ? ` · ${d.role}` : ""}` : d.role || (i === 0 ? "Capa" : `Card ${i + 1}`)}</span>
                        <h3>
                          <Marked text={d.title || "Sem título"} emphasis={d.emphasis} />
                        </h3>
                        {d.body && <p>{d.body}</p>}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            {view === "capa" && (
              <div className="covers-wrap">
                {!doc && (
                  <div className="style-row" role="group" aria-label="Estilo do carrossel">
                    {Object.entries(STYLE_SHORT).map(([k, l]) => (
                      <button key={k} aria-pressed={project.style === k} disabled={busy} onClick={() => setStyle(k)}>
                        {l}
                      </button>
                    ))}
                  </div>
                )}
                <h2>{doc ? "Qual capa combina com este material?" : "Qual capa faz você parar?"}</h2>
                <div className="covers">
                  {(project.coverOptions || []).map((o, i) => (
                    <button key={o.id} className={`cover-opt ${format === "apresentacao" ? "wide" : ""}`} aria-pressed={(cover || project.coverOptions[0].id) === o.id} onClick={() => setCover(o.id)}>
                      <span className="frame">
                        <img src={o.image} alt={`Opção de capa ${i + 1}`} />
                      </span>
                      Opção {i + 1}
                    </button>
                  ))}
                  {busy && project.status === "generating" && (
                    <div className="cover-ghost" role="status">
                      <Spinner />
                      Desenhando…
                    </div>
                  )}
                  {!project.coverOptions?.length && !busy && <div className="empty-state">As opções de capa aparecem aqui.</div>}
                </div>
                <div className="row">
                  <button className="btn" disabled={busy || (!template && !connected)} onClick={() => infer("generateCovers", { count: 3 })}>
                    <Sparkles size={15} /> {project.coverOptions?.length ? "Gerar outras opções" : "Gerar opções"}
                  </button>
                  <button className="ghost-btn" onClick={() => go("texto")}>
                    Voltar ao {doc ? "roteiro" : "texto"}
                  </button>
                </div>
                <p className="hint">{template ? "As opções saem na hora e não gastam o limite da sua conta." : "A capa escolhida vira a referência de estilo dos outros cards."}</p>
              </div>
            )}
            {view === "carrossel" && slides.length > 0 && (
              <div className="stage">
                {!doc ? (
                  <div className="style-row" role="group" aria-label="Estilo do carrossel">
                    {Object.entries(STYLE_SHORT).map(([k, l]) => (
                      <button key={k} aria-pressed={project.style === k} disabled={busy} onClick={() => setStyle(k)}>
                        {l}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div />
                )}
                {!doc && project.style === "fototexto" && !sceneInUse ? (
                  <div className="notice-strip info" style={{ borderRadius: 12, border: 0 }}>
                    <span>Sem fotos de cena ainda: os cards mostram um espaço reservado. Aprove cenas e gere as fotos na Marca.</span>
                    <button className="btn small" onClick={onBrand}>Abrir Marca</button>
                  </div>
                ) : !doc && project.style === "fototexto" && sceneInUse.images.length < slides.length ? (
                  <div className="notice-strip info" style={{ borderRadius: 12, border: 0 }}>
                    <span>
                      O ambiente “{sceneInUse.label}” tem {sceneInUse.images.length} de {slides.length} fotos: algumas se repetem. Gere mais {slides.length - sceneInUse.images.length} para cada card ter uma foto diferente do mesmo lugar.
                    </span>
                    <button
                      className="btn small primary"
                      disabled={busy || Boolean(state.working) || !connected}
                      onClick={async () => {
                        const done = await request("sceneImage", { id: sceneInUse.id, count: Math.min(8, slides.length - sceneInUse.images.length) }).catch(() => null);
                        if (done) await infer("generateSlides", { all: true });
                      }}
                    >
                      {state.working === "scene" ? <Spinner /> : <Sparkles size={14} />} {state.working === "scene" ? "Gerando fotos…" : "Gerar fotos"}
                    </button>
                  </div>
                ) : (
                  <div />
                )}
                <div className="stage-main" onMouseDown={(e) => { if (e.target === e.currentTarget) setSel(null); }}>
                  <button className="nav-arrow" aria-label="Anterior" disabled={cur === 0} onClick={() => step(-1)}>
                    <ChevronLeft size={18} />
                  </button>
                  <button className={`stage-frame ${frameClass}`} aria-label={`Editar ${unit} ${cur + 1}`} onClick={() => setSel(cur)}>
                    {preview(cur)}
                    {!doc && curSlide?.state === "outdated" && <span className="chip accent stage-badge">Texto mudou · atualizar</span>}
                  </button>
                  <button className="nav-arrow" aria-label="Próximo" disabled={cur === slides.length - 1} onClick={() => step(1)}>
                    <ChevronRight size={18} />
                  </button>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <div className="strip">
                    {slides.map((s, i) => (
                      <button key={s.id} className="thumb" aria-current={i === cur} aria-label={`${unit} ${i + 1}`} onClick={() => { setCur(i); if (sel !== null) setSel(i); }}>
                        <span className={`mini ${frameClass}`}>
                          {doc ? preview(i) : s.image ? <img src={s.image} alt="" /> : s.state === "generating" ? <Spinner /> : <span className="hint">{i + 1}</span>}
                          {!doc && s.state === "outdated" && <i className="flag" />}
                        </span>
                        {i === 0 ? "Capa" : i + 1}
                      </button>
                    ))}
                  </div>
                  <p className="stage-tip">{sel === null ? `Clique ${unit === "página" ? "na página" : `no ${unit}`} para ajustar. Use ← → para navegar.` : "Clique fora para fechar o painel."}</p>
                </div>
              </div>
            )}
            {view === "publicar" &&
              (doc ? (
                <div className="publish">
                  <div className="pubcol" style={{ width: format === "material" ? 380 : 560 }}>
                    <div className={`stage-frame ${frameClass}`} style={{ width: "100%", cursor: "default" }}>
                      {preview(cur)}
                    </div>
                    <div className="phone-ctl">
                      <button className="icon-only" aria-label="Página anterior" disabled={cur === 0} onClick={() => step(-1)}>
                        <ChevronLeft size={18} />
                      </button>
                      <span className="hint">
                        {cur + 1} de {slides.length}
                      </span>
                      <button className="icon-only" aria-label="Próxima página" disabled={cur === slides.length - 1} onClick={() => step(1)}>
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="pubcol">
                    <div className="split">
                      <button className="btn primary" disabled={busy || exporting} onClick={() => exportPdf()}>
                        {exporting ? <Spinner /> : <Download size={17} />} {exporting ? "Salvando PDF…" : "Baixar PDF"}
                      </button>
                      <div className="pop-anchor">
                        <button className="btn primary" aria-label="Outros destinos" onClick={() => pop.toggle("send")}>
                          <ChevronDown size={16} />
                        </button>
                        {pop.open === "send" && (
                          <div className="popover right">
                            <button className="opt" onClick={() => { pop.setOpen(null); exportPdf({ drive: true }); }}>
                              <b>Google Drive</b>
                              <small>Pasta Meu Drive › PACTO</small>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {drive && <DriveBox drive={drive} request={request} retry={() => exportPdf({ drive: true })} />}
                    <div className="box">
                      <div className="box-head">
                        <b>Arquivo</b>
                      </div>
                      <p>
                        {format === "material" ? "A4 retrato" : "Apresentação 16:9"} · {slides.length} {unit}s{"\n"}Texto selecionável, fontes embutidas e as cores do seu Design Kit.
                      </p>
                    </div>
                    {source ? (
                      <div className="box">
                        <div className="box-head">
                          <b>Entrega na DM</b>
                          {source.ctaKit?.keywords?.[0] && <span className="chip accent">{source.ctaKit.keywords[0]}</span>}
                        </div>
                        <p>Quem comentar no carrossel “{source.title}” recebe este PDF. Mande o arquivo junto com a DM 1.</p>
                        <button className="link-btn" onClick={() => onOpen(source.id)}>
                          Abrir o carrossel
                        </button>
                      </div>
                    ) : (
                      project.caption && (
                        <div className="box">
                          <div className="box-head">
                            <b>Mensagem para enviar junto</b>
                            <button className="btn small" onClick={() => (copyText(project.caption), onNotice("Mensagem copiada."))}>
                              <Copy size={14} /> Copiar
                            </button>
                          </div>
                          <p>{project.caption}</p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="publish">
                  <div className="phone" aria-label="Prévia no Instagram">
                    <div className="phone-head">
                      {brand.avatar ? <img src={brand.avatar} alt="" /> : <span className="av" />}
                      {brand.handle || brand.name || "seuperfil"}
                    </div>
                    <div className="phone-shot">{curSlide?.image && <img src={curSlide.image} alt={`Card ${cur + 1}`} />}</div>
                    <div className="phone-ctl">
                      <button className="icon-only" aria-label="Card anterior" disabled={cur === 0} onClick={() => step(-1)}>
                        <ChevronLeft size={18} />
                      </button>
                      <div className="dots">
                        {slides.map((s, i) => (
                          <i key={s.id} className={i === cur ? "on" : ""} />
                        ))}
                      </div>
                      <button className="icon-only" aria-label="Próximo card" disabled={cur === slides.length - 1} onClick={() => step(1)}>
                        <ChevronRight size={18} />
                      </button>
                    </div>
                    <p className="caption-line">
                      <b>{brand.handle || brand.name || "seuperfil"}</b> {(project.caption || "").split("\n")[0]} <span>… mais</span>
                    </p>
                  </div>
                  <div className="pubcol">
                    <div className="tabs-line" role="tablist">
                      {[
                        ["enviar", "Enviar"],
                        ["dm", "Comentário e DM"],
                        ["stories", "Stories"],
                        ["resultado", "Resultado"],
                      ].map(([k, l]) => (
                        <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
                          {l}
                        </button>
                      ))}
                    </div>
                    {tab === "enviar" && (
                      <>
                        <div className="split">
                          <button className="btn primary" onClick={() => setSharing(true)}>
                            <Smartphone size={17} /> Enviar para o celular
                          </button>
                          <div className="pop-anchor">
                            <button className="btn primary" aria-label="Outros destinos" onClick={() => pop.toggle("send")}>
                              <ChevronDown size={16} />
                            </button>
                            {pop.open === "send" && (
                              <div className="popover right">
                                <button className="opt" onClick={() => { pop.setOpen(null); saveDrive(); }}>
                                  <b>Google Drive</b>
                                  <small>Pasta Meu Drive › PACTO</small>
                                </button>
                                <button className="opt" onClick={() => { pop.setOpen(null); exportZip(); }}>
                                  <b>Baixar ZIP</b>
                                  <small>PNGs 1080×1350, legenda e DMs</small>
                                </button>
                                <button className="opt" onClick={() => { pop.setOpen(null); exportPdf(); }}>
                                  <b>PDF para o LinkedIn</b>
                                  <small>Os {slides.length} cards num só PDF</small>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                        {sharing && <Share project={project} request={request} />}
                        {drive && <DriveBox drive={drive} request={request} retry={saveDrive} />}
                        <div className="box">
                          <div className="box-head">
                            <b>Legenda</b>
                            <button className="btn small" onClick={() => (copyText(project.caption), onNotice("Legenda copiada."))}>
                              <Copy size={14} /> Copiar
                            </button>
                          </div>
                          <p>{project.caption || "Sem legenda. Escreva na etapa Texto."}</p>
                        </div>
                        <p className="hint">Depois de postar no Instagram, toque em “Marquei como publicado” no topo.</p>
                      </>
                    )}
                    {tab === "dm" && (
                      <>
                        <div className="box">
                          <div className="box-head">
                            <b>Material gratuito em PDF</b>
                            {sources[0] ? (
                              <button className="btn small" onClick={() => onOpen(sources[0].id)}>
                                <FileText size={14} /> Abrir material
                              </button>
                            ) : (
                              <button className="btn small primary" onClick={createMaterial}>
                                <Sparkles size={14} /> Criar PDF com a sua marca
                              </button>
                            )}
                          </div>
                          <p>{sources[0] ? `“${sources[0].title}” é o material entregue para quem comentar.` : "Transforme o material da DM 1 num PDF com as cores e o tom da sua marca."}</p>
                        </div>
                        {project.ctaKit ? (
                          <>
                            <div className="box">
                              <div className="box-head">
                                <b>Palavras-chave</b>
                              </div>
                              <div className="kw">
                                {project.ctaKit.keywords.map((k) => (
                                  <span key={k}>{k}</span>
                                ))}
                              </div>
                            </div>
                            {[
                              ["CTA do primeiro card", project.ctaKit.firstCardCta],
                              ["CTA do último card", project.ctaKit.lastCardCta],
                              ["Material gratuito", project.ctaKit.freebie],
                              ["DM 1 · entrega", project.ctaKit.dm1],
                              ["DM 2 · ponte para a oferta", project.ctaKit.dm2],
                            ].map(([label, value]) => (
                              <div className="box" key={label}>
                                <div className="box-head">
                                  <b>{label}</b>
                                  <button className="btn small" onClick={() => (copyText(value), onNotice("Copiado."))}>
                                    <Copy size={14} /> Copiar
                                  </button>
                                </div>
                                <p>{value}</p>
                              </div>
                            ))}
                          </>
                        ) : null}
                        <button className="btn" disabled={busy || !connected} onClick={() => infer("ctaKit")}>
                          <Sparkles size={15} /> {project.ctaKit ? "Gerar de novo" : "Gerar palavras-chave, CTAs e DMs"}
                        </button>
                      </>
                    )}
                    {tab === "stories" && (
                      <>
                        {(project.stories || []).map((s, i) => (
                          <div className="box" key={s.id}>
                            <div className="story">
                              <div className="story-pic">{s.image ? <img src={s.image} alt={`Story ${i + 1}`} /> : "9:16"}</div>
                              <div style={{ display: "grid", gap: 6 }}>
                                <b>
                                  {i + 1}. {s.type}
                                </b>
                                <p>{s.text}</p>
                                {s.sticker && <span className="hint">Sticker: {s.sticker}</span>}
                                <div className="row">
                                  <button className="btn small" onClick={() => (copyText([s.text, s.sticker, s.cta].filter(Boolean).join("\n")), onNotice("Story copiado."))}>
                                    <Copy size={14} /> Copiar
                                  </button>
                                  <button className="btn small" disabled={busy || !connected} onClick={() => infer("generateStoryArt", { storyId: s.id })}>
                                    <ImagePlus size={14} /> {s.image ? "Gerar arte de novo" : "Gerar arte 9:16"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button className="btn" disabled={busy || !connected} onClick={() => infer("stories")}>
                          <Sparkles size={15} /> {project.stories?.length ? "Criar outra sequência" : "Criar stories de perguntas e oferta"}
                        </button>
                        <p className="hint">A arte é opcional: gere só a dos stories que você quiser, para economizar o limite da conta.</p>
                      </>
                    )}
                    {tab === "resultado" && <Result project={project} request={request} onNotice={onNotice} connected={connected} />}
                  </div>
                </div>
              ))}
          </section>
          {((view === "texto" && slides.length > 0) || (view === "carrossel" && sel !== null)) && (
            <aside className="side" aria-label={selected ? `Editar ${unit}` : "Revisão"}>
              {selected ? (
                <>
                  <div className="side-head">
                    <b>
                      {sel === 0 ? "Capa" : `${unit[0].toUpperCase()}${unit.slice(1)} ${sel + 1}`}
                      {selected.role ? ` · ${selected.role}` : ""}
                    </b>
                    <button className="icon-only" aria-label="Fechar painel" onClick={() => setSel(null)}>
                      <X size={17} />
                    </button>
                  </div>
                  <div className="side-body">
                    {doc && (
                      <label className="fld">
                        <span>Tipo de página</span>
                        <select value={selected.layout || "text"} onChange={(e) => edit(selected.id, "layout", e.target.value)}>
                          {LAYOUTS.map((l) => (
                            <option key={l} value={l}>
                              {LAYOUT_LABEL[l]}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {view === "texto" && (
                      <label className="fld">
                        <span>Função</span>
                        <input value={selected.role} placeholder={sel === 0 ? "Capa" : "Função"} onChange={(e) => edit(selected.id, "role", e.target.value)} />
                      </label>
                    )}
                    <label className="fld">
                      <span>Título</span>
                      <Grow value={selected.title} onChange={(e) => edit(selected.id, "title", e.target.value)} />
                    </label>
                    {sel === 0 && view === "texto" && !doc && project.coverHooks?.length > 0 && (
                      <div className="fld">
                        <span>Outras headlines de capa</span>
                        <div className="hooks">
                          {project.coverHooks.map((h) => (
                            <button key={h} onClick={() => edit(selected.id, "title", h)}>
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <label className="fld">
                      <span>
                        Texto {doc && ["checklist", "steps"].includes(selected.layout) && <small>{selected.layout === "steps" ? "um passo por linha: Título — descrição" : "um item por linha"}</small>}
                      </span>
                      <Grow value={selected.body} onChange={(e) => edit(selected.id, "body", e.target.value)} />
                    </label>
                    <label className="fld">
                      <span>
                        Destaque <small>palavras inteiras, separadas por ;</small>
                      </span>
                      <input value={selected.emphasis} onChange={(e) => edit(selected.id, "emphasis", e.target.value)} />
                    </label>
                    {!doc && project.style === "ia" && (
                      <label className="fld">
                        <span>Ilustração</span>
                        <Grow value={selected.visual} onChange={(e) => edit(selected.id, "visual", e.target.value)} />
                      </label>
                    )}
                    {!doc && (
                      <div className="fld">
                        <span>
                          Imagem no card <small>o que deve aparecer</small>
                        </span>
                        <div className="photo-pick asset-pick" role="group" aria-label="Imagem no card">
                          <button className="none" aria-pressed={!selected.asset} onClick={() => edit(selected.id, "asset", "")}>
                            Nenhuma
                          </button>
                          {allAssets.map((a) => (
                            <button key={a.id} aria-label={a.name} title={a.name} aria-pressed={selected.asset === a.id} onClick={() => edit(selected.id, "asset", a.id)}>
                              <img src={a.dataUrl} alt="" />
                            </button>
                          ))}
                          <button className="none" aria-label="Enviar imagem para este card" title="Enviar imagem" disabled={busy} onClick={() => attachToCard(selected.id)}>
                            <ImagePlus size={16} />
                          </button>
                        </div>
                        {!allAssets.length && (
                          <button className="link-btn" onClick={onBrand}>
                            Cadastrar logo e produtos na Marca
                          </button>
                        )}
                      </div>
                    )}
                    {!doc && view === "carrossel" && project.style === "fototexto" && (
                      <div className="fld">
                        <span>
                          Foto <small>cenas aprovadas na Marca</small>
                        </span>
                        <div className="sugg">
                          {approvedScenes.map((s) => (
                            <button key={s.id} aria-pressed={(String(selected.photo).split("#")[0] || sceneInUse?.id) === s.id} onClick={() => edit(selected.id, "photo", s.id)}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                        {(() => {
                          const [sid, n] = String(selected.photo || "").split("#");
                          const scene = approvedScenes.find((s) => s.id === sid) || sceneInUse;
                          if (!scene || scene.images.length < 2) return null;
                          const current = n !== undefined && n !== "" ? Number(n) % scene.images.length : sel % scene.images.length;
                          return (
                            <div className="photo-pick" role="group" aria-label="Foto da série">
                              {scene.images.map((img, k) => (
                                <button key={k} aria-label={`Foto ${k + 1}`} aria-pressed={current === k} onClick={() => edit(selected.id, "photo", `${scene.id}#${k}`)}>
                                  <img src={img} alt="" />
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                        <button className="link-btn" onClick={onBrand}>
                          Aprovar mais cenas na Marca
                        </button>
                      </div>
                    )}
                    {!doc && view === "carrossel" && ["fundo", "recorte"].includes(project.style) && (
                      <div className="fld">
                        <span>
                          Sua foto <small>enviadas na Marca</small>
                        </span>
                        <div className="sugg">
                          {media.faces.map((f, i) => (
                            <button key={f.id} aria-pressed={selected.photo === f.id} onClick={() => edit(selected.id, "photo", f.id)}>
                              {f.name || `Foto ${i + 1}`}
                            </button>
                          ))}
                        </div>
                        <button className="link-btn" onClick={onBrand}>
                          Enviar fotos na Marca
                        </button>
                      </div>
                    )}
                    {!doc && view === "carrossel" && project.style === "ia" && selectedSlide?.image && (
                      <div className="fld">
                        <span>
                          Correção rápida <small>Aula 05</small>
                        </span>
                        <div className="sugg">
                          {(state.visualFixes || []).map((f) => (
                            <button key={f} aria-pressed={fixes.includes(f)} onClick={() => setFixes((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]))}>
                              {f}
                            </button>
                          ))}
                        </div>
                        <input aria-label="Detalhe da correção" placeholder="Detalhe (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
                        <button
                          className="btn small"
                          disabled={busy || !connected || (!fixes.length && !note.trim())}
                          onClick={async () => {
                            if (dirty) await save();
                            if (await infer("generateSlides", { slideId: selectedSlide.id, fix: { problems: fixes, note: note.trim() } })) {
                              setFixes([]);
                              setNote("");
                            }
                          }}
                        >
                          <WandSparkles size={14} /> Corrigir este card
                        </button>
                      </div>
                    )}
                  </div>
                  {view === "carrossel" && !doc ? (
                    <div className="side-foot">
                      <button
                        className="btn"
                        disabled={busy || (!template && !connected)}
                        onClick={async () => {
                          if (dirty) await save();
                          infer("generateSlides", { slideId: selectedSlide.id });
                        }}
                      >
                        <WandSparkles size={15} /> {template ? "Atualizar este card" : selectedSlide?.image ? "Gerar este card de novo" : "Gerar este card"}
                      </button>
                    </div>
                  ) : (
                    <div className="side-foot">
                      <Chat project={project} request={request} busy={busy} connected={connected} placeholder={`Peça um ajuste para ${unit === "página" ? "esta página" : `este ${unit}`}…`} />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="side-head">
                    <b>{doc ? (format === "material" ? "Sobre este material" : "Sobre esta apresentação") : project.textApproved ? "Texto aprovado" : "Revisão antes de aprovar"}</b>
                    {!doc && !project.textApproved && <span className="hint">{checks.length}/{CHECKLIST.length}</span>}
                  </div>
                  <div className="side-body">
                    {!doc && !project.textApproved && (
                      <div className="fld">
                        <div className="progress" aria-hidden="true">
                          <i style={{ width: `${(checks.length / CHECKLIST.length) * 100}%` }} />
                        </div>
                        <div className="checks" role="group" aria-label="Revisão humana · Aula 04">
                          {CHECKLIST.map((q) => (
                            <label className="check" key={q}>
                              <input type="checkbox" checked={checks.includes(q)} onChange={(e) => setChecks((c) => (e.target.checked ? [...c, q] : c.filter((x) => x !== q)))} />
                              <span>{q}</span>
                            </label>
                          ))}
                        </div>
                        <p className="hint">A IA acelera a escrita. Seu julgamento decide se vale publicar. Aula 04.</p>
                      </div>
                    )}
                    {doc && (
                      <div className="box">
                        <div className="box-head">
                          <b>Objetivo</b>
                        </div>
                        <p>{source ? `Entregar na DM de quem comentar no carrossel “${source.title}”.` : project.brief}</p>
                      </div>
                    )}
                    <label className="fld">
                      <span>
                        {doc ? "Mensagem para enviar junto" : "Legenda"} {!doc && <small>CTA na primeira linha</small>}
                      </span>
                      <Grow value={draft.caption} onChange={(e) => set("caption", e.target.value)} />
                    </label>
                    {!doc && (
                      <>
                        <label className="fld">
                          <span>Linha editorial</span>
                          <Grow value={draft.editorialLine} onChange={(e) => set("editorialLine", e.target.value)} />
                        </label>
                        <label className="fld">
                          <span>Mascote, desenho ou efeito</span>
                          <Grow value={draft.visualConcept} onChange={(e) => set("visualConcept", e.target.value)} />
                        </label>
                      </>
                    )}
                  </div>
                  <div className="side-foot">
                    <Chat project={project} request={request} busy={busy} connected={connected} placeholder={doc ? "Peça um ajuste no roteiro inteiro…" : "Peça um ajuste no texto inteiro…"} />
                  </div>
                </>
              )}
            </aside>
          )}
        </div>
      </main>
      {deleting && (
        <Dialog title="Excluir este projeto?" eyebrow={FORMAT_LABEL[format].toUpperCase()} onClose={() => setDeleting(false)}>
          <p className="dialog-copy">“{project.title}” será removido deste computador.</p>
          <div className="dialog-footer">
            <button className="btn" onClick={() => setDeleting(false)}>
              Manter
            </button>
            <button
              className="btn primary"
              onClick={async () => {
                if (await infer("delete")) {
                  setDeleting(false);
                  onNotice("Projeto excluído.");
                  onBack();
                }
              }}
            >
              Excluir
            </button>
          </div>
        </Dialog>
      )}
      {teaching && (
        <Dialog title="O que o Carrossell deve fazer diferente?" eyebrow="ENSINAR O CARROSSELL" onClose={() => setTeaching(false)}>
          <form
            className="feedback-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (lesson.text.trim().length < 3) return;
              try {
                await request("addFeedback", { text: lesson.text.trim(), area: lesson.area, projectId: project.id });
                setTeaching(false);
                setLesson({ text: "", area: "texto" });
                onNotice("Anotado. Vale para os próximos carrosséis; veja e edite em Marca › Otimizar.");
              } catch {}
            }}
          >
            <Grow aria-label="O que mudar" value={lesson.text} maxLength={600} placeholder="Ex.: capa com promessa mais específica; menos texto por card; ilustrações mais simples" onChange={(e) => setLesson((l) => ({ ...l, text: e.target.value }))} />
            <div className="row">
              <div className="seg" role="radiogroup" aria-label="Vale para" style={{ margin: 0 }}>
                {[["texto", "Texto"], ["visual", "Visual"], ["geral", "Tudo"]].map(([k, l]) => (
                  <button type="button" key={k} role="radio" aria-checked={lesson.area === k} aria-pressed={lesson.area === k} onClick={() => setLesson((x) => ({ ...x, area: k }))}>
                    {l}
                  </button>
                ))}
              </div>
              <span className="spacer" />
              <button className="btn primary" disabled={lesson.text.trim().length < 3}>
                Ensinar
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

function DriveBox({ drive, request, retry }) {
  return (
    <div className="box">
      <div className="box-head">
        <b>Google Drive</b>
        <button
          className="btn small"
          onClick={async () => {
            const r = await request("chooseDriveFolder").catch(() => null);
            if (r && !r.cancelled) retry();
          }}
        >
          <Search size={14} /> Escolher pasta
        </button>
      </div>
      <p>{drive.missing ? "Não encontramos a pasta “Meu Drive” neste computador. Instale o Google Drive para computador ou escolha outra pasta sincronizada." : `Salvo em ${drive.folder}. Em instantes aparece no app do Drive no celular.`}</p>
    </div>
  );
}

function Result({ project, request, onNotice, connected }) {
  const [m, setM] = useState({
    comments: project.results?.comments ?? "",
    saves: project.results?.saves ?? "",
    sales: project.results?.sales ?? "",
  });
  const values = { id: project.id, comments: Number(m.comments) || 0, saves: Number(m.saves) || 0, sales: Number(m.sales) || 0 };
  if (!project.publishedAt) return <p className="hint">Depois de publicar, marque como publicado no topo. Em 2 ou 3 dias, registre aqui comentários, salvamentos e vendas.</p>;
  return (
    <div className="box">
      <div className="box-head">
        <b>Como este carrossel foi?</b>
      </div>
      <div className="metrics">
        {[
          ["comments", "Comentários"],
          ["saves", "Salvamentos"],
          ["sales", "Vendas"],
        ].map(([k, l]) => (
          <label className="fld" key={k}>
            <span>{l}</span>
            <input type="number" min="0" value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      <div className="row">
        <button className="btn small" onClick={() => request("recordResults", values).then(() => onNotice("Resultado salvo.")).catch(() => {})}>
          <Check size={14} /> Salvar resultado
        </button>
        <button className="btn small primary" disabled={!connected} onClick={() => request("replicate", values).then(() => onNotice("10 ideias do vencedor estão no Início.")).catch(() => {})}>
          <Sparkles size={14} /> Salvar e replicar
        </button>
      </div>
    </div>
  );
}
