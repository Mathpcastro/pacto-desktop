import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { zipSync } from 'fflate';
import { unpackReferencePack } from '../core/reference-pack.mjs';
import { ReferenceLibrary } from '../electron/reference-library.mjs';

const json = value => Buffer.from(JSON.stringify(value));
const encode = (version = 1) => {
  const names = {
    'manifest.json': json({ format: 'carrossell-swipe-file', schema: 1, id: 'kimi-500', title: 'Coleção de teste', count: 500, version }),
    'references.json': json(Array.from({ length: 500 }, (_, index) => ({
      id: `CAR-${String(index + 1).padStart(4, '0')}`, author: 'Autor de teste', hook: `Gancho ${index + 1}`,
      coverage: 'cover_or_partial', evidence: 'metrics_text_only', slides: [],
      url: 'https://example.com/teste', caption: '', metricText: '', niche: 'ia', language: 'pt-BR', platform: 'instagram',
      likes: null, comments: null,
    }))),
  };
  names['checksums.json'] = json(Object.fromEntries(Object.entries(names).map(([name, bytes]) =>
    [name, { size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }])));
  return names;
};

async function folder(t) {
  const root = await mkdtemp(join(tmpdir(), 'carrossell-pack-'));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 3 }));
  return root;
}

test('a valid package installs once and reloads without adding projects or inlining images', async t => {
  const root = await folder(t);
  const zip = join(root, 'swipe.zip');
  await writeFile(zip, zipSync(encode()));
  const library = new ReferenceLibrary(join(root, 'installed'));
  assert.equal(await library.catalog(), null);
  assert.deepEqual(await library.install(zip, async () => false), { cancelled: true });
  assert.deepEqual(await readdir(join(root, 'installed')), []);
  assert.deepEqual(await library.install(zip, async () => true), { installed: true, count: 500 });
  assert.equal((await library.install(zip, async () => { throw Error('duplicate must not confirm'); })).duplicate, true);
  const loaded = new ReferenceLibrary(join(root, 'installed'));
  assert.equal((await loaded.catalog()).items.length, 500);
  assert.equal((await loaded.item('pack-CAR-0500')).hook, 'Gancho 500');
  assert.equal((await loaded.image({ url: 'carrossell-ref://library/invalid/../state.json', method: 'GET' })).status, 404);
  const update = join(root, 'update.zip');
  await writeFile(update, zipSync(encode(2)));
  assert.equal((await loaded.install(update, async () => true)).count, 500);
  await assert.rejects(loaded.install(zip, async () => true), /mais recente/);
});

test('ZIP traversal, unexpected assets and checksum changes fail before extraction', async t => {
  const root = await folder(t);
  const zip = join(root, 'invalid.zip');
  const target = join(root, 'target');
  await mkdir(target);
  for (const files of [
    { ...encode(), '../outside.webp': Buffer.from('binary') },
    { ...encode(), 'assets/CAR-0001-thumb.webp': Buffer.from('binary') },
    { ...encode(), 'references.json': Buffer.from('[]') },
  ]) {
    await writeFile(zip, zipSync(files));
    await assert.rejects(unpackReferencePack(zip, target), /ZIP não é/);
    assert.deepEqual(await readdir(target), []);
  }
});

// Pacote do TikTok: outro id, quantidade livre (até 1.000) e métricas de views, salvos e compartilhamentos.
const webp = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64');
// Imagens vão sem compressão no ZIP (como o empacotador faz), JSON comprimido.
const stored = names => Object.fromEntries(Object.entries(names).map(([name, bytes]) => [name, name.startsWith('assets/') ? [bytes, { level: 0 }] : bytes]));
const encodeTikTok = (count = 3, version = 1) => {
  const ids = Array.from({ length: count }, (_, index) => `TT-73000000000000000${String(index).padStart(2, "0")}`);
  const names = {};
  for (const id of ids) { names[`assets/${id}-thumb.webp`] = webp; names[`assets/${id}-001.webp`] = webp; }
  names['manifest.json'] = json({ format: 'carrossell-swipe-file', schema: 1, id: 'tiktok-slideshows', title: `Slideshows virais do TikTok · ${count}`, count, version });
  names['references.json'] = json(ids.map((id, index) => ({
    id, author: '@autora', hook: `apps you need ${index + 1}`, coverage: 'full_slides', evidence: 'metrics_text_only',
    slides: [`${id}-001.webp`], url: 'https://www.tiktok.com/@autora/photo/1', caption: '', metricText: '1,4 mi views',
    niche: 'estudos', language: 'en', platform: 'tiktok', likes: 10, comments: 2, views: 1400000, saves: 86000, shares: 900,
  })));
  names['checksums.json'] = json(Object.fromEntries(Object.entries(names).map(([name, bytes]) =>
    [name, { size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }])));
  return names;
};

test('the TikTok pack installs next to the Instagram Swipe File and both stay available', async t => {
  const root = await folder(t);
  const instagram = join(root, 'swipe.zip'), tiktok = join(root, 'tiktok.zip');
  await writeFile(instagram, zipSync(encode()));await writeFile(tiktok, zipSync(stored(encodeTikTok())));
  const library = new ReferenceLibrary(join(root, 'installed'));
  assert.equal((await library.install(instagram, async () => true)).count, 500);
  assert.deepEqual(await library.install(tiktok, async ({ title, count }) => title === 'Slideshows virais do TikTok · 3' && count === 3), { installed: true, count: 3 });
  const reopened = new ReferenceLibrary(join(root, 'installed'));
  const catalog = await reopened.catalog();
  assert.deepEqual(catalog.packs.map(p => [p.id, p.items.length]), [['kimi-500', 500], ['tiktok-slideshows', 3]]);
  assert.equal(catalog.items.length, 500, 'o formato antigo continua apontando para o Swipe File do Instagram');
  const item = catalog.packs[1].items[0];
  assert.equal(item.id, 'pack-TT-7300000000000000000');assert.equal(item.views, 1400000);assert.equal(item.saves, 86000);assert.equal(item.platform, 'tiktok');
  assert.match(await reopened.attachment(item.id), /^data:image\/webp;base64,/);
  const [, , , hash, name] = item.image.split('/');
  assert.equal((await reopened.image({ url: `carrossell-ref://library/${hash}/${name}`, method: 'GET' })).status, 200);
  assert.equal((await reopened.item('pack-CAR-0001')).hook, 'Gancho 1');
  await writeFile(tiktok, zipSync(stored(encodeTikTok(4, 2))));
  assert.equal((await reopened.install(tiktok, async () => true)).count, 4, 'atualizar o TikTok não mexe no Instagram');
  assert.equal((await reopened.catalog()).packs[0].items.length, 500);
});

test('a pack with an unknown id or a wrong count is refused', async t => {
  const root = await folder(t), file = join(root, 'x.zip');
  const bad = encodeTikTok(2);bad['manifest.json'] = json({ format: 'carrossell-swipe-file', schema: 1, id: 'outro-pacote', title: 'x', count: 2, version: 1 });
  bad['checksums.json'] = json(Object.fromEntries(Object.entries(bad).filter(([n]) => n !== 'checksums.json').map(([name, bytes]) => [name, { size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }])));
  await writeFile(file, zipSync(stored(bad)));
  await assert.rejects(unpackReferencePack(file, await mkdtemp(join(root, 'a-'))), /não é um Swipe File/);
});
