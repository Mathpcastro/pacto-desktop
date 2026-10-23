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
import IconButton from "./IconButton.jsx";

const steps = [
  { id: "account", label: "Conectar seu ChatGPT" },
  { id: "brand", label: "Contexto Oficial da Marca" },
  { id: "design", label: "Design Kit Oficial" },
  { id: "ready", label: "Projeto instalado" },
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
  const log = useRef(null);
  const messages = data?.messages || [];
  const answered = messages.some((m) => m.role === "user");
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages.length, busy]);
  const send = (args) =>
    request("interview", { kind, ...extra, ...args }).catch(() => {});
  const submit = (event) => {
    event?.preventDefault();
    const text = answer.trim();
    if (!text || busy) return;
    setAnswer("");
    send({ text });
  };
  if (!messages.length && !busy)
    return (
      <div className="interview-start">
        {children}
        <button
          className="button primary"
          disabled={!connected}
          onClick={() => send({})}
        >
          <Sparkles size={16} /> {copy[kind].start}
        </button>
        {!connected && (
          <p className="field-hint">
            Conecte sua conta ChatGPT na primeira etapa para fazer a entrevista.
          </p>
        )}
      </div>
    );
  return (
    <div className="interview">
      <div className="interview-log" ref={log}>
        {messages.map((message) => (
          <div key={message.id} className={`message message-${message.role}`}>
            <span className="eyebrow">
              {message.role === "user" ? "VOCÊ" : "PACTO"}
            </span>
            <p>{message.text}</p>
          </div>
        ))}
        {busy && (
          <div className="assistant-working" role="status">
            <LoaderCircle size={14} className="spin" />
            <span>
              {answered
                ? "Lendo suas respostas e preparando a próxima rodada…"
                : "Preparando as primeiras perguntas…"}
            </span>
            <button
              className="text-button"
              type="button"
              onClick={() => request("cancelInterview").catch(() => {})}
            >
              <Square size={11} /> Parar
            </button>
          </div>
        )}
      </div>
      <form className="chat-composer" onSubmit={submit}>
        <textarea
          rows={3}
          aria-label="Sua resposta"
          placeholder="Responda com o máximo de detalhes. Você pode responder várias perguntas de uma vez."
          value={answer}
          disabled={busy}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
        />
        <div>
          <span>Enter envia · Shift+Enter quebra linha</span>
          <IconButton
            label="Enviar resposta"
            type="submit"
            disabled={busy || !answer.trim() || !connected}
          >
            <Send size={16} />
          </IconButton>
        </div>
      </form>
      <div className="interview-actions">
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={() => request("resetInterview", { kind }).catch(() => {})}
        >
          <RotateCcw size={13} /> Recomeçar
        </button>
        {answered && (
          <button
            type="button"
            className="button secondary"
            disabled={busy || !connected}
            onClick={() => send({ finish: true })}
          >
            <FileText size={15} /> Gerar o documento agora
          </button>
        )}
      </div>
    </div>
  );
}

function DocumentReview({ kind, value, onChange, onRedo, busy }) {
  return (
    <div className="document-review">
      <p className="field-hint">{copy[kind].doc}</p>
      <label className="field">
        <span>{copy[kind].title.toUpperCase()}</span>
        <textarea
          className="document-text"
          rows={18}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="text-button"
        disabled={busy}
        onClick={onRedo}
      >
        <RotateCcw size={13} /> Refazer a entrevista
      </button>
    </div>
  );
}

export default function Onboarding({
  state,
  request,
  isPending,
  onDone,
  onCancel,
  onManual,
}) {
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
  const [brand, setBrand] = useState(
    profile?.brand || onboarding.brand?.brandName || "",
  );
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
    if (!brand && onboarding.brand?.brandName)
      setBrand(onboarding.brand.brandName);
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
      if (ref?.dataUrl)
        setReferences((r) => [...r, { name: ref.name, dataUrl: ref.dataUrl }]);
    } catch {
    } finally {
      setImporting(false);
    }
  };
  const finish = async () => {
    setSaving(true);
    try {
      const base = { ...(profile || {}) };
      await request("saveProfile", {
        profile: {
          ...base,
          brand: brand.trim(),
          brandContext: docs.brand,
          designKit: docs.design,
          designPreset: preset,
          references,
        },
      });
      // A biblioteca abre com oportunidades do Radar, não vazia (roda em segundo plano).
      if (connected && !profile) request("radar", {}).catch(() => {});
      onDone();
    } catch {
    } finally {
      setSaving(false);
    }
  };
  const ready = docs.brand.trim() && docs.design.trim();
  return (
    <section className="profile-flow onboarding-flow">
      <div className="profile-intro">
        <span className="eyebrow">SEU PROJETO P.A.C.T.O.</span>
        <h1>
          Seu projeto,
          <br />
          <em>montado com você.</em>
        </h1>
        <p>
          No curso, você cria um projeto no ChatGPT, responde duas entrevistas e
          instala o Prompt Mestre. Aqui o PACTO faz o mesmo por você: conversa,
          monta seus documentos oficiais e deixa tudo pronto para criar.
        </p>
        <ol className="step-list">
          {steps.map((item, index) => (
            <li
              key={item.id}
              className={
                step === index ? "current" : step > index ? "done" : ""
              }
            >
              <button
                type="button"
                className="step-jump"
                disabled={index > 0 && !connected && !profile}
                onClick={() => setStep(index)}
              >
                <span>
                  {step > index ? <Check size={13} /> : `0${index + 1}`}
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ol>
        <button className="text-button" type="button" onClick={onManual}>
          Prefiro preencher em formulário <ArrowRight size={13} />
        </button>
      </div>
      <div className="profile-form onboarding-panel">
        <div className="form-heading">
          <span className="eyebrow">
            ETAPA 0{step + 1} / 0{steps.length}
          </span>
          <h2>
            {current === "account"
              ? "Conecte sua conta do ChatGPT"
              : current === "ready"
                ? "Seu projeto está instalado."
                : copy[current].title}
          </h2>
          <p>
            {current === "account"
              ? "Como no curso, você usa a sua própria conta. O PACTO conversa com ela para entrevistar você e gerar seus carrosséis. Nada é publicado sem você."
              : current === "ready"
                ? "Contexto, Design Kit e Prompt Mestre ficam salvos neste computador e acompanham cada carrossel."
                : copy[current].lead}
          </p>
        </div>
        <div className="fields">
          {current === "account" && (
            <div className="account-step">
              <span className={`status-dot ${connected ? "connected" : ""}`} />
              <div>
                <strong>
                  {connected
                    ? account.label || "Conta conectada"
                    : "Conta ainda não conectada"}
                </strong>
                <p className="field-hint">
                  {connected
                    ? "Tudo certo. Vamos montar seu contexto."
                    : "Uma janela de login do ChatGPT vai abrir. Depois de entrar, volte para cá."}
                </p>
              </div>
              {!connected && (
                <button
                  className="button primary"
                  type="button"
                  disabled={isPending("connect")}
                  onClick={() => request("connect").catch(() => {})}
                >
                  {isPending("connect") ? (
                    <LoaderCircle size={15} className="spin" />
                  ) : (
                    <ArrowRight size={15} />
                  )}
                  {isPending("connect") ? "Conectando…" : "Conectar conta"}
                </button>
              )}
            </div>
          )}
          {(current === "brand" || current === "design") &&
            (docs[current].trim() ? (
              <DocumentReview
                kind={current}
                value={docs[current]}
                busy={busy(current)}
                onChange={(value) =>
                  setDocs((d) => ({ ...d, [current]: value }))
                }
                onRedo={() => redo(current)}
              />
            ) : (
              <Interview
                kind={current}
                data={onboarding[current]}
                busy={busy(current)}
                connected={connected}
                request={request}
                extra={
                  current === "design" ? { preset, references } : undefined
                }
              >
                {current === "design" && (
                  <>
                    <div className="field">
                      <span>
                        Ponto de partida{" "}
                        <span className="muted">· opcional</span>
                      </span>
                      <div className="preset-grid">
                        <button
                          type="button"
                          className={!preset ? "selected" : ""}
                          onClick={() => setPreset("")}
                        >
                          <strong>Criar o meu do zero</strong>
                          <small>
                            Recomendado no curso: use as cores e o estilo do seu
                            produto.
                          </small>
                        </button>
                        {presets.map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            className={preset === item.id ? "selected" : ""}
                            onClick={() => setPreset(item.id)}
                          >
                            <strong>{item.name}</strong>
                            <small>{item.description}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                    <ReferencePicker
                      references={references}
                      importing={importing}
                      onAdd={addReference}
                      onRemove={(index) =>
                        setReferences((r) => r.filter((_, i) => i !== index))
                      }
                    />
                  </>
                )}
              </Interview>
            ))}
          {current === "ready" && (
            <div className="install-summary">
              <label className="field">
                <span>Nome da marca</span>
                <input
                  value={brand}
                  maxLength={160}
                  placeholder="Como sua marca se chama"
                  onChange={(e) => setBrand(e.target.value)}
                />
              </label>
              <ul>
                {[
                  ["Contexto Oficial da Marca", docs.brand.trim(), 1],
                  ["Design Kit Oficial", docs.design.trim(), 2],
                  ["Prompt Mestre do método P.A.C.T.O.", true],
                ].map(([label, done, target]) => (
                  <li key={label} className={done ? "done" : ""}>
                    <span>{done ? <Check size={13} /> : "!"}</span>
                    {label}
                    {!done && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setStep(target)}
                      >
                        Completar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <div>
                <span className="eyebrow">VOCÊ VAI PODER CRIAR</span>
                <div className="architecture-chips">
                  {architectures.map((a) => (
                    <span key={a.id}>{a.name}</span>
                  ))}
                </div>
              </div>
              <ReferencePicker
                references={references}
                importing={importing}
                onAdd={addReference}
                onRemove={(index) =>
                  setReferences((r) => r.filter((_, i) => i !== index))
                }
              />
            </div>
          )}
        </div>
        <footer className="form-footer">
          {step > 0 ? (
            <button
              type="button"
              className="button ghost"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={16} /> Voltar
            </button>
          ) : onCancel ? (
            <button type="button" className="button ghost" onClick={onCancel}>
              Cancelar
            </button>
          ) : (
            <span className="field-hint">Você pode editar isso depois.</span>
          )}
          {current === "account" && (
            <button
              className="button primary"
              type="button"
              disabled={!connected}
              onClick={() => setStep(1)}
            >
              Continuar <ArrowRight size={16} />
            </button>
          )}
          {(current === "brand" || current === "design") &&
            docs[current].trim() && (
              <button
                className="button primary"
                type="button"
                disabled={!docs[current].trim() || busy(current)}
                onClick={() => approve(current)}
              >
                Aprovar e continuar <ArrowRight size={16} />
              </button>
            )}
          {current === "ready" && (
            <button
              className="button primary"
              type="button"
              disabled={saving || !ready}
              onClick={finish}
            >
              {saving && <LoaderCircle size={16} className="spin" />}
              {saving
                ? "Salvando…"
                : profile
                  ? "Salvar identidade"
                  : "Entrar no estúdio"}
              {!saving && <ArrowRight size={16} />}
            </button>
          )}
        </footer>
      </div>
    </section>
  );
}

function ReferencePicker({ references, importing, onAdd, onRemove }) {
  return (
    <div className="field">
      <span>
        Referências visuais <span className="muted">· opcional</span>
      </span>
      <button
        className="reference-add"
        type="button"
        onClick={onAdd}
        disabled={importing || references.length >= 6}
      >
        {importing ? (
          <LoaderCircle className="spin" size={20} />
        ) : (
          <ImagePlus size={20} />
        )}
        <span>
          Adicionar uma referência
          <small>
            Print do seu produto, página ou um estilo de ilustração que você
            gosta
          </small>
        </span>
        <span className="plus">+</span>
      </button>
      {references.length > 0 && (
        <div className="references">
          {references.map((ref, index) => (
            <figure key={`${ref.name}-${index}`}>
              <img src={ref.dataUrl} alt={ref.name || "Referência visual"} />
              <figcaption>{ref.name || "Referência"}</figcaption>
              <button
                type="button"
                aria-label={`Remover referência ${ref.name}`}
                onClick={() => onRemove(index)}
              >
                <Trash2 size={14} />
              </button>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
