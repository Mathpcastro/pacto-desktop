import { Bot, CheckSquare, Lightbulb } from "lucide-react";

const tabs = [
  { id: "ideas", label: "Ideias", Icon: Lightbulb },
  { id: "review", label: "Para revisar", Icon: CheckSquare },
  { id: "pilot", label: "Piloto automático", Icon: Bot },
];

export default function RadarNavigation({ view, pendingReviews, onView }) {
  function moveFocus(event, index) {
    const next = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    event.currentTarget.parentElement.querySelectorAll("[role=tab]")[next]?.focus();
    onView(tabs[next].id);
  }

  return <header className="page radar-heading">
    <h1 className="page-title">Radar</h1>
    <p className="page-sub">Encontre ideias e acompanhe o que o piloto preparou.</p>
    <div className="radar-tabs" role="tablist" aria-label="Radar">
      {tabs.map(({ id, label, Icon }, index) => <button key={id} id={`radar-tab-${id}`} type="button"
        role="tab" aria-selected={view === id} aria-controls="radar-workspace" tabIndex={view === id ? 0 : -1}
        onClick={() => onView(id)} onKeyDown={(event) => moveFocus(event, index)}>
        <Icon size={15} aria-hidden="true" /> {label}
        {id === "review" && pendingReviews > 0 && <span className="radar-count">{pendingReviews}</span>}
      </button>)}
    </div>
  </header>;
}
