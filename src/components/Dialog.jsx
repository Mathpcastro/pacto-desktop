import { useContext, useEffect, useRef } from "react";
import { X } from "lucide-react";
import IconButton from "./IconButton.jsx";
import { RuntimeErrorContext } from "../usePacto.js";

export default function Dialog({
  title,
  eyebrow,
  onClose,
  children,
  wide = false,
}) {
  const ref = useRef(null);
  const error = useContext(RuntimeErrorContext);
  useEffect(() => {
    const element = ref.current;
    const before = document.activeElement;
    if (!element.open) element.showModal();
    return () => {
      element.close();
      before?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "dialog-wide" : ""}`}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header className="dialog-header">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 id="dialog-title">{title}</h2>
        </div>
        <IconButton label="Fechar janela" onClick={onClose}>
          <X size={19} />
        </IconButton>
      </header>
      {error && (
        <p className="dialog-error" role="alert">
          {error}
        </p>
      )}
      {children}
    </dialog>
  );
}
