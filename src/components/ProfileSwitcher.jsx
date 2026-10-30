import { useState } from "react";
import { ChevronDown, Plus, Settings2, Trash2, Users } from "lucide-react";
import Dialog from "./Dialog.jsx";

// Perfis (multicontas): cada perfil tem marca, Design Kit, fotos e carrosséis próprios.
export default function ProfileSwitcher({
  state,
  request,
  isPending,
  menu,
  onSwitched,
}) {
  const profiles = state.profiles || [];
  const current = profiles.find((p) => p.id === state.profileId) || profiles[0];
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState(false);
  const busy =
    isPending("switchProfile") ||
    isPending("createProfile") ||
    isPending("deleteProfile");
  const go = (action, args) =>
    request(action, args)
      .then(
        () => (
          menu.setOpen(null),
          setCreating(false),
          setName(""),
          onSwitched()
        ),
      )
      .catch(() => {});
  const create = (event) => {
    event.preventDefault();
    if (name.trim()) go("createProfile", { name: name.trim() });
  };
  if (!current) return null;
  return (
    <div className="pop-anchor">
      <button
        className="ghost-btn profile-btn"
        aria-label={`Perfil: ${current.name}. Trocar de perfil`}
        aria-expanded={menu.open === "profiles"}
        onClick={() => menu.toggle("profiles")}
      >
        <Users size={15} />
        <span className="name">{current.name}</span>
        <ChevronDown size={14} />
      </button>
      {menu.open === "profiles" && (
        <div
          className="popover"
          style={{ minWidth: 260 }}
          role="menu"
          aria-label="Perfis"
        >
          <div className="head">Perfis</div>
          {profiles.map((p) => (
            <button
              key={p.id}
              className="opt"
              role="menuitemradio"
              aria-checked={p.id === current.id}
              disabled={busy}
              onClick={() =>
                p.id === current.id
                  ? menu.setOpen(null)
                  : go("switchProfile", { id: p.id })
              }
            >
              <b>{p.name}</b>
            </button>
          ))}
          <hr />
          {creating ? (
            <form className="profile-new fld" onSubmit={create}>
              <input
                autoFocus
                value={name}
                maxLength={60}
                placeholder="Nome do perfil (ex.: Cliente Ana)"
                aria-label="Nome do novo perfil"
                onChange={(e) => setName(e.target.value)}
              />
              <button
                className="btn small primary"
                type="submit"
                disabled={!name.trim() || busy}
              >
                Criar
              </button>
            </form>
          ) : (
            <button className="opt" onClick={() => setCreating(true)}>
              <b>
                <Plus size={15} /> Novo perfil
              </b>
              <small>
                Outra marca, com Contexto, Design Kit e carrosséis próprios
              </small>
            </button>
          )}
          <button
            className="opt"
            onClick={() => (menu.setOpen(null), setManaging(true))}
          >
            <b>
              <Settings2 size={15} /> Gerenciar perfis
            </b>
          </button>
        </div>
      )}
      {managing && (
        <ManageProfiles
          state={state}
          request={request}
          busy={busy}
          onClose={() => setManaging(false)}
          onDeleted={onSwitched}
        />
      )}
    </div>
  );
}

function ManageProfiles({ state, request, busy, onClose, onDeleted }) {
  const [names, setNames] = useState(() =>
    Object.fromEntries((state.profiles || []).map((p) => [p.id, p.name])),
  );
  const [confirm, setConfirm] = useState(null);
  const rename = (p) => {
    const value = (names[p.id] || "").trim();
    if (value && value !== p.name)
      request("renameProfile", { id: p.id, name: value }).catch(() => {});
  };
  const remove = (p) =>
    request("deleteProfile", { id: p.id })
      .then(() => (setConfirm(null), p.id === state.profileId && onDeleted()))
      .catch(() => {});
  return (
    <Dialog title="Gerenciar perfis" eyebrow="MULTICONTAS" onClose={onClose}>
      <div className="dialog-fields" style={{ gap: 12 }}>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "var(--t-md)" }}>
          Cada perfil guarda a própria marca, o Design Kit, as fotos e os
          carrosséis. A conta do ChatGPT é a mesma para todos.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {(state.profiles || []).map((p) => (
            <div
              key={p.id}
              className="fld"
              style={{ display: "flex", gap: 8, alignItems: "center" }}
            >
              <input
                style={{ flex: 1, width: "auto", minWidth: 0 }}
                value={names[p.id] ?? ""}
                maxLength={60}
                aria-label={`Nome do perfil ${p.name}`}
                onChange={(e) =>
                  setNames((n) => ({ ...n, [p.id]: e.target.value }))
                }
                onBlur={() => rename(p)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              />
              {p.id === "principal" ? (
                <small style={{ color: "var(--muted)", flex: "none" }}>
                  Não pode ser excluído
                </small>
              ) : confirm === p.id ? (
                <button
                  className="btn small danger"
                  disabled={busy}
                  onClick={() => remove(p)}
                >
                  Apagar tudo deste perfil
                </button>
              ) : (
                <button
                  className="icon-only"
                  aria-label={`Excluir o perfil ${p.name}`}
                  title="Excluir"
                  disabled={busy}
                  onClick={() => setConfirm(p.id)}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        {confirm && (
          <p
            style={{
              margin: 0,
              color: "var(--danger)",
              fontSize: "var(--t-sm)",
            }}
          >
            Excluir apaga a marca, as fotos e todos os carrosséis desse perfil
            neste computador. Não dá para desfazer.
          </p>
        )}
      </div>
    </Dialog>
  );
}
