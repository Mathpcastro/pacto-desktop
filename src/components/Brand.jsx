import { useEffect, useState } from "react";
import { Check, ImagePlus, Plus, RefreshCw, Scissors, Sparkles, Square, Trash2, X } from "lucide-react";
import { palette, slideHtml } from "../../core/templates.mjs";
import { Grow, Markdown, Spinner, TEMPLATE_FONTS, TemplateFrame } from "../ui.jsx";
import AgentSetup from "./AgentSetup.jsx";
import { InstagramSummary } from "./Instagram.jsx";

function DocSection({ title, value, onSave, hint, extra }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!editing) setDraft(value || "");
  }, [value, editing]);
  return (
    <section className="card-box" aria-label={title}>
      <div className="section-head">
        <h2>{title}</h2>
        <span className="spacer" />
        {editing ? (
          <>
            <button className="ghost-btn" onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button
              className="btn small primary"
              onClick={async () => {
                if (await onSave(draft)) setEditing(false);
              }}
            >
              Salvar
            </button>
          </>
        ) : (
          <button className="btn small" onClick={() => setEditing(true)}>
            Editar
          </button>
        )}
      </div>
      {extra}
      {editing ? (
        <label className="fld">
          <span>
            Documento usado pela IA <small>{hint}</small>
          </span>
          <Grow value={draft} onChange={(e) => setDraft(e.target.value)} />
        </label>
      ) : value ? (
        <>
          <Markdown text={value} clamp={!open} />
          {value.length > 900 && (
            <button className="link-btn" onClick={() => setOpen(!open)}>
              {open ? "Mostrar menos" : "Ler tudo"}
            </button>
          )}
        </>
      ) : (
        <p className="hint">Ainda não preenchido. Use “Refazer entrevista” para montar com o Carrossell.</p>
      )}
    </section>
  );
}

export default function Brand({ state, request, isPending, onRedo, onManual, onNotice, onInstagram }) {
  const profile = state.profile || {};
  const media = state.media || { faces: [], scenes: [], verified: true };
  const assets = media.assets || [];
  const brand = state.brandInfo || {};
  const colors = palette(profile.designKit || "");
  const connected = Boolean(state.account?.connected);
  const working = state.working;
  const [name, setName] = useState(media.displayName || "");
  const [handle, setHandle] = useState(media.handle || "");
  const [newScene, setNewScene] = useState("");
  const [tip, setTip] = useState("");
  const [area, setArea] = useState("texto");
  const feedback = state.feedback || [];
  const AREA_LABEL = { texto: "Texto", visual: "Visual", geral: "Tudo" };
  useEffect(() => {
    setName(media.displayName || "");
    setHandle(media.handle || "");
  }, [media.displayName, media.handle]);
  const saveMedia = (patch) => request("saveMedia", patch).then(() => true).catch(() => false);
  const saveDoc = (key) => (value) => request("saveProfile", { profile: { ...profile, [key]: value } }).then(() => (onNotice("Marca atualizada. Vale para os próximos projetos."), true)).catch(() => false);
  const pickImage = async () => {
    try {
      const ref = await request("importReference");
      return ref?.dataUrl ? ref : null;
    } catch {
      return null;
    }
  };
  const approved = media.scenes.filter((s) => s.status === "approved").length;
  const pendingScenes = media.scenes.filter((s) => s.status === "pending").length;
  const tweet = slideHtml({
    style: "tweet",
    slide: { title: "Assim o seu perfil aparece no estilo Tweet." },
    brand: { ...brand, name: name || brand.name, handle: handle || brand.handle, verified: media.verified !== false },
    fonts: TEMPLATE_FONTS,
  });
  const busyMedia = ["scenes", "scene", "cutout"].includes(working);
  return (
    <main className="page">
      <div className="section-head" style={{ alignItems: "flex-end" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <h1 className="page-title">{brand.name || "Sua marca"}</h1>
          <p className="page-sub">Tudo o que a IA usa em cada geração: o Contexto Oficial da Marca, o Design Kit e as suas fotos.</p>
        </div>
        <span className="spacer" />
        <button className="ghost-btn" onClick={onManual}>
          Preencher em formulário
        </button>
        <button className="btn" onClick={onRedo}>
          <RefreshCw size={15} /> Refazer pelo link ou entrevista
        </button>
      </div>
      <section className="card-box optimize" aria-label="Otimizar o Carrossell">
        <div className="section-head">
          <h2>Otimizar o Carrossell</h2>
          <span className="hint">O que você ensinar aqui vale para todos os próximos carrosséis.</span>
        </div>
        <form
          className="feedback-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (tip.trim().length < 3) return;
            try {
              await request("addFeedback", { text: tip.trim(), area });
              setTip("");
              onNotice("Anotado. Os próximos carrosséis seguem isso.");
            } catch {}
          }}
        >
          <Grow aria-label="Feedback para o Carrossell" value={tip} maxLength={600} placeholder="Ex.: textos mais curtos e diretos; nunca use emoji; capas com fundo escuro; sempre cite o teste grátis de 14 dias" onChange={(e) => setTip(e.target.value)} />
          <div className="row">
            <div className="seg" role="radiogroup" aria-label="Vale para" style={{ margin: 0 }}>
              {Object.entries(AREA_LABEL).map(([k, l]) => (
                <button type="button" key={k} role="radio" aria-checked={area === k} aria-pressed={area === k} onClick={() => setArea(k)}>
                  {l}
                </button>
              ))}
            </div>
            <span className="spacer" />
            <button className="btn small primary" disabled={tip.trim().length < 3}>
              Ensinar
            </button>
          </div>
        </form>
        {feedback.length > 0 && (
          <ul className="feedback-list" aria-label="O que o Carrossell já aprendeu">
            {feedback.map((f) => (
              <li key={f.id}>
                <span className="chip">{AREA_LABEL[f.area] || f.area}</span>
                <span>{f.text}</span>
                <button type="button" className="icon-only" aria-label={`Remover: ${f.text}`} onClick={() => request("removeFeedback", { id: f.id }).catch(() => {})}>
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="row">
          <span className="hint" style={{ flex: 1 }}>Quer copy ainda mais certeira? Responda a entrevista completa ou atualize pelo link do produto.</span>
          <button className="btn small" onClick={onRedo}>
            Melhorar Contexto e Design Kit
          </button>
        </div>
      </section>
      {busyMedia && (
        <div className="work-strip" role="status">
          <Spinner />
          <span>{working === "scenes" ? "Sugerindo cenas para as suas fotos…" : working === "cutout" ? "Recortando a sua foto…" : "Gerando a foto da cena…"}</span>
          <button className="ghost-btn" onClick={() => request("cancelWork").catch(() => {})}>
            <Square size={12} /> Parar
          </button>
        </div>
      )}
      <div className="brand-grid">
        <DocSection title="Contexto da marca" value={profile.brandContext} hint="Aula 02" onSave={saveDoc("brandContext")} />
        <DocSection
          title="Design Kit"
          value={profile.designKit}
          hint="Aula 05"
          onSave={saveDoc("designKit")}
          extra={
            <div className="swatches" aria-label="Paleta usada nos modelos">
              {[
                ["Destaque", colors.accent],
                ["Texto", colors.ink],
                ["Fundo", colors.paper],
                ["Apoio", colors.soft],
              ].map(([label, hex]) => (
                <div className="swatch" key={label}>
                  <i style={{ background: hex }} />
                  <b>{label}</b>
                  <code>{hex}</code>
                </div>
              ))}
            </div>
          }
        />
        <section className="card-box full" aria-label="Perfil e fotos">
          <div className="section-head">
            <h2>Perfil e fotos</h2>
          </div>
          <div className="sub">
            <div className="sub-head">
              <b>Foto de perfil</b>
              <span className="hint">Aparece nos estilos Tweet e Capa com sua foto</span>
            </div>
            <div className="profile-row">
              {media.avatar ? <img className="big-avatar" src={media.avatar} alt="Foto de perfil" /> : <span className="big-avatar">{(brand.name || "?").charAt(0)}</span>}
              <div style={{ display: "grid", gap: 10, minWidth: 220 }}>
                <div className="row">
                  <button
                    className="btn small"
                    onClick={async () => {
                      const ref = await pickImage();
                      if (ref && (await saveMedia({ avatar: ref.dataUrl }))) onNotice("Foto de perfil atualizada.");
                    }}
                  >
                    <ImagePlus size={15} /> {media.avatar ? "Trocar foto" : "Enviar foto"}
                  </button>
                  {media.avatar && (
                    <button className="ghost-btn" onClick={() => saveMedia({ avatar: "" })}>
                      Remover
                    </button>
                  )}
                </div>
                <div className="row">
                  <label className="fld" style={{ width: 150 }}>
                    <span>Nome</span>
                    <input value={name} maxLength={80} placeholder={profile.brand || "Sua marca"} onChange={(e) => setName(e.target.value)} onBlur={() => name !== (media.displayName || "") && saveMedia({ displayName: name.trim() })} />
                  </label>
                  <label className="fld" style={{ width: 150 }}>
                    <span>@ do Instagram</span>
                    <input value={handle} maxLength={60} placeholder="seuperfil" onChange={(e) => setHandle(e.target.value)} onBlur={() => handle !== (media.handle || "") && saveMedia({ handle })} />
                  </label>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={media.verified !== false} onChange={(e) => saveMedia({ verified: e.target.checked })} />
                  Mostrar selo de verificado
                </label>
              </div>
              <div className="tweet-preview">
                <TemplateFrame html={tweet} width={1080} height={1350} title="Prévia do perfil no estilo Tweet" />
              </div>
            </div>
          </div>
          <div className="sub">
            <div className="sub-head">
              <b>Fotos com o seu rosto</b>
              <span className="hint">{media.faces.length} de 10 · usadas em Foto de fundo e Capa com sua foto</span>
            </div>
            <div className="photo-grid">
              {media.faces.map((f) => {
                const cut = f.onColor?.[colors.accent];
                return (
                  <div className="tile" key={f.id}>
                    <div className="pic">
                      <img src={cut || f.dataUrl} alt={f.name} />
                      <button className="icon-only" aria-label={`Remover ${f.name}`} onClick={() => saveMedia({ removeFace: f.id })}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {cut ? (
                      <span className="chip good">
                        <Check size={12} /> Recorte pronto
                      </span>
                    ) : (
                      <button className="link-btn" disabled={!connected || Boolean(working)} onClick={() => request("faceOnColor", { id: f.id, color: colors.accent }).catch(() => {})}>
                        <Scissors size={13} /> Recortar na cor da marca
                      </button>
                    )}
                  </div>
                );
              })}
              {media.faces.length < 10 && (
                <button
                  className="add-tile"
                  onClick={async () => {
                    const ref = await pickImage();
                    if (ref && (await saveMedia({ addFaces: [ref] }))) onNotice("Foto adicionada.");
                  }}
                >
                  <Plus size={20} />
                  Adicionar foto
                </button>
              )}
            </div>
            <p className="hint">Envie fotos suas: de frente, trabalhando, sorrindo, em pé. Fotos de outras pessoas só com autorização delas. O Carrossell não gera rostos de pessoas reais nem famosas.</p>
          </div>
          <div className="sub">
            <div className="sub-head">
              <b>Imagens da marca</b>
              <span className="hint">{assets.length} de 12 · logo, produtos e o que pode aparecer nos cards</span>
            </div>
            <div className="photo-grid">
              {assets.map((a) => (
                <div className="tile" key={a.id}>
                  <div className="pic asset">
                    <img src={a.dataUrl} alt={a.name} />
                    <button className="icon-only" aria-label={`Remover ${a.name}`} onClick={() => saveMedia({ removeAsset: a.id })}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <span className="tile-name" title={a.name}>{a.name}</span>
                  <select aria-label={`Tipo de ${a.name}`} value={a.kind} onChange={(e) => saveMedia({ asset: { id: a.id, kind: e.target.value } })}>
                    <option value="logo">Logo</option>
                    <option value="produto">Produto</option>
                    <option value="outro">Outra imagem</option>
                  </select>
                </div>
              ))}
              {assets.length < 12 && (
                <button
                  className="add-tile"
                  onClick={async () => {
                    const ref = await pickImage();
                    if (ref && (await saveMedia({ addAssets: [{ name: ref.name.replace(/\.[a-z]+$/i, ""), dataUrl: ref.dataUrl, kind: assets.some((x) => x.kind === "logo") ? "produto" : "logo" }] }))) onNotice("Imagem adicionada à marca.");
                  }}
                >
                  <Plus size={20} />
                  Adicionar imagem
                </button>
              )}
            </div>
            <p className="hint">O logo vira referência em toda arte com IA. Produtos e outras imagens aparecem no card que você escolher, ou o Carrossell escolhe ao escrever o texto. Nos estilos prontos, a imagem entra no próprio card.</p>
          </div>
          <div className="sub">
            <div className="sub-head">
              <b>Cenas para fotos simples</b>
              <span className="hint">
                {approved} aprovadas{pendingScenes ? ` · ${pendingScenes} para revisar` : ""} · usadas no estilo Texto + foto
              </span>
              <span className="spacer" />
              <button className="btn small" disabled={!connected || Boolean(working)} onClick={() => request("suggestScenes").catch(() => {})}>
                <Sparkles size={15} /> Sugerir cenas
              </button>
            </div>
            <p className="hint">O Carrossell sugere cenas pelo seu Contexto da Marca. Só as aprovadas viram fotos nos carrosséis. Cada cena vira uma série de fotos do mesmo ambiente, com ângulos e detalhes diferentes: cada card usa uma foto da série.</p>
            <div className="scene-grid">
              {media.scenes.map((s) => (
                <div className={`scene ${s.status}`} key={s.id}>
                  <div className="pic">{s.image ? <img src={s.image} alt={s.label} /> : <span>{s.status === "approved" ? "Foto ainda não gerada" : "Prévia depois de aprovar"}</span>}</div>
                  {s.images?.length > 1 && (
                    <div className="series" aria-label={`${s.images.length} fotos do mesmo ambiente`}>
                      {s.images.map((img, i) => (
                        <img key={i} src={img} alt={`${s.label}, foto ${i + 1}`} />
                      ))}
                    </div>
                  )}
                  <div className="body">
                    <b>{s.label}</b>
                    <div className="row">
                      {s.status === "approved" ? (
                        <>
                          <span className="chip good">
                            <Check size={12} /> Aprovada
                          </span>
                          <span className="spacer" />
                          <button className="ghost-btn" disabled={!connected || Boolean(working)} onClick={() => request("sceneImage", { id: s.id, count: s.image ? 3 : 1 }).catch(() => {})}>
                            {s.image ? "+3 fotos do ambiente" : "Gerar foto"}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="btn small primary"
                            onClick={async () => {
                              if (!(await saveMedia({ scene: { id: s.id, status: "approved" } }))) return;
                              if (connected && !s.image) request("sceneImage", { id: s.id }).catch(() => {});
                            }}
                          >
                            Aprovar
                          </button>
                          {s.status !== "rejected" && (
                            <button className="btn small" onClick={() => saveMedia({ scene: { id: s.id, status: "rejected" } })}>
                              Recusar
                            </button>
                          )}
                        </>
                      )}
                      <button className="icon-only" aria-label={`Remover cena ${s.label}`} onClick={() => saveMedia({ removeScene: s.id })}>
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <form
              className="row"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newScene.trim()) return;
                if (await saveMedia({ addScenes: [{ label: newScene.trim(), prompt: newScene.trim() }] })) setNewScene("");
              }}
            >
              <label className="fld" style={{ flex: 1, minWidth: 220 }}>
                <span>Sugerir uma cena sua</span>
                <input value={newScene} maxLength={160} placeholder="Ex.: xícara de café ao lado da agenda de papel" onChange={(e) => setNewScene(e.target.value)} />
              </label>
              <button className="btn small" style={{ alignSelf: "flex-end" }} disabled={!newScene.trim() || isPending("saveMedia")}>
                <Plus size={15} /> Adicionar
              </button>
            </form>
          </div>
        </section>
      </div>
      <InstagramSummary state={state} request={request} onNotice={onNotice} onOpen={onInstagram} />
      <AgentSetup request={request} isPending={isPending} onNotice={onNotice} />
    </main>
  );
}
