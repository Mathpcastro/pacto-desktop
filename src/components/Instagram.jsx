import { useEffect, useState } from "react";
import { AtSign, CalendarClock, Check, ExternalLink, KeyRound, RefreshCw, Send, X } from "lucide-react";
import { Spinner } from "../ui.jsx";

// Instagram pelo Composio: configurar (Marca), postar e agendar (estúdio) e ver as métricas (Resultado).
const when = (iso) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const SCHEDULE_LABEL = { scheduled: "Agendado", late: "Atrasado", failed: "Não saiu", published: "Publicado" };
// Valor inicial do campo de agendamento: amanhã às 18h, no horário local.
function tomorrowAt18() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00`;
}

export function InstagramSetup({ state, request, isPending, onNotice }) {
  const [status, setStatus] = useState(null);
  const [key, setKey] = useState("");
  const [editingKey, setEditingKey] = useState(false);
  const ig = state.instagram || {};
  useEffect(() => {
    request("instagramStatus").then(setStatus).catch(() => {});
  }, [request, state.profileId, state.composio?.hasKey, ig.connectedAccountId, ig.pendingAccountId, state.projects]);
  const act = (action, args, notice) =>
    request(action, args)
      .then((next) => {
        if (next?.hasKey !== undefined) setStatus(next);
        if (notice) onNotice(notice);
        return next;
      })
      .catch(() => {});
  const hasKey = status?.hasKey ?? state.composio?.hasKey;
  return (
    <section className="card-box" aria-label="Instagram">
      <div className="section-head">
        <h2>
          <AtSign size={18} style={{ verticalAlign: "-3px" }} /> Instagram
        </h2>
        <span className="hint">Postar e agendar com um clique, pelo Composio</span>
      </div>
      {!hasKey || editingKey ? (
        <>
          <ol className="steps-list">
            <li>Crie uma conta grátis em composio.dev.</li>
            <li>Em Settings › API Keys, crie e copie a sua chave de API.</li>
            <li>Cole aqui. Ela fica cifrada neste computador.</li>
          </ol>
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              if (key.trim()) act("saveComposioKey", { key: key.trim() }, "Chave do Composio salva.").then((next) => next && (setKey(""), setEditingKey(false)));
            }}
          >
            <label className="fld" style={{ flex: 1, minWidth: 240 }}>
              <span>Chave de API do Composio</span>
              <input type="password" autoComplete="off" value={key} placeholder="Cole a chave aqui" onChange={(e) => setKey(e.target.value)} />
            </label>
            <button className="btn" style={{ alignSelf: "flex-end" }} disabled={!key.trim() || isPending("saveComposioKey")}>
              <KeyRound size={15} /> {isPending("saveComposioKey") ? "Conferindo…" : "Salvar chave"}
            </button>
            {editingKey && (
              <button type="button" className="ghost-btn" style={{ alignSelf: "flex-end" }} onClick={() => setEditingKey(false)}>
                Cancelar
              </button>
            )}
          </form>
        </>
      ) : (
        <>
          <div className="row">
            {status?.account ? (
              <>
                <span className="chip good">
                  <Check size={13} /> @{status.account.username} conectado a este perfil
                </span>
                <button className="ghost-btn" disabled={isPending("disconnectInstagram")} onClick={() => act("disconnectInstagram", {}, "Instagram desconectado deste perfil.")}>
                  Desconectar
                </button>
              </>
            ) : status?.pending ? (
              <>
                <span className="chip accent">
                  <Spinner /> Esperando você autorizar no navegador…
                </span>
                <button className="btn small" disabled={isPending("checkInstagram")} onClick={() => act("checkInstagram")}>
                  Já autorizei
                </button>
                <button className="ghost-btn" onClick={() => act("connectInstagram")}>
                  Abrir o link de novo
                </button>
              </>
            ) : (
              <button className="btn primary" disabled={isPending("connectInstagram")} onClick={() => act("connectInstagram", {}, "Autorize no navegador que abriu. O Carrossell confirma sozinho.")}>
                <AtSign size={15} /> Conectar o Instagram deste perfil
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
            A conta precisa ser Profissional (Empresa ou Criador de conteúdo). Cada perfil do Carrossell liga a própria conta. Para postar, as imagens sobem para o armazenamento do Composio, na sua conta, e o Instagram busca de lá.
          </p>
          {status?.scheduled?.length > 0 && (
            <div className="scheduled-list" aria-label="Posts agendados">
              <b>Agendados</b>
              {status.scheduled.map((s) => (
                <div className="row" key={s.id}>
                  <span className={`chip ${s.status === "scheduled" ? "" : "accent"}`}>{SCHEDULE_LABEL[s.status] || s.status}</span>
                  <span style={{ flex: 1 }}>
                    {when(s.at)} · {s.title}
                    {s.error ? <small style={{ display: "block", color: "var(--danger)" }}>{s.error}</small> : null}
                  </span>
                  {s.status !== "scheduled" && (
                    <button className="btn small" disabled={isPending("publishInstagram")} onClick={() => act("publishInstagram", { id: s.id }, "Publicado no Instagram.")}>
                      Postar agora
                    </button>
                  )}
                  <button className="ghost-btn" aria-label={`Cancelar o agendamento de ${s.title}`} onClick={() => act("cancelSchedule", { id: s.id }, "Agendamento cancelado.")}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function InstagramPost({ project, state, request, isPending, activity, onNotice, onBrand }) {
  const [confirming, setConfirming] = useState(false);
  const [at, setAt] = useState(tomorrowAt18);
  const [scheduling, setScheduling] = useState(false);
  const ig = state.instagram || {};
  const ready = state.composio?.hasKey && ig.connectedAccountId;
  const posting = isPending("publishInstagram");
  const run = (action, args, notice) =>
    request(action, { id: project.id, ...args })
      .then(() => (setConfirming(false), setScheduling(false), notice && onNotice(notice)))
      .catch(() => {});
  const post = project.instagram;
  const s = project.schedule;
  let body;
  if (post?.mediaId)
    body = (
      <div className="row">
        <span className="chip good">
          <Check size={13} /> Postado em {when(post.publishedAt)}
          {post.username ? ` · @${post.username}` : ""}
        </span>
        {post.permalink && (
          <button className="btn small" onClick={() => request("openPermalink", { url: post.permalink }).catch(() => {})}>
            <ExternalLink size={14} /> Ver no Instagram
          </button>
        )}
      </div>
    );
  else if (!ready)
    body = (
      <div className="row">
        <span style={{ flex: 1, color: "var(--muted)" }}>Conecte o Instagram deste perfil para postar e agendar daqui.</span>
        <button className="btn small" onClick={onBrand}>
          Conectar em Marca
        </button>
      </div>
    );
  else if (posting)
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
              <CalendarClock size={13} /> Agendado para {when(s.at)} em @{ig.username}
            </span>
            <button className="ghost-btn" onClick={() => run("cancelSchedule", {}, "Agendamento cancelado.")}>
              Cancelar
            </button>
          </div>
        )}
        {s?.status === "late" && <p className="hint" style={{ margin: 0, color: "var(--danger)" }}>Estava agendado para {when(s.at)}, mas o computador estava desligado. Poste agora ou cancele.</p>}
        {s?.status === "failed" && <p className="hint" style={{ margin: 0, color: "var(--danger)" }}>O post agendado não saiu: {s.error}</p>}
        {confirming ? (
          <div className="row">
            <span style={{ flex: 1 }}>
              Publicar agora em <b>@{ig.username}</b>, com {project.slides.length} cards e a legenda abaixo?
            </span>
            <button className="btn primary" onClick={() => run("publishInstagram", {}, "Publicado no Instagram.")}>
              <Send size={15} /> Publicar
            </button>
            <button className="ghost-btn" onClick={() => setConfirming(false)}>
              Voltar
            </button>
          </div>
        ) : scheduling ? (
          <form
            className="row"
            onSubmit={(e) => {
              e.preventDefault();
              run("schedulePost", { at }, `Agendado para ${when(at)}. O computador precisa estar ligado nesse horário (o app pode estar fechado).`);
            }}
          >
            <label className="fld" style={{ flex: 1, minWidth: 200 }}>
              <span>Data e hora</span>
              <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
            </label>
            <button className="btn primary" style={{ alignSelf: "flex-end" }} disabled={!at || isPending("schedulePost")}>
              <CalendarClock size={15} /> Agendar
            </button>
            <button type="button" className="ghost-btn" style={{ alignSelf: "flex-end" }} onClick={() => setScheduling(false)}>
              Voltar
            </button>
          </form>
        ) : (
          <div className="row">
            <button className="btn primary" onClick={() => setConfirming(true)}>
              <Send size={15} /> Postar agora em @{ig.username}
            </button>
            {s?.status !== "scheduled" && (
              <button className="btn" onClick={() => setScheduling(true)}>
                <CalendarClock size={15} /> Agendar
              </button>
            )}
          </div>
        )}
      </>
    );
  return (
    <div className="box" aria-label="Postar no Instagram">
      <div className="box-head">
        <b>
          <AtSign size={15} style={{ verticalAlign: "-2px" }} /> Instagram
        </b>
      </div>
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
  const post = project.instagram;
  if (!post?.mediaId) return null;
  const m = post.metrics;
  return (
    <div className="box" aria-label="Métricas do Instagram">
      <div className="box-head">
        <b>Números do Instagram</b>
        <button className="btn small" disabled={isPending("refreshMetrics")} onClick={() => request("refreshMetrics", { id: project.id }).then(() => onNotice("Métricas atualizadas.")).catch(() => {})}>
          <RefreshCw size={14} /> {isPending("refreshMetrics") ? "Atualizando…" : "Atualizar"}
        </button>
      </div>
      {m ? (
        <>
          <div className="ig-metrics">
            {METRICS.filter(([k]) => m[k] !== null && m[k] !== undefined).map(([k, label]) => (
              <div key={k}>
                <b>{m[k].toLocaleString("pt-BR")}</b>
                <small>{label}</small>
              </div>
            ))}
          </div>
          <p className="hint" style={{ margin: 0 }}>
            Atualizado em {when(post.metricsAt)}. {post.insights === "unavailable" ? "Alcance e visualizações aparecem quando a conta tem 1.000 seguidores (regra do Instagram)." : ""} Comentários e salvamentos já entram no resultado abaixo.
          </p>
        </>
      ) : (
        <p className="hint" style={{ margin: 0 }}>Os números chegam sozinhos 1, 3 e 7 dias depois de postar, ou agora mesmo em Atualizar.</p>
      )}
    </div>
  );
}
