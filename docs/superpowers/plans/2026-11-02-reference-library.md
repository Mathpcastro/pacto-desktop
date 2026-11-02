# Carrossell Reference Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lazy-loaded 36-item reference library to Carrossell 0.7.0, preserving the current design and using references through the existing composer attachment contract.

**Architecture:** Static editorial data and pure helpers stay separate from a lazy React page and inline WebP imports. Home remains mounted while References is visible; selecting an item preserves the draft and adds only a marked attachment. No Store, runtime, IPC, preload or generation changes are required.

**Tech Stack:** Electron 44, React 19, Vite 8, Node test runner, Playwright, existing Lucide icons and CSS tokens.

---

## File map

- Create `src/data/references.js`: approved static catalog.
- Create `src/data/referenceImages.js`: 36 `?inline` WebP imports.
- Create `src/assets/references/CAR-*.webp`: optimized covers.
- Create `src/referenceLibrary.js`: pure filtering and attachment helpers.
- Create `src/components/References.jsx`: local library page.
- Create `tests/references.test.mjs`: data, budget and helper contract.
- Create `scripts/references-proof.mjs`: real Electron behavior and screenshots.
- Modify `src/components/Home.jsx`: lazy page and composer integration.
- Modify `src/App.jsx`: new navigation and view passing.
- Modify `src/studio.css`: scoped reference styles only.
- Modify `scripts/ui-phases.mjs`: intentional topbar control budget 7 → 8.
- Keep the environment-only `tests/mcp.test.mjs` fix; do not include unrelated lockfile churn.

### Task 1: Catalog, assets and pure behavior

**Files:** `tests/references.test.mjs`, `src/data/references.js`, `src/referenceLibrary.js`, `src/assets/references/`.

- [ ] **Step 1: Write failing catalog tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { REFERENCES } from '../src/data/references.js';
import { filterReferences, replaceReferenceAttachment } from '../src/referenceLibrary.js';

test('catalog has the approved 36 references and valid editorial fields', () => {
  assert.equal(REFERENCES.length, 36);
  assert.equal(new Set(REFERENCES.map(x => x.sourceId)).size, 36);
  assert.equal(new Set(REFERENCES.map(x => x.author)).size, 33);
  for (const x of REFERENCES) {
    assert.equal(x.id, `TPL-${x.sourceId}`);
    for (const key of ['theme','hook','deliverable','connection','reason','niche','language','author','layout']) assert.ok(x[key].trim());
    assert.ok(['Lista Útil','Tutorial','Framework','Estudo de Caso','História → Método → Oferta'].includes(x.architecture));
    assert.ok(['Alcance','Comentários','Salvamentos','Levar para uma oferta'].includes(x.goal));
  }
});
```

Add assertions for exact source order and distributions `{ ia: 15, marketing_digital: 8, direct_response: 8, saas: 5 }`, `{ en: 25, 'pt-BR': 6, es: 5 }`.

- [ ] **Step 2: Write failing asset and helper tests**

Use the existing WebP dimension reader from the old `tests/templates.test.mjs`. Assert exactly 36 files, 360 × 450, and `statSync(data).size + images <= 2 * 1024 * 1024`.

```js
test('search, filters and empty results use editorial metadata', () => {
  assert.equal(filterReferences(REFERENCES, '', 'ia', 'all').length, 15);
  assert.equal(filterReferences(REFERENCES, 'Semrush', 'all', 'all').length, 1);
  assert.equal(filterReferences(REFERENCES, 'termo inexistente', 'all', 'all').length, 0);
});

test('a new reference replaces only the previous library attachment', () => {
  const manual = { name: 'manual.png', dataUrl: 'data:image/png;base64,AAAA' };
  const first = replaceReferenceAttachment([manual], REFERENCES[0], 'data:image/webp;base64,BBBB');
  const second = replaceReferenceAttachment(first.attachments, REFERENCES[1], 'data:image/webp;base64,CCCC');
  assert.equal(first.added, true);
  assert.deepEqual(second.attachments[0], manual);
  assert.equal(second.attachments.length, 2);
  assert.equal(second.attachments[1].referenceId, REFERENCES[1].id);
});

test('six manual attachments are never discarded', () => {
  const manual = Array.from({length:6}, (_,i) => ({name:`${i}.png`,dataUrl:'x'}));
  const result = replaceReferenceAttachment(manual, REFERENCES[0], 'data:image/webp;base64,BBBB');
  assert.equal(result.added, false);
  assert.deepEqual(result.attachments, manual);
});
```

- [ ] **Step 3: Verify RED**

Run `node --test tests/references.test.mjs`. Expected: module-not-found for `src/data/references.js`; after creating only data, expected missing helper/assets failures. Do not implement before observing the first failure.

- [ ] **Step 4: Port the approved data and assets**

Port the 36 records from `worktrees/pacto-templates/desktop/core/templates.mjs` into `src/data/references.js` without importing the existing art-style `core/templates.mjs`. Copy only the 36 approved WebP files into `src/assets/references/`; do not copy generator output, full slides or engagement screenshots.

Implement the pure helpers with this contract:

```js
export function filterReferences(items, query = '', niche = 'all', goal = 'all') {
  const q = query.trim().toLocaleLowerCase('pt-BR');
  return items.filter(item => {
    const haystack = [item.theme,item.hook,item.deliverable,item.reason,item.niche,item.author].join(' ').toLocaleLowerCase('pt-BR');
    return (!q || haystack.includes(q)) && (niche === 'all' || item.niche === niche) && (goal === 'all' || item.goal === goal);
  });
}

export function replaceReferenceAttachment(attachments, item, dataUrl) {
  const kept = attachments.filter(x => !x.referenceId);
  if (kept.length >= 6) return { attachments, added: false };
  return { added: true, attachments: [...kept, {
    name: `Referência ${item.sourceId} · ${item.author}.webp`, dataUrl, referenceId: item.id,
  }] };
}
```

- [ ] **Step 5: Verify GREEN and commit**

Run `node --test tests/references.test.mjs`; expect PASS. Run `npm test`; expect the existing 113 plus new tests to pass. Remove the unrelated three-line `bin` lockfile addition from `npm install`, then commit the focused catalog/assets/helpers/tests and the MCP environment fix separately if appropriate.

### Task 2: Lazy library page and navigation

**Files:** `src/data/referenceImages.js`, `src/components/References.jsx`, `src/App.jsx`, `src/components/Home.jsx`, `src/studio.css`, `scripts/ui-phases.mjs`.

- [ ] **Step 1: Add a failing real-renderer proof**

Create `scripts/references-proof.mjs` using the existing `_electron` + Vite pattern. Seed a profile through `window.pacto.request`, reload, then assert navigation to Referências shows 36 `.reference-card` elements without a connected account. Assert niche IA yields 15, search `Semrush` yields one, no-results shows the empty state and Limpar filtros restores 36. Run before implementation; expected failure: no Referências button.

- [ ] **Step 2: Implement inline image map**

Use Vite's statically analyzed glob so every local WebP is included without runtime filesystem access or fetch:

```js
const modules = import.meta.glob('../assets/references/*.webp', {
  eager: true, query: '?inline', import: 'default',
});
export const REFERENCE_IMAGES = Object.fromEntries(
  Object.entries(modules).map(([path, dataUrl]) => [path.split('/').pop().replace('.webp', ''), dataUrl]),
);
```

- [ ] **Step 3: Implement the library page**

Use local `query`, `niche`, `goal` state and `filterReferences`. Render `<main className="page reference-page">`, existing `page-title`, `page-sub`, `section-head`, `seg`, `search-box`, `chip`, `btn`, `empty-state`, and scoped `reference-grid/card/cover/meta` classes. Each card has `img width={360} height={450} loading="lazy" decoding="async"`, generic hook, author, architecture, goal, compact observed likes/comments, reason and `Usar referência`. Labels: Todos, IA, SaaS, Marketing digital, Direct response; objectives Todos, Alcance, Comentários, Salvamentos, Oferta. Use `Intl.NumberFormat('pt-BR', { notation: 'compact' })`. The card callback has the exact signature `onUse(item, REFERENCE_IMAGES[item.sourceId])`.

- [ ] **Step 4: Integrate without unmounting Home**

In App, add `LayoutTemplate`, a Referências button between Início and Marca, `aria-current` equality for all three items, and pass `view` plus `onShowHome={goHome}` to Home. In Home, lazy-import References and render it for `view === 'references'` after all hooks. Define `useReference(item, dataUrl)` with this exact body:

```js
const result = replaceReferenceAttachment(attachments, item, dataUrl);
if (!result.added) { onShowHome(); onNotice('Você já tem 6 anexos manuais. Remova um para trocar a referência.'); return; }
setAttachments(result.attachments);
setFormat('carrossel');
setStyle('ia');
onShowHome();
onNotice(`Referência ${item.sourceId} anexada. Seu tema foi preservado.`);
setTimeout(() => composerRef.current?.focus(), 50);
```

The image data URL comes from the selected card callback; Home does not statically import the catalog or image map. Do not set text, goal, size, architectureId, editorialLine or visualConcept.

- [ ] **Step 5: Add only scoped CSS and verify**

Use existing tokens and 13/14/15/18/32 px scale. Grid uses `repeat(auto-fill,minmax(210px,1fr))`; cards use panel/line/radius, images 4:5 object-fit cover, responsive toolbar wrapping, no nested scrolling. Do not edit existing selectors. Change only the topbar assertion in `scripts/ui-phases.mjs` from `<= 7` to `<= 8` and its comment.

Run `node scripts/references-proof.mjs`, `npm test`, and `npm run build`; expect all checks green. Commit.

### Task 3: Full composer persistence and production verification

**Files:** `scripts/references-proof.mjs` and focused fixes only.

- [ ] **Step 1: Extend the renderer proof before fixing any failure**

Fill `Tema ou ideia` with a manual draft, add a manual image through the existing native dialog stub, open Referências and choose one. Assert return to Home preserves the draft and manual attachment, shows one library attachment, and keeps goal/architecture/size unchanged. Choose another and assert only the library attachment changes. Fill no additional prompt text and click Criar carrossel with account disconnected; assert persisted project contains the original brief and two attachments, with `referenceId` stripped by Store.

- [ ] **Step 2: Verify responsive themes and production chunking**

Capture light/dark screenshots at 1440 × 900 and 1000 × 700. Assert `document.documentElement.scrollWidth <= innerWidth + 1`, no nested scrollers, no visible own-text below 13 px. Inspect build output: initial entry must not contain WebP data URLs; the lazy References chunk must contain them. Build and launch once without `PACTO_DEV_URL` using temporary `PACTO_USER_DATA`; open Referências and confirm images render from `file://`.

- [ ] **Step 3: Run all regression checks**

Run `npm test`, `node scripts/renderer-regression.mjs`, `node scripts/ui-phases.mjs`, `node scripts/references-proof.mjs`, and `npm run build`. Stop all spawned Electron/Vite processes in `finally`. Confirm source catalog + 36 WebP <= 2 MiB and no extra research files under `dist`.

- [ ] **Step 4: Review and commit**

Review the complete diff against `526b7ff`: only the documented files plus the MCP test environment fix may change. Dispatch spec-compliance and code-quality reviewers, resolve every issue, rerun checks, and commit focused fixes. Do not merge or build a release installer.

### Task 4: Future order-bump note only

**Files:** one Obsidian project note in the existing Carrossell/PACTO vault location discovered through the Obsidian CLI; no app code.

- [ ] Document the R$ 37 product promise, compact versioned package, manifest, hashes, drag-and-drop validation, storage outside installation, errors, and reuse in the composer.
- [ ] State the actual archive coverage: 500 references; 107 multipage, 393 partial; 333 engagement screenshots; 167 metric-only.
- [ ] Mark checkout, licensing, packaging and importer as future work; do not implement them.
