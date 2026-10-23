import test from 'node:test';
import assert from 'node:assert/strict';
import { loadKnowledge, getLesson, searchKnowledge, briefing, prepareCarousel, reviewCarousel } from '../core/knowledge.mjs';

test('course maps the eight supplied IDs and preserves provenance', () => {
  const k = loadKnowledge();
  assert.equal(k.lessons.length, 8);
  assert.equal(new Set(k.lessons.map(l => l.id)).size, 8);
  assert.equal(k.lessons[0].id, 'SkJWJMKwy6I');
  assert.ok(k.manifest.limitations.length);
  assert.match(k.method, /Pauta/);
});
test('retrieves an exact lesson without accepting traversal', () => {
  const k = loadKnowledge();
  assert.match(getLesson(k, '73OpTuUsCH8').text, /brand context/i);
  assert.throws(() => getLesson(k, '../../secret'), /Aula/);
});
test('search finds relevant source passages with source links and bounded output', () => {
  const hits = searchKnowledge(loadKnowledge(), 'architecture framework', 3);
  assert.ok(hits.length > 0 && hits.length <= 3);
  assert.ok(hits.every(h => /^https:\/\/(www\.youtube\.com\/watch\?v=|app\.notion\.com\/p\/)/.test(h.url)));
  assert.ok(hits.every(h => h.excerpt.length < 1100));
});
test('briefing requests missing essentials instead of inventing business data', () => {
  const b = briefing({ brand: 'Exemplo' });
  assert.equal(b.complete, false);
  assert.ok(b.missing.includes('audience'));
  assert.ok(b.questions.some(q => q.field === 'offer'));
});
test('carousel context includes real profile, all stages and no teacher proof reused', () => {
  const p = {brand:'Ateliê Azul',product:'Oficina',audience:'Ceramistas',problem:'Rachaduras',promise:'Melhorar peças',offer:'Oficina presencial',cta:'Guia',colors:'Azul e branco',style:'Fotográfico'};
  const c = prepareCarousel(loadKnowledge(), p, 'Evitar rachaduras');
  assert.equal(c.briefing.complete, true);
  assert.ok(c.instructions.includes('Ateliê Azul'));
  assert.ok(c.instructions.includes('Evitar rachaduras'));
  assert.match(c.instructions, /não.*invent/i);
  assert.equal(c.stages.length,5);
});
test('review detects missing CTA context and dense copy without claiming visual inspection', () => {
  const r = reviewCarousel({slides:[{title:'Início',body:'a '.repeat(200)},{title:'Fim',body:'Comente X'}],caption:''});
  assert.ok(r.issues.some(i=>i.code==='dense-copy'));
  assert.ok(r.issues.some(i=>i.code==='cta-deliverable'));
  assert.equal(r.visualInspection,false);
});
