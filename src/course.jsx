import { createContext, useContext } from "react";
import { ExternalLink, PlayCircle } from "lucide-react";
import Dialog from "./components/Dialog.jsx";

// Liga cada etapa do app ao trecho da aula que ensina aquilo (minuto estimado)
// e toca a aula dentro do próprio app.
export const CourseContext = createContext({ moments: [], play: null });

export const formatMoment = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const lessonNumber = (title) => title.match(/Aula\s*0?(\d+)/i)?.[1];

export function LessonLink({ step, compact = false }) {
  const { moments, play } = useContext(CourseContext);
  const moment = moments.find((m) => m.step === step);
  if (!moment || !play) return null;
  const lesson = lessonNumber(moment.lesson);
  return (
    <button
      type="button"
      className={`lesson-link ${compact ? "compact" : ""}`}
      title={`${moment.label}: ${moment.summary} O minuto é aproximado.`}
      onClick={() =>
        play({ lessonId: moment.lessonId, seconds: moment.seconds, step })
      }
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

// Player embutido no modo de privacidade do YouTube. O processo principal só
// permite este domínio no iframe e libera apenas a tela cheia.
export function LessonPlayer({
  video,
  course,
  moments,
  request,
  onSeek,
  onClose,
}) {
  const lesson = course.find((l) => l.id === video.lessonId);
  if (!lesson || !/^[\w-]{11}$/.test(lesson.id)) return null;
  const marks = moments.filter((m) => m.lessonId === lesson.id);
  const src = `https://www.youtube-nocookie.com/embed/${lesson.id}?start=${Math.max(0, Math.floor(video.seconds || 0))}&autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  return (
    <Dialog
      title={lesson.title.replace(/\s+/g, " ")}
      eyebrow={
        video.seconds
          ? `CURSO P.A.C.T.O. · A PARTIR DE ~${formatMoment(video.seconds)}`
          : "CURSO P.A.C.T.O."
      }
      onClose={onClose}
      wide
    >
      <div className="lesson-player">
        <div className="lesson-frame">
          <iframe
            key={src}
            src={src}
            title={`Aula: ${lesson.title}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        {marks.length > 0 && (
          <div className="lesson-marks">
            <span className="eyebrow">
              TRECHOS DESTA AULA · MINUTOS APROXIMADOS
            </span>
            {marks.map((m) => (
              <button
                key={m.step}
                className={video.step === m.step ? "active" : ""}
                onClick={() =>
                  onSeek({
                    lessonId: lesson.id,
                    seconds: m.seconds,
                    step: m.step,
                  })
                }
              >
                <span className="mono">~{formatMoment(m.seconds)}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="dialog-footer">
        <button
          className="button ghost"
          onClick={() =>
            request(
              "openCourse",
              video.step ? { step: video.step } : { id: lesson.id },
            ).catch(() => {})
          }
        >
          <ExternalLink size={14} /> Abrir no YouTube
        </button>
        <button className="button primary" onClick={onClose}>
          Voltar ao estúdio
        </button>
      </div>
    </Dialog>
  );
}
