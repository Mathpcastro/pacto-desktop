import { createHash } from 'node:crypto';
import { mkdir, open, readFile, statfs, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { unzipSync } from 'fflate';

const MB = 1024 * 1024;
// CAR-: Swipe File do Instagram (500 referências). TT-: slideshows virais do TikTok (pacote do plano Completo).
const ID = /^(?:CAR-[0-9]{4,6}|TT-[0-9]{6,24})$/;
const assetName = /^(?:CAR-[0-9]{4,6}|TT-[0-9]{6,24})-(?:thumb|proof|[0-9]{3})\.webp$/;
// Pacotes aceitos e quantas referências cada um pode ter. Cada pacote instala ao lado dos outros.
export const PACKS = {
  'kimi-500': count => count === 500,
  'tiktok-slideshows': count => count >= 1 && count <= 1000,
};
const jsonFiles = ['manifest.json', 'references.json', 'checksums.json'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const invalid = () => new Error('O ZIP não é um Swipe File do Carrossell válido.');

function text(value, max) {
  if (typeof value !== 'string' || value.length > max) throw invalid();
  return value;
}

const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;

function validateWebp(bytes) {
  const image = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length);
  if (image.length < 30 || image.toString('ascii', 0, 4) !== 'RIFF' ||
      image.readUInt32LE(4) !== image.length - 8 || image.toString('ascii', 8, 12) !== 'WEBP') throw invalid();
  const type = image.toString('ascii', 12, 16);
  let width, height;
  if (type === 'VP8X' && !(image[20] & 2)) {
    width = 1 + image.readUIntLE(24, 3);
    height = 1 + image.readUIntLE(27, 3);
  } else if (type === 'VP8 ' && image.subarray(23, 26).equals(Buffer.from([0x9d, 0x01, 0x2a]))) {
    width = image.readUInt16LE(26) & 0x3fff;
    height = image.readUInt16LE(28) & 0x3fff;
  } else if (type === 'VP8L' && image[20] === 0x2f) {
    const size = image.readUInt32LE(21);
    width = (size & 0x3fff) + 1;
    height = ((size >>> 14) & 0x3fff) + 1;
  }
  if (!width || !height || width > 1400 || height > 1400) throw invalid();
}

export async function unpackReferencePack(file, target) {
  let zip;
  const handle = await open(file, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 22 || stat.size > 192 * MB) throw new Error('Escolha um ZIP do Carrossell de até 192 MB.');
    zip = Buffer.alloc(stat.size);
    const { bytesRead } = await handle.read({ buffer: zip, length: zip.length, position: 0 });
    if (bytesRead !== zip.length || zip.readUInt32LE(0) !== 0x04034b50) throw invalid();
  } finally {
    await handle.close();
  }

  const entries = new Map();
  let total = 0;
  let files;
  try {
    files = unzipSync(zip, { filter: ({ name, size, originalSize, compression }) => {
      const json = jsonFiles.includes(name);
      const image = name.startsWith('assets/') && assetName.test(name.slice(7));
      total += originalSize;
      if ((!json && !image) || entries.has(name) || entries.size >= 6500 ||
          !originalSize || originalSize > (json ? 5 * MB : MB) || !size || size > zip.length ||
          total > 200 * MB || (compression === 0 && size !== originalSize) ||
          (compression !== 0 && (!json || compression !== 8 || originalSize > 100 * size))) throw invalid();
      entries.set(name, originalSize);
      return true;
    } });
  } catch {
    throw invalid();
  }
  const parse = name => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(files[name]));
  for (const name of jsonFiles) if (!files[name]) throw invalid();
  let manifest, rows, checksums;
  try {
    manifest = parse('manifest.json');
    rows = parse('references.json');
    checksums = parse('checksums.json');
  } catch {
    throw invalid();
  }
  if (manifest?.format !== 'carrossell-swipe-file') throw invalid();
  if (manifest.schema !== 1) throw new Error('Este Swipe File precisa de uma versão compatível do Carrossell.');
  if (!Object.hasOwn(PACKS, manifest.id) || !Number.isSafeInteger(manifest.count) || !PACKS[manifest.id](manifest.count) ||
      !Number.isSafeInteger(manifest.version) || manifest.version < 1 ||
      !Array.isArray(rows) || rows.length !== manifest.count || !checksums || Object.keys(checksums).length !== entries.size - 1) throw invalid();
  const title = text(manifest.title, 120);
  for (const [name, size] of entries) {
    if (files[name]?.length !== size) throw invalid();
    if (name === 'checksums.json') continue;
    const check = Object.hasOwn(checksums, name) && checksums[name];
    if (check?.size !== size || check.sha256 !== sha256(files[name])) throw invalid();
  }

  const ids = new Set(), used = new Set();
  const hasAsset = name => {
    const bytes = files[`assets/${name}`];
    if (!bytes) return false;
    validateWebp(bytes);
    used.add(name);
    return true;
  };
  const references = rows.map(row => {
    const id = row?.id;
    if (!ID.test(id) || ids.has(id) || !Array.isArray(row.slides) || row.slides.length > 60 ||
        !['full_slides', 'cover_or_partial'].includes(row.coverage) ||
        !['platform_screenshot', 'search_result_screenshot', 'metrics_text_only'].includes(row.evidence)) throw invalid();
    ids.add(id);
    const slides = row.slides.map((name, index) => {
      if (name !== `${id}-${String(index + 1).padStart(3, '0')}.webp` || !hasAsset(name)) throw invalid();
      return name;
    });
    const url = text(row.url, 700);
    if (!URL.canParse(url) || new URL(url).protocol !== 'https:') throw invalid();
    return {
      id: `pack-${id}`, sourceId: id, author: text(row.author, 320), hook: text(row.hook, 1000),
      niche: text(row.niche, 60), language: text(row.language, 20), platform: text(row.platform, 40),
      caption: text(row.caption, 12000), metricText: text(row.metricText, 1200), url,
      likes: count(row.likes), comments: count(row.comments), views: count(row.views), saves: count(row.saves), shares: count(row.shares),
      coverage: row.coverage, evidence: row.evidence, slides,
      thumbnail: hasAsset(`${id}-thumb.webp`) ? `${id}-thumb.webp` : slides[0] || '',
      proof: hasAsset(`${id}-proof.webp`) ? `${id}-proof.webp` : '',
    };
  });
  if (used.size !== entries.size - jsonFiles.length) throw invalid();
  const disk = await statfs(target);
  if (disk.bavail * disk.bsize < total + 8 * MB) throw new Error('Não há espaço em disco para importar o Swipe File.');
  const result = { id: manifest.id, title, version: manifest.version, hash: sha256(zip), references };
  await mkdir(join(target, 'assets'));
  for (const name of used) await writeFile(join(target, 'assets', name), files[`assets/${name}`]);
  await writeFile(join(target, 'catalog.json'), JSON.stringify(result));
  return result;
}

export function referenceAsset(root, name) {
  return assetName.test(name) ? readFile(join(root, 'assets', name)) : Promise.reject(invalid());
}
