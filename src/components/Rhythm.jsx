import { useState } from "react";
import { ArrowRight, Check, Minus, Plus, Trophy } from "lucide-react";
import { LessonLink } from "../course.jsx";
import { rhythm } from "../../core/rhythm.mjs";
import { ResultsDialog } from "./Flow.jsx";
import { IdeaCard } from "./Ideas.jsx";

export default function Rhythm({ state, request, onOpen, onIdeas, onCreate }) {
  const [measuring, setMeasuring] = useState(null);
  const data = rhythm(state.projects, state.settings);
  const goal = data.goal;
  const progress = Math.min(
    100,
    Math.round((data.publishedThisWeek / goal) * 100),
  );
  const replicated = (state.ideas || []).find((b) => b.source === "replicador");
  const radar = (state.ideas || []).find((b) => b.source === "radar");
  const next = replicated
    ? replicated.ideas.slice(0, 3)
    : (radar?.ideas || []).filter((i) => i.top).slice(0, 3);
  const setGoal = (value) =>
    request("saveSettings", {
      weeklyGoal: Math.max(1, Math.min(50, value)),
    }).catch(() => {});
  return (
    <main className="rhythm page-enter">
      <header className="library-heading">
        <div>
          <span className="eyebrow">VOLUME → SINAL → REPETIÇÃO</span>
          <h1>
            Publique, meça,
            <br />
            <em>repita o que vence.</em>
          </h1>
          <p>
            Não tente prever o vencedor. Produza rápido o suficiente para
            encontrá-lo.
          </p>
          <LessonLink step="replicator" />
        </div>
      </header>
      <section className="rhythm-goal">
        <div>
          <span className="eyebrow">META DA SEMANA</span>
          <h2>
            {data.publishedThisWeek} de {goal} carrosséis publicados
          </h2>
          <div
            className="goal-bar"
            role="progressbar"
            aria-valuenow={data.publishedThisWeek}
            aria-valuemax={goal}
          >
            <i style={{ width: `${progress}%` }} />
          </div>
          <p className="field-hint">
            Na fase de descoberta, o curso sugere testar de 3 a 4 por dia, se
            você tiver capacidade. Publique no maior volume que consiga manter.
          </p>
        </div>
        <div className="goal-stepper" aria-label="Ajustar meta semanal">
          <button aria-label="Diminuir meta" onClick={() => setGoal(goal - 1)}>
            <Minus size={14} />
          </button>
          <strong>{goal}</strong>
          <button aria-label="Aumentar meta" onClick={() => setGoal(goal + 1)}>
            <Plus size={14} />
          </button>
        </div>
      </section>
      <section className="rhythm-section">
        <header>
          <span className="eyebrow">AGUARDANDO RESULTADO</span>
          <h2>Já passou tempo suficiente para medir.</h2>
        </header>
        {data.pending.length ? (
          <ul className="pending-list">
            {data.pending.map((p) => (
              <li key={p.id}>
                {p.slides[0]?.image && <img src={p.slides[0].image} alt="" />}
                <div>
                  <button
                    className="project-title"
                    onClick={() => onOpen(p.id)}
                  >
                    {p.title}
                  </button>
                  <p className="field-hint">
                    Publicado em{" "}
                    {new Date(p.publishedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => setMeasuring(p)}
                >
                  Registrar resultado
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="field-hint">
            Nada pendente. Marque como publicado na tela final do carrossel e
            volte em 2 ou 3 dias para registrar comentários, salvamentos e
            vendas.
          </p>
        )}
      </section>
      <section className="rhythm-section">
        <header>
          <span className="eyebrow">
            <Trophy size={12} /> SEUS VENCEDORES
          </span>
          <h2>O acervo que fica mais valioso a cada post.</h2>
        </header>
        {data.winners.length ? (
          <table className="winners">
            <thead>
              <tr>
                <th>Carrossel</th>
                <th>Comentários</th>
                <th>Salvamentos</th>
                <th>Vendas</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.winners.map((p) => (
                <tr key={p.id} className={p.aboveAverage ? "above" : ""}>
                  <td>
                    <button
                      className="project-title"
                      onClick={() => onOpen(p.id)}
                    >
                      {p.title}
                    </button>
                    {p.aboveAverage && (
                      <span className="idea-badge">Acima da sua média</span>
                    )}
                  </td>
                  <td>{p.results.comments}</td>
                  <td>{p.results.saves}</td>
                  <td>{p.results.sales}</td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => setMeasuring(p)}
                    >
                      {p.aboveAverage ? "Replicar" : "Atualizar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="field-hint">
            Seus resultados aparecem aqui, ordenados por salvamentos,
            comentários e vendas. Com dois ou mais, o Carrossell mostra quais ficaram
            acima da sua média.
          </p>
        )}
      </section>
      <section className="rhythm-section">
        <header>
          <span className="eyebrow">PRÓXIMO PASSO</span>
          <h2>
            {replicated
              ? "Novas versões do seu vencedor."
              : "As próximas pautas para testar."}
          </h2>
        </header>
        {next.length ? (
          <div className="idea-grid">
            {next.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} onCreate={onCreate} />
            ))}
          </div>
        ) : (
          <button className="text-button" onClick={onIdeas}>
            Gerar pautas no Radar <ArrowRight size={14} />
          </button>
        )}
      </section>
      {measuring && (
        <ResultsDialog
          project={measuring}
          request={request}
          busy={false}
          onClose={() => setMeasuring(null)}
          onIdeas={() => {
            setMeasuring(null);
            onIdeas();
          }}
        />
      )}
      <p className="field-hint rhythm-foot">
        <Check size={12} /> Os números ficam salvos neste computador.
      </p>
    </main>
  );
}
