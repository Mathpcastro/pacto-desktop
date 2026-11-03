import { useState } from "react";
import { ArrowRight, BarChart3, CalendarDays, Check, Compass, Layers, Palette, Terminal } from "lucide-react";
import Dialog from "./Dialog.jsx";

const GOALS = [
  { id: "create", label: "Criar conteúdo", icon: Layers, title: "Da sua ideia ao conteúdo pronto", lead: "Carrosséis, stories e materiais com a voz e o visual da sua marca.", items: [
    ["Carrossel", "Transforme uma ideia em cards para o Instagram.", "Criar carrossel", "carousel"],
    ["Stories", "Prepare stories a partir de um carrossel. Exporte e poste manualmente.", "Preparar stories", "stories"],
    ["Material gratuito", "Monte um PDF útil para entregar aos seus contatos.", "Criar material", "material"],
    ["Apresentação", "Organize uma proposta ou uma mensagem em slides.", "Criar apresentação", "presentation"],
  ] },
  { id: "ideas", label: "Encontrar pautas", icon: Compass, title: "Encontre a próxima boa ideia", lead: "Comece pelas dúvidas do seu público, por uma referência ou pelo que já funcionou.", items: [
    ["Radar de ideias", "Encontre temas ligados ao Contexto da Marca.", "Abrir Radar", "radar"],
    ["Biblioteca de referências", "Estude abordagens e use uma referência no seu próximo conteúdo.", "Abrir referências", "references"],
    ["Modelar um conteúdo", "Cole um post e entenda o princípio que fez ele funcionar.", "Modelar referência", "model"],
    ["Seus melhores conteúdos", "Registre resultados e crie variações de um vencedor.", "Ver resultados", "results"],
  ] },
  { id: "publish", label: "Publicar e organizar", icon: CalendarDays, title: "Organize o que vai para o ar", lead: "Revise, escolha as contas e decida quando publicar. Seus arquivos continuam à mão.", items: [
    ["Conteúdos e agendamentos", "Veja sua biblioteca e as publicações agendadas.", "Ver agendamentos", "calendar"],
    ["Revisar e publicar", "Abra um carrossel pronto e escolha as contas antes de publicar.", "Escolher carrossel", "publish"],
    ["Aprovar pelo Telegram", "Configure sua rotina e revise o conteúdo antes de liberar.", "Abrir piloto", "pilot"],
    ["Baixar e exportar", "Abra um projeto para baixar PNGs, stories ou PDF.", "Escolher conteúdo", "export"],
  ] },
  { id: "results", label: "Entender resultados", icon: BarChart3, title: "Use os resultados para criar melhor", lead: "Consulte as contas conectadas e encontre pistas para o próximo conteúdo.", items: [
    ["Métricas do Instagram", "Consulte alcance, interações e posts das contas conectadas.", "Abrir Analytics", "analytics"],
    ["Resultados e vencedores", "Registre comentários, salvamentos e vendas dos seus projetos.", "Registrar resultados", "results"],
  ] },
  { id: "brand", label: "Cuidar da marca", icon: Palette, title: "Seu jeito, em cada criação", lead: "Guarde contexto, estilo e materiais próprios para cada marca.", items: [
    ["Contexto e voz", "Conte o que você vende e como quer se comunicar.", "Abrir Contexto da marca", "brand-context"],
    ["Cores e estilo", "Defina a aparência dos próximos conteúdos no Design Kit.", "Abrir Design Kit", "brand-design"],
    ["Logo, fotos e imagens", "Organize o material visual da marca.", "Abrir imagens da marca", "brand-images"],
    ["Contas do Instagram", "Conecte as contas e escolha onde publicar.", "Gerenciar Instagram", "instagram"],
  ] },
  { id: "agents", label: "Usar com agentes e CLI", icon: Terminal },
];
const AGENTS = { claude: "Claude Code", gemini: "Gemini CLI", codex: "Codex" };
const PROMPT = "Use o carrossell no modo agente. Crie 6 cards sobre [tema], seguindo minha marca. Me mostre o texto antes de montar os cards. Não publique.";

export default function Capabilities({ onClose, onAction, onAgents, onNotice, initialGoal = "create" }) {
  const [goalId, setGoal] = useState(initialGoal);
  const [agent, setAgent] = useState("claude");
  const [copyFallback, setCopyFallback] = useState(false);
  const goal = GOALS.find((item) => item.id === goalId) || GOALS[0];
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(PROMPT);
      onNotice("Pedido copiado. Cole no seu agente.");
    } catch { setCopyFallback(true); }
  };
  return (
    <Dialog title="O que posso fazer no Carrossell?" className="capabilities-dialog" onClose={onClose}>
      <p className="capabilities-intro">Escolha seu objetivo. Encontre um jeito simples de começar.</p>
      <div className="capabilities-layout">
        <nav className="capabilities-nav" aria-label="Objetivos no Carrossell">
          {GOALS.map(({ id, label, icon: Icon }) => <button key={id} aria-pressed={goal.id === id} onClick={() => setGoal(id)}><Icon size={18} /><span>{label}</span></button>)}
        </nav>
        <section className="capabilities-content" aria-label="Recursos do objetivo escolhido" key={goal.id}>
          {goal.id === "agents" ? <>
            <h3>Use o agente que você já tem</h3>
            <p className="capabilities-lead">Seu agente escreve e monta os cards. Tudo aparece no Carrossell para revisar e baixar.</p>
            <div className="capabilities-providers" role="tablist" aria-label="Escolher seu agente">
              {Object.entries(AGENTS).map(([id, name]) => <button key={id} role="tab" aria-selected={agent === id} onClick={() => setAgent(id)}>{name}</button>)}
            </div>
            <ul className="capabilities-benefits">
              <li><Check size={17} />Sem exigir uma conta ChatGPT conectada ao app.</li>
              <li><Check size={17} />Cards em modelos Texto/Tweet ou montados pelo agente.</li>
              <li><Check size={17} />Projetos, exportação e Instagram no mesmo lugar.</li>
            </ul>
            <p className="capabilities-caveat">Imagens por IA dependem das ferramentas do seu agente. Cards em modelos ou HTML podem ser feitos sem o ChatGPT.</p>
            <div className="row"><button className="btn primary" onClick={() => onAgents(agent)}>Usar com {AGENTS[agent]}<ArrowRight size={16} /></button><button className="ghost-btn" onClick={copy}>Copiar pedido</button></div>
            {copyFallback && <div className="capabilities-copy" role="status">Selecione e copie o pedido:<p tabIndex={0}>{PROMPT}</p></div>}
            <details className="capabilities-cli"><summary>Ver instruções da CLI</summary><p><b>Comando carrossell (CLI)</b><br />Seu agente ou terminal pode criar conteúdos, preparar stories, exportar, agendar, consultar métricas e trabalhar com várias marcas.</p><code>carrossell ajuda --agente</code><p>{PROMPT}</p><p>Para publicar ou agendar, configure o Instagram e peça a ação explicitamente.</p></details>
            <p className="capabilities-separate">Este modo é separado do piloto automático. A rotina e a conversa do Telegram usam a conta ChatGPT conectada ao app.</p>
          </> : <>
            <h3>{goal.title}</h3><p className="capabilities-lead">{goal.lead}</p>
            {goal.items.map(([title, description, label, action]) => <article className="capabilities-resource" key={action}><div><h4>{title}</h4><p>{description}</p></div><button className="link-btn" onClick={() => onAction(action)}>{label}<ArrowRight size={16} /></button></article>)}
          </>}
        </section>
      </div>
      <footer className="capabilities-footer"><p>Também funciona com <b>Claude, Gemini e Codex.</b></p><button className="link-btn" onClick={() => setGoal("agents")}>Ver como<ArrowRight size={16} /></button></footer>
    </Dialog>
  );
}
