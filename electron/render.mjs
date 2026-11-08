import { BrowserWindow } from 'electron';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

// Renderiza o HTML dos modelos numa janela oculta: o PNG e o PDF saem iguais à prévia.
// A página é um arquivo local temporário para poder carregar as fontes do app.
// No Windows, antivírus e o próprio sistema às vezes travam um arquivo recém-criado e a janela
// falha ao abri-lo (ERR_FAILED). Por isso cada card tenta até 3 vezes, com arquivo e janela novos,
// e a última tentativa usa a pasta temporária do sistema.
const ATTEMPTS = 3;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export function createRenderer({ folder, fontsDir, failFirst = 0 }) {
  const fonts = {
    archivo500: pathToFileURL(join(fontsDir, 'archivo-latin-500-normal.woff2')).href,
    archivo800: pathToFileURL(join(fontsDir, 'archivo-latin-800-normal.woff2')).href,
  };
  let queue = Promise.resolve(), forcedFailures = failFirst;
  async function attempt(dir, html, { width, height }, work) {
    await mkdir(dir, { recursive: true });
    const file = join(dir, `${randomUUID()}.html`);
    await writeFile(file, html, 'utf8');
    const win = new BrowserWindow({ show: false, width, height, useContentSize: true, enableLargerThanScreen: true, paintWhenInitiallyHidden: true, webPreferences: { offscreen: true, sandbox: true, contextIsolation: true, nodeIntegration: false } });
    try {
      win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      win.webContents.on('will-navigate', (event) => event.preventDefault());
      win.setContentSize(width, height);
      try {
        // Só em desenvolvimento: simula a falha de abertura para provar as novas tentativas.
        if (forcedFailures > 0) { forcedFailures--; await win.loadFile(`${file}.ausente`); }
        await win.loadFile(file);
      } catch (error) { error.loadFailure = true; throw error; }
      await win.webContents.executeJavaScript('document.fonts.ready.then(()=>true)', true).catch(() => true);
      await new Promise((resolve) => setTimeout(resolve, 120));
      return await work(win);
    } finally {
      win.destroy();
      await rm(file, { force: true }).catch(() => {});
    }
  }
  async function withPage(html, size, work) {
    let last;
    for (let i = 0; i < ATTEMPTS; i++) {
      try { return await attempt(i < ATTEMPTS - 1 ? folder : join(tmpdir(), 'carrossell-render'), html, size, work); }
      catch (error) {
        if (!error?.loadFailure) throw error;
        last = error;
        console.error(`[render] tentativa ${i + 1} falhou: ${error.message}`);
        if (i < ATTEMPTS - 1) await pause(500 * (i + 1));
      }
    }
    throw new Error(`Não foi possível montar a imagem do card depois de ${ATTEMPTS} tentativas. Um antivírus pode estar bloqueando a pasta do Carrossell. (${last?.message || 'erro desconhecido'})`);
  }
  // Uma renderização por vez: janelas ocultas em paralelo disputam memória.
  const serial = (task) => { const next = queue.then(task, task); queue = next.catch(() => {}); return next; };
  return {
    fonts,
    png(html, size) {
      return serial(() => withPage(html, size, async (win) => {
        const image = await win.webContents.capturePage({ x: 0, y: 0, width: size.width, height: size.height });
        const resized = image.getSize().width === size.width ? image : image.resize({ width: size.width, height: size.height, quality: 'best' });
        return resized.toPNG();
      }));
    },
    pdf(html, size) {
      return serial(() => withPage(html, size, (win) => win.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, margins: { marginType: 'none' }, pageSize: { width: size.width / 96, height: size.height / 96 } })));
    },
  };
}
