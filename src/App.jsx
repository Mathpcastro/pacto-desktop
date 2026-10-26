import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ExternalLink,
  FolderOpen,
  Laptop,
  LoaderCircle,
  LogOut,
  Moon,
  Palette,
  Radar,
  RefreshCw,
  Settings2,
  Sun,
  Trophy,
  X,
} from "lucide-react";
import { RuntimeErrorContext, usePacto } from "./usePacto.js";
import IconButton from "./components/IconButton.jsx";
import Dialog from "./components/Dialog.jsx";
import Profile from "./components/Profile.jsx";
import Onboarding from "./components/Onboarding.jsx";
import Library from "./components/Library.jsx";
import CreateProject from "./components/CreateProject.jsx";
import Editor from "./components/Editor.jsx";
import Ideas from "./components/Ideas.jsx";
import Rhythm from "./components/Rhythm.jsx";
import PreferencesDialog from "./components/PreferencesDialog.jsx";
import { CourseContext, LessonPlayer, formatMoment } from "./course.jsx";
import { rhythm } from "../core/rhythm.mjs";
import brandMark from "./assets/brand-mark.svg";

const DEFAULT_PREFERENCES = {
  theme: "light",
  palette: "carrossell",
  font: "system",
  scale: 100,
};

function readPreferences() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("carrossell-preferences") || "{}",
    ) || {};
    const legacyTheme = localStorage.getItem("pacto-theme");
    return {
      theme: ["light", "dark"].includes(saved.theme)
        ? saved.theme
        : legacyTheme === "dark"
          ? "dark"
          : DEFAULT_PREFERENCES.theme,
      palette: ["carrossell", "ocean", "forest", "violet"].includes(
        saved.palette,
      )
        ? saved.palette
        : DEFAULT_PREFERENCES.palette,
      font: ["system", "arial", "verdana", "georgia"].includes(saved.font)
        ? saved.font
        : DEFAULT_PREFERENCES.font,
      scale: [100, 105, 110, 115, 120, 125].includes(saved.scale)
        ? saved.scale
        : DEFAULT_PREFERENCES.scale,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export default function App() {
  const runtime = usePacto();
  const {
    state,
    request,
    loading,
    error,
    clearError,
    activity,
    update,
    available,
    pending,
    isPending,
    bootstrapFailed,
  } = runtime;
  const [preferences, setPreferences] = useState(readPreferences);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const theme = preferences.theme;
  const [view, setView] = useState("library");
  const [projectId, setProjectId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [courseOpen, setCourseOpen] = useState(false);
  const [video, setVideo] = useState(null);
  const [manual, setManual] = useState(false);
  const [notice, setNotice] = useState("");
  const navigationGuard = useRef(null);
  const navigate = (proceed) =>
    navigationGuard.current ? navigationGuard.current(proceed) : proceed();
  const project = state.projects.find((p) => p.id === projectId);
  const connected = Boolean(state.account?.connected);
  const hasProfile = Boolean(state.profile);
  const pendingResults = rhythm(state.projects, state.settings).pending.length;
  useEffect(() => {
    const go = (event) =>
      navigate(() => {
        setView(event.detail);
        setProjectId(null);
      });
    window.addEventListener("pacto:navigate", go);
    return () => window.removeEventListener("pacto:navigate", go);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [view, hasProfile, projectId]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.palette = preferences.palette;
    if (preferences.font === "system")
      delete document.documentElement.dataset.uiFont;
    else document.documentElement.dataset.uiFont = preferences.font;
    document.documentElement.style.setProperty(
      "--app-zoom",
      String(preferences.scale / 100),
    );
    try {
      localStorage.setItem("pacto-theme", theme);
      localStorage.setItem(
        "carrossell-preferences",
        JSON.stringify(preferences),
      );
    } catch {}
  }, [preferences, theme]);
  useEffect(() => {
    if (!notice) return undefined;
    const timeout = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    const closeMenus = (event) =>
      document
        .querySelectorAll(
          "details.account-menu[open], details.action-menu[open]",
        )
        .forEach((menu) => {
          if (
            event.type === "keydown"
              ? event.key === "Escape"
              : !menu.contains(event.target)
          )
            menu.open = false;
        });
    document.addEventListener("click", closeMenus);
    document.addEventListener("keydown", closeMenus);
    return () => {
      document.removeEventListener("click", closeMenus);
      document.removeEventListener("keydown", closeMenus);
    };
  }, []);
  useEffect(() => {
    const onKey = (event) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "n" &&
        state.profile &&
        available &&
        !document.querySelector("dialog[open]")
      ) {
        event.preventDefault();
        setCreating(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.profile, available]);
  const openProject = (id) => {
    setProjectId(id);
    setView("editor");
  };
  const updatePreferences = (patch) =>
    setPreferences((current) => ({ ...current, ...patch }));
  const accountAction = () =>
    request(connected ? "disconnect" : "connect").catch(() => {});
  return (
    <RuntimeErrorContext.Provider value={error}>
      <CourseContext.Provider
        value={{
          moments: state.courseMoments || [],
          play: available ? setVideo : null,
        }}
      >
        <div className={`app ${view === "editor" && project ? "editing" : ""}`}>
          <header className="app-header">
            <button
              className="wordmark"
              aria-label="Carrossell, início"
              onClick={() =>
                navigate(() => {
                  setView("library");
                  setProjectId(null);
                })
              }
            >
              <b className="brand-name">carrossell</b>
              <img className="brand-symbol" src={brandMark} alt="" />
              <small>ESTÚDIO DE CARROSSÉIS</small>
            </button>
            {state.profile && available && (
              <nav className="main-nav" aria-label="Navegação principal">
                <button
                  className={
                    !["profile", "ideas", "rhythm"].includes(view)
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    navigate(() => {
                      setView("library");
                      setProjectId(null);
                    })
                  }
                >
                  <FolderOpen size={15} /> Biblioteca
                </button>
                <button
                  className={view === "ideas" ? "active" : ""}
                  onClick={() =>
                    navigate(() => {
                      setView("ideas");
                      setProjectId(null);
                    })
                  }
                >
                  <Radar size={15} /> Pautas
                </button>
                <button
                  className={view === "rhythm" ? "active" : ""}
                  onClick={() =>
                    navigate(() => {
                      setView("rhythm");
                      setProjectId(null);
                    })
                  }
                >
                  <Trophy size={15} /> Ritmo
                  {pendingResults > 0 && (
                    <span className="nav-badge">{pendingResults}</span>
                  )}
                </button>
                <button
                  className={view === "profile" ? "active" : ""}
                  onClick={() => navigate(() => setView("profile"))}
                >
                  <Palette size={15} /> Minha identidade
                </button>
              </nav>
            )}
            <div className="header-tools">
              <button
                className="course-link"
                disabled={!available || !state.course.length}
                onClick={() => setCourseOpen(true)}
              >
                <BookOpen size={16} />
                <span>O método</span>
                <span className="optional">OPCIONAL</span>
              </button>
              <span className="header-separator" />
              <IconButton
                label={
                  theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"
                }
                onClick={() =>
                  updatePreferences({
                    theme: theme === "light" ? "dark" : "light",
                  })
                }
              >
                {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
              </IconButton>
              <IconButton
                label="Preferências de aparência e leitura"
                onClick={() => setPreferencesOpen(true)}
              >
                <Settings2 size={17} />
              </IconButton>
              {available && (
                <details className="account-menu">
                  <summary
                    aria-label={
                      connected
                        ? `Conta conectada: ${state.account.label || "ChatGPT"}`
                        : "Opções de conexão"
                    }
                  >
                    <span
                      className={`status-dot ${connected ? "connected" : ""}`}
                    />
                    <span>
                      {connected ? "Conta conectada" : "Conectar conta"}
                    </span>
                  </summary>
                  <div>
                    <span className="eyebrow">CONTA CHATGPT</span>
                    <p>
                      {connected
                        ? state.account.label || "Conta conectada"
                        : "Use sua conta para criar com o Codex."}
                    </p>
                    <button
                      className="button secondary full"
                      disabled={isPending("connect") || isPending("disconnect")}
                      onClick={accountAction}
                    >
                      {isPending("connect") ? (
                        <LoaderCircle size={15} className="spin" />
                      ) : connected ? (
                        <LogOut size={15} />
                      ) : (
                        <ArrowRight size={15} />
                      )}
                      {isPending("connect")
                        ? "Conectando…"
                        : connected
                          ? "Desconectar"
                          : "Conectar minha conta"}
                    </button>
                  </div>
                </details>
              )}
            </div>
          </header>
          {error && (
            <div className="error-banner" role="alert">
              <AlertCircle size={17} />
              <span>{error}</span>
              <IconButton label="Fechar mensagem de erro" onClick={clearError}>
                <X size={15} />
              </IconButton>
            </div>
          )}
          {update?.status === "ready" && (
            <div className="update-banner" role="status">
              <RefreshCw size={16} />
              <span>
                A versão {update.version} do Carrossell está pronta. Ela entra
                quando você fechar o app.
              </span>
              <button
                className="button secondary"
                onClick={() => request("installUpdate").catch(() => {})}
              >
                Reiniciar e atualizar
              </button>
            </div>
          )}
          {!available ? (
            <main className="desktop-only page-enter">
              <div className="desktop-symbol">
                <Laptop size={42} strokeWidth={1} />
                <span className="tiny-wordmark"><img src={brandMark} alt="" width="14" height="14" /></span>
              </div>
              <span className="eyebrow">FEITO PARA O SEU COMPUTADOR</span>
              <h1>
                Seu estúdio.
                <br />
                <em>No seu ritmo.</em>
              </h1>
              <p>
                Abra o Carrossell pelo aplicativo para computador para configurar sua
                marca, conectar sua conta e criar seus carrosséis.
              </p>
              <div className="desktop-note">
                <ArrowDownToLine size={18} />
                <span>
                  Esta janela não tem acesso aos recursos do aplicativo.
                  <br />
                  Use o atalho Carrossell instalado no seu computador.
                </span>
              </div>
            </main>
          ) : loading ? (
            <main className="loading-screen" role="status">
              <LoaderCircle className="spin" size={25} />
              <p>Abrindo seu estúdio…</p>
            </main>
          ) : bootstrapFailed ? (
            <main className="loading-screen">
              <AlertCircle size={28} />
              <h2>Não foi possível abrir o estúdio.</h2>
              <button
                className="button secondary"
                onClick={() => request("bootstrap").catch(() => {})}
              >
                Tentar novamente
              </button>
            </main>
          ) : !state.profile || view === "profile" ? (
            <>
              <div className="profile-page-top">
                {state.profile && (
                  <button
                    className="text-button"
                    onClick={() => setView("library")}
                  >
                    <ArrowLeft size={14} /> Voltar à biblioteca
                  </button>
                )}
                <span className="eyebrow">
                  {state.profile ? "MINHA IDENTIDADE" : "BEM-VINDO AO CARROSSELL"}
                </span>
              </div>
              {manual ? (
                <Profile
                  profile={state.profile}
                  account={state.account}
                  request={request}
                  busy={isPending("connect")}
                  onDone={() => {
                    setManual(false);
                    setView("library");
                    if (state.profile)
                      setNotice("Sua identidade foi atualizada.");
                  }}
                  onCancel={() => setManual(false)}
                />
              ) : (
                <Onboarding
                  state={state}
                  request={request}
                  isPending={isPending}
                  onManual={() => setManual(true)}
                  onDone={() => {
                    setView("library");
                    if (state.profile)
                      setNotice("Sua identidade foi atualizada.");
                  }}
                  onCancel={
                    state.profile ? () => setView("library") : undefined
                  }
                />
              )}
            </>
          ) : view === "editor" && project ? (
            <Editor
              onNavigationGuard={(guard) => {
                navigationGuard.current = guard;
              }}
              key={project.id}
              project={project}
              request={request}
              account={state.account}
              activity={activity}
              pending={pending}
              onBack={() => {
                setView("library");
                setProjectId(null);
              }}
              onOpen={openProject}
              onNotice={setNotice}
              onIdeas={() => {
                setView("ideas");
                setProjectId(null);
              }}
              visualFixes={state.visualFixes || []}
              settings={state.settings}
            />
          ) : view === "rhythm" ? (
            <Rhythm
              state={state}
              request={request}
              onOpen={openProject}
              onIdeas={() => setView("ideas")}
              onCreate={(idea) => setCreating(idea)}
            />
          ) : view === "ideas" ? (
            <Ideas
              state={state}
              request={request}
              isPending={isPending}
              onCreate={(idea) => setCreating(idea)}
            />
          ) : (
            <Library
              ideas={state.ideas}
              working={state.working}
              connected={connected}
              onIdea={(idea) => setCreating(idea)}
              projects={state.projects}
              request={request}
              onOpen={openProject}
              onCreate={() => setCreating(true)}
              pending={pending.length > 0}
            />
          )}
          {available && !loading && view !== "editor" && (
            <footer className="app-footer">
              <span>
                Carrossell <span className="footer-dot">·</span> Uma boa ideia merece
                uma boa sequência.
              </span>
              <span>
                <span className="local-dot" /> Projetos salvos neste dispositivo
              </span>
            </footer>
          )}
          {creating && (
            <CreateProject
              request={request}
              initial={creating === true ? null : creating}
              architectures={state.architectures || []}
              goals={state.goals || []}
              onClose={() => setCreating(false)}
              onCreated={(id) => {
                setCreating(false);
                openProject(id);
              }}
            />
          )}
          {courseOpen && (
            <Dialog
              title="O método, no seu tempo."
              eyebrow="CURSO P.A.C.T.O."
              onClose={() => setCourseOpen(false)}
              wide
            >
              <p className="course-intro">
                Você pode criar direto no estúdio. Se quiser aprofundar seu
                processo, as aulas estão aqui.
              </p>
              <div className="course-list">
                {state.course.map((lesson, index) => (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      setCourseOpen(false);
                      setVideo({ lessonId: lesson.id, seconds: 0 });
                    }}
                  >
                    <span className="mono">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{lesson.title}</span>
                    <ExternalLink size={16} />
                  </button>
                ))}
              </div>
              {state.courseMoments?.length > 0 && (
                <div className="course-moments">
                  <span className="eyebrow">
                    CADA ETAPA DO APP NA AULA CERTA
                  </span>
                  {state.courseMoments.map((m) => (
                    <button
                      key={m.step}
                      onClick={() => {
                        setCourseOpen(false);
                        setVideo({
                          lessonId: m.lessonId,
                          seconds: m.seconds,
                          step: m.step,
                        });
                      }}
                    >
                      <span>{m.label}</span>
                      <small>
                        {m.lesson.replace(/\s+/g, " ").slice(0, 32)} · ~
                        {formatMoment(m.seconds)}
                      </small>
                    </button>
                  ))}
                  <p className="field-hint">
                    Minutos aproximados: as transcrições não têm marcação de
                    tempo.
                  </p>
                </div>
              )}
              <footer className="course-footer">
                <BookOpen size={14} />
                <span>
                  {state.knowledge?.transcribed || 0} de{" "}
                  {state.knowledge?.lessons || state.course.length} aulas
                  transcritas na base do assistente
                </span>
              </footer>
            </Dialog>
          )}
          {preferencesOpen && (
            <PreferencesDialog
              preferences={preferences}
              onChange={updatePreferences}
              onReset={() => setPreferences({ ...DEFAULT_PREFERENCES })}
              onClose={() => setPreferencesOpen(false)}
            />
          )}
          {notice && (
            <div className="toast" role="status">
              <Check size={17} />
              <span>{notice}</span>
              <IconButton label="Fechar aviso" onClick={() => setNotice("")}>
                <X size={15} />
              </IconButton>
            </div>
          )}
          {video && (
            <LessonPlayer
              video={video}
              course={state.course}
              moments={state.courseMoments || []}
              request={request}
              onSeek={setVideo}
              onClose={() => setVideo(null)}
            />
          )}
        </div>
      </CourseContext.Provider>
    </RuntimeErrorContext.Provider>
  );
}
