import { useState } from "react";
import { Bell, ExternalLink } from "lucide-react";
import Dialog from "./Dialog.jsx";

// Avisos do Carrossell (arquivo público lido pelo app). Só texto; a ação abre um lugar do app
// ou um link https pelo processo principal.
const day = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

function NoticeAction({ notice, request, onGo, onDone }) {
  if (!notice.action) return null;
  const run = async () => {
    if (notice.action.url) await request("openNoticeLink", { id: notice.id }).catch(() => {});
    else { await request("readNotice", { id: notice.id }).catch(() => {}); onGo(notice.action.view); }
    onDone?.();
  };
  return <button className="btn small primary" onClick={run}>{notice.action.label}{notice.action.url && <ExternalLink size={13} />}</button>;
}

export function NoticeBell({ notices, request, onGo }) {
  const [open, setOpen] = useState(false);
  const items = notices?.items || [];
  if (!items.length) return null;
  const unread = notices.unread || 0;
  return <>
    <button className="cmd-btn notice-bell" aria-label={unread ? `Avisos do Carrossell, ${unread} não lido${unread > 1 ? "s" : ""}` : "Avisos do Carrossell"} onClick={() => setOpen(true)}>
      <Bell size={15} />{unread > 0 && <span className="notice-count" aria-hidden="true">{unread}</span>}
    </button>
    {open && <Dialog title="Avisos do Carrossell" onClose={() => setOpen(false)} className="notice-dialog"><div className="notice-list">
      {unread > 0 && <div className="row" style={{ justifyContent: "flex-end" }}><button className="ghost-btn" onClick={() => request("readAllNotices").catch(() => {})}>Marcar todos como lidos</button></div>}
      {items.map((n) => <article key={n.id} className={`notice-item ${n.read ? "" : "unread"}`}>
        <div className="row"><b style={{ flex: 1 }}>{n.title}</b><span className="hint">{day(n.date)}</span></div>
        <p>{n.body}</p>
        <div className="row">
          <NoticeAction notice={n} request={request} onGo={onGo} onDone={() => setOpen(false)} />
          {!n.read && <button className="ghost-btn" onClick={() => request("readNotice", { id: n.id }).catch(() => {})}>Marcar como lido</button>}
        </div>
      </article>)}
    </div></Dialog>}
  </>;
}

// Faixa no topo para o aviso importante mais novo ainda não lido.
export function NoticeBanner({ notices, request, onGo }) {
  const n = (notices?.items || []).find((item) => item.important && !item.read);
  if (!n) return null;
  return <div className="notice-banner" role="status">
    <Bell size={16} aria-hidden="true" />
    <div className="notice-banner-text"><b>{n.title}</b><span>{n.body}</span></div>
    <NoticeAction notice={n} request={request} onGo={onGo} />
    <button className="ghost-btn" onClick={() => request("readNotice", { id: n.id }).catch(() => {})}>Dispensar</button>
  </div>;
}
