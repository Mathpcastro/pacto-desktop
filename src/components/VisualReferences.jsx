import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Spinner } from "../ui.jsx";

const MAX = 6;
const TYPES = ["image/png", "image/jpeg", "image/webp"];
function readImage(file) {
  if (!TYPES.includes(file.type)) return Promise.reject(new Error("Use imagens PNG, JPEG ou WebP. No Google Imagens, escolha Copiar imagem, não Copiar link."));
  if (file.size > 10 * 1024 * 1024) return Promise.reject(new Error("Cada referência pode ter até 10 MB."));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name || "Imagem colada", dataUrl: reader.result });
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem. Tente novamente."));
    reader.readAsDataURL(file);
  });
}

export default function VisualReferences({ profile, request, onNotice }) {
  const refs = profile?.references || [];
  const current = useRef(refs); current.current = refs;
  const locked = useRef(false);
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mutate = async (makeRefs) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try {
      const references = await makeRefs(current.current);
      await request("saveVisualReferences", { references });
      current.current = references;
      onNotice?.("Referências atualizadas. Valem para as próximas artes desta marca.");
    } catch (e) { setError(String(e?.message || "Não foi possível salvar as referências.").replace(/^Error invoking remote method '[^']+': (?:\w*Error: )?/, "")); }
    finally { locked.current = false; setBusy(false); }
  };
  const add = (files) => {
    if (!files.length) return;
    return mutate(async (saved) => {
      if (saved.length + files.length > MAX) throw new Error("Use até seis referências. Remova uma imagem para adicionar outra.");
      return [...saved, ...await Promise.all(files.map(readImage))];
    });
  };
  return <section className="card-box visual-references" aria-label="Referências visuais">
    <div className="section-head"><h2>Referências visuais</h2><span className="hint">{refs.length}/{MAX} imagens</span></div>
    <p className="hint">Adicione exemplos de carrosséis, gráficos, imagens ou composições que combinam com a sua marca. A IA usa essas referências junto com o Contexto e o Design Kit ao criar novas artes, inclusive no piloto automático.</p>
    <div className="reference-paste" tabIndex={0} role="group" aria-label="Colar imagens de referência" aria-busy={busy}
      onPaste={(event) => {
        const files = Array.from(event.clipboardData.items).filter(item => item.kind === "file").map(item => item.getAsFile()).filter(Boolean);
        event.preventDefault();
        if (files.length) void add(files);
        else setError("Copie a imagem e cole aqui com Ctrl+V (no Mac, Cmd+V). Um link ou texto não contém a imagem.");
      }}>
      <ImagePlus size={24} aria-hidden="true" />
      <strong>Clique nesta área e cole uma imagem</strong>
      <span className="hint">Ctrl+V ou Cmd+V · PNG, JPEG ou WebP · até 10 MB por imagem</span>
      <button type="button" className="btn small" disabled={busy || refs.length >= MAX} onClick={() => input.current?.click()}>{busy ? <Spinner /> : <ImagePlus size={15} />} Adicionar imagens</button>
      <input ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp" hidden aria-label="Arquivos de referência visual" onChange={(e) => { const files = Array.from(e.target.files || []); e.target.value = ""; void add(files); }} />
    </div>
    {error && <p role="alert" style={{color:"var(--danger)"}}>{error}</p>}
    {!!refs.length && <div className="photo-grid reference-grid">
      {refs.map((ref, i) => <div className="tile" key={`${i}-${ref.name}`}>
        <div className="pic asset"><img src={ref.dataUrl} alt={ref.name || `Referência ${i + 1}`} /><button type="button" className="icon-only" disabled={busy} aria-label={`Remover referência ${i + 1}`} onClick={() => void mutate(saved => saved.filter((_, n) => n !== i))}><Trash2 size={14} /></button></div>
        <span className="hint">{ref.name || `Referência ${i + 1}`}</span>
      </div>)}
    </div>}
    <p className="hint">Referências orientam o visual; não são copiadas literalmente. Para colocar um logo, print ou produto exato no card, use Imagens da marca. Nos estilos prontos, como Tweet e Texto, a diagramação continua sendo a escolhida. As referências orientam novas artes e fotos geradas com IA.</p>
  </section>;
}
