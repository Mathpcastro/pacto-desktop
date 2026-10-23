import { createContext, useContext } from "react";
import { PlayCircle } from "lucide-react";

// Liga cada etapa do app ao trecho da aula que ensina aquilo (minuto estimado).
export const CourseContext = createContext({ moments: [], request: null });

export const formatMoment = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function LessonLink({ step, compact = false }) {
  const { moments, request } = useContext(CourseContext);
  const moment = moments.find((m) => m.step === step);
  if (!moment || !request) return null;
  const lesson = moment.lesson.match(/Aula\s*0?(\d+)/i)?.[1];
  return (
    <button
      type="button"
      className={`lesson-link ${compact ? "compact" : ""}`}
      title={`${moment.label}: ${moment.summary} O minuto é aproximado.`}
      onClick={() => request("openCourse", { step }).catch(() => {})}
    >
      <PlayCircle size={13} />
      <span>
        {compact ? "Aula" : "Ver na aula"}{" "}
        {lesson ? `${lesson.padStart(2, "0")}` : ""} · ~
        {formatMoment(moment.seconds)}
        {!compact && <small> (aprox.)</small>}
      </span>
    </button>
  );
}
