import { useEffect, useRef, useState } from "react";

const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Ctrl+K: as ações secundárias ficam aqui em vez de botões espalhados pela tela.
export default function CommandPalette({ commands, onClose }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef(null);
  const list = commands.filter((c) => !c.hidden && norm(`${c.label} ${c.hint || ""}`).includes(norm(query.trim())));
  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => setIndex(0), [query]);
  const run = (command) => {
    if (!command || command.disabled) return;
    onClose();
    command.run();
  };
  return (
    <div
      className="scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cmdk" role="dialog" aria-label="Comandos">
        <input
          ref={input}
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdk-list"
          aria-label="O que você quer fazer?"
          placeholder="O que você quer fazer?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(list.length - 1, i + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(0, i - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(list[index]);
            } else if (e.key === "Escape") onClose();
          }}
        />
        {list.length ? (
          <ul id="cmdk-list" role="listbox">
            {list.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === index}
                aria-disabled={c.disabled || undefined}
                style={c.disabled ? { opacity: 0.45 } : undefined}
                onMouseEnter={() => setIndex(i)}
                onClick={() => run(c)}
              >
                <span>{c.label}</span>
                {c.hint && <small>{c.hint}</small>}
              </li>
            ))}
          </ul>
        ) : (
          <div className="none">Nada encontrado para “{query}”.</div>
        )}
      </div>
    </div>
  );
}
