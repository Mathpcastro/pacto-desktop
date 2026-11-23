import { useEffect, useState } from "react";
import { AlertTriangle, Check, ImagePlus, Plus, Sparkles, UserRound } from "lucide-react";
import { translateUi } from "../../core/i18n.mjs";
import Dialog from "./Dialog.jsx";
import "./UgcPersonas.css";

const fields = [
  ["nome", "Nome", true],
  ["idade", "Idade", true],
  ["genero", "Gênero", true],
  ["etnia", "Etnia (aparência)", true],
  ["cabelo", "Cabelo"],
  ["olhos", "Olhos"],
  ["marcaFixa", "Marca fixa"],
  ["porte", "Porte"],
  ["estilo", "Estilo de roupa", true],
  ["cenario", "Cenário", true],
  ["nicho", "Nicho", true],
  ["instagram", "@ do Instagram"],
];

function Anchor({ image }) {
  return (
    <div className="ugc-persona-anchor">
      {image ? <img src={image} alt="Foto-âncora" /> : <UserRound size={25} aria-hidden="true" />}
    </div>
  );
}

function PersonaEditor({ persona, activePersonaId, request, connected, working, onUpdate, onClose }) {
  const [draft, setDraft] = useState(persona);
  const [pending, setPending] = useState("");
  const [anchorHelp, setAnchorHelp] = useState("");
  const isActive = Boolean(draft.id && draft.id === activePersonaId);
  const [use, setUse] = useState(isActive);
  const busy = Boolean(pending);
  const saved = Boolean(persona.anchor);

  const pickAnchor = async () => {
    setPending("upload");
    setAnchorHelp("");
    try {
      const result = await request("importReference");
      if (result?.dataUrl) {
        if (result.dataUrl.length > 4 * Math.ceil(15 * 1024 * 1024 / 3) + 23) {
          setAnchorHelp("Use uma foto de até 15 MB.");
          return;
        }
        setDraft((current) => ({ ...current, anchor: result.dataUrl }));
      }
    } catch {
      // O erro da ação aparece no diálogo pelo contexto do app.
    } finally {
      setPending("");
    }
  };

  const save = async (generate = false) => {
    if (busy || (generate && (!connected || working || draft.anchor))) return;
    setPending(generate ? "generate" : "save");
    try {
      const fieldsToSave = {
        ...Object.fromEntries(fields.map(([key]) => [key, draft[key] ?? ""])),
        idade: Number(draft.idade),
      };
      if (generate) {
        const { anchor } = await request("generatePersonaAnchor", { persona: fieldsToSave });
        if (anchor) setDraft((current) => ({ ...current, anchor }));
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
      onUpdate(snapshot);
      onClose();
    } catch {
      // O diálogo mantém os campos preenchidos para uma nova tentativa.
    } finally {
      setPending("");
    }
  };

  return (
    <Dialog title={saved ? "Editar avatar" : draft.id ? "Editar persona" : "Criar persona"} wide className="ugc-persona-dialog" onClose={() => !busy && onClose()}>
      <form className="ugc-persona-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <div className="dialog-fields">
          <div className="ugc-persona-fields">
            {fields.map(([key, label, required]) => (
              <label className="fld" key={key}>
                <span>{label}</span>
                <input
                  type={key === "idade" ? "number" : "text"}
                  value={draft[key] ?? ""}
                  required={required}
                  disabled={busy}
                  maxLength={key === "instagram" ? 31 : 300}
                  min={key === "idade" ? 1 : undefined}
                  max={key === "idade" ? 120 : undefined}
                  pattern={key === "instagram" ? "@[A-Za-z0-9_.]{1,30}" : undefined}
                  onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                />
              </label>
            ))}
          </div>
          <div className="ugc-persona-photo">
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
                    onClick={(event) => { if (event.currentTarget.form.reportValidity()) void save(true); }}>
                    <Sparkles size={15} /> {pending === "generate" ? "Gerando foto-âncora…" : "Gerar foto-âncora com ChatGPT"}
                  </button>
                )}
              </div>
              {!draft.anchor && !connected && <span className="hint" id="ugc-anchor-connect">Conecte sua conta ChatGPT para gerar a foto-âncora.</span>}
              {anchorHelp && <p className="hint" role="alert">{anchorHelp}</p>}
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
          <button className="ghost-btn" type="button" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className="btn primary" type="submit" disabled={busy}>{draft.anchor ? "Salvar avatar" : "Salvar rascunho"}</button>
        </footer>
      </form>
    </Dialog>
  );
}

export default function UgcPersonas({ state, request, isPending, connected }) {
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
  const busy = ["savePersona", "generatePersonaAnchor", "usePersona", "deletePersona", "setProfileAvatar"].some(isPending);
  const activate = (id) => request("usePersona", { id }).then(setSnapshot).catch(() => {});
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
        <div className="ugc-persona-warning" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <ul>
              {crossProfile.map(({ a, b, motivo }) => {
                const other = a.profileId === profileId ? b : a;
                const local = other === a ? b : a;
                return (
                  <li key={`${a.id}-${b.id}`}>
                    <b data-user-text>{local.nome}</b>
                    {" · "}{warn(other)}{" "}
                    {motivo.split(/(?<=\.) /).map((part) => translateUi(settings?.language, part)).join(" ")}
                  </li>
                );
              })}
            </ul>
            <p>Use traços e fotos-âncora distintos ao criar outro avatar.</p>
          </div>
        </div>
      )}
      {personas.length ? (
        <ul className="ugc-persona-list">
          {personas.map((persona) => (
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
                {persona.anchor && persona.id !== face && (
                  <button className="btn small" type="button" disabled={busy} onClick={() => request("setProfileAvatar", { id: persona.id }).then(setSnapshot).catch(() => {})}>
                    Usar como cara do perfil
                  </button>
                )}
                <button className="btn small" type="button" disabled={busy} onClick={() => setEditing(persona)}>Editar</button>
                <button className="ghost-btn" type="button" disabled={busy} onClick={() => setDeleting(persona)}>Apagar</button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">Crie uma persona para usar como avatar dos seus carrosséis UGC.</p>
      )}
      {editing && (
        <PersonaEditor persona={editing} activePersonaId={active} request={request} connected={connected} working={Boolean(working)}
          onUpdate={setSnapshot} onClose={() => setEditing(null)} />
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
