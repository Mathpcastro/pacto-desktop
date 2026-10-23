import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Image,
  LoaderCircle,
  Megaphone,
  Trophy,
  Wrench,
  MessageSquare,
  MoreHorizontal,
  PanelRightClose,
  Pencil,
  Save,
  Send,
  Square,
  WandSparkles,
} from "lucide-react";
import Dialog from "./Dialog.jsx";
import IconButton from "./IconButton.jsx";
import { PaperStack, statusLabels } from "./Library.jsx";
import {
  CopyBoard,
  CoverPicker,
  CtaDialog,
  FixDialog,
  ProjectDirection,
  ResultsDialog,
  StageBar,
  projectStage,
} from "./Flow.jsx";
import { PublishScreen } from "./Publish.jsx";

function editableContent(slide) {
  return {
    title: slide.title || "",
    body: slide.body || "",
    visual: slide.visual || "",
    prompt: slide.prompt || "",
  };
}

function SlideFields({ slide, project, request, blocked, onDirtyChange }) {
  const [form, setForm] = useState(() => {
    const content = editableContent(slide);
    return { draft: content, baseline: content };
  });
  const { draft } = form;
  const setDraft = (value) =>
    setForm((current) => ({ ...current, draft: value }));
  const [saving, setSaving] = useState(false);
  const dirty = Object.keys(draft).some(
    (key) => draft[key] !== form.baseline[key],
  );
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    const incoming = editableContent(slide);
    setForm((current) => {
      const keys = Object.keys(incoming);
      if (keys.every((key) => incoming[key] === current.baseline[key]))
        return current;
      // Compare with the previous persisted baseline, not the incoming props:
      // untouched fields follow events; actual local edits stay in the draft.
      return {
        baseline: incoming,
        draft: Object.fromEntries(
          keys.map((key) => [
            key,
            current.draft[key] === current.baseline[key]
              ? incoming[key]
              : current.draft[key],
          ]),
        ),
      };
    });
  }, [slide.title, slide.body, slide.visual, slide.prompt]);
  return (
    <form
      className="slide-fields"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
          await request("saveProject", {
            id: project.id,
            slides: project.slides.map((s) =>
              s.id === slide.id ? { ...s, ...draft } : s,
            ),
          });
        } catch {
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="panel-section-heading">
        <span className="eyebrow">CONTEÚDO DO SLIDE</span>
        <span className="mono">
          {String(slide.index ?? project.slides.indexOf(slide) + 1).padStart(
            2,
            "0",
          )}
        </span>
      </div>
      <label className="field">
        <span>Título</span>
        <textarea
          rows={3}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Texto</span>
        <textarea
          rows={5}
          value={draft.body}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
        />
      </label>
      <details className="visual-details">
        <summary>Direção visual e prompt</summary>
        <label className="field">
          <span>Direção visual</span>
          <textarea
            rows={3}
            value={draft.visual}
            onChange={(e) => setDraft({ ...draft, visual: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Prompt da imagem</span>
          <textarea
            rows={4}
            value={draft.prompt}
            onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
          />
        </label>
      </details>
      <p className="field-hint">
        Salvar altera o plano. Para atualizar a arte, gere a imagem deste slide
        novamente.
      </p>
      <button
        className="button secondary full"
        disabled={!dirty || saving || blocked}
      >
        {saving ? (
          <LoaderCircle className="spin" size={15} />
        ) : dirty ? (
          <Save size={15} />
        ) : (
          <Check size={15} />
        )}
        {saving ? "Salvando…" : dirty ? "Salvar alterações" : "Conteúdo salvo"}
      </button>
    </form>
  );
}

function Assistant({ project, request, blocked, account, activity }) {
  const [text, setText] = useState("");
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [project.messages?.length, activity]);
  return (
    <div className="assistant">
      <div className="assistant-messages">
        {project.messages?.length ? (
          project.messages.map((message) => (
            <article
              key={message.id}
              className={`message message-${message.role}`}
            >
              <span className="eyebrow">
                {message.role === "user" ? "VOCÊ" : "ASSISTENTE PACTO"}
              </span>
              <p>{message.text}</p>
            </article>
          ))
        ) : (
          <div className="assistant-empty">
            <MessageSquare size={24} strokeWidth={1.25} />
            <h3>
              Uma conversa
              <br />
              faz a ideia avançar.
            </h3>
            <p>
              Peça uma nova abordagem, ajuste o tom ou refine um slide. O
              assistente conhece o contexto do seu projeto.
            </p>
          </div>
        )}
        {blocked && (
          <div className="assistant-working">
            <LoaderCircle size={14} className="spin" />
            <span>{activity || "Trabalhando no seu carrossel…"}</span>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        className="chat-composer"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!text.trim() || blocked || !account.connected) return;
          const sent = text.trim();
          setText("");
          try {
            await request("sendMessage", { id: project.id, text: sent });
          } catch {
            setText(sent);
          }
        }}
      >
        <textarea
          rows={3}
          aria-label="Mensagem para o assistente"
          placeholder={
            account.connected
              ? "O que vamos melhorar?"
              : "Conecte sua conta para conversar"
          }
          value={text}
          disabled={!account.connected}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form.requestSubmit();
            }
          }}
        />
        <div>
          <span>Enter para enviar · Shift + Enter para quebrar</span>
          <IconButton
            label="Enviar mensagem"
            type="submit"
            disabled={!text.trim() || blocked || !account.connected}
          >
            <Send size={16} />
          </IconButton>
        </div>
      </form>
    </div>
  );
}

export default function Editor({
  project,
  request,
  onBack,
  onOpen,
  account,
  activity,
  pending,
  onNotice,
  onNavigationGuard,
  onIdeas,
  visualFixes = [],
  settings,
}) {
  const [selectedId, setSelectedId] = useState(project.slides?.[0]?.id || null);
  const [panel, setPanel] = useState("edit");
  const [panelOpen, setPanelOpen] = useState(true);
  const [copyView, setCopyView] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState(null);
  const [editInfo, setEditInfo] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [adjusting, setAdjusting] = useState(false);
  const [info, setInfo] = useState({
    title: project.title,
    brief: project.brief,
    caption: project.caption || "",
  });
  useEffect(() => {
    onNavigationGuard?.((proceed) => {
      if (dirty) setLeaveTarget({ navigate: proceed });
      else proceed();
    });
    return () => onNavigationGuard?.(null);
  }, [dirty, onNavigationGuard]);
  useEffect(() => {
    if (!dirty) return undefined;
    const protect = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);
  const slides = project.slides || [];
  const stage = projectStage(project);
  const textStage = stage === "start" || stage === "text";
  const slide = slides.find((s) => s.id === selectedId) || slides[0];
  const index = slide ? slides.indexOf(slide) : 0;
  const busy =
    ["planning", "generating"].includes(project.status) ||
    pending.some((p) =>
      [
        "generatePlan",
        "generateSlides",
        "generateCovers",
        "sendMessage",
        "cancel",
        "ctaKit",
      ].includes(p.action),
    );
  const imageCount = slides.filter((s) => s.image).length;
  const pendingImageCount = slides.filter(
    (s) => !s.image || s.state === "outdated",
  ).length;
  const readyToExport = slides.length > 0 && pendingImageCount === 0;
  const select = (next) => {
    if (next === slide?.id) return;
    if (dirty) setLeaveTarget({ id: next });
    else {
      setSelectedId(next);
      setCopyView(false);
    }
  };
  const back = () => {
    if (dirty) setLeaveTarget({ back: true });
    else onBack();
  };
  const infer = (action, args = {}) =>
    request(action, { id: project.id, ...args }).catch(() => {});
  const exporting = pending.some((p) => p.action === "export");
  useEffect(() => {
    setInfo({
      title: project.title,
      brief: project.brief,
      caption: project.caption || "",
    });
  }, [project.title, project.brief, project.caption]);
  return (
    <main className="workspace page-enter">
      <header className="workspace-toolbar">
        <div className="project-breadcrumb">
          <IconButton label="Voltar para a biblioteca" onClick={back}>
            <ArrowLeft size={18} />
          </IconButton>
          <span className="breadcrumb-divider" />
          <div>
            <h1>{project.title}</h1>
            <span className="workspace-status">
              <span
                className={`status-dot ${project.status === "complete" ? "connected" : ""}`}
              />
              {statusLabels[project.status] || "Rascunho"}
              {dirty && " · alterações não salvas"}
            </span>
          </div>
        </div>
        <StageBar stage={stage} />
        <div className="toolbar-actions">
          <details className="action-menu">
            <summary aria-label="Mais ações do projeto">
              <MoreHorizontal size={20} />
            </summary>
            <div>
              <button onClick={() => setEditInfo(true)}>
                <Pencil size={15} /> Título, briefing e legenda
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  const duplicate = async () => {
                    try {
                      const result = await request("duplicate", {
                        id: project.id,
                      });
                      if (result?.id) onOpen(result.id);
                    } catch {}
                  };
                  if (dirty) setLeaveTarget({ navigate: duplicate });
                  else void duplicate();
                }}
              >
                <Copy size={15} /> Duplicar carrossel
              </button>
              <button
                disabled={busy || !account.connected || dirty}
                onClick={() => infer("generatePlan")}
              >
                <WandSparkles size={15} /> Refazer o texto
              </button>
              <button
                disabled={!slides.length}
                onClick={() => setDialog("cta")}
              >
                <Megaphone size={15} /> CTA, DM e oferta
              </button>
              <button
                disabled={!slides.length || busy}
                onClick={() => setDialog("results")}
              >
                <Trophy size={15} /> Registrar resultado e replicar
              </button>
            </div>
          </details>
          <button
            className="button secondary"
            disabled={!readyToExport || busy || exporting}
            title={
              !readyToExport
                ? "Gere a imagem de todos os slides para exportar"
                : "Exportar imagens e legenda"
            }
            onClick={async () => {
              try {
                const result = await request("export", { id: project.id });
                if (!result.cancelled)
                  onNotice(
                    `${result.count || imageCount} imagens exportadas${result.path ? ` para ${result.path}` : ""}.`,
                  );
              } catch {}
            }}
          >
            {exporting ? (
              <LoaderCircle size={15} className="spin" />
            ) : (
              <Download size={15} />
            )}
            {exporting ? "Exportando…" : "Exportar"}
          </button>
          {["slides", "done"].includes(stage) && (
            <button
              className="button primary"
              disabled={
                busy ||
                !account.connected ||
                dirty ||
                !slides.length ||
                pendingImageCount === 0
              }
              onClick={() => infer("generateSlides")}
            >
              <WandSparkles size={15} />
              {pendingImageCount === 0 && slides.length
                ? "Imagens prontas"
                : imageCount
                  ? "Gerar restantes"
                  : "Gerar imagens"}
            </button>
          )}
          <IconButton
            label={panelOpen ? "Ocultar painel" : "Mostrar painel"}
            onClick={() => setPanelOpen(!panelOpen)}
          >
            <PanelRightClose size={18} />
          </IconButton>
        </div>
      </header>
      {busy && (
        <div className="progress-banner" role="status">
          <LoaderCircle className="spin" size={15} />
          <span>
            {activity ||
              (project.status === "generating"
                ? "Gerando as imagens do seu carrossel…"
                : "Escrevendo o texto do seu carrossel…")}
          </span>
          <button
            disabled={pending.some((p) => p.action === "cancel")}
            onClick={() => infer("cancel")}
          >
            <Square size={10} /> Cancelar
          </button>
        </div>
      )}
      {project.error && (
        <div className="project-error" role="alert">
          {project.error}
        </div>
      )}
      <div className={`editor-grid ${panelOpen ? "" : "panel-hidden"}`}>
        <aside className="slide-rail" aria-label="Slides do carrossel">
          <header>
            <span className="eyebrow">SLIDES</span>
            <span>{slides.length.toString().padStart(2, "0")}</span>
          </header>
          <div className="slide-list">
            {slides.map((s, i) => (
              <button
                key={s.id}
                className={`slide-thumb ${slide?.id === s.id ? "selected" : ""}`}
                onClick={() => select(s.id)}
                aria-label={`Slide ${i + 1}: ${s.title || "Sem título"}`}
                aria-pressed={slide?.id === s.id}
              >
                <span className="thumb-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="thumb-paper">
                  {s.image ? (
                    <img src={s.image} alt="" />
                  ) : (
                    <span className="thumb-copy">
                      {s.title || `Slide ${i + 1}`}
                      <i />
                      <i />
                    </span>
                  )}
                  {s.state === "generating" && (
                    <span className="thumb-loading">
                      <LoaderCircle className="spin" size={18} />
                    </span>
                  )}
                </span>
                <span className="thumb-label">
                  {i === 0
                    ? "Capa"
                    : i === slides.length - 1
                      ? "Encerramento"
                      : `Slide ${i + 1}`}
                  {s.image && <Check size={11} />}
                </span>
              </button>
            ))}
            {!slides.length && (
              <span className="rail-empty">
                Seu plano
                <br />
                aparece aqui.
              </span>
            )}
          </div>
          <footer>
            {imageCount} / {slides.length} imagens
          </footer>
        </aside>
        <section className="canvas-region" aria-label="Prévia do slide">
          {stage === "text" ? (
            <CopyBoard
              project={project}
              request={request}
              busy={busy}
              selectedId={selectedId}
              onDirtyChange={setDirty}
              onAskAssistant={() => {
                setPanel("chat");
                setPanelOpen(true);
              }}
            />
          ) : stage === "done" && !adjusting ? (
            <PublishScreen
              project={project}
              request={request}
              busy={busy}
              settings={settings}
              onEdit={() => setAdjusting(true)}
              onNotice={onNotice}
              onOpenDialog={setDialog}
            />
          ) : stage === "cover" ? (
            <CoverPicker
              project={project}
              request={request}
              busy={busy}
              connected={account.connected}
            />
          ) : slide ? (
            <>
              <div className="canvas-topline">
                <span className="eyebrow">
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(slides.length).padStart(2, "0")}{" "}
                  <span>· {index === 0 ? "CAPA" : "SLIDE"}</span>
                </span>
                <div className="view-switch">
                  <button
                    className={!copyView ? "active" : ""}
                    onClick={() => setCopyView(false)}
                  >
                    Arte
                  </button>
                  <button
                    className={copyView ? "active" : ""}
                    onClick={() => setCopyView(true)}
                  >
                    Texto
                  </button>
                </div>
              </div>
              <div className="canvas-scroll">
                <div
                  className={`slide-preview ${slide.image && !copyView ? "has-image" : "text-preview"}`}
                >
                  {slide.image && !copyView ? (
                    <img
                      src={slide.image}
                      alt={`Arte do slide ${index + 1}: ${slide.title || ""}`}
                    />
                  ) : (
                    <>
                      <span className="preview-kicker">
                        {copyView ? "PLANO DO SLIDE" : "ARTE AINDA NÃO GERADA"}
                      </span>
                      <div>
                        <h2>{slide.title}</h2>
                        {slide.body && <p>{slide.body}</p>}
                      </div>
                      <footer>
                        <span>PRÉVIA DO TEXTO</span>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                      </footer>
                    </>
                  )}
                </div>
              </div>
              <footer className="canvas-footer">
                <div className="slide-pager">
                  <IconButton
                    label="Slide anterior"
                    disabled={index === 0}
                    onClick={() => select(slides[index - 1].id)}
                  >
                    <ChevronLeft size={17} />
                  </IconButton>
                  <span>
                    {index + 1} de {slides.length}
                  </span>
                  <IconButton
                    label="Próximo slide"
                    disabled={index === slides.length - 1}
                    onClick={() => select(slides[index + 1].id)}
                  >
                    <ChevronRight size={17} />
                  </IconButton>
                </div>
                <div className="canvas-actions">
                  {stage === "done" && (
                    <button
                      className="button secondary"
                      disabled={dirty}
                      onClick={() => setAdjusting(false)}
                    >
                      <Check size={15} /> Pronto para publicar
                    </button>
                  )}
                  {index === 0 && project.coverOptions?.length > 1 && (
                    <button
                      className="button ghost"
                      disabled={busy || dirty}
                      onClick={() => setDialog("covers")}
                    >
                      <Image size={15} /> Trocar capa
                    </button>
                  )}
                  {slide.image && (
                    <button
                      className="button ghost"
                      disabled={busy || !account.connected || dirty}
                      onClick={() => setDialog("fix")}
                    >
                      <Wrench size={15} /> Corrigir
                    </button>
                  )}
                  <button
                    className="button ghost"
                    disabled={busy || !account.connected || dirty}
                    onClick={() =>
                      infer("generateSlides", { slideId: slide.id })
                    }
                  >
                    <Image size={15} />
                    {slide.image
                      ? "Gerar este slide novamente"
                      : "Gerar este slide"}
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="plan-empty">
              <PaperStack />
              <span className="eyebrow">DA IDEIA À SEQUÊNCIA</span>
              <h2>
                Primeiro o texto.
                <br />
                Depois a arte.
              </h2>
              <p>{project.brief}</p>
              <ProjectDirection
                key={project.id}
                project={project}
                request={request}
                busy={busy}
                disabled={!account.connected}
                onGenerate={() => infer("generatePlan")}
              />
              {!account.connected && (
                <button
                  className="text-button"
                  onClick={() => request("connect").catch(() => {})}
                >
                  Conectar minha conta <ArrowRight size={14} />
                </button>
              )}
              <small>Texto → capa → carrossel, como no curso.</small>
            </div>
          )}
        </section>
        <aside className="editor-panel" hidden={!panelOpen}>
          <div className="panel-tabs">
            {!textStage && (
              <button
                className={panel === "edit" ? "active" : ""}
                onClick={() => setPanel("edit")}
              >
                <Pencil size={14} /> Ajustar slide
              </button>
            )}
            <button
              className={panel === "chat" ? "active" : ""}
              onClick={() => setPanel("chat")}
            >
              <MessageSquare size={14} /> Assistente
            </button>
          </div>
          {
            <div
              className="editor-pane-content"
              hidden={panel !== "edit" || textStage}
            >
              {slide ? (
                <SlideFields
                  key={slide.id}
                  slide={slide}
                  project={project}
                  request={request}
                  blocked={busy}
                  onDirtyChange={setDirty}
                />
              ) : (
                <div className="panel-placeholder">
                  <span className="eyebrow">PRIMEIRO, O PLANO</span>
                  <p>
                    Depois de criar o plano, você pode revisar o texto e a
                    direção visual de cada slide aqui.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setPanel("chat")}
                  >
                    Conversar com o assistente <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          }
          {(panel === "chat" || textStage) && (
            <Assistant
              project={project}
              request={request}
              blocked={busy}
              account={account}
              activity={activity}
            />
          )}
        </aside>
      </div>
      {editInfo && (
        <Dialog
          title="Contexto do carrossel"
          eyebrow="DETALHES DO PROJETO"
          onClose={() => setEditInfo(false)}
        >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              try {
                await request("saveProject", { id: project.id, ...info });
                setEditInfo(false);
              } catch {}
            }}
          >
            <div className="dialog-fields">
              {[
                ["title", "Nome", 1],
                ["brief", "Briefing", 4],
                ["caption", "Legenda para publicação", 5],
              ].map(([key, label, rows]) => (
                <label className="field" key={key}>
                  <span>{label}</span>
                  {rows === 1 ? (
                    <input
                      required
                      value={info[key]}
                      onChange={(e) =>
                        setInfo({ ...info, [key]: e.target.value })
                      }
                    />
                  ) : (
                    <textarea
                      rows={rows}
                      value={info[key]}
                      onChange={(e) =>
                        setInfo({ ...info, [key]: e.target.value })
                      }
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="dialog-footer">
              <button
                type="button"
                className="button ghost"
                onClick={() => setEditInfo(false)}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                disabled={
                  busy || pending.some((p) => p.action === "saveProject")
                }
              >
                <Save size={15} /> Salvar
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {dialog === "fix" && slide && (
        <FixDialog
          project={project}
          slide={slide}
          problems={visualFixes}
          request={request}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "cta" && (
        <CtaDialog
          project={project}
          request={request}
          busy={busy}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "results" && (
        <ResultsDialog
          project={project}
          request={request}
          busy={busy}
          onClose={() => setDialog(null)}
          onIdeas={() => {
            setDialog(null);
            onIdeas?.();
          }}
        />
      )}
      {dialog === "covers" && (
        <Dialog
          title="Trocar a capa"
          eyebrow="OPÇÕES GERADAS"
          onClose={() => setDialog(null)}
          wide
        >
          <div className="cover-options compact">
            {(project.coverOptions || []).map((option, i) => (
              <figure key={option.id}>
                <img src={option.image} alt={`Opção de capa ${i + 1}`} />
                <button
                  className="button secondary full"
                  disabled={busy}
                  onClick={async () => {
                    try {
                      await request("chooseCover", {
                        id: project.id,
                        optionId: option.id,
                      });
                      setDialog(null);
                    } catch {}
                  }}
                >
                  Usar esta capa
                </button>
              </figure>
            ))}
          </div>
        </Dialog>
      )}
      {leaveTarget && (
        <Dialog
          title="Há alterações não salvas."
          onClose={() => setLeaveTarget(null)}
        >
          <p className="dialog-copy">
            Volte ao slide e salve o texto para manter suas alterações.
          </p>
          <div className="dialog-footer">
            <button
              className="button ghost"
              onClick={() => {
                if (leaveTarget.navigate) leaveTarget.navigate();
                else if (leaveTarget.back) onBack();
                else {
                  setSelectedId(leaveTarget.id);
                  setCopyView(false);
                }
                setDirty(false);
                setLeaveTarget(null);
              }}
            >
              Descartar e continuar
            </button>
            <button
              className="button primary"
              onClick={() => {
                setLeaveTarget(null);
                setPanel("edit");
                setPanelOpen(true);
              }}
            >
              Voltar e revisar
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
