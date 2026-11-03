# Referências e quantidade dinâmica de cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a versão 0.7.3 com 36 referências e seleção de 1 a 10 cards, inclusive durante escrita e geração de arte.

**Architecture:** Integrar a branch de Referências sobre `main` e acrescentar uma ação `resizeCarousel` no Runtime. Essa ação cancela e aguarda tokens antigos, adapta a copy quando o número de slides muda e retoma apenas artes pendentes; renderer e Store continuam seguindo os contratos atuais.

**Tech Stack:** React, Electron, Node ESM, node:test, Playwright, Vite, GitHub Actions.

---

### Task 1: Integrar a biblioteca de Referências

**Files:**
- Merge: `feat/carrossell-reference-templates` em `release/0.7.3-references-card-count`
- Test: `tests/references.test.mjs`
- UI: `scripts/references-proof.mjs`

- [ ] **Step 1: Trazer somente o histórico commitado da worktree**

```bash
git fetch --no-tags "C:/Users/Admin2/Documents/Claude Code Editor/cutroom/worktrees/carrossell-templates" refs/heads/feat/carrossell-reference-templates:refs/remotes/local/carrossell-reference-templates
git merge --no-ff local/carrossell-reference-templates -m "feat: add viral reference library"
```

- [ ] **Step 2: Verificar a integração**

Run: `git diff --check && node --test tests/references.test.mjs`
Expected: zero conflitos e 6/6 testes aprovados; `package.json` permanece em 0.7.1 nesta etapa.

### Task 2: Aceitar todas as quantidades no Store e no composer

**Files:**
- Modify: `core/store.mjs:62-63`
- Modify: `src/components/Home.jsx:30-47,244`
- Test: `tests/value.test.mjs:27-66`

- [ ] **Step 1: Substituir o teste que tratava 5 como inválido**

```js
test("every card count from automatic through 10 is validated and persisted", async (t) => {
  const store = await fixture(t);
  for (let cardCount = 0; cardCount <= 10; cardCount += 1) {
    const p = await store.createProject({ title: `Projeto ${cardCount}`, brief: "B", cardCount });
    assert.equal(p.cardCount, cardCount);
  }
  for (const invalid of [-1, 1.5, 11, "abc"]) {
    await assert.rejects(store.createProject({ title: "Inválido", brief: "B", cardCount: invalid }), /cards inválida/);
  }
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha antiga**

Run: `node --test tests/value.test.mjs`
Expected: FAIL porque `CARD_COUNTS` ainda rejeita 1, 2, 3, 5, 7 e 9.

- [ ] **Step 3: Implementar os valores e as opções**

```js
export const CARD_COUNTS = Array.from({ length: 11 }, (_, index) => index);
function cardCount(value) {
  const n = Number(value || 0);
  if (!Number.isInteger(n) || !CARD_COUNTS.includes(n)) throw new Error("Quantidade de cards inválida.");
  return n;
}
```

No composer, gerar `[1, ..., 10]`, ocultar 1 para documentos e usar singular em `1 card`, `1 página` e `1 slide`.

- [ ] **Step 4: Repetir o teste**

Run: `node --test tests/value.test.mjs`
Expected: PASS, incluindo o teste existente de prompt com 4 cards.

- [ ] **Step 5: Commit**

```bash
git add core/store.mjs src/components/Home.jsx tests/value.test.mjs
git commit -m "feat: allow one through ten cards"
```

### Task 3: Redimensionar com segurança durante o processamento

**Files:**
- Modify: `core/runtime.mjs:13,529-560,572-627,634-642`
- Test: `tests/value.test.mjs`
- Test: `tests/images.test.mjs`

- [ ] **Step 1: Escrever testes de mudança durante a escrita e a arte**

Criar um mock com um `deferred` para o primeiro `codex.run`; `codex.cancel()` resolve esse deferred. O segundo retorno contém a nova quantidade de slides. Cobrir:

```js
await runtime.request("generatePlan", { id: p.id });
await runtime.request("resizeCarousel", { id: p.id, cardCount: 1 });
await settle(runtime);
assert.equal(store.get(p.id).slides.length, 1);
assert.match(prompts.at(-1), /exatamente 1 cards/);
```

Para arte, começar com dois slides e capa real, bloquear a arte do segundo, redimensionar para três e responder a adaptação com os mesmos dois IDs mais `three`. Verificar três slides finais, `three` completo e somente uma versão de arte por card. Em um segundo caso, reduzir quatro para dois e confirmar que as duas artes preservadas não foram redesenhadas.

- [ ] **Step 2: Rodar os testes e confirmar ausência da ação**

Run: `node --test tests/value.test.mjs tests/images.test.mjs`
Expected: FAIL com `Ação não permitida` para `resizeCarousel`.

- [ ] **Step 3: Implementar conclusão do token e a ação**

Adicionar `resizeCarousel` a `ACTIONS` e ao switch. Em `begin`, criar `token.done` e resolvê-la no `finally` de `execute`, depois de limpar `this.job`.

```js
async resizeCarousel(id, value) {
  const next = count(value, 1, 10);
  const initial = this.store.get(id);
  if (initial.format !== "carrossel") throw new Error("O tamanho dinâmico vale para carrosséis.");
  if (this.job && this.job.id !== id) throw new Error("Aguarde ou cancele a operação em andamento.");
  const previous = this.job;
  if (previous && !["plan", "message", "images", "covers"].includes(previous.kind)) {
    throw new Error("Aguarde ou cancele a operação em andamento.");
  }
  if (previous) {
    previous.cancelled = true;
    await this.codex.cancel();
    await previous.done;
  }
  const p = this.store.get(id);
  const sameSlideCount = p.slides.length === next;
  const current = this.publish(await this.store.saveProject({ id, cardCount: next }));
  if (!p.slides.length) {
    return previous && ["plan", "message"].includes(previous.kind) ? this.begin(id, "plan") : current;
  }
  if (sameSlideCount) {
    return previous?.kind === "images" && p.textApproved && p.slides[0]?.image ? this.handle("generateSlides", { id }) : current;
  }
  this.ensureConnected();
  return this.begin(id, "message", {
    message: `A pessoa mudou o tamanho para exatamente ${next} cards. Adapte a sequência, preserve IDs e conteúdo não afetado e mantenha capa e CTA final.`,
    resumeImages: p.textApproved && Boolean(p.slides[0]?.image),
  });
}
```

Depois de `savePlan`, se `options.resumeImages` for verdadeiro e a capa existir, retomar `images(token)` para IA ou `renderSlides(id, null, false, token)` para modelos. Adicionar o parâmetro interno opcional `token` a `renderSlides`; só ignorar `ensureIdle` quando `this.job === token` e interromper o loop se o token for cancelado.

- [ ] **Step 4: Permitir um único card no fluxo de carrossel**

Em `savePlan`, exigir `slides.length >= 1`. Em `approveText`, exigir um slide para carrossel e manter dois para documentos. Manter a exportação existente, que já valida e exporta qualquer quantidade completa.

- [ ] **Step 5: Repetir os testes**

Run: `node --test tests/value.test.mjs tests/images.test.mjs`
Expected: todos PASS, inclusive aumento, redução e carrossel de um card.

- [ ] **Step 6: Commit**

```bash
git add core/runtime.mjs tests/value.test.mjs tests/images.test.mjs
git commit -m "feat: resize carousel during generation"
```

### Task 4: Expor o seletor no Estúdio

**Files:**
- Modify: `src/components/Studio.jsx:214-280,447-524`
- Modify: `scripts/references-proof.mjs:114-181`

- [ ] **Step 1: Acrescentar as asserções reais de UI**

Na prova do composer, abrir Tamanho e verificar 11 opções: Automático mais 1–10. Verificar `1 card` no singular. Após criar um projeto sem conta, escolher 3 no seletor do Estúdio e confirmar:

```js
const resized = await page.evaluate(async (id) => {
  const state = await window.pacto.request("bootstrap");
  return state.projects.find((item) => item.id === id).cardCount;
}, project.id);
assert.equal(resized, 3);
```

- [ ] **Step 2: Rodar a prova antes da UI**

Run: `node scripts/references-proof.mjs`
Expected: FAIL porque o seletor de 1–10 no Estúdio ainda não existe.

- [ ] **Step 3: Implementar pill/popover existente**

Renderizar somente para carrossel um botão `pill` com rótulo `Tamanho`, valor atual e `ChevronDown`. O popover contém botões `menuitemradio` para 1–10 e chama:

```js
await infer("resizeCarousel", { cardCount: next });
```

Não desabilitar o seletor por `busy`. Incluir `resizeCarousel` na lista de ações pendentes que representam trabalho no projeto, sem criar CSS paralelo ou alterar o design system.

- [ ] **Step 4: Repetir a prova e o build**

Run: `node scripts/references-proof.mjs && npm run build`
Expected: todas as verificações PASS e build Vite concluído.

- [ ] **Step 5: Commit**

```bash
git add src/components/Studio.jsx scripts/references-proof.mjs
git commit -m "feat: add studio card count selector"
```

### Task 5: Validar e publicar 0.7.3

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `shared-memory/35 - Release Carrossell 0.7.3.md`

- [ ] **Step 1: Executar toda a validação local**

Run:

```bash
"/c/Program Files/nodejs/node.exe" --test tests/*.test.mjs
"/c/Program Files/nodejs/node.exe" "/c/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run build
"/c/Program Files/nodejs/node.exe" scripts/renderer-regression.mjs
"/c/Program Files/nodejs/node.exe" scripts/ui-phases.mjs
"/c/Program Files/nodejs/node.exe" scripts/references-proof.mjs
git diff --check
```

Expected: suíte completa sem falhas, build concluído, regressões e provas de UI aprovadas.

- [ ] **Step 2: Atualizar a versão e repetir os testes afetados**

Run: `npm version 0.7.3 --no-git-tag-version && node --test tests/value.test.mjs tests/images.test.mjs tests/references.test.mjs && npm run build`
Expected: somente os campos de versão mudam; todos os comandos PASS.

- [ ] **Step 3: Registrar limites e evidências reais**

Criar a nota de release com os testes observados, 36 referências, quantidade dinâmica, ausência de teste físico no Mac e ausência de assinatura/notarização. Commitar código, nota e manifestos.

- [ ] **Step 4: Publicar e acompanhar o workflow**

```bash
git push origin HEAD:main
git tag -a v0.7.3 -m "Carrossell 0.7.3"
git push origin v0.7.3
gh run list --repo Mathpcastro/pacto-desktop --workflow build-mac.yml --branch v0.7.3 --limit 1
```

Expected: preparação, Windows, macOS ARM64, macOS x64 e publish concluídos com sucesso.

- [ ] **Step 5: Verificar o contrato de atualização**

Confirmar release `v0.7.3` Latest em `pacto-releases`, 11 assets, `latest.yml` com `version: 0.7.1` substituído por `0.7.3`, downloads HTTP 200 e `total_count: 0` nos artefatos do Actions. Criar também a release de referência no repo do app com links para os instaladores.
