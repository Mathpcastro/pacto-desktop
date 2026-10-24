import { useState } from "react";
import { ArrowRight, LoaderCircle, Sparkles } from "lucide-react";
import { LessonLink } from "../course.jsx";
import Dialog from "./Dialog.jsx";

export default function CreateProject({
  request,
  onClose,
  onCreated,
  architectures = [],
  goals = [],
  initial = null,
}) {
  // A pauta escolhida no Radar, Modelador ou Replicador já chega preenchida.
  const [title, setTitle] = useState(initial?.hook || initial?.theme || "");
  const [brief, setBrief] = useState(
    initial
      ? [
          initial.theme && `Tema: ${initial.theme}`,
          initial.hook && `Hook: ${initial.hook}`,
          initial.deliverable && `Entrega: ${initial.deliverable}`,
          initial.connection && `Conexão com a oferta: ${initial.connection}`,
          initial.reason && `Motivo: ${initial.reason}`,
        ]
          .filter(Boolean)
          .join("\n")
      : "",
  );
  const [architectureId, setArchitectureId] = useState(
    architectures.find((a) => a.name === initial?.architecture)?.id || "",
  );
  const [goal, setGoal] = useState("");
  const [cardCount, setCardCount] = useState(0);
  const [editorialLine, setEditorialLine] = useState("");
  const [visualConcept, setVisualConcept] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      title="Qual é a sua próxima ideia?"
      eyebrow="NOVO CARROSSEL"
      onClose={onClose}
      wide
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const project = await request("createProject", {
              title: title.trim(),
              brief: brief.trim(),
              architectureId,
              goal,
              editorialLine: editorialLine.trim(),
              visualConcept: visualConcept.trim(),
              cardCount,
            });
            onCreated(project.id);
          } catch {
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="dialog-fields">
          <label className="field">
            <span>Nome do carrossel</span>
            <input
              autoFocus
              required
              maxLength={160}
              placeholder="Um título para encontrar depois"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Sobre o que é? Tema ou referência</span>
            <textarea
              required
              rows={4}
              placeholder="Conte o assunto, o objetivo e o que não pode faltar. Pode colar a ideia de uma referência que funcionou."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />
          </label>
          {goals.length > 0 && (
            <div className="field">
              <span>Objetivo com este carrossel</span>
              <div className="goal-chips" role="radiogroup">
                {goals.map((item) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={goal === item}
                    key={item}
                    className={goal === item ? "selected" : ""}
                    onClick={() => setGoal(goal === item ? "" : item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="field">
            <span>Tamanho do carrossel</span>
            <div className="goal-chips" role="radiogroup">
              {[
                [0, "Automático"],
                [4, "4 cards"],
                [6, "6 cards"],
                [8, "8 cards"],
                [10, "10 cards"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={cardCount === value}
                  key={value}
                  className={cardCount === value ? "selected" : ""}
                  onClick={() => setCardCount(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="field-hint">
              Menos cards gastam menos do limite da sua conta ChatGPT.
            </p>
          </div>
          {architectures.length > 0 && (
            <div className="field">
              <span>
                Tipo de carrossel · as 5 arquiteturas do método{" "}
                <LessonLink step="architecture" compact />
              </span>
              <div className="architecture-grid" role="radiogroup">
                <button
                  type="button"
                  role="radio"
                  aria-checked={!architectureId}
                  className={!architectureId ? "selected" : ""}
                  onClick={() => setArchitectureId("")}
                >
                  <strong>
                    <Sparkles size={13} /> Deixar o Carrossell escolher
                  </strong>
                  <small>A arquitetura mais adequada para o seu tema.</small>
                </button>
                {architectures.map((a) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={architectureId === a.id}
                    key={a.id}
                    className={architectureId === a.id ? "selected" : ""}
                    onClick={() => setArchitectureId(a.id)}
                  >
                    <strong>{a.name}</strong>
                    <small>{a.useWhen}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="direction-pair">
            <label className="field">
              <span>
                Linha editorial <span className="muted">· opcional</span>
              </span>
              <input
                value={editorialLine}
                maxLength={600}
                placeholder="Vazio: o Carrossell sugere"
                onChange={(e) => setEditorialLine(e.target.value)}
              />
            </label>
            <label className="field">
              <span>
                Mascote, desenho ou efeito{" "}
                <span className="muted">· opcional</span>
              </span>
              <input
                value={visualConcept}
                maxLength={600}
                placeholder="Vazio: o Carrossell sugere pelo Design Kit"
                onChange={(e) => setVisualConcept(e.target.value)}
              />
            </label>
          </div>
          <p className="field-hint">
            Seu Contexto Oficial da Marca, seu Design Kit e o Prompt Mestre
            acompanham esta ideia. Primeiro vem o texto, que você edita e
            aprova; depois a capa; depois o restante. Sem tema? Use a aba
            Pautas.
          </p>
        </div>
        <div className="dialog-footer">
          <button type="button" className="button ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="button primary"
            type="submit"
            disabled={busy || !title.trim() || !brief.trim()}
          >
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <ArrowRight size={16} />
            )}
            {busy ? "Criando…" : "Abrir no estúdio"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
