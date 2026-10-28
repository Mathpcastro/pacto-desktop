import { BrowserWindow } from 'electron';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';

// Renderiza o HTML dos modelos numa janela oculta: o PNG e o PDF saem iguais à prévia.
// A página é um arquivo local temporário para poder carregar as fontes do app.
export function createRenderer({ folder, fontsDir }) {
  const fonts = {
    archivo500: pathToFileURL(join(fontsDir, 'archivo-latin-500-normal.woff2')).href,
    archivo800: pathToFileURL(join(fontsDir, 'archivo-latin-800-normal.woff2')).href,
  };
  let queue = Promise.resolve();
  async function withPage(html, { width, height }, work) {
    await mkdir(folder, { recursive: true });
    const file = join(folder, `${randomUUID()}.html`);
    await writeFile(file, html, 'utf8');
    const win = new BrowserWindow({ show: false, width, height, useContentSize: true, enableLargerThanScreen: true, paintWhenInitiallyHidden: true, webPreferences: { offscreen: true, sandbox: true, contextIsolation: true, nodeIntegration: false } });
    try {
      win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      win.webContents.on('will-navigate', (event) => event.preventDefault());
      win.setContentSize(width, height);
      await win.loadFile(file);
      await win.webContents.executeJavaScript('document.fonts.ready.then(()=>true)', true).catch(() => true);
      await new Promise((resolve) => setTimeout(resolve, 120));
      return await work(win);
    } finally {
      win.destroy();
      await rm(file, { force: true });
    }
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
