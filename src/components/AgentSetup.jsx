import { useEffect, useState } from "react";
import { Bot, Check, ClipboardCopy, Copy, Terminal, X } from "lucide-react";
import { AGENT_GUIDE } from "../../core/agent-guide.mjs";
import Dialog from "./Dialog.jsx";

// Usar o Carrossell por um agente (Codex, Claude Code): card no Início, modal com o passo a passo
// e a seção em Marca. Tudo passa pelo comando "carrossell", que funciona até com o app fechado.
const HIDE_KEY = "carrossell-agent-card";
const PROMPTS = [
  "Use o comando carrossell (rode \"carrossell ajuda --agente\" primeiro). Crie um carrossel de 8 cards sobre os 3 erros mais comuns ao precificar um serviço, aprove o texto, escolha a melhor capa, gere as artes e me mostre o resultado.",
  "Com o carrossell, gere 30 pautas com o Radar no perfil Cliente Ana e crie carrosséis das 3 mais fortes. Não poste: só me mostre para eu aprovar.",
  "Com o carrossell, agende o carrossel mais recente para terça às 18h no Instagram @minhaconta e me confirme o horário.",
];
function useCli(request, onNotice) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    request("cliInfo").then(setInfo).catch(() => {});
  }, [request]);
  const install = () =>
    request("installCli")
      .then((next) => (setInfo(next), onNotice("Comando instalado. Feche e abra o terminal (ou o Codex) para ele aparecer.")))
      .catch(() => {});
  const copy = (text, notice) => navigator.clipboard.writeText(text).then(() => onNotice(notice));
  return { info, install, copy };
}
function InstallButton({ info, install, busy }) {
  if (info?.packaged === false) return <code className="agent-code">{info.command}</code>;
  if (info?.installed)
    return (
      <span className="chip good">
        <Check size={13} /> Comando <code>carrossell</code> instalado
      </span>
    );
  return (
    <button className="btn primary" disabled={!info || busy} onClick={install}>
      <Terminal size={15} /> {busy ? "Instalando…" : "Instalar o comando carrossell"}
    </button>
  );
}

// Início: uma linha de destaque, que some para sempre em "Agora não".
export function AgentCard({ onOpen }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === "hidden";
    } catch {
      return false;
    }
  });
  if (hidden) return null;
  const hide = () => {
    try {
      localStorage.setItem(HIDE_KEY, "hidden");
    } catch {}
    setHidden(true);
  };
  return (
    <section className="agent-card" aria-label="Usar com um agente">
      <span className="agent-icon">
        <Bot size={20} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>Seu agente pode usar o Carrossell por você</b>
        <small>O Codex ou o Claude Code criam, geram as artes com a sua conta, exportam e postam, até com o app fechado.</small>
      </div>
      <button className="btn small primary" onClick={onOpen}>
        Configurar em 1 minuto
      </button>
      <button className="icon-only" aria-label="Agora não" title="Agora não" onClick={hide}>
        <X size={15} />
      </button>
    </section>
  );
}

export function AgentModal({ request, isPending, onNotice, onClose }) {
  const { info, install, copy } = useCli(request, onNotice);
  return (
    <Dialog title="Use o Carrossell pelo seu agente" eyebrow="CODEX · CLAUDE CODE · TERMINAL" onClose={onClose} wide>
      <div className="dialog-fields agent-modal">
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Peça em palavras ao seu agente e ele usa o Carrossell por você: lê a sua marca, escreve, gera as artes com a sua conta ChatGPT, exporta, posta e agenda no Instagram. O app nem precisa estar aberto. Você continua podendo fazer tudo à mão aqui.
        </p>
        <ol className="ig-steps agent-steps">
          <li className={info?.installed ? "done" : ""}>
            <span className="n">{info?.installed ? <Check size={13} /> : 1}</span>
            <div>
              <b>Instale o comando</b>
              <small>Coloca o comando carrossell no seu computador, para o agente encontrar.</small>
              <div className="row" style={{ marginTop: 8 }}>
                <InstallButton info={info} install={install} busy={isPending("installCli")} />
              </div>
            </div>
          </li>
          <li>
            <span className="n">2</span>
            <div>
              <b>Ensine o agente</b>
              <small>Copie o guia e cole nas instruções do agente: AGENTS.md no Codex, CLAUDE.md no Claude Code.</small>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn" onClick={() => copy(AGENT_GUIDE, "Guia copiado. Cole nas instruções do seu agente.")}>
                  <ClipboardCopy size={15} /> Copiar guia para o agente
                </button>
              </div>
            </div>
          </li>
          <li>
            <span className="n">3</span>
            <div>
              <b>Peça em palavras</b>
              <small>Alguns pedidos prontos para colar no agente:</small>
            </div>
          </li>
        </ol>
        <div className="agent-prompts">
          {PROMPTS.map((p) => (
            <div key={p} className="agent-prompt">
              <p>{p}</p>
              <button className="icon-only" aria-label="Copiar pedido" title="Copiar" onClick={() => copy(p, "Pedido copiado. Cole no seu agente.")}>
                <Copy size={15} />
              </button>
            </div>
          ))}
        </div>
        <p className="hint" style={{ margin: 0 }}>
          Postar no Instagram só acontece quando você pede: o agente precisa confirmar com --confirmar. Com vários perfis, ele escolhe a marca certa com --perfil, sem trocar o que você vê aqui.
        </p>
      </div>
    </Dialog>
  );
}

// Marca › Usar com agentes: resumo e atalho para o modal.
export default function AgentSetup({ request, isPending, onNotice, onOpen }) {
  const { info, install } = useCli(request, onNotice);
  return (
    <section className="card-box" aria-label="Usar com agentes">
      <div className="section-head">
        <h2>
          <Bot size={18} style={{ verticalAlign: "-3px" }} /> Usar com agentes
        </h2>
        <span className="hint">Codex, Claude Code ou o terminal</span>
        <span className="spacer" />
        <button className="btn small" onClick={onOpen}>
          Como funciona
        </button>
      </div>
      <p style={{ margin: 0, color: "var(--muted)" }}>
        Um agente controla o Carrossell pelo comando <code>carrossell</code>: lê a sua marca, cria carrosséis, gera as artes com a sua conta, exporta e posta. Funciona com o app fechado.
      </p>
      <div className="row">
        <InstallButton info={info} install={install} busy={isPending("installCli")} />
      </div>
    </section>
  );
}
