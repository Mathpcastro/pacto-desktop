import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  Send,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import { LessonLink } from "../course.jsx";
import { Grow, Markdown, Spinner } from "../ui.jsx";

const steps = [
  { id: "account", label: "Conectar seu ChatGPT", short: "Conta" },
  { id: "brand", label: "Contexto Oficial da Marca", short: "Contexto" },
  { id: "design", label: "Design Kit Oficial", short: "Design Kit" },
  { id: "ready", label: "Projeto instalado", short: "Pronto" },
];
const copy = {
  brand: {
    title: "Contexto Oficial da Marca",
    lead: "Uma entrevista curta, em rodadas, como na Aula 02. Quanto mais detalhes você der, melhores ficam as pautas e a copy.",
    start: "Começar entrevista",
    doc: "Leia e corrija o que não representar seu negócio. Este documento acompanha todos os seus carrosséis.",
    field: "brandContext",
  },
  design: {
    title: "Design Kit Oficial",
    lead: "Defina a identidade visual que a IA vai repetir em todos os cards, como na Aula 05. O ideal é usar as cores e o estilo do seu produto, para criar o Efeito Continuidade.",
    start: "Começar entrevista do Design Kit",
    doc: "Revise paleta, ilustrações, capa e o prompt-base visual. É ele que garante cards bonitos e consistentes.",
    field: "designKit",
  },
};

function Interview({ kind, data, busy, connected, request, extra, children }) {
  const [answer, setAnswer] = useState("");
  const end = useRef(null);
  const messages = data?.messages || [];
  const answered = messages.some((m) => m.role === "user");
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages.length, busy]);
  const send = (args) => request("interview", { kind, ...extra, ...args }).catch(() => {});
  const submit = (event) => {
    event?.preventDefault();
    const text = answer.trim();
    if (!text || busy) return;
    setAnswer("");
    send({ text });
  };
  if (!messages.length && !busy)
    return (
      <div className="wizard-body">
        {children}
        <div className="row">
          <button className="btn primary big" disabled={!connected} onClick={() => send({})}>
            <Sparkles size={16} /> {copy[kind].start}
          </button>
          {!connected && <span className="hint">Conecte sua conta ChatGPT na primeira etapa.</span>}
        </div>
      </div>
    );
  return (
    <div className="wizard-body">
      <div className="chat">
        {messages.map((message) => (
          <p key={message.id} className={`bubble ${message.role}`}>
            {message.text}
          </p>
        ))}
        {busy && (
          <div className="work-strip" role="status" style={{ borderRadius: 12 }}>
            <Spinner />
            <span>{answered ? "Lendo suas respostas e preparando a próxima rodada…" : "Preparando as primeiras perguntas…"}</span>
            <button className="ghost-btn" type="button" onClick={() => request("cancelInterview").catch(() => {})}>
              <Square size={12} /> Parar
            </button>
          </div>
        )}
        <div ref={end} />
      </div>
      <form className="ask" onSubmit={submit}>
        <Grow
          aria-label="Sua resposta"
          placeholder="Responda com o máximo de detalhes. Dá para responder várias perguntas de uma vez."
          value={answer}
          disabled={busy}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
        />
        <button className="icon-only" aria-label="Enviar resposta" disabled={busy || !answer.trim() || !connected}>
          <Send size={16} />
        </button>
      </form>
      <div className="row">
        <span className="hint">Enter envia · Shift + Enter quebra a linha</span>
        <span className="spacer" />
        <button type="button" className="ghost-btn" disabled={busy} onClick={() => request("resetInterview", { kind }).catch(() => {})}>
          <RotateCcw size={14} /> Recomeçar
        </button>
        {answered && (
          <button type="button" className="btn" disabled={busy || !connected} onClick={() => send({ finish: true })}>
            <FileText size={15} /> Gerar o documento agora
          </button>
        )}
      </div>
    </div>
  );
}

function DocumentReview({ kind, value, onChange, onRedo, busy }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="wizard-body">
      <div className="row">
        <span className="hint" style={{ flex: 1 }}>
          {copy[kind].doc}
        </span>
        <button type="button" className="btn small" onClick={() => setEditing(!editing)}>
          {editing ? "Ver como documento" : "Editar"}
        </button>
      </div>
      <div className="card-box">
        {editing ? (
          <label className="fld">
            <span>{copy[kind].title}</span>
            <Grow value={value} onChange={(e) => onChange(e.target.value)} />
          </label>
        ) : (
          <Markdown text={value} />
        )}
      </div>
      <button type="button" className="ghost-btn" style={{ justifySelf: "start" }} disabled={busy} onClick={onRedo}>
        <RotateCcw size={14} /> Refazer a entrevista
      </button>
    </div>
  );
}

export default function Onboarding({ state, request, isPending, onDone, onCancel, onManual }) {
  const { profile, account, onboarding = {}, architectures = [] } = state;
  const presets = state.designPresets || [];
  const connected = Boolean(account?.connected);
  const [step, setStep] = useState(profile || connected ? 1 : 0);
  const [docs, setDocs] = useState({
    brand: onboarding.brand?.document || profile?.brandContext || "",
    design: onboarding.design?.document || profile?.designKit || "",
  });
  const [preset, setPreset] = useState(profile?.designPreset || "");
  const [references, setReferences] = useState(profile?.references || []);
  const [brand, setBrand] = useState(profile?.brand || onboarding.brand?.brandName || "");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const serverDocs = [onboarding.brand?.document, onboarding.design?.document];
  useEffect(() => {
    setDocs((current) => ({
      brand: onboarding.brand?.document || current.brand,
      design: onboarding.design?.document || current.design,
    }));
    // Interviews finish on the main process; adopt each new document once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, serverDocs);
  useEffect(() => {
    if (!brand && onboarding.brand?.brandName) setBrand(onboarding.brand.brandName);
  }, [onboarding.brand?.brandName, brand]);
  const current = steps[step].id;
  const busy = (kind) => state.interviewing === kind || isPending("interview");
  const redo = async (kind) => {
    try {
      await request("resetInterview", { kind });
      setDocs((d) => ({ ...d, [kind]: "" }));
    } catch {}
  };
  const approve = async (kind) => {
    try {
      await request("saveInterview", { kind, document: docs[kind] });
      setStep(step + 1);
    } catch {}
  };
  const addReference = async () => {
    setImporting(true);
    try {
      const ref = await request("importReference");
      if (ref?.dataUrl) setReferences((r) => [...r, { name: ref.name, dataUrl: ref.dataUrl }]);
    } catch {
    } finally {
      setImporting(false);
    }
  };
  const finish = async () => {
    setSaving(true);
    try {
      const base = { ...(profile || {}) };
      await request("saveProfile", { profile: { ...base, brand: brand.trim(), brandContext: docs.brand, designKit: docs.design, designPreset: preset, references } });
      // O Início abre com pautas do Radar, não vazio (roda em segundo plano).
      if (connected && !profile) request("radar", {}).catch(() => {});
      onDone();
    } catch {
    } finally {
      setSaving(false);
    }
  };
  const ready = docs.brand.trim() && docs.design.trim();
  const title = current === "account" ? "Conecte sua conta do ChatGPT" : current === "ready" ? "Tudo pronto para criar" : copy[current].title;
  const lead =
    current === "account"
      ? "Como no curso, você usa a sua própria conta. O Carrossell conversa com ela para entrevistar você e criar seus carrosséis. Nada é publicado sem você."
      : current === "ready"
        ? "Contexto, Design Kit e Prompt Mestre ficam salvos neste computador e acompanham cada projeto."
        : copy[current].lead;
  return (
    <section className="wizard" aria-label="Configuração do projeto">
      <header className="wizard-head">
        <span className="eyebrow">{profile ? "SUA MARCA" : "SEU PROJETO, MONTADO COM VOCÊ"}</span>
        <nav className="steps" aria-label="Etapas da configuração">
          {steps.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={step > index ? "done" : ""}
              aria-current={step === index ? "step" : undefined}
              disabled={index > 0 && !connected && !profile}
              onClick={() => setStep(index)}
            >
              {item.short}
            </button>
          ))}
        </nav>
        <h1 className="page-title">{title}</h1>
        <p className="page-sub">{lead}</p>
        {(current === "brand" || current === "design") && <LessonLink step={current} />}
      </header>
      {current === "account" && (
        <div className="card-box account-card">
          <span className={`account-dot ${connected ? "on" : ""}`} aria-hidden="true" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b>{connected ? account.label || "Conta conectada" : "Conta ainda não conectada"}</b>
            <p className="hint">{connected ? "Tudo certo. Vamos montar seu contexto." : "O login abre no seu navegador. Depois de entrar, o Carrossell volta sozinho, já conectado."}</p>
          </div>
          {!connected && (
            <button className="btn primary" type="button" disabled={isPending("connect")} onClick={() => request("connect").catch(() => {})}>
              {isPending("connect") ? <Spinner /> : <ArrowRight size={15} />}
              {isPending("connect") ? "Conectando…" : "Conectar conta"}
            </button>
          )}
        </div>
      )}
      {(current === "brand" || current === "design") &&
        (docs[current].trim() ? (
          <DocumentReview kind={current} value={docs[current]} busy={busy(current)} onChange={(value) => setDocs((d) => ({ ...d, [current]: value }))} onRedo={() => redo(current)} />
        ) : (
          <Interview kind={current} data={onboarding[current]} busy={busy(current)} connected={connected} request={request} extra={current === "design" ? { preset, references } : undefined}>
            {current === "design" && (
              <>
                <div className="fld">
                  <span>
                    Ponto de partida <small>opcional</small>
                  </span>
                  <div className="choice-grid" role="radiogroup">
                    <button type="button" role="radio" aria-checked={!preset} onClick={() => setPreset("")}>
                      <b>Criar o meu do zero</b>
                      <small>Recomendado: use as cores e o estilo do seu produto.</small>
                    </button>
                    {presets.map((item) => (
                      <button type="button" role="radio" key={item.id} aria-checked={preset === item.id} onClick={() => setPreset(item.id)}>
                        <b>{item.name}</b>
                        <small>{item.description}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <ReferencePicker references={references} importing={importing} onAdd={addReference} onRemove={(index) => setReferences((r) => r.filter((_, i) => i !== index))} />
              </>
            )}
          </Interview>
        ))}
      {current === "ready" && (
        <div className="wizard-body">
          <label className="fld">
            <span>Nome da marca</span>
            <input value={brand} maxLength={160} placeholder="Como sua marca se chama" onChange={(e) => setBrand(e.target.value)} />
          </label>
          <div className="card-box" style={{ gap: 10 }}>
            {[
              ["Contexto Oficial da Marca", docs.brand.trim(), 1],
              ["Design Kit Oficial", docs.design.trim(), 2],
              ["Prompt Mestre do método P.A.C.T.O.", true],
            ].map(([label, done, target]) => (
              <div className="row" key={label}>
                <span className={`chip ${done ? "good" : "accent"}`}>{done ? <Check size={13} /> : "!"}</span>
                <span style={{ flex: 1 }}>{label}</span>
                {!done && (
                  <button type="button" className="link-btn" onClick={() => setStep(target)}>
                    Completar
                  </button>
                )}
              </div>
            ))}
          </div>
          {architectures.length > 0 && (
            <div className="fld">
              <span>Você vai poder criar</span>
              <div className="row">
                {architectures.map((a) => (
                  <span className="chip" key={a.id}>
                    {a.name}
                  </span>
                ))}
                <span className="chip">Material gratuito em PDF</span>
                <span className="chip">Apresentação em PDF</span>
              </div>
            </div>
          )}
          <ReferencePicker references={references} importing={importing} onAdd={addReference} onRemove={(index) => setReferences((r) => r.filter((_, i) => i !== index))} />
        </div>
      )}
      <footer className="wizard-foot">
        {step > 0 ? (
          <button type="button" className="ghost-btn" onClick={() => setStep(step - 1)}>
            <ArrowLeft size={16} /> Voltar
          </button>
        ) : onCancel ? (
          <button type="button" className="ghost-btn" onClick={onCancel}>
            Cancelar
          </button>
        ) : (
          <button className="ghost-btn" type="button" onClick={onManual}>
            Prefiro preencher em formulário
          </button>
        )}
        <span className="spacer" />
        {current === "account" && (
          <button className="btn primary" type="button" disabled={!connected} onClick={() => setStep(1)}>
            Continuar <ArrowRight size={16} />
          </button>
        )}
        {(current === "brand" || current === "design") && docs[current].trim() && (
          <button className="btn primary" type="button" disabled={!docs[current].trim() || busy(current)} onClick={() => approve(current)}>
            Aprovar e continuar <ArrowRight size={16} />
          </button>
        )}
        {current === "ready" && (
          <button className="btn primary" type="button" disabled={saving || !ready} onClick={finish}>
            {saving && <Spinner />}
            {saving ? "Salvando…" : profile ? "Salvar marca" : "Entrar no estúdio"}
            {!saving && <ArrowRight size={16} />}
          </button>
        )}
      </footer>
    </section>
  );
}

function ReferencePicker({ references, importing, onAdd, onRemove }) {
  return (
    <div className="fld">
      <span>
        Referências visuais <small>opcional · print do seu produto, página ou um estilo que você gosta</small>
      </span>
      <div className="photo-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}>
        {references.map((ref, index) => (
          <div className="tile" key={`${ref.name}-${index}`}>
            <div className="pic" style={{ aspectRatio: "1" }}>
              <img src={ref.dataUrl} alt={ref.name || "Referência visual"} />
              <button type="button" className="icon-only" aria-label={`Remover referência ${ref.name}`} onClick={() => onRemove(index)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {references.length < 6 && (
          <button className="add-tile" style={{ aspectRatio: "1" }} type="button" onClick={onAdd} disabled={importing}>
            {importing ? <Spinner /> : <ImagePlus size={20} />}
            Adicionar
          </button>
        )}
      </div>
    </div>
  );
}
