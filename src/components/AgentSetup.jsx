import { useEffect, useState } from "react";
import { Bot, Check, ClipboardCopy, Terminal } from "lucide-react";
import { AGENT_GUIDE } from "../../core/agent-guide.mjs";

// Marca › Usar com agentes: instala o comando "carrossell" e copia o guia para o Codex ou o Claude Code.
export default function AgentSetup({ request, isPending, onNotice }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    request("cliInfo").then(setInfo).catch(() => {});
  }, [request]);
  const install = () =>
    request("installCli")
      .then((next) => (setInfo(next), onNotice("Comando instalado. Feche e abra o terminal (ou o Codex) para ele aparecer.")))
      .catch(() => {});
  const copy = () => navigator.clipboard.writeText(AGENT_GUIDE).then(() => onNotice("Guia copiado. Cole nas instruções do seu agente (AGENTS.md no Codex)."));
  return (
    <section className="card-box" aria-label="Usar com agentes">
      <div className="section-head">
        <h2>
          <Bot size={18} style={{ verticalAlign: "-3px" }} /> Usar com agentes
        </h2>
        <span className="hint">Codex, Claude Code ou o terminal</span>
      </div>
      <p style={{ margin: 0, color: "var(--muted)" }}>
        Um agente controla o Carrossell pelo comando <code>carrossell</code>: lê a sua marca, cria carrosséis, gera as artes com a sua conta e exporta. Funciona com o app fechado: ele abre sozinho em segundo plano. Com vários perfis, o agente escolhe o
        perfil com <code>--perfil</code>.
      </p>
      <div className="row">
        {info?.packaged === false ? (
          <code style={{ padding: "6px 10px", background: "var(--sunk)", borderRadius: 8 }}>{info.command}</code>
        ) : info?.installed ? (
          <span className="chip good">
            <Check size={13} /> Comando <code>carrossell</code> instalado
          </span>
        ) : (
          <button className="btn" disabled={!info || isPending("installCli")} onClick={install}>
            <Terminal size={15} /> {isPending("installCli") ? "Instalando…" : "Instalar o comando carrossell"}
          </button>
        )}
        <button className="btn" onClick={copy}>
          <ClipboardCopy size={15} /> Copiar guia para o agente
        </button>
      </div>
      <pre className="agent-example" aria-label="Exemplo">{`carrossell status
carrossell criar --pauta "3 erros ao precificar" --cards 8
carrossell aprovar <id>  →  capas <id>  →  escolher-capa <id> 1  →  gerar <id>
carrossell exportar <id> --pasta "C:\\Carrosseis"`}</pre>
    </section>
  );
}
