import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ImagePlus,
  LoaderCircle,
  Trash2,
} from "lucide-react";

const blank = {
  brand: "",
  product: "",
  audience: "",
  problem: "",
  promise: "",
  offer: "",
  cta: "",
  proof: "",
  tone: "",
  colors: "",
  style: "",
  freebie: "",
  differentiators: "",
  territories: "",
  references: [],
};
const steps = ["Seu negócio", "Público e oferta", "Identidade visual"];
const groups = [
  [
    {
      key: "brand",
      label: "Como sua marca se chama?",
      placeholder: "Nome da marca ou do negócio",
      required: true,
    },
    {
      key: "product",
      label: "O que você vende ou faz?",
      placeholder: "Seu produto, serviço ou área de atuação",
      area: true,
      required: true,
    },
    {
      key: "tone",
      label: "Como você quer conversar?",
      placeholder: "Ex.: direto, próximo e didático",
    },
    {
      key: "differentiators",
      label: "O que diferencia o seu negócio?",
      placeholder: "Seu jeito de fazer, experiência ou proposta",
      area: true,
    },
    {
      key: "territories",
      label: "Sobre quais assuntos você quer falar?",
      placeholder: "Temas que conectam sua experiência ao seu público",
      area: true,
    },
  ],
  [
    {
      key: "audience",
      label: "Com quem você quer falar?",
      placeholder: "Descreva seu público e o momento dele",
      area: true,
      required: true,
    },
    {
      key: "problem",
      label: "Qual problema você ajuda a resolver?",
      placeholder: "A dificuldade que seu público reconhece",
      area: true,
    },
    {
      key: "promise",
      label: "Qual transformação você entrega?",
      placeholder: "O resultado que você consegue sustentar",
    },
    {
      key: "offer",
      label: "Qual é sua oferta?",
      placeholder: "O que está incluído, condições e valor, se fizer sentido",
      area: true,
    },
    {
      key: "cta",
      label: "Qual próximo passo você quer incentivar?",
      placeholder: "Ex.: acessar o link do perfil",
    },
    {
      key: "proof",
      label: "Que provas você já tem?",
      placeholder:
        "Resultados reais, experiência ou depoimentos. Pode deixar vazio.",
      area: true,
    },
    {
      key: "freebie",
      label: "Você oferece algum material gratuito?",
      placeholder: "Ex.: checklist, guia ou aula. Opcional.",
    },
  ],
  [
    {
      key: "colors",
      label: "Suas cores",
      placeholder: "Ex.: azul-marinho, creme e laranja / #153246",
    },
    {
      key: "style",
      label: "Sua direção visual",
      placeholder:
        "Ex.: editorial, imagens com textura, títulos grandes e bastante respiro",
      area: true,
    },
  ],
];

export default function Profile({
  profile,
  request,
  onDone,
  onCancel,
  account,
  busy,
}) {
  const [draft, setDraft] = useState({ ...blank, ...profile });
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const edit = (key, value) => setDraft((p) => ({ ...p, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setSaving(true);
    try {
      await request("saveProfile", { profile: draft });
      onDone();
    } catch {
    } finally {
      setSaving(false);
    }
  };
  const addReference = async () => {
    setImporting(true);
    try {
      const ref = await request("importReference");
      if (ref?.dataUrl)
        setDraft((p) => ({
          ...p,
          references: [
            ...(p.references || []),
            { name: ref.name, dataUrl: ref.dataUrl },
          ],
        }));
    } catch {
    } finally {
      setImporting(false);
    }
  };
  return (
    <section className="profile-flow">
      <div className="profile-intro">
        <span className="eyebrow">SEU PONTO DE PARTIDA</span>
        <h1>
          O conteúdo começa
          <br />
          <em>com você.</em>
        </h1>
        <p>
          Conte um pouco sobre seu negócio. O PACTO usa esse contexto para
          construir carrosséis com a sua voz.
        </p>
        <ol className="step-list">
          {steps.map((name, index) => (
            <li
              key={name}
              className={
                step === index ? "current" : step > index ? "done" : ""
              }
            >
              <span>
                {step > index ? <Check size={13} /> : `0${index + 1}`}
              </span>
              {name}
            </li>
          ))}
        </ol>
        <div className="onboarding-note">
          <span
            className={`status-dot ${account?.connected ? "connected" : ""}`}
          />
          <div>
            <strong>
              {account?.connected
                ? "Conta conectada"
                : "Sua conta, seu estúdio"}
            </strong>
            <p>
              {account?.connected
                ? account.label || "Tudo pronto para criar com o Codex."
                : "Conecte sua conta para planejar e gerar suas imagens."}
            </p>
            {!account?.connected && (
              <button
                className="text-button"
                type="button"
                disabled={busy}
                onClick={() => request("connect").catch(() => {})}
              >
                {busy ? "Conectando…" : "Conectar conta"}{" "}
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
      <form className="profile-form" onSubmit={save}>
        <div className="form-heading">
          <span className="eyebrow">ETAPA 0{step + 1} / 03</span>
          <h2>{steps[step]}</h2>
          <p>
            {
              [
                "Vamos entender o que faz a sua marca existir.",
                "Clareza sobre a mensagem vem antes do design.",
                "Uma identidade própria, em cada slide.",
              ][step]
            }
          </p>
        </div>
        <div className="fields">
          {groups[step].map((field) => (
            <label className="field" key={field.key}>
              <span>
                {field.label}
                {field.required && (
                  <span className="required" aria-label="obrigatório">
                    {" "}
                    *
                  </span>
                )}
              </span>
              {field.area ? (
                <textarea
                  value={draft[field.key]}
                  onChange={(e) => edit(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={field.key === "audience" ? 3 : 2}
                />
              ) : (
                <input
                  value={draft[field.key]}
                  onChange={(e) => edit(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}
            </label>
          ))}
          {step === 2 && (
            <div className="field">
              <span>
                Referências visuais <span className="muted">· opcional</span>
              </span>
              <button
                className="reference-add"
                type="button"
                onClick={addReference}
                disabled={importing}
              >
                {importing ? (
                  <LoaderCircle className="spin" size={20} />
                ) : (
                  <ImagePlus size={20} />
                )}
                <span>
                  Adicionar uma referência
                  <small>Uma imagem que traduza o estilo que você busca</small>
                </span>
                <span className="plus">+</span>
              </button>
              {draft.references?.length > 0 && (
                <div className="references">
                  {draft.references.map((ref, index) => (
                    <figure key={`${ref.name}-${index}`}>
                      <img
                        src={ref.dataUrl}
                        alt={ref.name || "Referência visual"}
                      />
                      <figcaption>{ref.name || "Referência"}</figcaption>
                      <button
                        type="button"
                        aria-label={`Remover referência ${ref.name}`}
                        onClick={() =>
                          edit(
                            "references",
                            draft.references.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </figure>
                  ))}
                </div>
              )}
              <p className="field-hint">
                Sua identidade é usada nos carrosséis. As cores do aplicativo
                permanecem independentes.
              </p>
            </div>
          )}
        </div>
        <footer className="form-footer">
          {step > 0 ? (
            <button
              type="button"
              className="button ghost"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft size={16} /> Voltar
            </button>
          ) : onCancel ? (
            <button type="button" className="button ghost" onClick={onCancel}>
              Cancelar
            </button>
          ) : (
            <span className="field-hint">Você pode editar isso depois.</span>
          )}
          <button className="button primary" type="submit" disabled={saving}>
            {saving && <LoaderCircle size={16} className="spin" />}
            {step === 2
              ? saving
                ? "Salvando…"
                : profile
                  ? "Salvar identidade"
                  : "Entrar no estúdio"
              : "Continuar"}
            {!saving && <ArrowRight size={16} />}
          </button>
        </footer>
      </form>
    </section>
  );
}
