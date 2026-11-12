import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Check, Compass, Home as HomeIcon, Laptop, Layers, LayoutTemplate, LogOut, Palette, Radar, RefreshCw, Search, X } from "lucide-react";
import { RuntimeErrorContext, usePacto } from "./usePacto.js";
import Dialog from "./components/Dialog.jsx";
import Profile from "./components/Profile.jsx";
import Onboarding from "./components/Onboarding.jsx";
import Home from "./components/Home.jsx";
import Brand from "./components/Brand.jsx";
import Studio from "./components/Studio.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import ProfileSwitcher from "./components/ProfileSwitcher.jsx";
import { InstagramButton, InstagramModal } from "./components/Instagram.jsx";
import { AgentModal } from "./components/AgentSetup.jsx";
import { NoticeBell, NoticeBanner } from "./components/Notices.jsx";
import Capabilities from "./components/Capabilities.jsx";
import Autopilot from "./components/Autopilot.jsx";
import RadarNavigation from "./components/RadarNavigation.jsx";
import StoriesWorkspace from "./components/StoriesWorkspace.jsx";
import { CourseContext, LessonPlayer, formatMoment } from "./course.jsx";
import { rhythm } from "../core/rhythm.mjs";
import { Spinner, usePopover } from "./ui.jsx";
import { setLocale, useDomLocale } from "./i18n.js";
import brandMark from "./assets/brand-mark.svg";

const DEFAULT_PREFERENCES = { theme: "light", palette: "carrossell", scale: 100, language: "pt-BR" };
const PALETTES = [
  ["carrossell", "Carrossell", "#ff5a36"],
  ["ocean", "Oceano", "#28769c"],
  ["forest", "Floresta", "#4a7e53"],
  ["violet", "Ametista", "#7659a6"],
];

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem("carrossell-preferences") || "{}") || {};
    const legacyTheme = localStorage.getItem("pacto-theme");
    return {
      theme: ["light", "dark"].includes(saved.theme) ? saved.theme : legacyTheme === "dark" ? "dark" : DEFAULT_PREFERENCES.theme,
      palette: PALETTES.some(([id]) => id === saved.palette) ? saved.palette : DEFAULT_PREFERENCES.palette,
      scale: [100, 105, 110, 115, 120, 125].includes(saved.scale) ? saved.scale : DEFAULT_PREFERENCES.scale,
      language: saved.language === "es" ? "es" : "pt-BR",
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export default function App() {
  const runtime = usePacto();
  const { state, request, loading, error, clearError, activity, update, available, pending, isPending, bootstrapFailed } = runtime;
  const [preferences, setPreferences] = useState(readPreferences);
  const [view, setView] = useState("home");
  const [projectId, setProjectId] = useState(null);
  const [setup, setSetup] = useState(null);
  const [palette, setPalette] = useState(false);
  const [projectCommands, setProjectCommands] = useState([]);
  const [courseOpen, setCourseOpen] = useState(false);
  const [video, setVideo] = useState(null);
  const [notice, setNotice] = useState("");
  const [igOpen, setIgOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [agentProvider, setAgentProvider] = useState("claude");
  const [capabilities, setCapabilities] = useState(false);
  const [capabilityGoal, setCapabilityGoal] = useState("create");
  const [homeTarget, setHomeTarget] = useState({ n: 0 });
  const [projectPicker, setProjectPicker] = useState(null);
  const [storiesProjectId, setStoriesProjectId] = useState(null);
  const openAgents = (provider = "claude") => { setAgentProvider(["claude", "gemini", "codex"].includes(provider) ? provider : "claude"); setAgentsOpen(true); };
  const openCapabilities = (goal = "create") => { setCapabilityGoal(typeof goal === "string" ? goal : "create"); setCapabilities(true); };
  // Abrir a Marca já numa seção (links do estúdio e Ctrl K).
  const [brandTarget, setBrandTarget] = useState({ tab: null, n: 0 });
  const openBrand = (tab) => {
    if (typeof tab === "string") setBrandTarget((t) => ({ tab, n: t.n + 1 }));
    setView("brand");
    setProjectId(null);
  };
  // Ação de um aviso: abre o lugar do app que ele indica.
  const goNotice = (target) => {
    if (target?.startsWith("brand:")) openBrand(target.slice(6));
    else if (target === "brand") openBrand();
    else if (target === "instagram") setIgOpen(true);
    else if (target === "home") goHome();
    else if (["library", "pilot"].includes(target)) goView(target);
  };
  const composerRef = useRef(null);
  const menu = usePopover();
  const project = state.projects.find((p) => p.id === projectId);
  const connected = Boolean(state.account?.connected);
  const hasProfile = Boolean(state.profile);
  const pendingResults = rhythm(state.projects, state.settings).pending.length;
  const pendingReviews = (state.autopilot?.jobs || []).filter(job => job.status === "ready").length;
  const radarOpen = ["ideas", "review", "pilot"].includes(view);
  const editing = view === "studio" && project;
  const goHome = () => {
    setView("home");
    setProjectId(null);
    setSetup(null);
  };
  const openProject = (id) => {
    setProjectId(id);
    setView("studio");
  };
  useEffect(() => {
    const go = (event) => {
      setView(event.detail);
      setProjectId(null);
    };
    window.addEventListener("pacto:navigate", go);
    return () => window.removeEventListener("pacto:navigate", go);
  }, []);
  const goView = (next) => { setView(next); setProjectId(null); setSetup(null); };
  const discoverAction = (action) => {
    setCapabilities(false);
    if (["carousel", "material", "presentation"].includes(action)) {
      goHome(); setHomeTarget((current) => ({ n: current.n + 1, format: { carousel: "carrossel", material: "material", presentation: "apresentacao" }[action] }));
      setTimeout(() => composerRef.current?.focus(), 0);
    } else if (["radar", "model"].includes(action)) {
      goView("ideas"); setHomeTarget((current) => ({ n: current.n + 1, source: action === "radar" ? "radar" : "modelador" }));
    } else if (["references", "calendar"].includes(action)) goView(action);
    else if (action === "pilot") goView("pilot");
    else if (action === "results") goView("rhythm");
    else if (action === "analytics") openBrand("analytics");
    else if (action.startsWith("brand-")) openBrand({ "brand-context": "contexto", "brand-design": "design", "brand-images": "imagens" }[action]);
    else if (action === "instagram") setIgOpen(true);
    else if (["stories", "publish", "export"].includes(action)) setProjectPicker(action);
  };
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = preferences.theme;
    root.dataset.palette = preferences.palette;
    delete root.dataset.uiFont;
    root.style.setProperty("--app-zoom", String(preferences.scale / 100));
    root.dataset.platform = /Mac/i.test(navigator.platform) ? "mac" : "win";
    // Botões de janela do Windows com as cores da barra do app (tema e paleta).
    const probe = document.createElement("i");
    probe.style.cssText = "position:fixed;visibility:hidden;background:var(--panel);color:var(--ink)";
    document.body.append(probe);
    const hex = (rgb) => "#" + (rgb.match(/\d+/g) || []).slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
    const { backgroundColor, color } = getComputedStyle(probe);
    probe.remove();
    window.pacto?.request("titleBar", { color: hex(backgroundColor), symbol: hex(color) }).catch(() => {});
    try {
      localStorage.setItem("pacto-theme", preferences.theme);
      localStorage.setItem("carrossell-preferences", JSON.stringify(preferences));
    } catch {}
  }, [preferences]);
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    const onKey = (event) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "k" && hasProfile && available) {
        event.preventDefault();
        setPalette((v) => !v);
      } else if (mod && event.key.toLowerCase() === "n" && hasProfile && available && !document.querySelector("dialog[open]")) {
        event.preventDefault();
        goHome();
        setTimeout(() => composerRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasProfile, available]);
  const set = (patch) => setPreferences((current) => {
    const next = { ...current, ...patch };
    if (patch.language) setLocale(next.language);
    return next;
  });
  setLocale(preferences.language);
  useDomLocale(preferences.language);
  useEffect(() => {
    if (!available || loading || !state.settings) return undefined;
    if ((state.settings.language === "es" ? "es" : "pt-BR") === preferences.language) return undefined;
    request("saveSettings", { language: preferences.language }).catch(() => {});
    return undefined;
  }, [available, loading, preferences.language, state.settings?.language, state.profileId]);
  const commands = useMemo(
    () => [
      ...projectCommands.map((c) => (editing ? c : { ...c, hidden: true })),
      { id: "new", label: "Novo carrossel", hint: "Ctrl + N", run: () => (goHome(), setTimeout(() => composerRef.current?.focus(), 50)) },
      { id: "home", label: "Ir para o Início", run: goHome },
      { id: "capabilities", label: "O que posso fazer no Carrossell?", hint: "Recursos por objetivo", run: () => openCapabilities() },
      { id: "library", label: "Abrir meus conteúdos", hint: "Biblioteca", run: () => goView("library") },
      { id: "references", label: "Abrir biblioteca de referências", hint: "Ideias e estilos", run: () => goView("references") },
      { id: "pilot", label: "Abrir piloto automático", hint: "Telegram e rotina", run: () => goView("pilot") },
      { id: "results", label: "Registrar resultados e ver vencedores", run: () => goView("rhythm") },
      { id: "brand", label: "Abrir Marca", hint: "Contexto, Design Kit e fotos", run: () => openBrand() },
      ...[["contexto", "Contexto da marca"], ["design", "Design Kit"], ["perfil", "Perfil (nome, @ e foto)"], ["fotos", "Fotos e cenas"], ["imagens", "Imagens da marca (logo e produtos)"], ["otimizar", "Otimizar o Carrossell"]].map(([tab, label]) => ({ id: `brand-${tab}`, label: `Marca: ${label}`, hint: "Marca", run: () => openBrand(tab) })),
      { id: "radar", label: "Abrir Radar de ideias", hint: "Pautas da marca", run: () => discoverAction("radar") },
      { id: "scenes", label: "Sugerir cenas para fotos simples", hint: "Marca", disabled: !connected, run: () => (setView("brand"), request("suggestScenes").catch(() => {})) },
      { id: "theme", label: preferences.theme === "dark" ? "Usar tema claro" : "Usar tema escuro", run: () => set({ theme: preferences.theme === "dark" ? "light" : "dark" }) },
      { id: "instagram", label: "Conectar Instagram", hint: "Postar e agendar", run: () => setIgOpen(true) },
      { id: "analytics", label: "Marca: Analytics do Instagram", hint: "Desempenho e Replicador", run: () => openBrand("analytics") },
      { id: "agents", label: "Usar o Carrossell com agentes e CLI", hint: "Claude, Gemini, Codex", run: () => openCapabilities("agents") },
      { id: "course", label: "Abrir as aulas do método", hint: "Opcional", run: () => setCourseOpen(true) },
      { id: "account", label: connected ? "Desconectar a conta ChatGPT" : "Conectar a conta ChatGPT", run: () => request(connected ? "disconnect" : "connect").catch(() => {}) },
      ...(state.profiles || []).filter((p) => p.id !== state.profileId).map((p) => ({ id: `profile-${p.id}`, label: `Trocar para o perfil ${p.name}`, hint: "Perfis", run: () => request("switchProfile", { id: p.id }).then(goHome).catch(() => {}) })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectCommands, editing, connected, preferences.theme, state.profiles, state.profileId],
  );
  const accountMenu = (
    <div className="pop-anchor">
      <button className="avatar-btn" aria-label={connected ? "Conta conectada e preferências" : "Conectar conta e preferências"} aria-expanded={menu.open === "account"} onClick={() => menu.toggle("account")}>
        {state.media?.avatar ? <img src={state.media.avatar} alt="" /> : (state.brandInfo?.name || "C").charAt(0).toUpperCase()}
        <span className={`dot ${connected ? "on" : ""}`} />
      </button>
      {menu.open === "account" && (
        <div className="popover right" style={{ minWidth: 280 }}>
          <div className="head">Conta ChatGPT</div>
          <button className="opt" disabled={isPending("connect") || isPending("disconnect")} onClick={() => request(connected ? "disconnect" : "connect").catch(() => {})}>
            <b>
              {connected ? <LogOut size={15} /> : <RefreshCw size={15} />}
              {isPending("connect") ? "Conectando…" : connected ? "Desconectar" : "Conectar minha conta"}
            </b>
            <small>{connected ? state.account.label || "Conectada · usada para escrever e gerar" : "Use a sua conta para escrever e gerar as artes"}</small>
          </button>
          <hr />
          <div className="head">Tema</div>
          <div className="seg">
            {[
              ["light", "Claro"],
              ["dark", "Escuro"],
            ].map(([k, l]) => (
              <button key={k} aria-pressed={preferences.theme === k} onClick={() => set({ theme: k })}>
                {l}
              </button>
            ))}
          </div>
          <div className="head">Cor do app</div>
          <div className="seg">
            {PALETTES.map(([id, label, color]) => (
              <button key={id} aria-pressed={preferences.palette === id} aria-label={label} title={label} onClick={() => set({ palette: id })}>
                <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 99, background: color, verticalAlign: "-1px" }} />
              </button>
            ))}
          </div>
          <div className="head">Idioma</div>
          <div className="seg">
            {[
              ["pt-BR", "Português"],
              ["es", "Español"],
            ].map(([id, label]) => (
              <button key={id} aria-pressed={preferences.language === id} onClick={() => set({ language: id })}>
                {label}
              </button>
            ))}
          </div>
          <div className="head">Tamanho do texto</div>
          <div className="seg">
            {[100, 110, 115, 125].map((z) => (
              <button key={z} aria-pressed={preferences.scale === z} onClick={() => set({ scale: z })}>
                {z}%
              </button>
            ))}
          </div>
          <hr />
          <button className="opt" onClick={() => (menu.setOpen(null), setAgentsOpen(true))}>
            <b>Usar com agentes</b>
            <small>Claude, Gemini ou Codex criam carrosséis por você</small>
          </button>
          <button className="opt" disabled={!state.course.length} onClick={() => (menu.setOpen(null), setCourseOpen(true))}>
            <b>Aulas do método</b>
            <small>Opcional · {state.course.length} aulas</small>
          </button>
        </div>
      )}
    </div>
  );
  let body;
  if (!available)
    body = (
      <main className="shell-main">
        <div className="page" style={{ textAlign: "center", justifyItems: "center" }}>
          <Laptop size={42} strokeWidth={1} />
          <h1 className="page-title">Abra o Carrossell pelo aplicativo</h1>
          <p className="page-sub">Esta janela não tem acesso aos recursos do aplicativo. Use o atalho Carrossell instalado no seu computador.</p>
        </div>
      </main>
    );
  else if (loading)
    body = (
      <main className="shell-main">
        <div className="loading">
          <Spinner />
          <b>Abrindo seu estúdio…</b>
        </div>
      </main>
    );
  else if (bootstrapFailed)
    body = (
      <main className="shell-main">
        <div className="loading">
          <AlertCircle size={28} />
          <b>Não foi possível abrir o estúdio.</b>
          <button className="btn" onClick={() => request("bootstrap").catch(() => {})}>
            Tentar novamente
          </button>
        </div>
      </main>
    );
  else if (!hasProfile || setup)
    body = (
      <main className="shell-main">
        <div className="setup-wrap">
          {hasProfile && (
            <button className="ghost-btn" style={{ margin: "16px 0 0 20px" }} onClick={() => setSetup(null)}>
              <ArrowLeft size={15} /> Voltar para a Marca
            </button>
          )}
          {setup === "manual" ? (
            <Profile profile={state.profile} account={state.account} request={request} busy={isPending("connect")} onDone={() => (setSetup(null), setView(hasProfile ? "brand" : "home"), hasProfile && setNotice("Sua marca foi atualizada."))} onCancel={() => setSetup(hasProfile ? null : "interview")} />
          ) : (
            <Onboarding state={state} request={request} isPending={isPending} onAgents={() => setAgentsOpen(true)} onManual={() => setSetup("manual")} onDone={() => (setSetup(null), setView("home"), hasProfile && setNotice("Sua marca foi atualizada."))} onCancel={hasProfile ? () => setSetup(null) : undefined} />
          )}
        </div>
      </main>
    );
  else
    body = (
      <>
        <main className="shell-main" hidden={Boolean(editing)}>
            {radarOpen && <RadarNavigation view={view} pendingReviews={pendingReviews} onView={goView} />}
            <div hidden={view === "brand" || view === "pilot" || view === "review" || view === "stories"}
              {...(view === "ideas" ? { id: "radar-workspace", role: "tabpanel", "aria-labelledby": "radar-tab-ideas", tabIndex: 0 } : {})}>
              <Home key={state.profileId} view={view} state={state} request={request} isPending={isPending} onOpen={openProject} onNotice={setNotice} onShowHome={goHome} composerRef={composerRef} connected={connected} onAgents={openAgents} onDiscover={openCapabilities} onView={goView} pendingReviews={pendingReviews} onStories={() => setProjectPicker("stories")} onInstagram={() => setIgOpen(true)} target={homeTarget} />
          </div>
          {view === "brand" && <Brand state={state} request={request} isPending={isPending} onRedo={() => setSetup("interview")} onManual={() => setSetup("manual")} onNotice={setNotice} onInstagram={() => setIgOpen(true)} onAgents={openAgents} target={brandTarget} />}
            {(view === "review" || view === "pilot") && <section className="page radar-content" id="radar-workspace" role="tabpanel" aria-labelledby={`radar-tab-${view}`} tabIndex={0}>
              <Autopilot heading="Rotina e Telegram" pane={view === "review" ? "review" : "routine"} state={state} request={request} onNotice={setNotice}
                onPilot={() => goView("pilot")} onReview={() => goView("review")} />
            </section>}
          {view === "stories" && <StoriesWorkspace project={state.projects.find((item) => item.id === storiesProjectId)} state={state} request={request} pending={pending} onBack={() => goView("library")} onOpen={openProject} onNotice={setNotice} />}
        </main>
        {editing && <Studio key={project.id} project={project} state={state} request={request} pending={pending} activity={activity} onBack={goHome} onOpen={openProject} onNotice={setNotice} onCommands={setProjectCommands} onBrand={openBrand} onInstagram={() => setIgOpen(true)} />}
      </>
    );
  return (
    <RuntimeErrorContext.Provider value={error}>
      <CourseContext.Provider value={{ moments: state.courseMoments || [], play: available ? setVideo : null }}>
        <div className="shell">
          {editing ? null : (
            <header className="topbar" ref={menu.ref}>
              <button className="brandmark" aria-label="Carrossell, início" onClick={goHome}>
                <img src={brandMark} alt="" />
                carrossell
              </button>
              {available && !loading && !bootstrapFailed && <ProfileSwitcher state={state} request={request} isPending={isPending} menu={menu} onSwitched={goHome} />}
              {hasProfile && available && !setup && (
                <nav className="topnav" aria-label="Navegação principal">
                  <button aria-current={view === "home" ? "page" : undefined} onClick={goHome}>
                    <HomeIcon size={16} /> Início
                  </button>
                  <button aria-current={view === "library" ? "page" : undefined} onClick={() => goView("library")}>
                    <Layers size={16} /> Conteúdos
                  </button>
                  <button aria-current={radarOpen ? "page" : undefined} onClick={() => pendingReviews ? goView("review") : discoverAction("radar")}>
                    <Radar size={16} aria-hidden="true" /> Radar
                    {pendingReviews > 0 && <span className="radar-count" aria-label={`${pendingReviews} para revisar`}>{pendingReviews}</span>}
                  </button>
                  <button aria-current={view === "brand" ? "page" : undefined} onClick={() => setView("brand")}>
                    <Palette size={16} /> Marca
                  </button>
                </nav>
              )}
              <span className="spacer" />
              {hasProfile && available && <InstagramButton composio={state.composio} onOpen={() => setIgOpen(true)} />}
              {hasProfile && available && (
                <button className="cmd-btn" aria-label="Abrir comandos" onClick={() => setPalette(true)}>
                  <Search size={15} />
                  <span className="label">Buscar ou fazer algo</span>
                  <kbd>Ctrl K</kbd>
                </button>
              )}
              {hasProfile && available && <NoticeBell notices={state.notices} request={request} onGo={goNotice} />}
              {available && accountMenu}
            </header>
          )}
          {!editing && hasProfile && available && !setup && <NoticeBanner notices={state.notices} request={request} onGo={goNotice} />}
          {editing ? null : update?.status === "manual" ? (
            <div className="notice-strip info" role="status">
              <RefreshCw size={16} />
              <span>A versão {update.version} do Carrossell está disponível. Baixe, abra e arraste para Aplicativos; seus projetos continuam salvos.</span>
              <button className="btn small" onClick={() => request("installUpdate").catch(() => {})}>
                Baixar
              </button>
            </div>
          ) : update?.status === "ready" ? (
            <div className="notice-strip info" role="status">
              <RefreshCw size={16} />
              <span>A versão {update.version} do Carrossell está pronta. Ela entra quando você fechar o app.</span>
              <button className="btn small" onClick={() => request("installUpdate").catch(() => {})}>
                Reiniciar e atualizar
              </button>
            </div>
          ) : (
            <div />
          )}
          {body}
        </div>
        {palette && <CommandPalette commands={commands} onClose={() => setPalette(false)} />}
        {capabilities && <Capabilities initialGoal={capabilityGoal} onClose={() => setCapabilities(false)} onAction={discoverAction} onAgents={openAgents} onNotice={setNotice} />}
        {agentsOpen && <AgentModal key={agentProvider} initialAgent={agentProvider} request={request} isPending={isPending} onNotice={setNotice} onClose={() => setAgentsOpen(false)} />}
        {projectPicker && <Dialog title={projectPicker === "stories" ? "De qual carrossel vamos preparar os stories?" : projectPicker === "publish" ? "Qual carrossel você quer revisar e publicar?" : "Qual conteúdo você quer baixar?"} onClose={() => setProjectPicker(null)} wide>
          <div className="dialog-fields project-picker"><p className="hint">{projectPicker === "stories" ? "Os stories usam o texto de um carrossel, mesmo sem as artes prontas. Você revisa, baixa e posta manualmente." : "Escolha um projeto para abrir os controles de revisão, publicação e exportação do Estúdio."}</p>
          {state.projects.filter((item) => projectPicker === "export" || (item.format || "carrossel") === "carrossel" && (projectPicker === "stories" ? item.slides?.length > 0 : item.status === "complete")).map((item) => <button key={item.id} className="btn" onClick={() => { const stories = projectPicker === "stories"; setProjectPicker(null); if (stories) { setStoriesProjectId(item.id); goView("stories"); } else openProject(item.id); }}>{item.title}<ArrowLeft size={15} style={{ transform: "rotate(180deg)" }} /></button>)}
          {!state.projects.some((item) => projectPicker === "export" || (item.format || "carrossel") === "carrossel" && (projectPicker === "stories" ? item.slides?.length > 0 : item.status === "complete")) && <div className="empty-state"><p>{projectPicker === "export" ? "Você ainda não tem conteúdo neste perfil." : projectPicker === "stories" ? "Crie o texto de um carrossel primeiro. As artes não precisam estar prontas." : "Nenhum carrossel pronto neste perfil. Conclua um carrossel no Estúdio para continuar."}</p><button className="btn" onClick={() => { setProjectPicker(null); goView("library"); }}>Abrir meus conteúdos</button></div>}
          </div>
        </Dialog>}
        {igOpen && <InstagramModal state={state} request={request} isPending={isPending} onNotice={setNotice} onClose={() => setIgOpen(false)} />}
        {(error || notice) && (
          <div className="snack" role={error ? "alert" : "status"} style={error ? { background: "var(--danger)", color: "#fff" } : undefined}>
            {error ? <AlertCircle size={17} /> : <Check size={17} />}
            <span>{error || notice}</span>
            <button className="icon-only" aria-label="Fechar aviso" onClick={() => (error ? clearError() : setNotice(""))}>
              <X size={15} />
            </button>
          </div>
        )}
        {courseOpen && (
          <Dialog title="O método, no seu tempo." eyebrow="CURSO P.A.C.T.O. · OPCIONAL" onClose={() => setCourseOpen(false)} wide>
            <div className="course-cols">
              <div style={{ display: "grid", alignContent: "start" }}>
                <span className="eyebrow" style={{ padding: "0 10px 6px" }}>AULAS</span>
                {state.course.map((lesson, i) => (
                  <button key={lesson.id} onClick={() => (setCourseOpen(false), setVideo({ lessonId: lesson.id, seconds: 0 }))}>
                    <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                    <span>{lesson.title.replace(/\s+/g, " ")}</span>
                  </button>
                ))}
              </div>
              <div style={{ display: "grid", alignContent: "start" }}>
                <span className="eyebrow" style={{ padding: "0 10px 6px" }}>CADA ETAPA NA AULA CERTA</span>
                {(state.courseMoments || []).slice(0, 10).map((m) => (
                  <button key={m.step} onClick={() => (setCourseOpen(false), setVideo({ lessonId: m.lessonId, seconds: m.seconds, step: m.step }))}>
                    <span className="mono">~{formatMoment(m.seconds)}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Dialog>
        )}
        {video && <LessonPlayer video={video} course={state.course} moments={state.courseMoments || []} request={request} onSeek={setVideo} onClose={() => setVideo(null)} />}
      </CourseContext.Provider>
    </RuntimeErrorContext.Provider>
  );
}
