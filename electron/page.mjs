import { productUrl } from '../core/ugc-product.mjs';
import { setTimeout as pause } from 'node:timers/promises';

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const MOBILE_SCALE = 3;
const MOBILE_USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36';
const HIDE_SCROLLBARS = '::-webkit-scrollbar{display:none!important} html,body{scrollbar-width:none!important}';
const PRODUCT_ERROR = 'Não foi possível capturar a página do produto. Confira o link ou envie uma imagem.';
const PRODUCT_TIMEOUT = 20000;

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

function within(promise, ms, message) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); })]).finally(() => clearTimeout(timer));
}

export async function captureMobileFold(win, url, timeout = PRODUCT_TIMEOUT) {
  const contents = win.webContents;
  const controller = new AbortController();
  const capture = async () => {
    // A janela offscreen já tem 390×844 CSS e deviceScaleFactor 3 (ver readPage).
    // Não usar contents.debugger/Emulation: no Electron 44 do Linux isso derruba o processo.
    await win.loadURL(url, { userAgent: MOBILE_USER_AGENT });
    await pause(1000, undefined, { signal: controller.signal });
    const currentUrl = productUrl(contents.getURL());
    await contents.insertCSS(HIDE_SCROLLBARS, { cssOrigin: 'user' });
    await contents.executeJavaScript("window.scrollTo({top:0,left:0,behavior:'instant'})");
    const shot = await contents.capturePage({ x: 0, y: 0, ...MOBILE_VIEWPORT });
    if (shot.isEmpty()) throw new Error(PRODUCT_ERROR);
    return { url: currentUrl, screenshot: shot.toDataURL({ scaleFactor: MOBILE_SCALE }) };
  };
  try {
    return await within(capture(), Math.min(timeout, PRODUCT_TIMEOUT), PRODUCT_ERROR);
  } finally {
    controller.abort();
  }
}

export async function readPage(url, { timeout = 30000, product = false } = {}) {
  const target = new URL(url);
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Use um link http ou https.');
  const deadline = Date.now() + Math.min(timeout, PRODUCT_TIMEOUT);
  const { BrowserWindow, session } = await import('electron');
  const partition = `page-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { width, height } = product ? MOBILE_VIEWPORT : { width: 1280, height: 900 };
  const offscreen = product ? { deviceScaleFactor: MOBILE_SCALE } : true;
  const win = new BrowserWindow({ show: false, width, height, useContentSize: true, enableLargerThanScreen: product, paintWhenInitiallyHidden: true, webPreferences: { offscreen, sandbox: true, contextIsolation: true, nodeIntegration: false, partition, javascript: true } });
  const pageSession = session.fromPartition(partition);
  pageSession.on('will-download', (event) => event.preventDefault());
  pageSession.setPermissionRequestHandler((_wc, _permission, done) => done(false));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.setAudioMuted(true);
  if(product){
    const restrict=(event,details)=>{
      try{productUrl(typeof details==='string'?details:details.url);}catch{event.preventDefault();}
    };
    win.webContents.on('will-navigate',restrict);
    win.webContents.on('will-redirect',restrict);
  }
  try {
    if (product) return await captureMobileFold(win, target.href, deadline - Date.now());
    await within(win.loadURL(target.href, { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0 Safari/537.36' }), timeout, 'A página demorou demais para abrir.');
    // Sites em React/Next montam o conteúdo depois do carregamento.
    await pause(2500);
    const data = await within(win.webContents.executeJavaScript(EXTRACT, true), 15000, 'A página demorou demais para responder.');
    // O print só ajuda o Design Kit: se a janela oculta não pintar, segue sem ele.
    const shot = await within(win.webContents.capturePage({ x: 0, y: 0, width, height }), 10000, '').catch(() => null);
    return { ...data, url: win.webContents.getURL(), screenshot: !shot || shot.isEmpty() ? '' : shot.toDataURL() };
  } catch (error) {
    if (product) throw new Error(PRODUCT_ERROR);
    throw new Error(`Não consegui abrir a página (${error.message.replace(/^Error:\s*/, '').slice(0, 120)}). Confira o link ou escreva uma frase sobre o que você vende.`);
  } finally {
    win.destroy();
    const cleanup = pageSession.clearStorageData().catch(() => {});
    if (product) {
      await within(cleanup, Math.max(0, deadline - Date.now()), PRODUCT_ERROR).catch(() => {});
    } else {
      await cleanup;
    }
  }
}

export async function captureProductPage(url) {
  const { screenshot } = await readPage(productUrl(url), { product: true });
  return screenshot;
}
