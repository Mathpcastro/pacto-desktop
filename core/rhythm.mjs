// Volume → Sinal → Repetição (Aula 08 e Bônus de Replicação). Funções puras,
// usadas pela aba Ritmo e pelo lembrete do processo principal.
const DAY = 86400000;
export function weekStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7; // semana começa na segunda-feira
  d.setDate(d.getDate() - offset);
  return d;
}
// Peso maior para vendas: são o sinal que paga a conta. Comentários e salvamentos são as métricas do curso.
export const score = (r) =>
  (r?.comments || 0) + (r?.saves || 0) + (r?.sales || 0) * 10;
export function rhythm(projects = [], settings = {}, now = new Date()) {
  const start = weekStart(now).getTime(),
    time = now.getTime();
  const published = projects.filter((p) => p.publishedAt);
  const thisWeek = published.filter(
    (p) => new Date(p.publishedAt).getTime() >= start,
  );
  const pending = published
    .filter(
      (p) => !p.results && time - new Date(p.publishedAt).getTime() >= 2 * DAY,
    )
    .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  const measured = projects.filter((p) => p.results);
  const average = measured.length
    ? measured.reduce((sum, p) => sum + score(p.results), 0) / measured.length
    : 0;
  const winners = measured
    .map((p) => ({
      ...p,
      score: score(p.results),
      aboveAverage: measured.length >= 2 && score(p.results) > average,
    }))
    .sort((a, b) => b.score - a.score);
  return {
    goal: settings.weeklyGoal || 5,
    publishedThisWeek: thisWeek.length,
    pending,
    winners,
    average,
    measured: measured.length,
  };
}
// Um lembrete por dia, só quando há resultado pendente.
export function reminder(projects, settings = {}, now = new Date()) {
  const { pending } = rhythm(projects, settings, now);
  if (!pending.length) return null;
  if (
    settings.lastReminderAt &&
    now.getTime() - new Date(settings.lastReminderAt).getTime() < DAY
  )
    return null;
  return pending.length === 1
    ? `“${pending[0].title}” foi publicado há alguns dias. Registre comentários, salvamentos e vendas para saber se ele venceu.`
    : `${pending.length} carrosséis publicados esperam resultado. Registre os números para encontrar seus vencedores.`;
}
