import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { REFERENCES } from '../src/data/references.js';
import { filterReferences, replaceReferenceAttachment } from '../src/referenceLibrary.js';

const SOURCE_IDS = [
  'CAR-0004', 'CAR-0007', 'CAR-0010', 'CAR-0012', 'CAR-0019', 'CAR-0034',
  'CAR-0002', 'CAR-0008', 'CAR-0015', 'CAR-0043', 'CAR-0023', 'CAR-0001',
  'CAR-0006', 'CAR-0020', 'CAR-0047', 'CAR-0285', 'CAR-0286', 'CAR-0299',
  'CAR-0324', 'CAR-0336', 'CAR-0338', 'CAR-0347', 'CAR-0364', 'CAR-0436',
  'CAR-0448', 'CAR-0469', 'CAR-0476', 'CAR-0492', 'CAR-0493', 'CAR-0509',
  'CAR-0528', 'CAR-0241', 'CAR-0242', 'CAR-0264', 'CAR-0276', 'CAR-0277',
];
const ARCHITECTURES = ['Lista Útil', 'Tutorial', 'Framework', 'Estudo de Caso', 'História → Método → Oferta'];
const GOALS = ['Alcance', 'Comentários', 'Salvamentos', 'Levar para uma oferta'];
const REQUIRED_TEXT = ['theme', 'hook', 'deliverable', 'connection', 'reason', 'niche', 'language', 'author', 'layout'];
const ASSETS_DIR = fileURLToPath(new URL('../src/assets/references/', import.meta.url));
const CATALOG_PATH = fileURLToPath(new URL('../src/data/references.js', import.meta.url));
const BUDGET = 2 * 1024 * 1024;

function webpDimensions(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  if (chunk === 'VP8 ') {
    assert.deepEqual([...buffer.subarray(23, 26)], [0x9d, 0x01, 0x2a]);
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  assert.fail(`Chunk WebP não suportado: ${chunk}`);
}

test('catálogo contém exatamente as 36 referências aprovadas e a distribuição editorial', () => {
  assert.equal(REFERENCES.length, 36);
  assert.deepEqual(REFERENCES.map(item => item.sourceId), SOURCE_IDS);
  assert.equal(new Set(REFERENCES.map(item => item.id)).size, 36);
  assert.equal(new Set(REFERENCES.map(item => item.sourceId)).size, 36);
  assert.equal(new Set(REFERENCES.map(item => item.author)).size, 33);

  const countBy = key => Object.fromEntries(
    [...new Set(REFERENCES.map(item => item[key]))].sort().map(value => [value, REFERENCES.filter(item => item[key] === value).length]),
  );
  assert.deepEqual(countBy('niche'), { direct_response: 8, ia: 15, marketing_digital: 8, saas: 5 });
  assert.deepEqual(countBy('language'), { en: 25, es: 5, 'pt-BR': 6 });
});

test('cada referência tem campos textuais, arquitetura e objetivo válidos', () => {
  for (const item of REFERENCES) {
    assert.equal(item.id, `TPL-${item.sourceId}`);
    for (const field of REQUIRED_TEXT) {
      assert.equal(typeof item[field], 'string', `${item.id}: ${field}`);
      assert.ok(item[field].trim().length > 0, `${item.id}: ${field} vazio`);
    }
    assert.ok(ARCHITECTURES.includes(item.architecture), `${item.id}: arquitetura`);
    assert.ok(GOALS.includes(item.goal), `${item.id}: objetivo`);
  }
});

test('ativos contêm somente 36 WebP 360x450 e catálogo mais imagens cabem em 2 MiB', () => {
  const files = readdirSync(ASSETS_DIR).sort();
  assert.deepEqual(files, SOURCE_IDS.map(id => `${id}.webp`).sort());
  let total = statSync(CATALOG_PATH).size;
  for (const id of SOURCE_IDS) {
    const buffer = readFileSync(`${ASSETS_DIR}${id}.webp`);
    assert.deepEqual(webpDimensions(buffer), { width: 360, height: 450 }, id);
    total += buffer.length;
  }
  assert.ok(total <= BUDGET, `Orçamento excedido: ${total} bytes > ${BUDGET}`);
});

test('busca, nicho, objetivo e resultados vazios usam metadados editoriais', () => {
  assert.equal(filterReferences(REFERENCES, '', 'ia', 'all').length, 15);
  assert.equal(filterReferences(REFERENCES, 'Semrush', 'all', 'all').length, 1);
  assert.equal(filterReferences(REFERENCES, 'termo inexistente', 'all', 'all').length, 0);
  const saves = filterReferences(REFERENCES, '', 'all', 'Salvamentos');
  assert.ok(saves.length > 0);
  assert.ok(saves.every(item => item.goal === 'Salvamentos'));
});

test('nova referência preserva anexos manuais e substitui somente a anterior da biblioteca', () => {
  const manual = { name: 'manual.png', dataUrl: 'data:image/png;base64,AAAA' };
  const first = replaceReferenceAttachment([manual], REFERENCES[0], 'data:image/webp;base64,BBBB');
  assert.equal(first.added, true);
  assert.deepEqual(first.attachments[0], manual);
  assert.deepEqual(first.attachments[1], {
    name: `Referência ${REFERENCES[0].sourceId} · ${REFERENCES[0].author}.webp`,
    dataUrl: 'data:image/webp;base64,BBBB',
    referenceId: REFERENCES[0].id,
  });

  const second = replaceReferenceAttachment(first.attachments, REFERENCES[1], 'data:image/webp;base64,CCCC');
  assert.equal(second.added, true);
  assert.deepEqual(second.attachments[0], manual);
  assert.equal(second.attachments.length, 2);
  assert.equal(second.attachments[1].referenceId, REFERENCES[1].id);
  assert.equal(second.attachments[1].dataUrl, 'data:image/webp;base64,CCCC');
});

test('seis anexos manuais resultam em added=false e array inalterado', () => {
  const manual = Array.from({ length: 6 }, (_, i) => ({ name: `${i}.png`, dataUrl: 'x' }));
  const result = replaceReferenceAttachment(manual, REFERENCES[0], 'data:image/webp;base64,BBBB');
  assert.equal(result.added, false);
  assert.equal(result.attachments, manual);
  assert.deepEqual(result.attachments, manual);
});
