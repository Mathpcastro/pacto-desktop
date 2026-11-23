import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, Terminal } from "lucide-react";
import Dialog from "./Dialog.jsx";
import plan from "../data/cli-plan.json";

export const CLI_GUIDE_TITLE = "Gerar pelo terminal (Claude, Gemini, Codex)";
const agentPrompt = cmd => `Use a CLI do Carrossell (\`${cmd} ajuda --agente\`) para escrever um carrossel de 6 cards sobre <tema> no estilo texto. Salve o plano em plano.json e rode \`${cmd} criar --slides plano.json --estilo texto --exportar ./carrossel\`.`;

function CopyBlock({ value, label }) {
  const [feedback, setFeedback] = useState("");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback("Copiado");
    } catch {
      setFeedback("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  };
  return (
    <div className="cli-copy-block">
      <pre className="agent-code"><code>{value}</code></pre>
      <button className="btn small" type="button" onClick={copy} aria-live="polite">
        {feedback === "Copiado" ? <Check size={14} /> : <Copy size={14} />}
        {feedback === "Copiado" ? "Copiado" : label}
      </button>
      {feedback && feedback !== "Copiado" && <span className="hint" role="status">{feedback}</span>}
    </div>
  );
}

function useCliInfo(request) {
  const [info, setInfo] = useState();
  useEffect(() => {
    let active = true;
    request("cliInfo")
      .then(value => { if (active) setInfo(value); })
      .catch(() => { if (active) setInfo(null); });
    return () => { active = false; };
  }, [request]);
  return [info, setInfo];
}

function CliStatus({ info }) {
  let label = "Consultando a instalação…";
  if (info?.installed) label = "CLI instalada";
  else if (info?.packaged === false) label = "CLI disponível em desenvolvimento";
  else if (info) label = "CLI ainda não instalada";
  else if (info === null) label = "Não foi possível consultar a instalação da CLI.";
  return <span className="hint" role="status">{label}</span>;
}

export function CliMenuSection({ request, onOpen }) {
  const [info] = useCliInfo(request);
  return (
    <div className="cli-menu-section">
      <div className="head">{CLI_GUIDE_TITLE}</div>
      <CliStatus info={info} />
      <button className="opt" type="button" onClick={onOpen}>
        <b><Terminal size={15} /> Abrir configuração da CLI</b>
      </button>
    </div>
  );
}

export function CliDialog({ request, isPending, onClose }) {
  const [full, setFull] = useState(false);
  return (
    <Dialog title={full ? "Guia passo a passo" : CLI_GUIDE_TITLE} wide onClose={onClose}>
      <div className="dialog-fields">
        <CliGuide request={request} isPending={isPending} full={full}
          onOpenGuide={() => setFull(true)} onBack={() => setFull(false)} />
      </div>
    </Dialog>
  );
}

export default function CliGuide({ request, isPending, full = true, onOpenGuide, onBack, onDone, saving }) {
  const [info, setInfo] = useCliInfo(request);
  const cmd = info?.command || "carrossell";
  const busy = isPending("installCli");
  const install = () => request("installCli").then(setInfo).catch(() => {});
  const examples = (
    <>
      <CopyBlock value={`${cmd} --version`} label="Copiar teste de versão" />
      <CopyBlock value={`${cmd} status`} label="Copiar teste de status" />
    </>
  );

  return (
    <section className="cli-guide" aria-label={CLI_GUIDE_TITLE}>
      <div className="card-box cli-guide-install">
        {full && <b>1. Instale ou encontre a CLI</b>}
        <div className="row">
          <CliStatus info={info} />
          <code className="agent-code">{cmd}</code>
        </div>
        {info?.packaged !== false && (
          <div className="row">
            <button className="btn" type="button" disabled={!info || busy} onClick={install}>
              <Terminal size={15} /> {busy ? "Instalando…" : info?.installed ? "Reinstalar a CLI" : "Instalar a CLI"}
            </button>
            {info?.platform === "win32" && <span className="hint">Abra um terminal novo depois de instalar.</span>}
            {info?.platform && info.platform !== "win32" && <span className="hint">O atalho fica em ~/.local/bin. Use um terminal que tenha essa pasta no PATH.</span>}
          </div>
        )}
      </div>

      {full ? (
        <>
          <div><b>2. Teste no terminal</b>{examples}</div>
          <div><b>3. Peça ao Claude Code ou ao Gemini CLI</b><CopyBlock value={agentPrompt(cmd)} label="Copiar prompt" /></div>
          <div><b>4. Exemplo de plano.json</b><CopyBlock value={JSON.stringify(plan, null, 2)} label="Copiar plano.json" /></div>
          <div>
            <b>5. O que funciona sem ChatGPT</b>
            <p className="hint">Os modelos tweet, texto, textopreto, fototexto, fundo e recorte montam os PNGs no app. Fundo e recorte usam uma foto do seu rosto, salva em Marca › Perfil e fotos. O estilo IA pede ChatGPT para gerar a arte. Se você já tem o PNG, envie com <code>carrossell card &lt;id&gt; &lt;n&gt; --imagem &lt;arquivo.png&gt;</code>.</p>
          </div>
        </>
      ) : (
        <>
          <div><b>Teste no terminal</b>{examples}</div>
          <CopyBlock value={`${cmd} criar --slides plano.json --estilo texto --exportar ~/Carrossell`} label="Copiar exemplo" />
          <button className="ghost-btn" type="button" onClick={onOpenGuide}>Ver guia passo a passo <ArrowRight size={15} /></button>
        </>
      )}

      {full && (onBack || onDone) && (
        <footer className="row">
          {onBack && <button className="ghost-btn" type="button" disabled={saving} onClick={onBack}><ArrowLeft size={16} /> Voltar</button>}
          <span className="spacer" />
          {onDone && <button className="btn primary" type="button" disabled={saving} onClick={onDone}>{saving ? "Salvando…" : "Concluir"}</button>}
        </footer>
      )}
    </section>
  );
}
