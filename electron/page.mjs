import { BrowserWindow, session } from 'electron';

// Lê a página do produto numa janela oculta e isolada: texto visível, título, descrição,
// cores mais usadas e um print do topo. Funciona com sites feitos em React/Next.
// Sessão própria e temporária: não leva cookies do app nem guarda nada depois.
const EXTRACT = `(() => {
  const meta = (n) => document.querySelector('meta[name="' + n + '"],meta[property="' + n + '"]')?.content || '';
  const text = (document.body?.innerText || '').replace(/\\n{3,}/g, '\\n\\n').trim();
  const count = new Map();
  const add = (c, w) => { const m = /rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/.exec(c || ''); if (!m || (m[4] !== undefined && Number(m[4]) < 0.5)) return; const hex = '#' + [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join(''); count.set(hex, (count.get(hex) || 0) + w); };
  for (const el of [...document.querySelectorAll('body, header, section, a, button, h1, h2, h3, [class*=btn], [class*=button]')].slice(0, 600)) {
    const s = getComputedStyle(el), r = el.getBoundingClientRect(), area = Math.min(r.width * r.height, 400000) / 10000;
    add(s.backgroundColor, /^(A|BUTTON)$/.test(el.tagName) || /btn|button/.test(el.className) ? 30 : area);
    if (/^H[1-3]$|^A$|^BUTTON$/.test(el.tagName)) add(s.color, 12);
  }
  const colors = [...count].sort((a, b) => b[1] - a[1]).map(([c]) => c).slice(0, 8);
  return { title: document.title || meta('og:title'), description: meta('description') || meta('og:description'), text: text.slice(0, 30000), colors };
})()`;

export async function readPage(url, { timeout = 30000 } = {}) {
  const target = new URL(url);
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Use um link http ou https.');
  const partition = `page-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const win = new BrowserWindow({ show: false, width: 1280, height: 900, useContentSize: true, paintWhenInitiallyHidden: true, webPreferences: { offscreen: true, sandbox: true, contextIsolation: true, nodeIntegration: false, partition, javascript: true } });
  const pageSession = session.fromPartition(partition);
  pageSession.on('will-download', (event) => event.preventDefault());
  pageSession.setPermissionRequestHandler((_wc, _permission, done) => done(false));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.setAudioMuted(true);
  try {
    const load = win.loadURL(target.href, { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0 Safari/537.36' });
    await Promise.race([load, new Promise((_, reject) => setTimeout(() => reject(new Error('A página demorou demais para abrir.')), timeout))]);
    // Sites em React/Next montam o conteúdo depois do carregamento.
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const data = await win.webContents.executeJavaScript(EXTRACT, true);
    const shot = await win.webContents.capturePage({ x: 0, y: 0, width: 1280, height: 900 });
    return { ...data, url: win.webContents.getURL(), screenshot: shot.isEmpty() ? '' : shot.toDataURL() };
  } catch (error) {
    throw new Error(`Não consegui abrir a página (${error.message.replace(/^Error:\s*/, '').slice(0, 120)}). Confira o link ou escreva uma frase sobre o que você vende.`);
  } finally {
    win.destroy();
    await pageSession.clearStorageData().catch(() => {});
  }
}
