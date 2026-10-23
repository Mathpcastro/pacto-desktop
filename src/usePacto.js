import { createContext, useCallback, useEffect, useState } from "react";

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

export function usePacto() {
  const available = typeof window.pacto?.request === "function";
  const [state, setState] = useState(initial);
  const [loading, setLoading] = useState(available);
  const [error, setError] = useState("");
  const [bootstrapFailed, setBootstrapFailed] = useState(false);
  const [activity, setActivity] = useState("");
  const [pending, setPending] = useState([]);
  const accept = useCallback((result) => {
    if (!result || typeof result !== "object") return;
    if (Array.isArray(result.projects)) setState({ ...initial, ...result });
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
          "O aplicativo para Windows é necessário para esta ação.",
        );
      const token = `${action}-${Date.now()}-${Math.random()}`;
      setPending((items) => [...items, { token, action }]);
      setError("");
      if (action === "bootstrap") setBootstrapFailed(false);
      try {
        const result = await window.pacto.request(action, args);
        accept(result);
        return result;
      } catch (err) {
        if (action === "bootstrap") setBootstrapFailed(true);
        setError(
          err?.message ||
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
      if (event.type === "state") accept(event.state);
      if (event.type === "project") accept(event.project);
      if (event.type === "activity") setActivity(event.message || "");
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
    available,
    pending,
    isPending: (action) => pending.some((item) => item.action === action),
  };
}
