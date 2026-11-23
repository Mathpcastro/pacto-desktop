import { useContext, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import IconButton from "./IconButton.jsx";
import { RuntimeErrorContext } from "../usePacto.js";
import { canCloseFromBackdrop, isBackdropEvent } from "./dialog-close.mjs";

export default function Dialog({
  title,
  eyebrow,
  onClose,
  onCloseBlocked,
  children,
  wide = false,
  className = "",
  localError,
}) {
  const ref = useRef(null);
  const pointerDownOnBackdrop = useRef(false);
  const titleId = useId();
  const runtimeError = useContext(RuntimeErrorContext);
  const error = localError || runtimeError;
  useEffect(() => {
    const element = ref.current;
    const before = document.activeElement;
    const clearPointer = () => { pointerDownOnBackdrop.current = false; };
    if (!element.open) element.showModal();
    window.addEventListener("blur", clearPointer);
    return () => {
      window.removeEventListener("blur", clearPointer);
      element.close();
      before?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "dialog-wide" : ""} ${className}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        pointerDownOnBackdrop.current = false;
        onClose("onCancel");
      }}
      onPointerDown={(e) => {
        pointerDownOnBackdrop.current = e.button === 0 && isBackdropEvent(e, ref.current);
      }}
      onPointerCancel={() => { pointerDownOnBackdrop.current = false; }}
      onClick={(e) => {
        const clickOnBackdrop = isBackdropEvent(e, ref.current);
        const canClose = canCloseFromBackdrop(pointerDownOnBackdrop.current, clickOnBackdrop);
        pointerDownOnBackdrop.current = false;
        if (canClose) onClose("backdrop-click");
        else if (clickOnBackdrop) onCloseBlocked?.("backdrop-click");
      }}
    >
      <header className="dialog-header">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 id={titleId}>{title}</h2>
        </div>
        <IconButton label="Fechar janela" onClick={() => onClose("header-close-button")}>
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
