import { ArrowLeft, Download, Square } from "lucide-react";
import { Spinner } from "../ui.jsx";
import { StoriesPanel } from "./Studio.jsx";

// Reuse the same editing/rendering controls as the Studio. Stories need the
// carousel's text, while Instagram publishing retains its own approval flow.
export default function StoriesWorkspace({ project, state, request, pending, onBack, onOpen, onNotice }) {
  if (!project) return <section className="page"><h1 className="page-title">Conteúdo não encontrado</h1><button className="btn" onClick={onBack}>Voltar aos conteúdos</button></section>;
  const busy = pending.some((item) => ["stories", "saveStory", "storyTheme", "generateStoryArt"].includes(item.action)) || ["planning", "generating"].includes(project.status);
  const infer = (action, args = {}) => request(action, { id: project.id, ...args }).catch(() => {});
  return <section className="page stories-workspace">
    <div className="section-head"><button className="ghost-btn" onClick={onBack}><ArrowLeft size={16} />Conteúdos</button><span className="spacer" /><button className="btn" onClick={() => onOpen(project.id)}>Abrir carrossel no Estúdio</button></div>
    <div className="stories-workspace-intro"><span className="eyebrow">STORIES DE APOIO</span><h1 className="page-title">{project.title}</h1><p className="page-sub">Uma sequência a partir do texto do seu carrossel. Revise, baixe as imagens e poste manualmente no Instagram.</p></div>
    {busy && <div className="work-strip" role="status"><Spinner /><span>Preparando os stories…</span><button className="ghost-btn" onClick={() => request("cancelWork").catch(() => {})}><Square size={13} />Parar</button></div>}
    {!state.account?.connected && <p className="hint">Conecte o ChatGPT para gerar por aqui, ou use os agentes e a CLI para preparar os stories. Você pode revisar os que já existem.</p>}
    <div className="stories-workspace-content"><StoriesPanel project={project} connected={Boolean(state.account?.connected)} busy={busy} infer={infer} onNotice={onNotice} /></div>
    {project.stories?.some((story) => /^data:image\/(png|jpeg|webp);base64,/.test(story.image || "")) && <section className="section" aria-label="Baixar stories"><h2>Imagens para postar manualmente</h2><div className="row">{project.stories.map((story, index) => { const mime = /^data:image\/(png|jpeg|webp);base64,/.exec(story.image || "")?.[1]; return mime && <a key={story.id} className="btn" href={story.image} download={`story-${String(index + 1).padStart(2, "0")}.${mime === "jpeg" ? "jpg" : mime}`}><Download size={15} />Baixar story {index + 1}</a>; })}</div></section>}
  </section>;
}
