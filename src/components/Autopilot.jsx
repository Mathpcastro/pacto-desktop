import { useEffect, useRef, useState } from "react";
import { Bot, CalendarClock, ExternalLink, Pause, Play, RefreshCw } from "lucide-react";
import { STYLES } from "../../core/templates.mjs";
import { Spinner } from "../ui.jsx";

const STYLE_LABEL = { ia: "Arte com IA", tweet: "Tweet", texto: "Texto em fundo claro", textopreto: "Texto em fundo preto", fototexto: "Texto + foto", fundo: "Foto de fundo", recorte: "Capa com sua foto" };
const DAYS = [[1, "Segunda", "Seg"], [2, "Terça", "Ter"], [3, "Quarta", "Qua"], [4, "Quinta", "Qui"], [5, "Sexta", "Sex"], [6, "Sábado", "Sáb"], [0, "Domingo", "Dom"]];
const JOB_LABEL = {
  queued: "Na fila", planning: "Escolhendo a pauta", writing: "Escrevendo", generating: "Criando o carrossel", rendering: "Preparando as imagens",
  notifying: "Enviando para o Telegram", ready: "Esperando sua aprovação no Telegram", approved: "Aprovado", publishing: "Publicando",
  sending: "Enviando prévia", scheduleDate: "Esperando data", scheduleConfirm: "Esperando confirmação", approvedSchedule: "Agendamento aprovado", scheduling: "Agendando", redo: "Refazendo", resend: "Reenviando prévia", scheduled: "Agendado",
  published: "Publicado", complete: "Concluído", error: "Precisa de atenção", failed: "Precisa de atenção", uncertain: "Confira o Instagram", discarded: "Descartado", cancelled: "Cancelado",
};
const RUNNING = new Set(["ready", "scheduleDate", "scheduleConfirm", "queued", "planning", "writing", "generating", "rendering", "notifying", "sending", "approved", "approvedSchedule", "publishing", "scheduling", "redo", "resend"]);
const DISCARDABLE = new Set(["ready", "error", "queued", "scheduleDate", "scheduleConfirm"]);
const when = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};
const editable = (config = {}) => ({
  time: config.time || "09:00",
  days: Array.isArray(config.days) ? [...config.days].sort((a, b) => a - b) : [1, 2, 3, 4, 5],
  style: config.style || "texto",
  cardCount: config.cardCount ?? 6,
  accounts: Array.isArray(config.accounts) ? [...config.accounts].sort() : [],
});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const valid = (config, accounts, requireAccounts = true) => /^([01]\d|2[0-3]):[0-5]\d$/.test(config.time)
  && config.days.length > 0 && config.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
  && STYLES.includes(config.style) && Number.isInteger(config.cardCount) && config.cardCount >= 2 && config.cardCount <= 10
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
  const [token, setToken] = useState("");
  const [editingToken, setEditingToken] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [pending, setPending] = useState("");
  const inFlight = useRef(false);
  const [error, setError] = useState("");
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
  const pairing = pilot.pairing;
  const expires = pairing?.expiresAt ? new Date(pairing.expiresAt).getTime() : NaN;
  const expired = Number.isFinite(expires) && expires <= now;
  const showToken = !pilot.hasToken || editingToken;
  const saveRoutine = async (event) => {
    event.preventDefault();
    if (!draftValid) return;
    const result = await act("saveAutopilot", { config: { ...draft, enabled: Boolean(saved.enabled) } }, "Rotina salva para este perfil.");
    if (result) {
      edited.current = false;
      setDraft(editable(result.autopilot?.config || { ...draft, enabled: saved.enabled }));
    }
  };
  const toggleRoutine = async () => {
    await act("saveAutopilot", { config: { ...editable(saved), enabled: !saved.enabled } }, saved.enabled ? "Rotina pausada. Seus ajustes foram mantidos." : "Rotina ativada.");
  };

  return (
    <section className="card-box" aria-label="Piloto automático">
      <div className="section-head">
        <Bot size={20} aria-hidden="true" />
        <h2>{heading}</h2>
        <span className="spacer" />
        <span className={`chip ${saved.enabled ? "good" : ""}`} role="status">{saved.enabled ? "Rotina ativa" : "Rotina pausada"}</span>
      </div>
      <p className="hint" style={{ margin: 0 }}>O Carrossell prepara um carrossel nos dias escolhidos e envia para você revisar no Telegram. Só publica depois da sua aprovação. Os stories ficam prontos para você postar manualmente.</p>

      <section className="sub telegram-guide" aria-label="Usar a conversa do Telegram">
        <h3>Converse com o Carrossell pelo Telegram</h3>
        <p>Depois de vincular sua conversa, envie um pedido em palavras. O Carrossell prepara o texto primeiro; você revisa e escolhe os próximos passos.</p>
        <div className="telegram-examples"><blockquote>Crie um carrossel com 6 cards sobre erros ao vender serviços. Me mostre o texto primeiro.</blockquote><blockquote>Como foram os últimos 7 dias no Instagram da minha marca?</blockquote></div>
        <p className="hint">Use <code>/ajuda</code> para ver o que está disponível, <code>/marcas</code> e <code>/projetos</code> para escolher o contexto, <code>/status</code> para acompanhar e <code>/cancelar</code> para parar o pedido da conversa.</p>
        <p className="hint">Os pedidos de conteúdo usam o ChatGPT conectado ao app, com o computador ligado e sem suspensão. Claude e Gemini usam o modo separado de agentes e CLI. Publicar e agendar continuam dependendo da sua aprovação na prévia.</p>
      </section>

      <div className="sub" aria-label="Conexão do Telegram">
        <div className="sub-head">
          <b>1. Conecte o Telegram</b>
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

      <form className="sub" aria-label="Rotina deste perfil" onSubmit={saveRoutine}>
        <div className="sub-head"><b>2. Escolha a rotina</b><span className="hint">Um carrossel por dia escolhido</span></div>
        <fieldset disabled={Boolean(pending)} style={{ display: "grid", gap: 12, padding: 0, margin: 0, border: 0, minWidth: 0 }}>
          <legend className="hint" style={{ marginBottom: 8 }}>Dias da semana</legend>
          <div className="row" role="group" aria-label="Dias da rotina">
            {DAYS.map(([day, label, short]) => <button type="button" className="pill" key={day} aria-label={label} aria-pressed={draft.days.includes(day)} onClick={() => change({ days: (draft.days.includes(day) ? draft.days.filter((value) => value !== day) : [...draft.days, day]).sort((a, b) => a - b) })}>{short}</button>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <label className="fld"><span>Horário neste computador</span><input type="time" required aria-label="Horário da rotina" value={draft.time} onChange={(event) => change({ time: event.target.value })} /></label>
            <label className="fld"><span>Estilo</span><select aria-label="Estilo do carrossel" value={draft.style} onChange={(event) => change({ style: event.target.value })}>{STYLES.map((style) => <option key={style} value={style}>{STYLE_LABEL[style] || style}</option>)}</select></label>
            <label className="fld"><span>Quantidade de cards</span><input type="number" min="2" max="10" step="1" required aria-label="Quantidade de cards, de 2 a 10" value={draft.cardCount} onChange={(event) => change({ cardCount: event.target.value === "" ? "" : Number(event.target.value) })} /></label>
          </div>
          <div style={{ display: "grid", gap: 10 }} role="group" aria-label="Contas escolhidas para publicação">
            <b>Publicar nas contas que você marcar</b>
            {accounts.length ? accounts.map((account) => <label className="toggle" key={account.id}>
              <input type="checkbox" checked={draft.accounts.includes(account.id)} onChange={(event) => change({ accounts: (event.target.checked ? [...draft.accounts, account.id] : draft.accounts.filter((id) => id !== account.id)).sort() })} />
              @{(account.username || "conta sem nome").replace(/^@/, "")}
            </label>) : <p className="hint" style={{ margin: 0 }}>Conecte uma conta em Instagram para escolher onde publicar.</p>}
            {draft.accounts.some((id) => !accounts.some((account) => account.id === id)) && <p className="hint" style={{ margin: 0, color: "var(--danger)" }}>Uma conta escolhida não está mais conectada. <button type="button" className="link-btn" onClick={() => change({ accounts: draft.accounts.filter((id) => accounts.some((account) => account.id === id)) })}>Remover contas indisponíveis</button></p>}
          </div>
          <p className="hint" style={{ margin: 0 }}>Escolha ao menos um dia e de 2 a 10 cards. Marque uma conta antes de ativar ou gerar.</p>
          <div className="row">
            <button className="btn primary" disabled={!draftValid}>{pending === "saveAutopilot" ? "Salvando…" : "Salvar rotina"}</button>
            {dirty && <span className="hint" role="status">Há alterações para salvar.</span>}
          </div>
        </fieldset>
      </form>

      <div className="sub">
        <div className="row">
          <button className="btn" disabled={Boolean(pending) || (!saved.enabled && (!connected || !savedValid || !state.account?.connected))} onClick={toggleRoutine}>{saved.enabled ? <Pause size={15} /> : <Play size={15} />}{saved.enabled ? "Pausar rotina" : "Ativar rotina"}</button>
          <button className="btn" disabled={Boolean(pending) || !connected || !state.account?.connected || !savedValid || dirty || running || Boolean(state.working)} onClick={() => act("runAutopilot", {}, "Preparação iniciada. Acompanhe o pedido abaixo.")}><CalendarClock size={15} />{pending === "runAutopilot" ? "Iniciando…" : "Gerar agora"}</button>
        </div>
        {dirty && <p className="hint" style={{ margin: 0 }}>Salve as alterações antes de gerar. Ativar ou pausar usa a rotina já salva e mantém o que você está editando.</p>}
        {!connected && <p className="hint" style={{ margin: 0 }}>Conecte o bot e vincule sua conversa para ativar ou gerar.</p>}
        {!state.account?.connected && <p className="hint" style={{ margin: 0 }}>Conecte sua conta ChatGPT no Carrossell para preparar os textos e os stories.</p>}
        {saved.enabled && saved.nextAt && <p className="hint" role="status" style={{ margin: 0 }}>Próxima preparação: {when(saved.nextAt)}.</p>}
        <p className="hint" style={{ margin: 0 }}>Mantenha o computador ligado, conectado à internet e sem suspensão. Você pode fechar a janela; escolher Sair encerra o piloto.</p>
      </div>

      <div className="sub" aria-label="Últimos pedidos do piloto">
        <div className="sub-head"><b>Últimos pedidos</b><span className="hint">Até 8 mais recentes</span></div>
        {!jobs.length && <p className="hint" style={{ margin: 0 }}>Os carrosséis preparados pelo piloto vão aparecer aqui.</p>}
        {jobs.map((job) => <div className="pending-item" key={job.id} style={{ paddingTop: 12 }}>
          <div className="row"><b style={{ flex: 1, minWidth: 150, overflowWrap: "anywhere" }}>{job.title || "Preparação de carrossel"}</b><span className={`chip ${job.status === "published" || job.status === "complete" ? "good" : ""}`} role="status">{JOB_LABEL[job.status] || "Em andamento"}</span></div>
          {job.createdAt && <span className="hint">{when(job.createdAt)}</span>}
          {job.error && <p className="hint" style={{ margin: 0, color: "var(--danger)", overflowWrap: "anywhere" }}>{job.error}</p>}
          {job.status === "ready" && <p className="hint" style={{ margin: 0 }}>Revise as imagens e aprove pelo Telegram para publicar.</p>}
          {job.status === "uncertain" && <p className="hint" style={{ margin: 0 }}>Confira no Instagram se o post saiu antes de qualquer nova tentativa. A publicação não será repetida automaticamente.</p>}
          {DISCARDABLE.has(job.status) && <div className="row">
            {job.status === "error" && <button className="btn small" disabled={Boolean(pending) || !connected || !state.account?.connected || running} onClick={() => act("retryAutopilot", { id: job.id }, "Pedido retomado.")}><RefreshCw size={14} /> Retomar</button>}
            <button className="ghost-btn" disabled={Boolean(pending)} aria-label={`Descartar pedido: ${job.title || "carrossel"}`} onClick={() => act("discardAutopilot", { id: job.id }, "Pedido descartado.")}>Descartar pedido</button>
          </div>}
        </div>)}
      </div>
      {pending && <div className="row hint" role="status"><Spinner /> Aguarde…</div>}
      {error && <p role="alert" style={{ margin: 0, color: "var(--danger)" }}>{error}</p>}
    </section>
  );
}
