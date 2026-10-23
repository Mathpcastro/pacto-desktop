import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { networkInterfaces } from "node:os";
import QRCode from "qrcode";

// Envio para o celular pela rede local: servidor só de leitura, com token
// aleatório no caminho, que expira sozinho. Serve apenas os arquivos do carrossel.
const PRIVATE = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
export function lanAddress(interfaces = networkInterfaces()) {
  const all = Object.values(interfaces)
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal);
  return (all.find((i) => PRIVATE.test(i.address)) || all[0])?.address || null;
}
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function page({ title, caption, files, base }) {
  const images = files
    .map((f, i) => ({ ...f, i }))
    .filter((f) => f.type === "image/png");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title>
<style>body{margin:0;font-family:system-ui,sans-serif;background:#f5f3ee;color:#242522}main{max-width:560px;margin:0 auto;padding:20px 16px 40px}h1{font:600 20px Georgia,serif;margin:4px 0 4px}p{font-size:14px;line-height:1.5;color:#74756e}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.grid img{width:100%;border-radius:6px;display:block;box-shadow:0 4px 14px #0002}.grid a{font-size:12px;color:#bb512f;text-decoration:none;display:block;margin-top:4px}
button{width:100%;border:0;border-radius:8px;padding:14px;font:600 15px system-ui;background:#bb512f;color:#fff;margin:6px 0}button.secondary{background:#fff;color:#242522;border:1px solid #deded6}
pre{white-space:pre-wrap;background:#fff;border:1px solid #deded6;border-radius:8px;padding:12px;font:14px/1.5 system-ui}</style></head><body><main>
<p>PACTO · enviado do seu computador</p><h1>${escape(title)}</h1><p>Salve as imagens no celular e publique no Instagram. Este link expira em poucos minutos.</p>
<button id="save">Salvar todas no celular</button>
<div class="grid">${images.map((f) => `<div><img src="${base}f/${f.i}" alt="${escape(f.name)}"><a href="${base}f/${f.i}" download="${escape(f.name.replace("/", "-"))}">Baixar ${escape(f.name)}</a></div>`).join("")}</div>
<h2 style="font:600 15px system-ui">Legenda</h2><pre id="caption">${escape(caption || "")}</pre><button class="secondary" id="copy">Copiar legenda</button>
<script>
const files=${JSON.stringify(images.map((f) => ({ url: `${base}f/${f.i}`, name: f.name.replace("/", "-") })))};
document.getElementById('copy').onclick=async()=>{try{await navigator.clipboard.writeText(document.getElementById('caption').textContent);document.getElementById('copy').textContent='Legenda copiada';}catch{alert('Segure o texto para copiar.');}};
document.getElementById('save').onclick=async()=>{
  try{const blobs=await Promise.all(files.map(async f=>new File([await (await fetch(f.url)).blob()],f.name,{type:'image/png'})));
    if(navigator.canShare&&navigator.canShare({files:blobs})){await navigator.share({files:blobs,title:document.title});return;}
  }catch(e){if(e&&e.name==='AbortError')return;}
  for(const f of files){const a=document.createElement('a');a.href=f.url;a.download=f.name;document.body.appendChild(a);a.click();a.remove();await new Promise(r=>setTimeout(r,400));}
};
</script></main></body></html>`;
}
export class ShareServer {
  constructor({ host = lanAddress(), ttlMs = 30 * 60000 } = {}) {
    this.host = host;
    this.ttlMs = ttlMs;
    this.server = null;
    this.timer = null;
  }
  async start({ title, caption, files }) {
    await this.stop();
    if (!this.host)
      throw new Error(
        "Não encontramos uma rede local. Conecte o computador ao Wi-Fi e tente de novo.",
      );
    if (!Array.isArray(files) || !files.length)
      throw new Error("Não há arquivos para enviar.");
    const token = randomBytes(24).toString("base64url"),
      base = `/${token}/`;
    const html = Buffer.from(page({ title, caption, files, base }));
    const server = createServer((req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "no-referrer");
      if (req.method !== "GET") {
        res.writeHead(405).end();
        return;
      }
      const path = (req.url || "").split("?")[0];
      if (path === base || path === base.slice(0, -1)) {
        res
          .writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Security-Policy":
              "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'",
          })
          .end(html);
        return;
      }
      const match = path.startsWith(`${base}f/`)
        ? /^\d{1,3}$/.exec(path.slice(base.length + 2))
        : null;
      const file = match ? files[Number(match[0])] : null;
      if (!file) {
        res.writeHead(404).end();
        return;
      }
      res
        .writeHead(200, {
          "Content-Type": file.type,
          "Content-Disposition": `inline; filename="${file.name.replace(/[^\w.-]/g, "-")}"`,
        })
        .end(Buffer.from(file.bytes));
    });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, this.host, resolve);
    });
    this.server = server;
    const url = `http://${this.host}:${server.address().port}${base}`;
    this.expiresAt = new Date(Date.now() + this.ttlMs).toISOString();
    this.timer = setTimeout(() => void this.stop(), this.ttlMs);
    this.timer.unref?.();
    const qr = await QRCode.toDataURL(url, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: "M",
    });
    return {
      url,
      qr,
      expiresAt: this.expiresAt,
      count: files.filter((f) => f.type === "image/png").length,
    };
  }
  async stop() {
    clearTimeout(this.timer);
    this.timer = null;
    const server = this.server;
    this.server = null;
    if (server) {
      server.closeAllConnections?.();
      await new Promise((r) => server.close(() => r()));
    }
  }
}
