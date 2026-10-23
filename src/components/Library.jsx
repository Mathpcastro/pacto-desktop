import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Copy,
  FileText,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Dialog from "./Dialog.jsx";
import { IdeaCard } from "./Ideas.jsx";

const statusLabels = {
  draft: "Rascunho",
  planning: "Planejando",
  ready: "Plano pronto",
  generating: "Gerando imagens",
  complete: "Concluído",
  error: "Precisa de atenção",
};
export { statusLabels };

export function PaperStack({ small = false }) {
  return (
    <div className={`paper-stack ${small ? "small" : ""}`} aria-hidden="true">
      <i />
      <i />
      <i>
        <span />
        <span />
        <span />
        <b>p.</b>
      </i>
    </div>
  );
}

export default function Library({
  projects,
  request,
  onOpen,
  pending,
  onCreate,
  ideas = [],
  working,
  connected,
  onIdea,
}) {
  const radar = ideas.find((b) => b.source === "radar");
  const opportunities = (radar?.ideas || []).filter((i) => i.top);
  const radarRunning = working === "radar";
  const generate = () => request("radar", {}).catch(() => {});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleteProject, setDeleteProject] = useState(null);
  const items = useMemo(
    () =>
      projects
        .filter(
          (p) =>
            (filter === "all" ||
              (filter === "complete"
                ? p.status === "complete"
                : p.status !== "complete")) &&
            `${p.title} ${p.brief}`
              .toLocaleLowerCase("pt-BR")
              .includes(search.toLocaleLowerCase("pt-BR")),
        )
        .sort((a, b) =>
          String(b.updatedAt || b.createdAt).localeCompare(
            String(a.updatedAt || a.createdAt),
          ),
        ),
    [projects, search, filter],
  );
  const duplicate = async (project) => {
    try {
      const result = await request("duplicate", { id: project.id });
      if (result?.id) onOpen(result.id);
    } catch {}
  };
  return (
    <main className="library page-enter">
      <div className="library-heading">
        <div>
          <span className="eyebrow">BIBLIOTECA / SEUS CARROSSÉIS</span>
          <h1>
            Uma ideia.
            <br />
            <em>Uma sequência.</em>
          </h1>
          <p>Seu próximo carrossel começa aqui.</p>
        </div>
        <button className="button primary" onClick={onCreate}>
          <Plus size={17} /> Novo carrossel
        </button>
      </div>
      {projects.length > 0 && opportunities.length > 0 && (
        <section className="opportunity-strip">
          <header>
            <span className="eyebrow">PRÓXIMAS OPORTUNIDADES · RADAR</span>
          </header>
          <div className="idea-grid">
            {opportunities.slice(0, 3).map((idea) => (
              <IdeaCard key={idea.id} idea={idea} onCreate={onIdea} />
            ))}
          </div>
        </section>
      )}
      <div className="library-toolbar">
        <div className="tabs" role="tablist" aria-label="Filtrar carrosséis">
          {[
            ["all", "Todos"],
            ["draft", "Em criação"],
            ["complete", "Concluídos"],
          ].map(([value, label]) => (
            <button
              role="tab"
              key={value}
              aria-selected={filter === value}
              className={filter === value ? "selected" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
              {value === "all" && <span>{projects.length}</span>}
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Buscar carrosséis"
            placeholder="Buscar carrossel"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {items.length ? (
        <div className="project-grid">
          {items.map((project) => {
            const cover = project.slides?.find((slide) => slide.image)?.image;
            return (
              <article className="project-card" key={project.id}>
                <button
                  className="project-cover"
                  aria-label={`Abrir ${project.title}`}
                  onClick={() => onOpen(project.id)}
                >
                  {cover ? (
                    <img src={cover} alt={`Capa de ${project.title}`} />
                  ) : (
                    <div className="draft-cover">
                      <FileText size={28} strokeWidth={1} />
                      <span>
                        {project.slides?.length
                          ? `${project.slides.length} slides no plano`
                          : "Ideia em construção"}
                      </span>
                    </div>
                  )}
                  <span className={`project-status status-${project.status}`}>
                    {["planning", "generating"].includes(project.status) && (
                      <LoaderCircle size={12} className="spin" />
                    )}
                    {statusLabels[project.status] || project.status}
                  </span>
                  <span className="cover-open">
                    <ArrowUpRight size={18} />
                  </span>
                </button>
                <div className="project-meta">
                  <div>
                    <button
                      className="project-title"
                      onClick={() => onOpen(project.id)}
                    >
                      {project.title}
                    </button>
                    <p>
                      {project.updatedAt || project.createdAt
                        ? new Intl.DateTimeFormat("pt-BR", {
                            day: "numeric",
                            month: "short",
                          }).format(
                            new Date(project.updatedAt || project.createdAt),
                          )
                        : "Salvo neste dispositivo"}{" "}
                      <span>·</span> {project.slides?.length || 0} slides
                    </p>
                  </div>
                  <details className="action-menu">
                    <summary aria-label={`Ações para ${project.title}`}>
                      <MoreHorizontal size={20} />
                    </summary>
                    <div>
                      <button
                        onClick={() => duplicate(project)}
                        disabled={pending}
                      >
                        <Copy size={15} /> Duplicar
                      </button>
                      <button
                        className="danger-text"
                        onClick={() => setDeleteProject(project)}
                      >
                        <Trash2 size={15} /> Excluir
                      </button>
                    </div>
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      ) : !search && filter === "all" ? (
        <section className="opportunities">
          <header>
            <span className="eyebrow">SUAS OPORTUNIDADES DE CONTEÚDO</span>
            <h2>
              {opportunities.length
                ? "Comece por uma destas pautas."
                : radarRunning
                  ? "Procurando pautas para o seu negócio…"
                  : "Vamos encontrar suas primeiras pautas."}
            </h2>
            <p>
              {opportunities.length
                ? "O Radar leu o seu Contexto Oficial da Marca e marcou as 10 ideias mais fortes para testar primeiro."
                : "O Radar usa o seu Contexto Oficial da Marca para sugerir 30 pautas e marcar as 10 mais fortes."}
            </p>
          </header>
          {opportunities.length ? (
            <div className="idea-grid">
              {opportunities.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} onCreate={onIdea} />
              ))}
            </div>
          ) : radarRunning ? (
            <div className="assistant-working" role="status">
              <LoaderCircle size={14} className="spin" />
              <span>Isso leva um ou dois minutos.</span>
            </div>
          ) : (
            <button
              className="button primary"
              disabled={!connected}
              onClick={generate}
            >
              <Search size={16} /> Gerar minhas oportunidades
            </button>
          )}
          <button className="text-button" onClick={onCreate}>
            <Plus size={14} /> Ou crie um carrossel com o seu próprio tema
          </button>
        </section>
      ) : (
        <section className="empty-library">
          <PaperStack />
          <h2>
            {search
              ? "Nenhum carrossel encontrado."
              : filter !== "all"
                ? "Nada por aqui, por enquanto."
                : "Dê forma à sua primeira ideia."}
          </h2>
          <p>
            {search
              ? "Tente buscar por outro título ou assunto."
              : filter !== "all"
                ? "Seus carrosséis aparecerão aqui quando estiverem nesta etapa."
                : "Escolha um assunto. O método ajuda a transformar o que você sabe em uma sequência que faz sentido."}
          </p>
          {!search && filter === "all" && (
            <button className="button secondary" onClick={onCreate}>
              <Plus size={16} /> Criar meu primeiro carrossel
            </button>
          )}
          <span className="empty-footnote">
            PAUTA → ARQUITETURA → COPY → TRATAMENTO VISUAL → OFERTA
          </span>
        </section>
      )}
      {deleteProject && (
        <Dialog
          title="Excluir este carrossel?"
          eyebrow="BIBLIOTECA"
          onClose={() => setDeleteProject(null)}
        >
          <p className="dialog-copy">
            “{deleteProject.title}” será removido da biblioteca deste
            dispositivo.
          </p>
          <div className="dialog-footer">
            <button
              className="button ghost"
              onClick={() => setDeleteProject(null)}
            >
              Manter carrossel
            </button>
            <button
              className="button danger"
              disabled={pending}
              onClick={async () => {
                try {
                  await request("delete", { id: deleteProject.id });
                  setDeleteProject(null);
                } catch {}
              }}
            >
              Excluir carrossel
            </button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
