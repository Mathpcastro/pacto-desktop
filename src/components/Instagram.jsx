import { useEffect, useId, useState } from "react";
import { CalendarClock, Check, ExternalLink, KeyRound, Plus, RefreshCw, Send, Trash2, X } from "lucide-react";
import Dialog from "./Dialog.jsx";
import { Spinner } from "../ui.jsx";
import { formatLocale } from "../i18n.js";

// Instagram pelo Composio: botão do topo e modal (contas), postar e agendar (estúdio) e métricas (Resultado).
const when = (iso) => new Date(iso).toLocaleString(formatLocale(), { dateStyle: "short", timeStyle: "short" });
const SCHEDULE_LABEL = { scheduled: "Agendado", late: "Atrasado", failed: "Não saiu", partial: "Saiu em parte", published: "Publicado" };
const usable = (composio) => (composio?.accounts || []).filter((a) => a.status === "ACTIVE");
// Valor inicial do campo de agendamento: amanhã às 18h, no horário local.
function tomorrowAt18() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00`;
}

// Valor do campo datetime-local a partir de uma data ISO, no horário local.
function localInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const OPEN_SCHEDULE = ["scheduled", "late", "failed", "partial"];
export const scheduledProjects = (projects = []) =>
  projects.filter((p) => p.schedule && OPEN_SCHEDULE.includes(p.schedule.status)).sort((a, b) => a.schedule.at.localeCompare(b.schedule.at));

// Trocar a data de um post agendado: campo de data e hora com salvar e voltar.
export function RescheduleForm({ project, request, onNotice, onDone }) {
  const [at, setAt] = useState(() => (new Date(project.schedule.at) > new Date() ? localInput(project.schedule.at) : tomorrowAt18()));
  const [saving, setSaving] = useState(false);
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await request("reschedulePost", { id: project.id, at });
      onNotice?.(`Nova data salva: ${when(new Date(at).toISOString())}.`);
      onDone?.();
    } catch {
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="row reschedule" onSubmit={save} aria-label={`Trocar a data de ${project.title}`}>
      <input type="datetime-local" aria-label="Nova data e hora" value={at} required onChange={(e) => setAt(e.target.value)} />
      <button className="btn small primary" disabled={saving || !at}>
        {saving ? <Spinner /> : <Check size={14} />} Salvar nova data
      </button>
      <button type="button" className="ghost-btn" onClick={onDone}>
        Voltar
      </button>
    </form>
  );
}

// Lista de agendados com trocar data e cancelar (Marca › Instagram, Calendário e Piloto automático).
export function ScheduledPosts({ projects, request, onNotice, title = "Agendados", empty = "" }) {
  const [editing, setEditing] = useState("");
  const list = scheduledProjects(projects);
  if (!list.length) return empty ? <p className="hint" style={{ margin: 0 }}>{empty}</p> : null;
  return (
    <div className="scheduled-list" aria-label="Posts agendados">
      {title && <b>{title}</b>}
      {list.map((p) => (
        <div className="scheduled-item" key={p.id}>
          <div className="row">
            <span className={`chip ${p.schedule.status === "scheduled" ? "" : "accent"}`}>{SCHEDULE_LABEL[p.schedule.status] || p.schedule.status}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>{when(p.schedule.at)}</b> · {p.title} · {(p.schedule.usernames || []).map((u) => `@${u}`).join(", ")}
              {p.schedule.error ? <small style={{ display: "block", color: "var(--danger)" }}>{p.schedule.error}</small> : null}
            </span>
            {editing !== p.id && (
              <>
                <button className="ghost-btn" aria-label={`Trocar a data de ${p.title}`} onClick={() => setEditing(p.id)}>
                  <CalendarClock size={14} /> Trocar data
                </button>
                <button className="ghost-btn" aria-label={`Cancelar o agendamento de ${p.title}`} onClick={() => request("cancelSchedule", { id: p.id }).then(() => onNotice?.("Agendamento cancelado. O carrossel continua salvo.")).catch(() => {})}>
                  <X size={14} /> Cancelar
                </button>
              </>
            )}
          </div>
          {editing === p.id && <RescheduleForm project={p} request={request} onNotice={onNotice} onDone={() => setEditing("")} />}
        </div>
      ))}
    </div>
  );
}

// Logo minimalista: o contorno do Instagram com o degradê da marca.
export function InstagramLogo({ size = 18 }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`ig-${id}`} x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#feda75" />
          <stop offset="0.3" stopColor="#fa7e1e" />
          <stop offset="0.6" stopColor="#d62976" />
          <stop offset="1" stopColor="#4f5bd5" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="5.5" stroke={`url(#ig-${id})`} strokeWidth="2" />
      <circle cx="12" cy="12" r="4.2" stroke={`url(#ig-${id})`} strokeWidth="2" />
      <circle cx="17.3" cy="6.7" r="1.25" fill={`url(#ig-${id})`} />
    </svg>
  );
}

// Botão de destaque na barra de cima.
export function InstagramButton({ composio, onOpen }) {
  const accounts = usable(composio);
  return (
    <button className="ig-btn" onClick={onOpen} aria-label={accounts.length ? `Instagram: ${accounts.length} contas conectadas` : "Conectar Instagram"}>
      <InstagramLogo size={17} />
      <span className="label">{accounts.length ? "Instagram" : "Conectar Instagram"}</span>
      {accounts.length > 0 && <span className="count">{accounts.length}</span>}
    </button>
  );
}

const STEPS = [
  ["Conta Profissional", "No app do Instagram: Configurações › Tipo de conta e ferramentas › Mudar para conta profissional (Criador de conteúdo ou Empresa). Contas pessoais não podem postar por aplicativo."],
  ["Conta grátis no Composio", "O Composio é a ponte segura entre o Carrossell e o Instagram. Crie a sua conta em composio.dev."],
  ["Copie a chave do projeto", "Clique em Abrir o Composio: ele abre a página de chaves do projeto (crie um projeto se pedir). Copie a chave do projeto. A de Sessions & API Key do Connect (ck_, a do MCP) não serve. Ela fica cifrada neste computador."],
  ["Escolha as contas", "As contas do Instagram que você já conectou no Composio aparecem na lista, sem reconectar. Para outra, use Conectar outra conta."],
];

export function InstagramModal({ state, request, isPending, onNotice, onClose }) {
  const composio = state.composio || {};
  const profileName = (state.profiles || []).find((p) => p.id === state.profileId)?.name || "este perfil";
  const [key, setKey] = useState("");
  const [editingKey, setEditingKey] = useState(false);
  const [removing, setRemoving] = useState(null);
  const act = (action, args, notice) =>
    request(action, args)
      .then((r) => (notice && onNotice(notice), r))
      .catch(() => null);
  const defaults = composio.defaults || [];
  const toggle = (id) => act("setInstagramDefaults", { accounts: defaults.includes(id) ? defaults.filter((x) => x !== id) : [...defaults, id] });
  const showKeyForm = !composio.hasKey || editingKey;
  return (
    <Dialog title="Conectar Instagram" eyebrow="POSTAR E AGENDAR DIRETO DO CARROSSELL" onClose={onClose} wide>
      <div className="dialog-fields ig-modal">
        <ol className="ig-steps">
          {STEPS.map(([title, text], i) => (
            <li key={title} className={composio.hasKey && i < 3 ? "done" : ""}>
              <span className="n">{composio.hasKey && i < 3 ? <Check size={13} /> : i + 1}</span>
              <div>
                <b>{title}</b>
                <small>{text}</small>
              </div>
            </li>
          ))}
        </ol>
        {showKeyForm ? (
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (key.trim()) act("saveComposioKey", { key: key.trim() }, "Chave salva. As suas contas do Composio já estão na lista.").then((r) => r && (setKey(""), setEditingKey(false)));
            }}
          >
            <label className="fld" style={{ flex: 1, minWidth: 240 }}>
              <span>Chave de API do Composio</span>
              <input type="password" autoComplete="off" value={key} placeholder="Cole a chave aqui" onChange={(e) => setKey(e.target.value)} />
            </label>
            <button className="btn primary" style={{ alignSelf: "flex-end" }} disabled={!key.trim() || isPending("saveComposioKey")}>
              <KeyRound size={15} /> {isPending("saveComposioKey") ? "Conferindo…" : "Salvar chave"}
            </button>
            <button type="button" className="ghost-btn" style={{ alignSelf: "flex-end" }} onClick={() => request("openComposio").catch(() => {})}>
              <ExternalLink size={14} /> Abrir o Composio
            </button>
            {editingKey && (
              <button type="button" className="ghost-btn" style={{ alignSelf: "flex-end" }} onClick={() => setEditingKey(false)}>
                Cancelar
              </button>
            )}
          </form>
        ) : (
          <div className="ig-accounts" aria-label="Contas do Instagram">
            <div className="row">
              <b style={{ flex: 1 }}>Contas do seu Composio</b>
              <button className="ghost-btn" disabled={isPending("syncInstagram")} onClick={() => act("syncInstagram", {}, "Lista atualizada.")}>
                <RefreshCw size={14} /> {isPending("syncInstagram") ? "Buscando…" : "Atualizar lista"}
              </button>
            </div>
            {(composio.accounts || []).length === 0 && <p className="hint" style={{ margin: 0 }}>Nenhuma conta do Instagram no seu Composio ainda. Conecte a primeira abaixo.</p>}
            {(composio.accounts || []).map((a) => (
              <div className={`ig-account ${a.status === "ACTIVE" ? "" : "off"}`} key={a.id}>
                <InstagramLogo size={20} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>@{a.username || "conta sem nome"}</b>
                  <small>{a.status === "ACTIVE" ? (a.followers !== null ? `${a.followers.toLocaleString(formatLocale())} seguidores` : "Conta Profissional") : a.error}</small>
                </div>
                {a.status === "ACTIVE" && (
                  <label className="toggle">
                    <input type="checkbox" checked={defaults.includes(a.id)} disabled={isPending("setInstagramDefaults")} onChange={() => toggle(a.id)} />
                    Padrão em {profileName}
                  </label>
                )}
                {removing === a.id ? (
                  <button className="btn small danger" onClick={() => act("disconnectInstagram", { id: a.id }, `@${a.username} removida do Composio.`).then(() => setRemoving(null))}>
                    Remover do Composio
                  </button>
                ) : (
                  <button className="icon-only" aria-label={`Remover @${a.username}`} title="Remover" onClick={() => setRemoving(a.id)}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
            {removing && <p className="hint" style={{ margin: 0, color: "var(--danger)" }}>Remover apaga a conexão no Composio: ela para de funcionar em qualquer app que use a mesma chave.</p>}
            <div className="row">
              {composio.pending ? (
                <>
                  <span className="chip accent">
                    <Spinner /> Esperando você autorizar no navegador…
                  </span>
                  <button className="btn small" disabled={isPending("checkInstagram")} onClick={() => act("checkInstagram")}>
                    Já autorizei
                  </button>
                </>
              ) : (
                <button className="btn" disabled={isPending("connectInstagram")} onClick={() => act("connectInstagram", {}, "Entre na conta do Instagram no navegador que abriu e autorize. O Carrossell confirma sozinho.")}>
                  <Plus size={15} /> Conectar outra conta
                </button>
              )}
              <span className="spacer" />
              <button className="ghost-btn" onClick={() => setEditingKey(true)}>
                Trocar chave
              </button>
              <button className="ghost-btn" disabled={isPending("removeComposioKey")} onClick={() => act("removeComposioKey", {}, "Chave do Composio removida deste computador.")}>
                Remover chave
              </button>
            </div>
            <p className="hint" style={{ margin: 0 }}>
              Dica: ao conectar outra conta, o navegador usa o Instagram que estiver logado nele. Troque de conta antes, ou abra o link numa janela anônima. Para postar, as imagens sobem para o armazenamento do Composio e o Instagram busca de lá.
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

// Marca › Instagram: resumo das contas padrão e dos agendados deste perfil.
export function InstagramSummary({ state, request, onNotice, onOpen }) {
  const composio = state.composio || {};
  const accounts = usable(composio);
  const defaults = accounts.filter((a) => (composio.defaults || []).includes(a.id));
  return (
    <section className="card-box" aria-label="Instagram">
      <div className="section-head">
        <h2>
          <InstagramLogo size={18} /> Instagram
        </h2>
        <span className="hint">Postar e agendar com um clique, pelo Composio</span>
        <span className="spacer" />
        <button className="btn small" onClick={onOpen}>
          {accounts.length ? "Gerenciar contas" : "Conectar Instagram"}
        </button>
      </div>
      <p style={{ margin: 0, color: "var(--muted)" }}>
        {!composio.hasKey
          ? "Conecte o Instagram para postar e agendar daqui, em uma ou várias contas."
          : defaults.length
            ? `Este perfil posta por padrão em ${defaults.map((a) => `@${a.username}`).join(", ")}. Na hora de postar, dá para escolher outras.`
            : `${accounts.length} ${accounts.length === 1 ? "conta disponível" : "contas disponíveis"}. Marque as contas padrão deste perfil em Gerenciar contas.`}
      </p>
      <ScheduledPosts projects={state.projects} request={request} onNotice={onNotice} />
    </section>
  );
}

export function InstagramPost({ project, state, request, isPending, activity, onNotice, onConnect }) {
  const composio = state.composio || {};
  const accounts = usable(composio);
  const posts = project.instagram?.posts || [];
  const open = accounts.filter((a) => !posts.some((p) => p.accountId === a.id));
  const s = project.schedule;
  const [chosen, setChosen] = useState(() => (s?.accounts?.length ? s.accounts : composio.defaults || []));
  const [mode, setMode] = useState("");
  const [at, setAt] = useState(tomorrowAt18);
  useEffect(() => {
    setChosen((current) => current.filter((id) => open.some((a) => a.id === id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.length, accounts.length]);
  const picked = open.filter((a) => chosen.includes(a.id));
  const names = picked.map((a) => `@${a.username}`).join(", ");
  const run = (action, args, notice) =>
    request(action, { id: project.id, ...args })
      .then(() => (setMode(""), notice && onNotice(notice)))
      .catch(() => {});
  let body;
  if (!composio.hasKey || !accounts.length)
    body = (
      <div className="row">
        <span style={{ flex: 1, color: "var(--muted)" }}>Conecte o Instagram para postar e agendar daqui, em uma ou várias contas.</span>
        <button className="ig-btn" onClick={onConnect}>
          <InstagramLogo size={16} /> <span className="label">Conectar Instagram</span>
        </button>
      </div>
    );
  else if (isPending("publishInstagram"))
    body = (
      <div className="row">
        <Spinner /> <span>{activity || "Postando no Instagram…"}</span>
      </div>
    );
  else
    body = (
      <>
        {s?.status === "scheduled" && (
          <div className="row">
            <span className="chip">
              <CalendarClock size={13} /> Agendado para {when(s.at)} em {(s.usernames || []).map((u) => `@${u}`).join(", ")}
            </span>
            <button className="ghost-btn" onClick={() => setMode(mode === "move" ? "" : "move")}>
              Trocar data
            </button>
            <button className="ghost-btn" onClick={() => run("cancelSchedule", {}, "Agendamento cancelado.")}>
              Cancelar
            </button>
          </div>
        )}
        {["scheduled", "late", "failed", "partial"].includes(s?.status) && mode === "move" && <RescheduleForm project={project} request={request} onNotice={onNotice} onDone={() => setMode("")} />}
        {["late", "failed", "partial"].includes(s?.status) && mode !== "move" && (
          <div className="row">
            <button className="ghost-btn" onClick={() => setMode("move")}>
              <CalendarClock size={14} /> Escolher nova data
            </button>
            <button className="ghost-btn" onClick={() => run("cancelSchedule", {}, "Agendamento cancelado.")}>
              Cancelar agendamento
            </button>
          </div>
        )}
        {s?.status === "late" && <p className="hint" style={{ margin: 0, color: "var(--danger)" }}>Estava agendado para {when(s.at)}, mas o computador estava desligado. Poste agora ou cancele.</p>}
        {["failed", "partial"].includes(s?.status) && <p className="hint" style={{ margin: 0, color: "var(--danger)" }}>O post agendado {s.status === "partial" ? "saiu só em parte" : "não saiu"}: {s.error}</p>}
        {open.length > 0 && (
          <>
            <div className="ig-pick" role="group" aria-label="Contas para postar">
              {open.map((a) => (
                <button key={a.id} type="button" aria-pressed={chosen.includes(a.id)} onClick={() => setChosen((c) => (c.includes(a.id) ? c.filter((x) => x !== a.id) : [...c, a.id]))}>
                  {chosen.includes(a.id) ? <Check size={13} /> : <InstagramLogo size={13} />} @{a.username}
                </button>
              ))}
            </div>
            {mode === "confirm" ? (
              <div className="row">
                <span style={{ flex: 1 }}>
                  Publicar agora em <b>{names}</b>, com {project.slides.length} cards e a legenda abaixo?
                </span>
                <button className="btn primary" onClick={() => run("publishInstagram", { accounts: picked.map((a) => a.id) }, `Publicado em ${names}.`)}>
                  <Send size={15} /> Publicar
                </button>
                <button className="ghost-btn" onClick={() => setMode("")}>
                  Voltar
                </button>
              </div>
            ) : mode === "schedule" ? (
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  run("schedulePost", { at, accounts: picked.map((a) => a.id) }, `Agendado para ${when(at)} em ${names}. O computador precisa estar ligado nesse horário (o app pode estar fechado).`);
                }}
              >
                <label className="fld" style={{ flex: 1, minWidth: 200 }}>
                  <span>Data e hora</span>
                  <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
                </label>
                <button className="btn primary" style={{ alignSelf: "flex-end" }} disabled={!at || !picked.length || isPending("schedulePost")}>
                  <CalendarClock size={15} /> Agendar
                </button>
                <button type="button" className="ghost-btn" style={{ alignSelf: "flex-end" }} onClick={() => setMode("")}>
                  Voltar
                </button>
              </form>
            ) : (
              <div className="row">
                <button className="btn primary" disabled={!picked.length} onClick={() => setMode("confirm")}>
                  <Send size={15} /> {picked.length > 1 ? `Postar agora em ${picked.length} contas` : picked.length ? `Postar agora em @${picked[0].username}` : "Escolha as contas"}
                </button>
                {s?.status !== "scheduled" && (
                  <button className="btn" disabled={!picked.length} onClick={() => setMode("schedule")}>
                    <CalendarClock size={15} /> Agendar
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </>
    );
  return (
    <div className="box" aria-label="Postar no Instagram">
      <div className="box-head">
        <b className="ig-title">
          <InstagramLogo size={15} /> Instagram
        </b>
      </div>
      {posts.map((p) => (
        <div className="row" key={p.accountId}>
          <span className="chip good">
            <Check size={13} /> @{p.username} · postado em {when(p.publishedAt)}
          </span>
          {p.permalink && (
            <button className="btn small" onClick={() => request("openPermalink", { url: p.permalink }).catch(() => {})}>
              <ExternalLink size={14} /> Ver
            </button>
          )}
        </div>
      ))}
      {body}
    </div>
  );
}

const METRICS = [
  ["likes", "Curtidas"],
  ["comments", "Comentários"],
  ["saves", "Salvamentos"],
  ["shares", "Compartilhamentos"],
  ["reach", "Alcance"],
  ["views", "Visualizações"],
];
export function InstagramMetrics({ project, request, isPending, onNotice }) {
  const posts = project.instagram?.posts || [];
  if (!posts.length) return null;
  return (
    <div className="box" aria-label="Métricas do Instagram">
      <div className="box-head">
        <b>Números do Instagram</b>
        <button className="btn small" disabled={isPending("refreshMetrics")} onClick={() => request("refreshMetrics", { id: project.id }).then(() => onNotice("Métricas atualizadas.")).catch(() => {})}>
          <RefreshCw size={14} /> {isPending("refreshMetrics") ? "Atualizando…" : "Atualizar"}
        </button>
      </div>
      {posts.map((p) => (
        <div key={p.accountId} style={{ display: "grid", gap: 8 }}>
          {posts.length > 1 && <b className="ig-title">@{p.username}</b>}
          {p.metrics ? (
            <div className="ig-metrics">
              {METRICS.filter(([k]) => p.metrics[k] !== null && p.metrics[k] !== undefined).map(([k, label]) => (
                <div key={k}>
                  <b>{p.metrics[k].toLocaleString(formatLocale())}</b>
                  <small>{label}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="hint" style={{ margin: 0 }}>Os números chegam sozinhos 1, 3 e 7 dias depois de postar, ou agora mesmo em Atualizar.</p>
          )}
          {p.insights === "unavailable" && <p className="hint" style={{ margin: 0 }}>Alcance e visualizações aparecem quando a conta tem 1.000 seguidores (regra do Instagram).</p>}
        </div>
      ))}
      <p className="hint" style={{ margin: 0 }}>Comentários e salvamentos de todas as contas entram somados no resultado abaixo.</p>
    </div>
  );
}
