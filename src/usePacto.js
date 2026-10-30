import { createContext, useCallback, useEffect, useRef, useState } from "react";

export const RuntimeErrorContext = createContext("");

const initial = {
  profile: null,
  projects: [],
  account: { connected: false, label: "" },
  models: [],
  course: [],
  knowledge: {},
  onboarding: {
    brand: { messages: [], document: "" },
    design: { messages: [], document: "" },
  },
  architectures: [],
  designPresets: [],
  goals: [],
  ideas: [],
  visualFixes: [],
  working: null,
  settings: { weeklyGoal: 5, driveFolder: "", firstCompletedAt: "" },
  courseMoments: [],
};

// Ações que valem para o app inteiro ou que escolhem o perfil; as demais levam o perfil que a janela mostra.
const UNSCOPED = new Set(["bootstrap", "profiles", "createProfile", "renameProfile", "switchProfile", "deleteProfile", "installUpdate"]);

export function usePacto() {
  const available = typeof window.pacto?.request === "function";
  const [state, setState] = useState(initial);
  const [loading, setLoading] = useState(available);
  const [error, setError] = useState("");
  const [bootstrapFailed, setBootstrapFailed] = useState(false);
  const [activity, setActivity] = useState("");
  const [update, setUpdate] = useState(null);
  const [pending, setPending] = useState([]);
  // Perfil exibido: a CLI pode trabalhar em outro perfil ao mesmo tempo sem bagunçar esta janela.
  const shown = useRef("");
  const accept = useCallback((result) => {
    if (!result || typeof result !== "object") return;
    if (Array.isArray(result.projects)) {
      shown.current = result.profileId || "";
      setState({ ...initial, ...result });
    }
    else if (result.id && Array.isArray(result.slides))
      setState((prev) => ({
        ...prev,
        projects: [result, ...prev.projects.filter((p) => p.id !== result.id)],
      }));
  }, []);
  const request = useCallback(
    async (action, args = {}) => {
      if (!available)
        throw new Error(
          "O aplicativo para computador é necessário para esta ação.",
        );
      const token = `${action}-${Date.now()}-${Math.random()}`;
      setPending((items) => [...items, { token, action }]);
      setError("");
      if (action === "bootstrap") setBootstrapFailed(false);
      try {
        const scoped = !UNSCOPED.has(action) && shown.current ? { ...args, profileId: shown.current } : args;
        const result = await window.pacto.request(action, scoped);
        // Resposta que chega depois de trocar de perfil pertence ao perfil anterior: não entra na tela.
        if (!scoped.profileId || scoped.profileId === shown.current) accept(result);
        return result;
      } catch (err) {
        if (action === "bootstrap") setBootstrapFailed(true);
        // O Electron prefixa "Error invoking remote method 'pacto:request': Error:"; a pessoa vê só a mensagem.
        setError(
          String(err?.message || "").replace(/^Error invoking remote method '[^']+': (?:\w*Error: )?/, "") ||
            "Não foi possível concluir esta ação. Tente novamente.",
        );
        throw err;
      } finally {
        setPending((items) => items.filter((item) => item.token !== token));
      }
    },
    [available, accept],
  );
  useEffect(() => {
    if (!available) return undefined;
    let alive = true;
    const unsubscribe = window.pacto.onEvent?.((event) => {
      if (!alive) return;
      if (event.type === "profile") return accept(event.state);
      if (event.profileId && shown.current && event.profileId !== shown.current) return;
      if (event.type === "state") accept(event.state);
      if (event.type === "project") accept(event.project);
      if (event.type === "activity") setActivity(event.message || "");
      if (event.type === "update") setUpdate(event);
      if (event.type === "navigate")
        window.dispatchEvent(
          new CustomEvent("pacto:navigate", { detail: event.view }),
        );
    });
    request("bootstrap")
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [available, request, accept]);
  return {
    state,
    request,
    loading,
    error,
    bootstrapFailed,
    clearError: () => setError(""),
    activity,
    update,
    available,
    pending,
    isPending: (action) => pending.some((item) => item.action === action),
  };
}
