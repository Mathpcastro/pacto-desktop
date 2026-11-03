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
  const copy = async (text, notice) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(text);
      onNotice(notice);
    } catch { onNotice("Não foi possível copiar. Selecione o texto e use Ctrl+C (ou Command+C)."); }
  };
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
        <small>Codex, Claude Code ou Gemini CLI criam, exportam e postam, até com o app fechado. Sem a conta ChatGPT, o próprio agente escreve e desenha os cards.</small>
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

// Claude e Gemini escrevem e desenham com a estrutura do app (modo agente), sem a conta ChatGPT;
// o Codex pode usar a conta ChatGPT conectada no app. O que eles criam fica na biblioteca do app.
const AGENTS = {
  claude: {
    label: "Claude Code",
    install: "irm https://claude.ai/install.ps1 | iex",
    installHint: "Cole no PowerShell. Precisa de uma assinatura do Claude (Pro ou Max). Também funciona na aba Code do app Claude para computador.",
    open: "claude",
    file: "CLAUDE.md",
  },
  gemini: {
    label: "Gemini CLI",
    install: "npm install -g @google/gemini-cli",
    installHint: "Cole no PowerShell. Precisa do Node.js 20 ou mais novo (nodejs.org). Na primeira vez, escolha \"Sign in with Google\".",
    open: "gemini",
    file: "GEMINI.md",
  },
  codex: {
    label: "Codex",
    install: "npm install -g @openai/codex",
    installHint: "Cole no PowerShell. Precisa do Node.js. Entre com a mesma conta ChatGPT.",
    open: "codex",
    file: "AGENTS.md",
  },
};
const AGENT_PROMPTS = [
  "Use o comando carrossell no modo agente (rode \"carrossell ajuda --agente\" primeiro). Se a minha marca ainda não estiver no Carrossell, me entreviste e salve o Contexto e o Design Kit. Depois crie um carrossel de 8 cards sobre [seu tema], me mostre o texto para eu aprovar e desenhe os cards em HTML no estilo do Design Kit.",
  "Com o carrossell no modo agente, faça os stories e o kit de CTA e DM do carrossel mais recente.",
  "Com o carrossell no modo agente, crie 3 carrosséis de 6 cards no estilo texto (modelo do app) sobre as dúvidas mais comuns dos meus clientes. Não poste: só deixe prontos no app.",
];

export function AgentModal({ request, isPending, onNotice, onClose, initialAgent = "claude" }) {
  const { info, install, copy } = useCli(request, onNotice);
  const [agent, setAgent] = useState(AGENTS[initialAgent] ? initialAgent : "claude");
  const a = AGENTS[agent];
  const prompts = AGENT_PROMPTS;
  return (
    <Dialog title="Gere carrosséis pelo Claude, Gemini ou Codex" eyebrow="USAR COM AGENTES" onClose={onClose} wide>
      <div className="dialog-fields agent-modal">
        <div className="seg" role="group" aria-label="Qual agente você usa" style={{ margin: 0 }}>
          {Object.entries(AGENTS).map(([k, v]) => (
            <button key={k} aria-pressed={agent === k} onClick={() => setAgent(k)}>
              {v.label}
            </button>
          ))}
        </div>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Seu agente escreve e monta os cards. Tudo aparece no Carrossell para revisar e baixar. No modo agente, o {a.label} usa a própria conta dele, sem exigir uma conta ChatGPT conectada aqui.
        </p>
        <p className="hint" style={{ margin: 0 }}>Cards em modelos ou HTML podem ser feitos sem o ChatGPT. Imagens por IA dependem das ferramentas do seu agente. O piloto e a conversa do Telegram usam a conta ChatGPT conectada ao app.</p>
        <ol className="ig-steps agent-steps">
          <li>
            <span className="n">1</span>
            <div>
              <b>Instale o {a.label}</b>
              <small>{a.installHint}</small>
              <div className="row" style={{ marginTop: 8 }}>
                <code className="agent-code">{a.install}</code>
                <button className="icon-only" aria-label="Copiar comando" title="Copiar" onClick={() => copy(a.install, "Comando copiado. Cole no PowerShell.")}>
                  <Copy size={15} />
                </button>
              </div>
            </div>
          </li>
          <li className={info?.installed ? "done" : ""}>
            <span className="n">{info?.installed ? <Check size={13} /> : 2}</span>
            <div>
              <b>Instale o comando carrossell</b>
              <small>É por ele que o {a.label} conversa com o Carrossell.</small>
              <div className="row" style={{ marginTop: 8 }}>
                <InstallButton info={info} install={install} busy={isPending("installCli")} />
              </div>
            </div>
          </li>
          <li>
            <span className="n">3</span>
            <div>
              <b>Abra o {a.label} e peça em palavras</b>
              <small>
                Abra um terminal novo, digite <code>{a.open}</code> e cole um dos pedidos abaixo. Ele lê o guia sozinho com <code>carrossell ajuda --agente</code>; se preferir, cole o guia no {a.file} da pasta.
              </small>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn" onClick={() => copy(AGENT_GUIDE, `Guia copiado. Cole no ${a.file}.`)}>
                  <ClipboardCopy size={15} /> Copiar guia para o {a.file}
                </button>
              </div>
            </div>
          </li>
        </ol>
        <div className="agent-prompts">
          {prompts.map((p) => (
            <div key={p} className="agent-prompt">
              <p>{p}</p>
              <button className="icon-only" aria-label="Copiar pedido" title="Copiar" onClick={() => copy(p, "Pedido copiado. Cole no seu agente.")}>
                <Copy size={15} />
              </button>
            </div>
          ))}
        </div>
        <p className="hint" style={{ margin: 0 }}>
          Postar no Instagram só acontece quando você pede: o agente precisa confirmar com --confirmar. Com vários perfis, ele escolhe a marca certa com --perfil, sem trocar o que você vê aqui. O Carrossell abre sozinho em segundo plano quando o agente precisa dele.
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
        <span className="hint">Codex, Claude Code, Gemini CLI ou o terminal</span>
        <span className="spacer" />
        <button className="btn small" onClick={onOpen}>
          Como funciona
        </button>
      </div>
      <p style={{ margin: 0, color: "var(--muted)" }}>
        Seu agente controla o Carrossell pelo comando <code>carrossell</code>: escreve, monta cards em HTML ou modelos, exporta e pode publicar quando você pede. Imagens por IA dependem das ferramentas do agente. Os projetos ficam no app para revisar e baixar, mesmo sem ChatGPT conectado.
      </p>
      <div className="row">
        <InstallButton info={info} install={install} busy={isPending("installCli")} />
      </div>
    </section>
  );
}
