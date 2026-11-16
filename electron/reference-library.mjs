import { mkdtemp, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, join } from 'node:path';
import { Worker } from 'node:worker_threads';
import { referenceAsset } from '../core/reference-pack.mjs';

const scheme = 'carrossell-ref';
const hashPattern = /^[a-f0-9]{64}$/;
function unpack(file, target) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../core/reference-pack-worker.mjs', import.meta.url), { workerData: { file, target } });
    worker.once('message', ({ pack, error }) => error ? reject(new Error(error)) : resolve(pack));
    worker.once('error', reject);
    worker.once('exit', code => reject(new Error(`Não foi possível ler o Swipe File (${code}).`)));
  });
}

export class ReferenceLibrary {
  constructor(root) {
    this.root = root;
    this.loading = this.load();
  }
  async load() {
    try {
      const hash = (await readFile(join(this.root, 'current'), 'utf8')).trim();
      if (!hashPattern.test(hash)) return null;
      const pack = JSON.parse(await readFile(join(this.root, hash, 'catalog.json'), 'utf8'));
      return pack.hash === hash && Array.isArray(pack.references) ? pack : null;
    } catch {
      return null;
    }
  }
  url(hash, name) {
    return name ? `${scheme}://library/${hash}/${name}` : '';
  }
  async catalog() {
    const pack = await this.loading;
    if (!pack) return null;
    return {
      title: pack.title,
      items: pack.references.map(({ caption, slides, proof, url, ...item }) => ({
        ...item, count: slides.length, image: this.url(pack.hash, item.thumbnail),
      })),
    };
  }
  async item(id) {
    const pack = await this.loading;
    const item = pack?.references.find(item => item.id === id);
    if (!item) throw new Error('Referência não encontrada.');
    return {
      ...item, slides: item.slides.map(name => this.url(pack.hash, name)), proof: this.url(pack.hash, item.proof),
    };
  }
  async attachment(id) {
    const pack = await this.loading;
    const item = pack?.references.find(item => item.id === id);
    if (!item?.thumbnail) throw new Error('Esta referência não tem uma imagem para anexar.');
    const image = await referenceAsset(join(this.root, pack.hash), item.thumbnail);
    return `data:image/webp;base64,${image.toString('base64')}`;
  }
  async image(request) {
    const url = new URL(request.url);
    const [, hash, name, extra] = url.pathname.split('/');
    const pack = await this.loading;
    if (request.method !== 'GET' || url.host !== 'library' || extra !== undefined || hash !== pack?.hash)
      return new Response(null, { status: 404 });
    try {
      const bytes = await referenceAsset(join(this.root, hash), name);
      return new Response(bytes, { headers: { 'content-type': 'image/webp', 'cache-control': 'private, max-age=3600', 'x-content-type-options': 'nosniff' } });
    } catch {
      return new Response(null, { status: 404 });
    }
  }
  async install(file, confirm) {
    if (typeof file !== 'string' || !isAbsolute(file) || !/\.(zip|carrossellrefs)$/i.test(basename(file)))
      throw new Error('Escolha um arquivo ZIP de referências do Carrossell.');
    if (this.installing) throw new Error('Já há um Swipe File sendo importado.');
    this.installing = true;
    let staging;
    try {
      const current = await this.loading;
      await mkdir(this.root, { recursive: true });
      staging = await mkdtemp(join(this.root, '.import-'));
      const pack = await unpack(file, staging);
      if (current?.hash === pack.hash) return { installed: true, duplicate: true, count: pack.references.length };
      if (current && pack.version <= current.version) throw new Error('Uma versão igual ou mais recente deste Swipe File já está instalada.');
      if (!await confirm({ title: pack.title, count: pack.references.length, bytes: (await stat(file)).size }))
        return { cancelled: true };
      const finalPath = join(this.root, pack.hash);
      const exists = await stat(finalPath).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; });
      if (!exists) {
        // Keep the pointer file in staging until the verified directory has been committed.
        await mkdir(join(staging, 'pack'));
        await rename(join(staging, 'assets'), join(staging, 'pack', 'assets'));
        await rename(join(staging, 'catalog.json'), join(staging, 'pack', 'catalog.json'));
        await rename(join(staging, 'pack'), finalPath);
      }
      const pointer = join(staging, 'current');
      await writeFile(pointer, pack.hash);
      await rename(pointer, join(this.root, 'current'));
      this.loading = Promise.resolve(pack);
      return { installed: true, count: pack.references.length };
    } finally {
      if (staging) await rm(staging, { recursive: true, force: true }).catch(() => {});
      this.installing = false;
    }
  }
}
