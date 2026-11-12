import { useEffect, useRef, useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import Dialog from "./Dialog.jsx";
import { Spinner } from "../ui.jsx";
import { TERMS_VERSION, normalizeLicenseEmail, parseLicenseStatus } from "../../core/license.mjs";

// Mensagens do resultado de uma tentativa de ativação. Cada tentativa sempre mostra uma resposta:
// antes, uma recusa do servidor voltava para o mesmo texto e parecia que nada tinha acontecido.
export const ACTIVATION_ERRORS = {
  device_limit: "Esta licença já está ativa em 3 computadores. Fale com o suporte para liberar um deles.",
  rate_limited: "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.",
  offline: "Não foi possível falar com o servidor de licenças. Confira a internet e tente de novo.",
  not_found: "Não encontramos uma compra com este e-mail. Confira se é o mesmo e-mail usado no pagamento ou fale com o suporte.",
};
export function activationError(code) {
  return ACTIVATION_ERRORS[code] || ACTIVATION_ERRORS.not_found;
}

export default function LicenseDialog({ onClose, onStatus, openLink }) {
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [done, setDone] = useState(null);
  const input = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    if (!done) return undefined;
    const timer = setTimeout(() => close.current(), 1800);
    return () => clearTimeout(timer);
  }, [done]);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!normalizeLicenseEmail(email)) { setProblem({ field: "email", text: "Digite um e-mail válido, como nome@exemplo.com." }); input.current?.focus(); return; }
    if (!accepted) { setProblem({ field: "terms", text: "Marque que você aceita os Termos de Uso e o Aviso de Privacidade para ativar." }); return; }
    setBusy(true);
    setProblem(null);
    try {
      const value = await window.pacto.request("activateLicense", {
        email: email.trim(), accepted: true, termsVersion: TERMS_VERSION, acceptedAt: new Date().toISOString(),
      });
      const status = parseLicenseStatus(value);
      onStatus(status);
      if (status.activated && status.code !== "activation_failed" && status.code !== "offline") setDone(status);
      else setProblem({ text: activationError(status.code) });
    } catch {
      setProblem({ text: ACTIVATION_ERRORS.offline });
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Dialog title="Licença ativada" eyebrow="Carrossell" onClose={onClose} className="license-dialog">
        <div className="license-success" role="status">
          <CheckCircle2 size={34} />
          <p>Tudo certo{done.emailMasked ? <> para <strong>{done.emailMasked}</strong></> : null}. Bom trabalho com os seus carrosséis.</p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog title="Ative sua licença" eyebrow="Carrossell" onClose={onClose} className="license-dialog">
      <form onSubmit={submit} noValidate>
        <div className="dialog-fields">
          <div className="license-intro">
            <span className="license-icon"><KeyRound size={18} /></span>
            <p>Use o e-mail da sua compra. Leva alguns segundos e só precisa de internet nesta primeira vez. O app continua funcionando enquanto isso.</p>
          </div>
          <label className="field">
            <span>E-mail da compra</span>
            <input
              ref={input}
              type="email"
              autoComplete="email"
              placeholder="nome@exemplo.com"
              value={email}
              aria-invalid={problem?.field === "email" || undefined}
              onChange={(event) => { setEmail(event.target.value); if (problem) setProblem(null); }}
            />
          </label>
          <label className={`license-terms ${problem?.field === "terms" ? "attention" : ""}`}>
            <input type="checkbox" checked={accepted} onChange={(event) => { setAccepted(event.target.checked); if (problem?.field === "terms") setProblem(null); }} />
            <span>
              Li e aceito os{" "}
              <button type="button" className="license-link" onClick={() => openLink("termos")}>Termos de Uso</button>
              {" "}e o{" "}
              <button type="button" className="license-link" onClick={() => openLink("privacidade")}>Aviso de Privacidade</button>.
            </span>
          </label>
          {problem && <p className="license-problem" role="alert">{problem.text}</p>}
        </div>
        <footer className="dialog-footer">
          <button type="button" className="btn" onClick={onClose}>Agora não</button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? <><Spinner /> Ativando…</> : "Ativar licença"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
