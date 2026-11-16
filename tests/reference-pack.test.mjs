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
