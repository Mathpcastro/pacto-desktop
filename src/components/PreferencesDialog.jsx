import { Check, Minus, Moon, Plus, RotateCcw, Sun } from "lucide-react";
import Dialog from "./Dialog.jsx";

const palettes = [
  { id: "carrossell", label: "Carrossell", color: "#ff5a36" },
  { id: "ocean", label: "Oceano", color: "#28769c" },
  { id: "forest", label: "Floresta", color: "#4a7e53" },
  { id: "violet", label: "Ametista", color: "#7659a6" },
];

const fonts = [
  { id: "system", label: "Original do Carrossell" },
  { id: "arial", label: "Arial" },
  { id: "verdana", label: "Verdana" },
  { id: "georgia", label: "Georgia" },
];

const minScale = 100;
const maxScale = 125;
const scaleStep = 5;

export default function PreferencesDialog({
  preferences,
  onChange,
  onReset,
  onClose,
}) {
  const adjustScale = (delta) =>
    onChange({
      scale: Math.min(maxScale, Math.max(minScale, preferences.scale + delta)),
    });

  return (
    <Dialog
      title="Ajuste o estúdio para você."
      eyebrow="PREFERÊNCIAS"
      onClose={onClose}
      wide
    >
      <div className="preferences-body">
        <section
          className="preference-section"
          aria-labelledby="appearance-label"
        >
          <div className="preference-heading">
            <div>
              <span className="eyebrow">APARÊNCIA</span>
              <h3 id="appearance-label">Modo de cor</h3>
            </div>
          </div>
          <div
            className="preference-segments"
            role="group"
            aria-label="Modo de cor"
          >
            <button
              type="button"
              aria-pressed={preferences.theme === "light"}
              className={preferences.theme === "light" ? "selected" : ""}
              onClick={() => onChange({ theme: "light" })}
            >
              <Sun size={17} /> Claro
            </button>
            <button
              type="button"
              aria-pressed={preferences.theme === "dark"}
              className={preferences.theme === "dark" ? "selected" : ""}
              onClick={() => onChange({ theme: "dark" })}
            >
              <Moon size={17} /> Escuro
            </button>
          </div>
          <div className="preference-heading palette-heading">
            <div>
              <span className="eyebrow">CORES</span>
              <h3>Tema de destaque</h3>
            </div>
          </div>
          <div
            className="palette-grid"
            role="group"
            aria-label="Paleta de cores"
          >
            {palettes.map((palette) => (
              <button
                key={palette.id}
                type="button"
                aria-pressed={preferences.palette === palette.id}
                aria-label={`Tema ${palette.label}`}
                className={`palette-choice ${
                  preferences.palette === palette.id ? "selected" : ""
                }`}
                onClick={() => onChange({ palette: palette.id })}
              >
                <span
                  className="palette-swatch"
                  style={{ "--palette-color": palette.color }}
                />
                <span>{palette.label}</span>
                {preferences.palette === palette.id && <Check size={15} />}
              </button>
            ))}
          </div>
        </section>

        <section
          className="preference-section"
          aria-labelledby="reading-label"
        >
          <div className="preference-heading">
            <div>
              <span className="eyebrow">LEITURA</span>
              <h3 id="reading-label">
                Deixe os textos maiores e mais confortáveis.
              </h3>
            </div>
          </div>
          <label className="preference-field">
            <span>Fonte da interface</span>
            <select
              value={preferences.font}
              onChange={(event) => onChange({ font: event.target.value })}
            >
              {fonts.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.label}
                </option>
              ))}
            </select>
          </label>
          <div className="preference-scale-label">
            <span>Tamanho do texto e dos controles</span>
            <strong>{preferences.scale}%</strong>
          </div>
          <div className="preference-scale-control">
            <button
              type="button"
              className="scale-step"
              aria-label="Diminuir tamanho do texto"
              disabled={preferences.scale <= minScale}
              onClick={() => adjustScale(-scaleStep)}
            >
              <Minus size={17} />
            </button>
            <input
              type="range"
              min={minScale}
              max={maxScale}
              step={scaleStep}
              value={preferences.scale}
              aria-label="Tamanho do texto e dos controles"
              onChange={(event) =>
                onChange({ scale: Number(event.target.value) })
              }
            />
            <button
              type="button"
              className="scale-step"
              aria-label="Aumentar tamanho do texto"
              disabled={preferences.scale >= maxScale}
              onClick={() => adjustScale(scaleStep)}
            >
              <Plus size={17} />
            </button>
          </div>
          <div className="preference-scale-ends" aria-hidden="true">
            <span>100%</span>
            <span>125%</span>
          </div>
          <div className="preference-preview" aria-live="polite">
            <span className="eyebrow">PRÉVIA</span>
            <p>Uma boa ideia merece uma boa sequência.</p>
            <small>
              O texto e os controles aumentam no app; as artes exportadas
              mantêm o tamanho original.
            </small>
          </div>
        </section>
      </div>
      <footer className="preferences-footer">
        <button type="button" className="text-button" onClick={onReset}>
          <RotateCcw size={15} /> Restaurar padrão
        </button>
        <button type="button" className="button primary" onClick={onClose}>
          Concluir
        </button>
      </footer>
    </Dialog>
  );
}
