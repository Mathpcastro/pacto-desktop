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

// Cada pacote tem o seu ponteiro: "current" é o Swipe File do Instagram (como antes), e os outros
// usam "current-<id>". Assim o pacote do TikTok entra ao lado das 500 referências, sem trocar nada.
const pointer = id => id === 'kimi-500' ? 'current' : `current-${id}`;
const KNOWN = ['kimi-500', 'tiktok-slideshows'];

export class ReferenceLibrary {
  constructor(root) {
    this.root = root;
    this.loading = this.load();
  }
  async loadOne(id) {
    try {
      const hash = (await readFile(join(this.root, pointer(id)), 'utf8')).trim();
      if (!hashPattern.test(hash)) return null;
      const pack = JSON.parse(await readFile(join(this.root, hash, 'catalog.json'), 'utf8'));
      // Pacotes instalados antes dos vários pacotes não gravavam o id: o ponteiro diz qual é.
      return pack.hash === hash && Array.isArray(pack.references) ? { ...pack, id: pack.id || id } : null;
    } catch {
      return null;
    }
  }
  async load() {
    return (await Promise.all(KNOWN.map(id => this.loadOne(id)))).filter(Boolean);
  }
  url(hash, name) {
    return name ? `${scheme}://library/${hash}/${name}` : '';
  }
  async find(id) {
    for (const pack of await this.loading) {
      const item = pack.references.find(item => item.id === id);
      if (item) return { pack, item };
    }
    return {};
  }
  async catalog() {
    const packs = await this.loading;
    if (!packs.length) return null;
    const collections = packs.map(pack => ({
      id: pack.id, title: pack.title,
      items: pack.references.map(({ caption, slides, proof, url, ...item }) => ({
        ...item, count: slides.length, image: this.url(pack.hash, item.thumbnail),
      })),
    }));
    // title/items do primeiro pacote continuam aqui para quem lia o formato antigo.
    return { title: collections[0].title, items: collections[0].items, packs: collections };
  }
  async item(id) {
    const { pack, item } = await this.find(id);
    if (!item) throw new Error('Referência não encontrada.');
    return {
      ...item, slides: item.slides.map(name => this.url(pack.hash, name)), proof: this.url(pack.hash, item.proof),
    };
  }
  async attachment(id) {
    const { pack, item } = await this.find(id);
    if (!item?.thumbnail) throw new Error('Esta referência não tem uma imagem para anexar.');
    const image = await referenceAsset(join(this.root, pack.hash), item.thumbnail);
    return `data:image/webp;base64,${image.toString('base64')}`;
  }
  async image(request) {
    const url = new URL(request.url);
    const [, hash, name, extra] = url.pathname.split('/');
    const pack = (await this.loading).find(pack => pack.hash === hash);
    if (request.method !== 'GET' || url.host !== 'library' || extra !== undefined || !pack)
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
      const installed = await this.loading;
      await mkdir(this.root, { recursive: true });
      staging = await mkdtemp(join(this.root, '.import-'));
      const pack = await unpack(file, staging);
      const current = installed.find(item => item.id === pack.id);
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
      const next = join(staging, pointer(pack.id));
      await writeFile(next, pack.hash);
      await rename(next, join(this.root, pointer(pack.id)));
      this.loading = Promise.resolve([...installed.filter(item => item.id !== pack.id), pack]
        .sort((a, b) => KNOWN.indexOf(a.id) - KNOWN.indexOf(b.id)));
      return { installed: true, count: pack.references.length };
    } finally {
      if (staging) await rm(staging, { recursive: true, force: true }).catch(() => {});
      this.installing = false;
    }
  }
}
