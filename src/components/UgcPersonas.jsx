import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Info, Plus, Sparkles, UserRound, X } from "lucide-react";
import { translateUi } from "../../core/i18n.mjs";
import { runtimeErrorMessage } from "../usePacto.js";
import Dialog from "./Dialog.jsx";
import IconButton from "./IconButton.jsx";
import { shouldBlockPersonaClose } from "./dialog-close.mjs";
import { personaSaveLabel, profileFaceButton, savedAvatarNotice } from "./ugc-personas-ui.mjs";
import "./UgcPersonas.css";

const fields = [
  ["nome", "Nome"],
  ["idade", "Idade"],
  ["genero", "Gênero"],
  ["etnia", "Etnia (aparência)"],
  ["cabelo", "Cabelo"],
  ["olhos", "Olhos"],
  ["marcaFixa", "Marca fixa"],
  ["porte", "Porte"],
  ["estilo", "Estilo de roupa"],
  ["cenario", "Cenário"],
  ["nicho", "Nicho"],
  ["instagram", "@ do Instagram"],
];

const anchorReadError = "Não foi possível ler a imagem.";
const anchorImportErrors = new Set([
  anchorReadError,
  "Não foi possível abrir o seletor de imagens.",
  "Use uma foto de até 15 MB.",
]);

function logImport(event, data) {
  void window.pacto?.request?.("importLog", { event, ...data })?.catch(() => {});
}

function Anchor({ image }) {
  return (
    <div className="ugc-persona-anchor">
      {image ? <img src={image} alt="Foto-âncora" /> : <UserRound size={25} aria-hidden="true" />}
    </div>
  );
}

function PersonaEditor({ persona, activePersonaId, request, connected, working, onSave, onClose }) {
  const [draft, setDraft] = useState(persona);
  const [pending, setPending] = useState("");
  const [localError, setLocalError] = useState("");
  const [anchorHint, setAnchorHint] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const picking = useRef(false);
  const ignoreCloseUntil = useRef(0);
  const ageInput = useRef(null);
  const isActive = Boolean(draft.id && draft.id === activePersonaId);
  const [use, setUse] = useState(isActive);
  const busy = Boolean(pending);
  const saved = Boolean(persona.anchor);
  const close = (reason, blockedByDialog = false) => {
    logImport("dialog-close-attempt", { reason });
    if (blockedByDialog || shouldBlockPersonaClose({
      reason, picking: picking.current, busy, ignoreCloseUntil: ignoreCloseUntil.current, now: Date.now(),
    })) {
      logImport("dialog-close-blocked", { reason });
      return;
    }
    logImport("dialog-close", { reason });
    onClose();
  };

  const applyAnchorResult = (result, source) => {
    const { dataUrl, name, cancelled } = result ?? {};
    const hasDataUrl = typeof dataUrl === "string" && dataUrl.length > 0;
    const dataUrlLength = hasDataUrl ? dataUrl.length : 0;
    if (source === "pick") {
      logImport("pickAnchor-ipc-result", { cancelled: cancelled === true, name, hasDataUrl, dataUrlLength });
      if (cancelled === true) {
        setAnchorHint("Se o seletor não abrir sua foto, arraste a imagem para cá.");
        logImport("pickAnchor-hint");
        return;
      }
    }
    if (!hasDataUrl || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(dataUrl)) {
      throw new Error(anchorReadError);
    }
    setAnchorHint("");
    setDraft((current) => ({ ...current, anchor: dataUrl }));
    if (source === "drop") logImport("drop-ok", { name, dataUrlLength });
    logImport("pickAnchor-setDraft", { hasDataUrl, dataUrlLength });
  };

  const pickAnchor = async () => {
    if (picking.current || busy) return;
    picking.current = true;
    setPending("upload");
    setLocalError("");
    setAnchorHint("");
    logImport("pickAnchor-start");
    try {
      const result = await request("importReference", { purpose: "personaAnchor" });
      applyAnchorResult(result, "pick");
    } catch (error) {
      const message = runtimeErrorMessage(error);
      logImport("pickAnchor-error", { message });
      setLocalError(anchorImportErrors.has(message) ? message : anchorReadError);
    } finally {
      ignoreCloseUntil.current = Date.now() + 800;
      picking.current = false;
      setPending("");
    }
  };

  const dropAnchor = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (saved || picking.current || busy) return;
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    picking.current = true;
    setPending("upload");
    setLocalError("");
    setAnchorHint("");
    logImport("drop-start", { hasPath: Boolean(file.path), size: file.size });
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error("Use uma foto de até 15 MB.");
      let result;
      if (typeof window.pacto?.importReferenceFile === "function") {
        result = await window.pacto.importReferenceFile(file, { purpose: "personaAnchor" });
      } else {
        const bytes = new Uint8Array(await file.arrayBuffer());
        result = await request("importReference", { purpose: "personaAnchor", name: file.name || "", bytes });
      }
      applyAnchorResult(result, "drop");
    } catch (error) {
      const message = runtimeErrorMessage(error);
      logImport("drop-error", { message });
      setLocalError(anchorImportErrors.has(message) ? message : anchorReadError);
    } finally {
      ignoreCloseUntil.current = Date.now() + 800;
      picking.current = false;
      setPending("");
    }
  };

  const save = async (generate = false) => {
    if (picking.current || busy || (generate && (!connected || working || draft.anchor))) return;
    if (!draft.nome?.trim()) {
      setLocalError("Informe o nome.");
      return;
    }
    if (ageInput.current?.validity.badInput) {
      setLocalError("Informe a idade em anos.");
      return;
    }
    setLocalError("");
    setPending(generate ? "generate" : "save");
    try {
      const fieldsToSave = {
        ...Object.fromEntries(fields.map(([key]) => [key, draft[key] ?? ""])),
        idade: draft.idade == null || draft.idade === "" ? undefined : Number(draft.idade),
      };
      if (generate) {
        const { anchor } = await request("generatePersonaAnchor", { persona: fieldsToSave });
        if (anchor) { setAnchorHint(""); setDraft((current) => ({ ...current, anchor })); }
        return;
      }
      const snapshot = await request("savePersona", {
        persona: {
          ...fieldsToSave,
          ...(draft.id ? { id: draft.id } : {}),
          ...(!saved && draft.anchor ? { anchor: draft.anchor } : {}),
        },
        use: isActive || use,
      });
      logImport("dialog-close-attempt", { reason: "save-success" });
      logImport("dialog-close", { reason: "save-success" });
      onSave(snapshot);
    } catch {
      // O diálogo mantém os campos preenchidos para uma nova tentativa.
    } finally {
      setPending("");
    }
  };

  return (
    <Dialog title={saved ? "Editar avatar" : draft.id ? "Editar persona" : "Criar persona"} wide className="ugc-persona-dialog"
      localError={localError} onClose={close} onCloseBlocked={(reason) => close(reason, true)}>
      <form className="ugc-persona-form" noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <div className="dialog-fields">
          <div className="ugc-persona-fields">
            {fields.map(([key, label]) => {
              const fieldProps = {
                value: draft[key] ?? "",
                disabled: busy,
                onChange: (event) => setDraft((current) => ({ ...current, [key]: event.target.value })),
              };
              return (
                <label className="fld" key={key}>
                  <span>{label}</span>
                  {key === "idade" ? <input {...fieldProps} ref={ageInput} type="number" min={1} max={120} />
                    : key === "instagram" ? <input {...fieldProps} type="text" maxLength={31} />
                    : <textarea {...fieldProps} rows={1} maxLength={300} />}
                </label>
              );
            })}
          </div>
          <div
            className={`ugc-persona-photo${dragActive ? " is-drag-over" : ""}`}
            onDragEnter={!saved ? (event) => {
              if (!busy && event.dataTransfer?.types?.includes("Files")) {
                event.preventDefault();
                event.stopPropagation();
                setDragActive(true);
              }
            } : undefined}
            onDragOver={!saved ? (event) => {
              if (!busy && event.dataTransfer?.types?.includes("Files")) {
                event.preventDefault();
                event.stopPropagation();
                if (!dragActive) setDragActive(true);
              }
            } : undefined}
            onDragLeave={!saved ? (event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false);
            } : undefined}
            onDrop={!saved ? (event) => void dropAnchor(event) : undefined}
          >
            <Anchor image={draft.anchor} />
            <div className="section">
              <b>Foto-âncora original</b>
              <div className="row ugc-persona-actions">
                {!saved && (
                  <button className="btn small" type="button" disabled={busy} onClick={pickAnchor}>
                    <ImagePlus size={15} /> {draft.anchor ? "Trocar foto-âncora" : "Enviar foto-âncora"}
                  </button>
                )}
                {!draft.anchor && (
                  <button className="btn small" type="button" disabled={busy || !connected || working}
                    aria-describedby={!connected ? "ugc-anchor-connect" : undefined}
                    onClick={() => void save(true)}>
                    <Sparkles size={15} /> {pending === "generate" ? "Gerando foto-âncora…" : "Gerar foto-âncora com ChatGPT"}
                  </button>
                )}
              </div>
              {anchorHint && <span className="hint ugc-persona-anchor-hint" role="status">{anchorHint}</span>}
              {!draft.anchor && !connected && <span className="hint" id="ugc-anchor-connect">Conecte sua conta ChatGPT para gerar a foto-âncora.</span>}
            </div>
          </div>
          {draft.anchor && (
            <label className="toggle">
              <input type="checkbox" checked={isActive || use} disabled={busy || isActive} onChange={(event) => setUse(event.target.checked)} />
              {isActive ? "Ativo para UGC" : "Usar no UGC"}
            </label>
          )}
        </div>
        <footer className="dialog-footer ugc-persona-actions">
          <button className="ghost-btn" type="button" disabled={busy} onClick={() => close("cancel-button")}>Cancelar</button>
          <button className="btn primary" type="submit" disabled={busy}>{personaSaveLabel(draft)}</button>
        </footer>
      </form>
    </Dialog>
  );
}

export default function UgcPersonas({ state, request, isPending, connected, onNotice }) {
  const [snapshot, setSnapshot] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const { profileId, settings, working } = state;
  useEffect(() => {
    let current = true;
    request("personas").then((result) => {
      if (current) setSnapshot(result);
    }).catch(() => {});
    return () => { current = false; };
  }, [request]);

  const personas = state.personas ?? [];
  const active = state.activePersonaId;
  const face = state.media?.avatarPersonaId;
  const warnings = snapshot?.avisos || [];
  const crossProfile = warnings.filter(({ a, b }) => a.profileId !== b.profileId);
  const busy = ["savePersona", "generatePersonaAnchor", "usePersona", "deletePersona", "setProfileAvatar", "dismissPersonaWarning"].some(isPending);
  const dismissWarning = (a, b) => request("dismissPersonaWarning", { a: a.id, b: b.id }).then(setSnapshot).catch(() => {});
  const activate = (id) => request("usePersona", { id }).then(setSnapshot).catch(() => {});
  const setProfileAvatar = (id) => request("setProfileAvatar", { id }).then((result) => {
    setSnapshot(result);
    onNotice?.("Foto de perfil atualizada.");
  }).catch(() => {});
  const onSave = (result) => {
    setSnapshot(result);
    setEditing(null);
    const notice = savedAvatarNotice(result.persona, setProfileAvatar);
    if (notice) onNotice?.({ ...notice, profileId });
  };
  const remove = () => request("deletePersona", { id: deleting.id }).then((result) => {
    setSnapshot(result);
    setDeleting(null);
  }).catch(() => {});
  const warn = (other) => translateUi(settings?.language, "A persona {nome} do perfil {perfil} parece com esta:")
    .replace(/\{(?:nome|perfil)\}/g, (field) => field === "{nome}" ? other.nome : other.profileName);

  return (
    <section className="card-box" aria-label="Persona UGC">
      <div className="section-head">
        <h2>Biblioteca de avatares</h2>
        <span className="spacer" />
        <button className="btn small primary" type="button" disabled={busy} onClick={() => setEditing({})}>
          <Plus size={15} /> Criar persona
        </button>
      </div>
      {crossProfile.length > 0 && (
        <ul className="ugc-persona-warnings">
          {crossProfile.map(({ a, b, motivo }) => {
            const other = a.profileId === profileId ? b : a;
            const local = other === a ? b : a;
            return (
              <li className="ugc-persona-warning" key={`${a.id}:${b.id}`}>
                <Info size={18} aria-hidden="true" />
                <span role="status">
                  <b data-user-text>{local.nome}</b>
                  {" · "}{warn(other)}{" "}
                  {motivo.split(/(?<=\.) /).map((part) => translateUi(settings?.language, part)).join(" ")}
                </span>
                <IconButton label="Fechar aviso" disabled={busy} onClick={() => dismissWarning(a, b)}>
                  <X size={16} />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
      {personas.length ? (
        <ul className="ugc-persona-list">
          {personas.map((persona) => {
            const faceButton = profileFaceButton(persona, face, busy);
            return (
              <li className="ugc-persona-row" key={persona.id}>
                <Anchor image={persona.anchor} />
                <div className="ugc-persona-name">
                  <div className="row ugc-persona-actions">
                    <b data-user-text>{persona.nome}</b>
                    {!persona.anchor && <span className="chip">Rascunho</span>}
                    {persona.id === active && <span className="chip good"><Check size={13} /> Ativo para UGC</span>}
                    {persona.id === face && <span className="chip">Cara do perfil</span>}
                  </div>
                  <p className="hint" data-user-text>{[persona.cabelo, persona.olhos, persona.estilo, persona.nicho, persona.instagram].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="row ugc-persona-actions">
                  {persona.anchor && persona.id !== active && <button className="btn small" type="button" disabled={busy} onClick={() => activate(persona.id)}>Usar no UGC</button>}
                  {faceButton && (
                    <button className="btn small" type="button" disabled={faceButton.disabled} onClick={() => setProfileAvatar(persona.id)}>
                      {faceButton.label}
                    </button>
                  )}
                  <button className="btn small" type="button" disabled={busy} onClick={() => setEditing(persona)}>Editar</button>
                  <button className="ghost-btn" type="button" disabled={busy} onClick={() => setDeleting(persona)}>Apagar</button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="hint">Crie uma persona para usar como avatar dos seus carrosséis UGC.</p>
      )}
      {editing && (
        <PersonaEditor persona={editing} activePersonaId={active} request={request} connected={connected} working={Boolean(working)}
          onSave={onSave} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <Dialog title={deleting.anchor ? "Apagar avatar" : "Apagar persona"} onClose={() => !busy && setDeleting(null)}>
          <p>{deleting.anchor ? "Confirme para apagar o avatar" : "Confirme para apagar a persona"} <b data-user-text>{deleting.nome}</b>.</p>
          <div className="row ugc-persona-actions">
            <span className="spacer" />
            <button className="ghost-btn" type="button" disabled={busy} onClick={() => setDeleting(null)}>Cancelar</button>
            <button className="btn danger" type="button" disabled={busy} onClick={remove}>Apagar</button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
