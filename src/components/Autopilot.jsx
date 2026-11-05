import { useEffect, useRef, useState } from "react";
import { CalendarClock, ExternalLink, Pause, Play, RefreshCw, Monitor, Check, MessageCircle, Plus, X } from "lucide-react";
import { STYLES } from "../../core/templates.mjs";
import { Spinner } from "../ui.jsx";
import Dialog from "./Dialog.jsx";
import { ScheduledPosts } from "./Instagram.jsx";
import telegramLogo from "../assets/telegram.svg";

const STYLE_LABEL = { ia: "Arte com IA", tweet: "Tweet", texto: "Texto em fundo claro", textopreto: "Texto em fundo preto", fototexto: "Texto + foto", fundo: "Foto de fundo", recorte: "Capa com sua foto" };
const DAYS = [[1, "Segunda", "Seg"], [2, "Terça", "Ter"], [3, "Quarta", "Qua"], [4, "Quinta", "Qui"], [5, "Sexta", "Sex"], [6, "Sábado", "Sáb"], [0, "Domingo", "Dom"]];
const JOB_LABEL = {
  queued: "Na fila", planning: "Escolhendo a pauta", writing: "Escrevendo", generating: "Criando o carrossel", rendering: "Preparando as imagens",
  notifying: "Enviando para o Telegram", ready: "Esperando sua aprovação", approved: "Aprovado", publishing: "Publicando",
  sending: "Enviando prévia", scheduleDate: "Esperando data", scheduleConfirm: "Esperando confirmação", approvedSchedule: "Agendamento aprovado", scheduling: "Agendando", redo: "Refazendo", resend: "Reenviando prévia", scheduled: "Agendado",
  published: "Publicado", complete: "Concluído", error: "Precisa de atenção", failed: "Precisa de atenção", uncertain: "Confira o Instagram", discarded: "Descartado", cancelled: "Cancelado",
};
const RUNNING = new Set(["ready", "scheduleDate", "scheduleConfirm", "queued", "planning", "writing", "generating", "rendering", "notifying", "sending", "approved", "approvedSchedule", "publishing", "scheduling", "redo", "resend"]);
const DISCARDABLE = new Set(["ready", "error", "queued", "scheduleDate", "scheduleConfirm"]);
const CLOSED = new Set(["published", "scheduled", "discarded", "error", "uncertain", "complete", "cancelled", "failed"]);
const MAX_TIMES = 6;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const hourLabel = (time) => { const [h, m] = time.split(":"); return `${Number(h)}h${m !== "00" ? m : ""}`; };
const joinPt = (items) => items.length > 1 ? `${items.slice(0, -1).join(", ")} e ${items.at(-1)}` : items[0] || "";
const runLabel = (iso) => {
  const date = new Date(iso), today = new Date(), tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const day = date.toDateString() === today.toDateString() ? "Hoje" : date.toDateString() === tomorrow.toDateString() ? "Amanhã" : date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  return `${day}, ${hourLabel(date.toTimeString().slice(0, 5))}`;
};
const when = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};
// Cada horário tem o seu tipo de carrossel: arquitetura, estilo e quantidade de cards.
const slotOf = (slot = {}, config = {}) => ({ time: slot.time || "09:00", architectureId: slot.architectureId || "", style: slot.style || config.style || "texto", cardCount: slot.cardCount ?? config.cardCount ?? 6 });
const editable = (config = {}) => ({
  slots: (Array.isArray(config.slots) && config.slots.length ? config.slots
    : (Array.isArray(config.times) && config.times.length ? config.times : [config.time || "09:00"]).map((time) => ({ time }))
  ).map((slot) => slotOf(slot, config)).sort((a, b) => a.time.localeCompare(b.time)),
  days: Array.isArray(config.days) ? [...config.days].sort((a, b) => a - b) : [1, 2, 3, 4, 5],
  accounts: Array.isArray(config.accounts) ? [...config.accounts].sort() : [],
  approval: config.approval === "auto" ? "auto" : "review",
});
// Valor inicial do campo de agendar: amanhã às 18h, no horário do computador.
const tomorrowAt18 = () => { const d = new Date(); d.setDate(d.getDate() + 1); const pad = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T18:00`; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const validSlot = (slot) => TIME.test(slot.time) && STYLES.includes(slot.style) && Number.isInteger(slot.cardCount) && slot.cardCount >= 2 && slot.cardCount <= 10;
const valid = (config, accounts, requireAccounts = true) => config.slots.length > 0 && config.slots.length <= MAX_TIMES
  && config.slots.every(validSlot) && new Set(config.slots.map((slot) => slot.time)).size === config.slots.length
  && config.days.length > 0 && config.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  && (!requireAccounts || config.accounts.length > 0) && config.accounts.every((id) => accounts.some((account) => account.id === id));

// Um rascunho pertence ao perfil aberto; o bot e a conversa são desta instalação.
export default function Autopilot(props) {
  return <AutopilotPanel key={props.state.profileId || "default"} {...props} />;
}

function AutopilotPanel({ state, request, onNotice, heading = "Piloto automático" }) {
  const pilot = state.autopilot || {};
  const saved = pilot.config || {};
  const accounts = (state.composio?.accounts || []).filter((account) => account.status === "ACTIVE");
  const [draft, setDraft] = useState(() => editable(saved));
  const edited = useRef(false);
  const [dialog, setDialog] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const closeDialog = () => { setDialog(null); setToken(""); setEditingToken(false); setDisconnecting(false); };
  const [token, setToken] = useState("");
  const [editingToken, setEditingToken] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [pending, setPending] = useState("");
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  // Aprovação pelo app: { id, mode: "post" | "schedule", at }.
  const [approving, setApproving] = useState(null);
  const [now, setNow] = useState(Date.now());
  const savedKey = JSON.stringify(editable(saved));
  useEffect(() => {
    if (!edited.current) setDraft(JSON.parse(savedKey));
  }, [savedKey]);
  useEffect(() => {
    if (!pilot.pairing?.expiresAt) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pilot.pairing?.expiresAt]);

  const change = (values) => {
    edited.current = true;
    setDraft((current) => ({ ...current, ...values }));
  };
  const act = async (action, args = {}, notice) => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setPending(action);
    setError("");
    try {
      const result = await request(action, args);
      if (notice) onNotice?.(notice);
      return result;
    } catch {
      // Nunca mostrar respostas de autenticação que possam conter o token.
      setError(action === "saveTelegramToken" ? "Não foi possível conectar o bot. Confira o token do BotFather e tente de novo." : "Não foi possível concluir. Confira a conexão e tente de novo.");
      return null;
    } finally {
      inFlight.current = false;
      setPending("");
    }
  };
  const connected = Boolean(pilot.hasToken && pilot.paired && !pilot.connectionError);
  const dirty = !same(draft, editable(saved));
  const draftValid = valid(draft, accounts, Boolean(saved.enabled));
  const savedValid = valid(editable(saved), accounts);
  const jobs = [...(pilot.jobs || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  const running = (pilot.jobs || []).some((job) => RUNNING.has(job.status));
  // Cabem tantos carrosséis esperando aprovação quanto horários na rotina.
  const openJobs = (pilot.jobs || []).filter((job) => !CLOSED.has(job.status)).length;
  const full = openJobs >= Math.max(1, editable(saved).slots.length);
  const pairing = pilot.pairing;
  const expires = pairing?.expiresAt ? new Date(pairing.expiresAt).getTime() : NaN;
  const expired = Number.isFinite(expires) && expires <= now;
  const showToken = !pilot.hasToken || editingToken;
  const saveRoutine = async (event) => {
    event.preventDefault();
    if (!draftValid) return;
    const config = { ...draft, slots: [...draft.slots].sort((a, b) => a.time.localeCompare(b.time)), enabled: Boolean(saved.enabled) };
    const result = await act("saveAutopilot", { config }, "Rotina salva para este perfil.");
    if (result) {
      edited.current = false;
      setDraft(editable(result.autopilot?.config || { ...draft, enabled: saved.enabled }));
    }
  };
  const toggleRoutine = async () => {
    await act("saveAutopilot", { config: { ...editable(saved), enabled: !saved.enabled } }, saved.enabled ? "Rotina pausada. Seus ajustes foram mantidos." : "Rotina ativada.");
  };

  const summary = editable(saved);
  const daySummary = same(summary.days, [1, 2, 3, 4, 5]) ? "Seg–sex" : DAYS.filter(([day]) => summary.days.includes(day)).map(([, , short]) => short).join(", ") || "Escolha os dias";
  const perDay = summary.slots.length;
  const upcoming = pilot.upcoming || [];
  const duplicateTime = new Set(draft.slots.map((slot) => slot.time)).size !== draft.slots.length;
  const architectures = state.architectures || [];
  const typeName = (slot) => architectures.find((a) => a.id === slot.architectureId)?.name || "Tipo escolhido pela pauta";
  const typeLabel = (slot) => `${typeName(slot)} · ${STYLE_LABEL[slot.style] || slot.style} · ${slot.cardCount} cards`;
  const slotAt = (time) => summary.slots.find((slot) => slot.time === time);
  const changeSlot = (index, values) => change({ slots: draft.slots.map((slot, i) => i === index ? { ...slot, ...values } : slot) });
  const connectionStatus = pilot.connectionError ? "Conexão precisa de atenção" : connected ? "Conectado" : pilot.hasToken ? "Falta vincular a conversa" : "Não conectado";
  const activeJobs = jobs.filter((job) => !["published", "complete", "discarded", "cancelled", "scheduled"].includes(job.status));
  const previewProject = (state.projects || []).find((project) => project.id === previewId);
  const renderJobs = (list) => list.map((job) => <div className="pending-item" key={job.id}>
    <div className="row"><b style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>{job.title || "Preparação de carrossel"}</b><span className={`chip ${job.status === "published" || job.status === "complete" ? "good" : ""}`} role="status">{JOB_LABEL[job.status] || "Em andamento"}</span></div>
    {job.projectId && <button className="ghost-btn pilot-preview-link" onClick={() => { setPreviewId(job.projectId); setDialog("preview"); }}>Ver prévia</button>}
    {job.createdAt && <span className="hint">{when(job.createdAt)}</span>}
    {job.error && <p className="hint pilot-error">{job.error}</p>}
    {job.status === "ready" && <p className="hint">Veja a prévia e aprove aqui ou pelo Telegram.</p>}
    {job.status === "ready" && (approving?.id === job.id ? <div className="pilot-approve" role="group" aria-label={`Aprovar ${job.title || "carrossel"}`}>
      {approving.mode === "schedule" && <label className="fld"><span>Data e hora no computador</span><input type="datetime-local" aria-label="Data e hora do agendamento" value={approving.at} onChange={(event) => setApproving({ ...approving, at: event.target.value })} /></label>}
      <p className="hint" style={{ margin: 0 }}>{approving.mode === "post" ? "O carrossel vai para o Instagram agora, nas contas da rotina." : "O carrossel fica agendado nas contas da rotina."}</p>
      <div className="row">
        <button className="btn small primary" disabled={Boolean(pending) || (approving.mode === "schedule" && !approving.at)} onClick={async () => { if (await act("approveAutopilot", { id: job.id, ...(approving.mode === "schedule" ? { at: approving.at } : {}) }, approving.mode === "post" ? "Aprovado. Publicando agora." : "Aprovado. O post foi para os agendados.")) setApproving(null); }}>{approving.mode === "post" ? "Confirmar e publicar" : "Confirmar agendamento"}</button>
        <button className="ghost-btn" disabled={Boolean(pending)} onClick={() => setApproving(null)}>Voltar</button>
      </div>
    </div> : <div className="row">
      <button className="btn small primary" disabled={Boolean(pending) || !connected} onClick={() => setApproving({ id: job.id, mode: "post" })}>Publicar agora</button>
      <button className="btn small" disabled={Boolean(pending) || !connected} onClick={() => setApproving({ id: job.id, mode: "schedule", at: tomorrowAt18() })}><CalendarClock size={14} /> Agendar</button>
    </div>)}
    {job.status === "uncertain" && <p className="hint">Confira no Instagram se o post saiu antes de qualquer nova tentativa. A publicação não será repetida automaticamente.</p>}
    {DISCARDABLE.has(job.status) && <div className="row">
      {job.status === "error" && <button className="btn small" disabled={Boolean(pending) || !connected || !state.account?.connected || full} onClick={() => act("retryAutopilot", { id: job.id }, "Pedido retomado.")}><RefreshCw size={14} /> Retomar</button>}
      <button className="ghost-btn" disabled={Boolean(pending)} aria-label={`Descartar pedido: ${job.title || "carrossel"}`} onClick={() => act("discardAutopilot", { id: job.id }, "Pedido descartado.")}>Descartar pedido</button>
    </div>}
  </div>);

  return (
    <section className="pilot-layout" aria-label="Piloto automático">
      {heading === "Piloto automático" && <header className="pilot-legacy-heading"><h2>{heading}</h2><p>Crie por rotina ou peça pelo Telegram.</p></header>}
      <section className="pilot-connection" aria-labelledby="pilot-telegram-title">
        <img className="pilot-telegram-logo" src={telegramLogo} alt="Telegram" />
        <div className="pilot-connection-copy"><span className="pilot-eyebrow">TELEGRAM</span><h2 id="pilot-telegram-title">Seu Carrossell, no Telegram</h2><p>{connected ? `${pilot.bot?.username ? `@${pilot.bot.username.replace(/^@/, "")} · ` : ""}Sua conversa está vinculada.` : "Peça conteúdos e receba as prévias em uma conversa."}</p></div>
        <div className="pilot-connection-actions"><span className={`pilot-connection-status ${connected ? "connected" : ""}`} role="status">{connectionStatus}</span><button className="btn primary" disabled={Boolean(pending)} onClick={() => connected ? act("openTelegramPair") : setDialog("connection")}>{connected ? "Abrir Telegram" : "Conectar Telegram"}<ExternalLink size={15} /></button><button className="ghost-btn" onClick={() => setDialog("connection")}>{pilot.hasToken ? "Gerenciar conexão" : "Como conectar"}</button></div>
      </section>
      <div className="pilot-columns">
        <section className="pilot-panel pilot-routine" aria-labelledby="pilot-routine-title">
          <div className="pilot-section-top"><h2 id="pilot-routine-title">Sua rotina</h2><span className={`chip ${saved.enabled ? "good" : ""}`} role="status">{saved.enabled ? "Ativa" : "Pausada"}</span></div>
          <p className="pilot-schedule">{daySummary}, às {joinPt(summary.slots.map((slot) => hourLabel(slot.time)))}</p>
          <p className="pilot-routine-meta">{perDay === 1 ? "1 carrossel por dia" : `${perDay} carrosséis por dia`} <span aria-hidden="true">·</span> {summary.approval === "auto" ? "publica sem revisão" : "com revisão antes de publicar"}</p>
          <ul className="pilot-slot-summary" aria-label="Tipo de carrossel de cada horário">{summary.slots.map((slot) => <li key={slot.time}><b>{hourLabel(slot.time)}</b><span>{typeLabel(slot)}</span></li>)}</ul>
          <div className="pilot-routine-footer"><div className="pilot-account-note"><strong>{summary.accounts.length ? summary.accounts.map((id) => { const account = accounts.find((a) => a.id === id); return account ? `@${(account.username || "conta sem nome").replace(/^@/, "")}` : "Conta indisponível"; }).join(", ") : "Nenhuma conta selecionada"}</strong><span>{summary.accounts.length ? "Contas para publicação" : "Defina na configuração"}</span></div><button className="btn" onClick={() => setDialog("routine")}>Configurar rotina</button></div>
      <div className="pilot-routine-actions">
        <div className="row">
          <button className="btn" disabled={Boolean(pending) || (!saved.enabled && (!connected || !savedValid || !state.account?.connected))} onClick={toggleRoutine}>{saved.enabled ? <Pause size={15} /> : <Play size={15} />}{saved.enabled ? "Pausar rotina" : "Ativar rotina"}</button>
          <button className="btn" disabled={Boolean(pending) || !connected || !state.account?.connected || !savedValid || dirty || full || Boolean(state.working)} onClick={() => act("runAutopilot", saved.nextAt ? { at: saved.nextAt } : {}, "Preparação iniciada. Acompanhe o pedido abaixo.")}><CalendarClock size={15} />{pending === "runAutopilot" ? "Iniciando…" : "Gerar agora"}</button>
        </div>
        {dirty && <p className="hint" style={{ margin: 0 }}>Salve as alterações antes de gerar. Ativar ou pausar usa a rotina já salva e mantém o que você está editando.</p>}
        {!connected && <p className="hint" style={{ margin: 0 }}>Conecte o bot e vincule sua conversa para ativar ou gerar.</p>}
        {!state.account?.connected && <p className="hint" style={{ margin: 0 }}>Conecte sua conta ChatGPT no Carrossell para preparar os textos e os stories.</p>}
        {saved.enabled && saved.nextAt && <p className="hint" role="status" style={{ margin: 0 }}>Próxima preparação: {when(saved.nextAt)}.</p>}
        {full && connected && <p className="hint" style={{ margin: 0 }}>{openJobs === 1 ? "Há um carrossel" : `Há ${openJobs} carrosséis`} esperando você. Aprove ou descarte para a rotina preparar o próximo.</p>}

      </div>
      {saved.enabled && upcoming.length > 0 && <div className="pilot-upcoming" aria-labelledby="pilot-upcoming-title">
        <b id="pilot-upcoming-title">Próximos horários</b>
        <ul>{upcoming.map((run) => <li key={run.at} className={run.skipped ? "skipped" : ""}>
          <span>{runLabel(run.at)}{slotAt(run.time) && <small> · {typeName(slotAt(run.time))}</small>}{run.skipped && <em> · pulado</em>}</span>
          <button className="ghost-btn" disabled={Boolean(pending)} aria-label={`${run.skipped ? "Voltar a preparar" : "Pular"} ${runLabel(run.at)}`} onClick={() => act("skipAutopilotRun", { at: run.at, skip: !run.skipped }, run.skipped ? "Este horário volta a preparar um carrossel." : "Horário pulado. Os outros continuam.")}>{run.skipped ? "Voltar a preparar" : "Pular"}</button>
        </li>)}</ul>
      </div>}

        </section>
        <section className="pilot-panel pilot-review" aria-labelledby="pilot-review-title"><div className="pilot-section-top"><h2 id="pilot-review-title">Para revisar</h2>{activeJobs.length > 0 && <span className="chip">{activeJobs.length} pedido{activeJobs.length > 1 ? "s" : ""}</span>}</div>
          {activeJobs.length ? <div className="pilot-job-list">{renderJobs(activeJobs)}</div> : <div className="pilot-review-empty"><MessageCircle size={27} aria-hidden="true" /><div><strong>As próximas ideias chegam aqui.</strong><p>{connected ? "Peça um conteúdo pelo Telegram ou use sua rotina." : "Conecte o Telegram para pedir seu primeiro conteúdo."}</p></div></div>}
          <p className="pilot-approval-rule"><Check size={16} aria-hidden="true" />{summary.approval === "auto" ? "A rotina publica sem revisão. Pedidos pelo Telegram continuam esperando você." : "Você revisa antes de publicar, aqui ou no Telegram."}</p>
          {jobs.length > 0 && <button className="ghost-btn" onClick={() => setDialog("history")}>Ver últimos pedidos</button>}
        </section>
      </div>
      <section className="pilot-panel pilot-scheduled" aria-labelledby="pilot-scheduled-title">
        <div className="pilot-section-top"><h2 id="pilot-scheduled-title">Agendados</h2></div>
        <ScheduledPosts projects={state.projects} request={request} onNotice={onNotice} title="" empty="Nenhum post agendado. Quando você agendar uma prévia pelo Telegram ou pelo app, ela aparece aqui para trocar a data ou cancelar." />
        <p className="hint" style={{ margin: 0 }}>No Telegram, envie /agendados para ver, trocar a data ou cancelar.</p>
      </section>
      <section className="pilot-conversation" aria-labelledby="pilot-conversation-title"><h2 id="pilot-conversation-title">Peça pelo Telegram</h2><p>Uma mensagem é o ponto de partida. Experimente um pedido:</p><div className="pilot-examples"><blockquote>Crie um carrossel sobre [tema]. Me mostre o texto primeiro.</blockquote><blockquote>Como foram os últimos 7 dias no Instagram da minha marca?</blockquote></div><details className="pilot-commands"><summary>Ver exemplos e comandos</summary><div><p><code>/ajuda</code> O que você pode pedir · <code>/marcas</code> Escolher a marca · <code>/projetos</code> Escolher o projeto · <code>/status</code> Acompanhar · <code>/cancelar</code> Parar o pedido</p><p>Os stories ficam prontos para postagem manual. Claude e Gemini usam o modo separado de agentes e CLI. Publicar e agendar dependem da sua aprovação na prévia.</p></div></details></section>
      <footer className="pilot-requirement"><Monitor size={18} aria-hidden="true" /><span>Requer computador ligado e conta ChatGPT conectada. Você pode fechar a janela; escolher Sair encerra o piloto.</span></footer>
      {pending && <div className="row hint" role="status"><Spinner /> Aguarde…</div>}
      {error && !dialog && <p role="alert" className="pilot-error">{error}</p>}
      {dialog === "connection" && <Dialog title="Conexão do Telegram" onClose={closeDialog} className="pilot-dialog"><div className="pilot-dialog-body">
      <div className="sub" aria-label="Conexão do Telegram">
        <div className="sub-head">
          <b>Seu bot e sua conversa</b>
          <span className={`chip ${connected ? "good" : ""}`} role="status">{pilot.connectionError ? "Conexão precisa de atenção" : connected ? "Conectado" : pilot.hasToken ? "Bot conectado · falta vincular a conversa" : "Não conectado"}</span>
        </div>
        {pilot.connectionError && <p className="hint" role="alert" style={{ margin: 0, color: "var(--danger)", overflowWrap: "anywhere" }}>{pilot.connectionError}</p>}
        {showToken ? (
          <form style={{ display: "grid", gap: 10 }} onSubmit={async (event) => {
            event.preventDefault();
            if (!token.trim()) return;
            const result = await act("saveTelegramToken", { token: token.trim() });
            if (result) {
              setToken("");
              setEditingToken(false);
              onNotice?.("Bot conectado. Agora vincule sua conversa.");
            }
          }}>
            <p className="hint" style={{ margin: 0 }}>No Telegram, procure o @BotFather verificado, envie /newbot e siga as instruções. Cole abaixo o token que ele entregar.</p>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <label className="fld" style={{ flex: 1, minWidth: 180 }}>
                <span>Token do bot</span>
                <input type="password" autoComplete="off" spellCheck={false} autoCapitalize="none" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Cole o token do BotFather" aria-label="Token do bot do Telegram" disabled={Boolean(pending)} />
              </label>
              <button className="btn primary" disabled={!token.trim() || Boolean(pending)}>{pending === "saveTelegramToken" ? <><Spinner /> Conectando…</> : "Conectar bot"}</button>
              {editingToken && <button type="button" className="ghost-btn" disabled={Boolean(pending)} onClick={() => { setToken(""); setEditingToken(false); }}>Cancelar</button>}
            </div>
          </form>
        ) : (
          <div className="row">
            <span style={{ flex: 1 }}>{pilot.bot?.username ? `@${pilot.bot.username.replace(/^@/, "")}` : "Bot conectado"}</span>
            <button className="ghost-btn" disabled={Boolean(pending)} onClick={() => setEditingToken(true)}>Trocar bot</button>
            {disconnecting ? <>
              <button className="btn small danger" disabled={Boolean(pending)} onClick={async () => {
                if (await act("disconnectTelegram", {}, "Telegram desconectado. As rotinas foram pausadas.")) { setDisconnecting(false); setToken(""); }
              }}>{pending === "disconnectTelegram" ? "Desconectando…" : "Confirmar desconexão"}</button>
              <button className="ghost-btn" disabled={Boolean(pending)} onClick={() => setDisconnecting(false)}>Cancelar</button>
            </> : <button className="ghost-btn" disabled={Boolean(pending)} onClick={() => setDisconnecting(true)}>Desconectar</button>}
          </div>
        )}
        {pilot.hasToken && !showToken && <>
          {pilot.paired ? <p className="hint" style={{ margin: 0 }}>Sua conversa está vinculada. Os pedidos de aprovação chegam nela.</p> : <>
            <p className="hint" style={{ margin: 0 }}>Gere um código, abra seu bot e toque em Iniciar no Telegram para vincular sua conversa.</p>
            {pairing?.code && <div style={{ display: "grid", gap: 8 }}>
              <div className="row" role="status">
                <span>Código: <strong style={{ letterSpacing: "0.08em" }}>{pairing.code}</strong></span>
                <span className="hint">{expired ? "Expirou. Gere outro código." : when(pairing.expiresAt) ? `Válido até ${when(pairing.expiresAt)}` : "Use no Telegram"}</span>
              </div>
              {pairing.url && !expired && <div className="row">
                <button className="btn" disabled={Boolean(pending)} onClick={() => act("openTelegramPair")}><ExternalLink size={14} /> Abrir bot no Telegram</button>
                <span className="hint" style={{ overflowWrap: "anywhere", minWidth: 0 }}>{pairing.url}</span>
              </div>}
            </div>}
            <div><button className="btn small" disabled={Boolean(pending)} onClick={() => act("pairTelegram")}><RefreshCw size={14} /> {pending === "pairTelegram" ? "Gerando código…" : pairing?.code ? "Gerar novo código" : "Vincular minha conversa"}</button></div>
          </>}
        </>}
        {disconnecting && <p className="hint" style={{ margin: 0 }}>Desconectar pausa as rotinas de todos os perfis deste computador.</p>}
        <p className="hint" style={{ margin: 0 }}>O bot e a conversa valem para todos os perfis deste computador. A rotina abaixo vale só para este perfil.</p>
      </div>

        {error && <p role="alert" className="pilot-error">{error}</p>}
      </div></Dialog>}
      {dialog === "routine" && <Dialog title="Configurar rotina" onClose={closeDialog} className="pilot-dialog"><div className="pilot-dialog-body">
      <form className="sub" aria-label="Rotina deste perfil" onSubmit={saveRoutine}>
        <div className="sub-head"><b>Rotina deste perfil</b><span className="hint">Um carrossel em cada horário</span></div>
        <fieldset disabled={Boolean(pending)} style={{ display: "grid", gap: 12, padding: 0, margin: 0, border: 0, minWidth: 0 }}>
          <legend className="hint" style={{ marginBottom: 8 }}>Dias da semana</legend>
          <div className="row" role="group" aria-label="Dias da rotina">
            {DAYS.map(([day, label, short]) => <button type="button" className="pill" key={day} aria-label={label} aria-pressed={draft.days.includes(day)} onClick={() => change({ days: (draft.days.includes(day) ? draft.days.filter((value) => value !== day) : [...draft.days, day]).sort((a, b) => a - b) })}>{short}</button>)}
          </div>
          <div className="pilot-times" role="group" aria-label="Horários da rotina">
            <span className="hint">Horários neste computador · até {MAX_TIMES} por dia</span>
            {draft.slots.map((slot, index) => <div className="pilot-slot" key={index} role="group" aria-label={`Horário ${index + 1}`}>
              <label className="fld pilot-slot-time"><span>Horário</span><input type="time" required aria-label={`Horário ${index + 1} da rotina`} value={slot.time} onChange={(event) => changeSlot(index, { time: event.target.value })} /></label>
              <label className="fld pilot-slot-type"><span>Tipo de carrossel</span><select aria-label={`Tipo de carrossel do horário ${index + 1}`} value={slot.architectureId} onChange={(event) => changeSlot(index, { architectureId: event.target.value })}><option value="">Escolhido pela pauta</option>{architectures.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
              <label className="fld pilot-slot-style"><span>Estilo</span><select aria-label={`Estilo do horário ${index + 1}`} value={slot.style} onChange={(event) => changeSlot(index, { style: event.target.value })}>{STYLES.map((style) => <option key={style} value={style}>{STYLE_LABEL[style] || style}</option>)}</select></label>
              <label className="fld pilot-slot-cards"><span>Cards</span><input type="number" min="2" max="10" step="1" required aria-label={`Quantidade de cards do horário ${index + 1}, de 2 a 10`} value={slot.cardCount} onChange={(event) => changeSlot(index, { cardCount: event.target.value === "" ? "" : Number(event.target.value) })} /></label>
              {draft.slots.length > 1 && <button type="button" className="ghost-btn pilot-slot-remove" aria-label={`Remover horário ${index + 1}`} onClick={() => change({ slots: draft.slots.filter((_, i) => i !== index) })}><X size={14} /></button>}
            </div>)}
            {draft.slots.length < MAX_TIMES && <button type="button" className="ghost-btn" onClick={() => { const last = draft.slots.at(-1) || slotOf(); const [h, m] = (TIME.test(last.time) ? last.time : "09:00").split(":").map(Number); const next = `${String((h + 3) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`; change({ slots: [...draft.slots, { ...last, time: draft.slots.some((slot) => slot.time === next) ? "" : next }] }); }}><Plus size={14} /> Adicionar horário</button>}
            {duplicateTime && <p className="hint" style={{ margin: 0, color: "var(--danger)" }}>Há dois horários iguais. Troque ou remova um deles.</p>}
            <p className="hint" style={{ margin: 0 }}>Cada horário prepara um carrossel do tipo escolhido e manda a prévia no Telegram. Deixe pelo menos 1 hora entre os horários: cada carrossel leva alguns minutos para ficar pronto.</p>
          </div>
          <fieldset className="pilot-approval" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <legend><b>Antes de publicar</b></legend>
            <label className="toggle"><input type="radio" name="pilot-approval" checked={draft.approval === "review"} onChange={() => change({ approval: "review" })} /> Revisar antes, pelo Telegram ou pelo app</label>
            <label className="toggle"><input type="radio" name="pilot-approval" checked={draft.approval === "auto"} onChange={() => change({ approval: "auto" })} /> Publicar sem revisão</label>
            {draft.approval === "auto" && <p className="hint" role="note" style={{ margin: 0 }}>Cada carrossel da rotina vai para o Instagram assim que fica pronto, sem você ver antes. A prévia chega no Telegram como registro. Teste antes com "Gerar agora" no modo com revisão e confira o Contexto da Marca. Pedidos feitos pelo Telegram continuam esperando a sua aprovação.</p>}
          </fieldset>
          <div style={{ display: "grid", gap: 10 }} role="group" aria-label="Contas escolhidas para publicação">
            <b>Publicar nas contas que você marcar</b>
            {accounts.length ? accounts.map((account) => <label className="toggle" key={account.id}>
              <input type="checkbox" checked={draft.accounts.includes(account.id)} onChange={(event) => change({ accounts: (event.target.checked ? [...draft.accounts, account.id] : draft.accounts.filter((id) => id !== account.id)).sort() })} />
              @{(account.username || "conta sem nome").replace(/^@/, "")}
            </label>) : <p className="hint" style={{ margin: 0 }}>Conecte uma conta em Instagram para escolher onde publicar.</p>}
            {draft.accounts.some((id) => !accounts.some((account) => account.id === id)) && <p className="hint" style={{ margin: 0, color: "var(--danger)" }}>Uma conta escolhida não está mais conectada. <button type="button" className="link-btn" onClick={() => change({ accounts: draft.accounts.filter((id) => accounts.some((account) => account.id === id)) })}>Remover contas indisponíveis</button></p>}
          </div>
          <p className="hint" style={{ margin: 0 }}>Escolha ao menos um dia, um horário e de 2 a 10 cards. Marque uma conta antes de ativar ou gerar.</p>
          <div className="row">
            <button className="btn primary" disabled={!draftValid}>{pending === "saveAutopilot" ? "Salvando…" : "Salvar rotina"}</button>
            {dirty && <span className="hint" role="status">Há alterações para salvar.</span>}
          </div>
        </fieldset>
      </form>

        {error && <p role="alert" className="pilot-error">{error}</p>}
      </div></Dialog>}
      {dialog === "preview" && <Dialog title="Prévia do carrossel" onClose={closeDialog} className="pilot-dialog" wide><div className="pilot-dialog-body">
        <p className="hint">{previewProject?.title || "Projeto indisponível"} · A aprovação para publicar acontece pelo Telegram.</p>
        {previewProject?.slides?.some((slide) => slide.image) ? <div className="pilot-preview-images">{previewProject.slides.map((slide, index) => slide.image ? <figure key={slide.id || index}><img src={slide.image} alt={`Card ${index + 1} do carrossel`} /><figcaption>Card {index + 1}</figcaption></figure> : <p className="hint" key={slide.id || index}>Card {index + 1}: imagem ainda não disponível.</p>)}</div> : <p className="hint">{previewProject ? "As imagens deste projeto ainda não estão disponíveis." : "Este projeto não está mais disponível neste perfil."}</p>}
      </div></Dialog>}
      {dialog === "history" && <Dialog title="Últimos pedidos do piloto" onClose={closeDialog} className="pilot-dialog"><div className="pilot-dialog-body"><p className="hint">Até 8 pedidos mais recentes. As aprovações acontecem pelo Telegram.</p>{renderJobs(jobs)}{error && <p role="alert" className="pilot-error">{error}</p>}</div></Dialog>}
    </section>
  );
}
