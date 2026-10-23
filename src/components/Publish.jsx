import { useEffect, useState } from "react";
import {
  Check,
  CloudUpload,
  Copy,
  Download,
  FolderOpen,
  Image,
  LoaderCircle,
  Megaphone,
  Pencil,
  PartyPopper,
  Smartphone,
  Sparkles,
  Trophy,
} from "lucide-react";
import { LessonLink } from "../course.jsx";
import Dialog from "./Dialog.jsx";

const copyText = (value) =>
  navigator.clipboard?.writeText(value || "").catch(() => {});

function ShareDialog({ project, request, onClose }) {
  const [shared, setShared] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    request("shareToPhone", { id: project.id })
      .then((result) => alive && setShared(result))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      request("stopShare").catch(() => {});
    };
    // Starts once per open; closing the dialog stops the local link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Dialog
      title="Envie para o celular"
      eyebrow="QR CODE · MESMO WI-FI"
      onClose={onClose}
    >
      <div className="dialog-fields share-dialog">
        {shared ? (
          <>
            <img
              className="share-qr"
              src={shared.qr}
              alt="QR code para abrir o carrossel no celular"
            />
            <ol className="share-steps">
              <li>Conecte o celular ao mesmo Wi-Fi deste computador.</li>
              <li>Aponte a câmera para o QR code e abra o link.</li>
              <li>Toque em "Salvar todas no celular" e copie a legenda.</li>
            </ol>
            <p className="field-hint">
              O link mostra só este carrossel ({shared.count} imagens) e expira
              em 30 minutos ou quando você fechar esta janela. Se o Windows
              perguntar sobre a rede, permita o acesso em redes privadas.
            </p>
            <code className="share-url">{shared.url}</code>
          </>
        ) : failed ? (
          <p className="dialog-copy">
            Não foi possível abrir o link local. Verifique se o computador está
            conectado ao Wi-Fi.
          </p>
        ) : (
          <div className="assistant-working" role="status">
            <LoaderCircle size={14} className="spin" />
            <span>Preparando o link para o celular…</span>
          </div>
        )}
      </div>
      <div className="dialog-footer">
        <button className="button primary" onClick={onClose}>
          Concluir
        </button>
      </div>
    </Dialog>
  );
}

function DriveDialog({ project, request, settings, onClose, onNotice }) {
  const [state, setState] = useState("saving");
  const [result, setResult] = useState(null);
  const save = async () => {
    setState("saving");
    try {
      const saved = await request("saveToDrive", { id: project.id });
      if (saved?.needsFolder) setState("missing");
      else {
        setResult(saved);
        setState("done");
        onNotice?.("Carrossel salvo na pasta do Google Drive.");
      }
    } catch {
      setState("error");
    }
  };
  useEffect(() => {
    void save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const choose = async () => {
    try {
      const chosen = await request("chooseDriveFolder");
      if (!chosen?.cancelled) void save();
    } catch {}
  };
  return (
    <Dialog
      title="Salvar no Google Drive"
      eyebrow="PASTA SINCRONIZADA"
      onClose={onClose}
    >
      <div className="dialog-fields">
        {state === "saving" && (
          <div className="assistant-working" role="status">
            <LoaderCircle size={14} className="spin" />
            <span>Salvando imagens, legenda e textos…</span>
          </div>
        )}
        {state === "done" && (
          <>
            <p className="dialog-copy flush">
              Pronto. Em instantes o Google Drive sincroniza e os arquivos
              aparecem no app do Drive no celular.
            </p>
            <code className="share-url">{result.folder}</code>
          </>
        )}
        {state === "missing" && (
          <p className="dialog-copy flush">
            Não encontramos a pasta "Meu Drive" neste computador. Instale o
            Google Drive para computador (drive.google.com/drive/download) e
            entre com sua conta, ou escolha outra pasta sincronizada, como a do
            OneDrive.
          </p>
        )}
        {state === "error" && (
          <p className="dialog-copy flush">
            Não foi possível salvar nessa pasta. Escolha outra pasta.
          </p>
        )}
        {settings?.driveFolder && state !== "saving" && (
          <p className="field-hint">Pasta usada: {settings.driveFolder}</p>
        )}
      </div>
      <div className="dialog-footer">
        <button className="button ghost" onClick={choose}>
          <FolderOpen size={15} /> Escolher outra pasta
        </button>
        <button className="button primary" onClick={onClose}>
          Concluir
        </button>
      </div>
    </Dialog>
  );
}

function StoriesDialog({ project, request, busy, onClose }) {
  const [working, setWorking] = useState(false);
  const stories = project.stories || [];
  const generating = busy && project.status === "generating";
  return (
    <Dialog
      title="Stories: perguntas e oferta"
      eyebrow="AULA 08 · DEPOIS DO CARROSSEL"
      onClose={onClose}
      wide
    >
      <div className="dialog-fields">
        <p className="field-hint">
          Use os stories para caixa de perguntas e oferta, alternando. A arte é
          opcional: gere só a dos stories que você quiser, para economizar o
          limite da conta.
        </p>
        <LessonLink step="stories" />
        {stories.length > 0 ? (
          <div className="story-list">
            {stories.map((story, i) => (
              <article className="story-item" key={story.id}>
                <div className="story-frame">
                  {story.image ? (
                    <img src={story.image} alt={`Story ${i + 1}`} />
                  ) : (
                    <span>{story.text}</span>
                  )}
                </div>
                <div>
                  <span className="eyebrow">
                    STORY {i + 1} · {story.type.toUpperCase()}
                  </span>
                  <p className="story-text">{story.text}</p>
                  {story.sticker && (
                    <p className="field-hint">Sticker: {story.sticker}</p>
                  )}
                  {story.cta && <p className="field-hint">CTA: {story.cta}</p>}
                  <div className="story-actions">
                    <button
                      className="text-button"
                      onClick={() =>
                        copyText(
                          [story.text, story.sticker, story.cta]
                            .filter(Boolean)
                            .join("\n"),
                        )
                      }
                    >
                      <Copy size={12} /> Copiar
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        request("generateStoryArt", {
                          id: project.id,
                          storyId: story.id,
                        }).catch(() => {})
                      }
                    >
                      <Image size={12} />{" "}
                      {story.image ? "Gerar arte de novo" : "Gerar arte 9:16"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="dialog-copy flush">
            O PACTO cria de 4 a 6 stories a partir deste carrossel e do seu
            Contexto Oficial da Marca.
          </p>
        )}
        {generating && (
          <div className="assistant-working" role="status">
            <LoaderCircle size={14} className="spin" />
            <span>Desenhando o story…</span>
          </div>
        )}
      </div>
      <div className="dialog-footer">
        <button className="button ghost" onClick={onClose}>
          Fechar
        </button>
        <button
          className="button primary"
          disabled={busy || working}
          onClick={async () => {
            setWorking(true);
            try {
              await request("stories", { id: project.id });
            } catch {
            } finally {
              setWorking(false);
            }
          }}
        >
          {working ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <Sparkles size={15} />
          )}
          {stories.length ? "Criar outra sequência" : "Criar stories"}
        </button>
      </div>
    </Dialog>
  );
}

export function PublishScreen({
  project,
  request,
  busy,
  settings,
  onEdit,
  onNotice,
  onOpenDialog,
}) {
  const [dialog, setDialog] = useState(null);
  const [celebrate] = useState(!settings?.firstCompletedAt);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (celebrate)
      request("saveSettings", {
        firstCompletedAt: new Date().toISOString(),
      }).catch(() => {});
    // Only the first finished carousel gets the celebration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const exporting = async () => {
    try {
      const result = await request("export", { id: project.id });
      if (!result.cancelled)
        onNotice(
          `${result.count} imagens exportadas${result.path ? ` para ${result.path}` : ""}.`,
        );
    } catch {}
  };
  return (
    <div className={`publish-screen ${celebrate ? "celebrate" : ""}`}>
      <header>
        <span className="eyebrow">
          {celebrate ? (
            <>
              <PartyPopper size={13} /> SEU PRIMEIRO CARROSSEL QUE VENDE
            </>
          ) : (
            "PRONTO PARA PUBLICAR"
          )}
        </span>
        <h2>
          {celebrate
            ? "Você fez. Agora publique hoje."
            : "Pronto. Publique hoje."}
        </h2>
        <p>
          {project.slides.length} cards em 4:5, legenda com o CTA na primeira
          linha{project.ctaKit ? " e o roteiro de DM" : ""}. Volume → Sinal →
          Repetição: depois de publicar, registre o resultado.
        </p>
      </header>
      <div className="publish-cards">
        {project.slides.map((slide, i) => (
          <img
            key={slide.id}
            src={slide.image}
            alt={`Card ${i + 1}: ${slide.title}`}
            style={{ animationDelay: `${i * 70}ms` }}
          />
        ))}
      </div>
      <div className="publish-grid">
        <section className="publish-caption">
          <header>
            <span className="eyebrow">LEGENDA</span>
            <button
              className="text-button"
              onClick={() => {
                copyText(project.caption);
                setCopied(true);
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}{" "}
              {copied ? "Copiada" : "Copiar legenda"}
            </button>
          </header>
          <p>
            {project.caption ||
              "Sem legenda. Edite em Título, briefing e legenda."}
          </p>
          {project.ctaKit ? (
            <p className="field-hint">
              Palavra-chave: <strong>{project.ctaKit.keywords[0]}</strong> · DM
              pronta no kit de CTA.
            </p>
          ) : (
            <button className="text-button" onClick={() => onOpenDialog("cta")}>
              <Megaphone size={12} /> Gerar CTA, DM e oferta
            </button>
          )}
        </section>
        <section className="publish-actions">
          <button
            className="button primary full"
            onClick={() => setDialog("phone")}
          >
            <Smartphone size={16} /> Enviar para o celular
          </button>
          <button
            className="button secondary full"
            onClick={() => setDialog("drive")}
          >
            <CloudUpload size={16} /> Salvar no Google Drive
          </button>
          <button
            className="button secondary full"
            disabled={busy}
            onClick={exporting}
          >
            <Download size={16} /> Exportar ZIP
          </button>
          <button
            className="button secondary full"
            onClick={() => setDialog("stories")}
          >
            <Sparkles size={16} /> Stories de perguntas e oferta
          </button>
          {project.publishedAt ? (
            <button
              className="button secondary full"
              onClick={() => onOpenDialog("results")}
            >
              <Trophy size={16} /> Registrar resultado
            </button>
          ) : (
            <button
              className="button secondary full"
              onClick={() =>
                request("markPublished", { id: project.id })
                  .then(() =>
                    onNotice(
                      "Marcado como publicado. Registre o resultado em 2 ou 3 dias.",
                    ),
                  )
                  .catch(() => {})
              }
            >
              <Check size={16} /> Marquei como publicado
            </button>
          )}
          <button className="text-button" onClick={onEdit}>
            <Pencil size={13} /> Ajustar os cards
          </button>
        </section>
      </div>
      {dialog === "phone" && (
        <ShareDialog
          project={project}
          request={request}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "drive" && (
        <DriveDialog
          project={project}
          request={request}
          settings={settings}
          onNotice={onNotice}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "stories" && (
        <StoriesDialog
          project={project}
          request={request}
          busy={busy}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
