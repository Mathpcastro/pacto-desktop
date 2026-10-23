# P.A.C.T.O. Desktop Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development for independent renderer and runtime work; integrate against the contract below. Tasks use checkbox status.

**Goal:** Deliver a Windows Electron application and a reusable MCP grounded in all eight course lessons.

**Architecture:** Isolated `desktop/` package. React renderer calls an allowlisted preload API; Electron owns storage, Codex subprocess and image export. `resources/pacto` is the single course source consumed by app and stdio MCP. Shared memory is synced to Obsidian through the supplied local connector.

**Tech Stack:** Electron, Vite, React, Node ESM, Codex app-server, MCP SDK, fflate, node:test, Playwright.

## Contract

`window.pacto.request(action, args={})` returns a promise; `window.pacto.onEvent(callback)` returns unsubscribe. Actions:

| Action | Args | Result |
| --- | --- | --- |
| bootstrap | {} | state |
| saveProfile | {profile} | state |
| connect / disconnect | {} | state |
| createProject | {title,brief} | project |
| saveProject | {id,title?,brief?,slides?,caption?} | project |
| generatePlan | {id} | project (work continues through events) |
| generateSlides | {id,slideId?} | project (work continues through events) |
| sendMessage | {id,text} | project (work continues through events) |
| cancel | {id} | project |
| export | {id} | {cancelled?,path?,count?} |
| duplicate / delete | {id} | project / state |
| openCourse | {id} | {ok:true} |
| importReference | {} | {cancelled?,name?,dataUrl?} |

State: `{profile:null|Profile,projects:Project[],account:{connected:boolean,label:string},models:[],course:[{id,title,url}],knowledge:{lessons:number,transcribed:number}}`.

Profile string fields: `brand,product,audience,problem,promise,offer,cta,proof,tone,colors,style`; optional `references:[{name,dataUrl}]`. No hardcoded teacher identity.

Project: `{id,title,brief,status,slides,caption,architecture,messages,createdAt,updatedAt,error?}`. Status `draft|planning|ready|generating|complete|error`. Slide: `{id,index,title,body,visual,prompt,image?,state?}`; `image` renderer-safe data URL for existing real image. Message `{id,role:'user'|'assistant',text}`. Events `{type:'state',state}`, `{type:'project',project}`, `{type:'activity',message}`. Read `desktop/API.md` for updates agreed between workers.

## Task 1 — Source corpus and method (controller)

- [x] Fetch Pauta results until eight transcripts or an explicit provider failure; preserve raw response and language.
- [x] Save individual source files in `desktop/resources/pacto/transcripts` and a manifest with provenance and coverage.
- [x] Read all eight transcripts; write `method.md` and structured `method.json`, separating course statements from implementation choices and missing visual materials.
- [x] Check source count, video IDs, nonempty text and declared language by running Node assertions.

## Task 2 — MCP (controller)

- [x] Test course resource retrieval, search, onboarding missing fields, blueprint context and source linkage in `desktop/tests/knowledge.test.mjs` before implementing `desktop/core/knowledge.mjs`.
- [x] Implement standard SDK stdio server `desktop/mcp/server.mjs`: resources for method/lessons; tools `pacto_search`, `pacto_get_lesson`, `pacto_get_method`, `pacto_briefing`, `pacto_prepare_carousel`, `pacto_review_carousel`.
- [x] Exercise initialize, tools/list, resources/list and tools/call with a real MCP client, including invalid lesson IDs.

## Task 3 — Electron runtime and Codex (runtime worker)

- [x] Write failing storage/export/input tests in `desktop/tests/runtime.test.mjs`; run `node --test tests/runtime.test.mjs` and record missing-feature failures.
- [x] Implement `desktop/core/store.mjs`, `desktop/core/codex.mjs`, `desktop/electron/main.mjs`, `desktop/electron/preload.cjs` against the contract. Preserve atomic saves and prior image versions, reject path traversal and invalid payloads.
- [x] Codex uses pinned native binary, stdio JSON-RPC, browser login, one active turn, cancel and timeout. Disable inherited unrelated MCP servers and shell; enable native image generation. Only store verified real image outputs; never claim generated SVG/HTML templates are native image outputs.
- [x] Read local generated protocol schema to implement real output image events. Store files inside app data, attach previous approved images as references and preserve previous revisions.
- [x] Implement ZIP export with numbered PNGs and caption. Refuse incomplete image exports; allow native save cancellation.
- [x] Run unit tests and actual account/model handshake. Record whether native image generation really worked.

## Task 4 — Renderer (design worker)

- [x] Build real React components under `desktop/src/`, `desktop/index.html` and CSS against the contract, with no simulated account or generated projects.
- [x] Compact editorial workspace: terracotta accent, warm-white/graphite themes, restrained navigation and strong typography. Brand/profile colors are independent of app chrome.
- [x] Implement onboarding, profile/design-kit editor, empty library, project creation, slide thumbnails/preview, text edits, chat, progress/cancel, course access and export.
- [x] Verify keyboard forms, busy states and error display. UI never promises images before image files exist.
- [x] Start Vite and inspect screenshots; evaluator reviews actual page and workers address actionable issues.

## Task 5 — Integration and Windows delivery (controller)

- [x] `npm install`, `npm test`, `npm run build`; repeat only for relevant changes.
- [x] Playwright Electron smoke: save profile, create, persist, reopen, duplicate and inspect course links without inference mocks being described as real generation.
- [x] Real Codex proof: login/account, generate blueprint, native image generation, image validation, edit/reference and export; preserve artifacts and disclose any capability failure.
- [x] `npm run dist` and inspect installer file, hash and signature state. Test packaged startup and persistence.
- [x] Update Obsidian status with actual validations and remaining limitations; supply executable and concise usage instructions.

## Scope protection

Do not modify original funnel files or CutRoom. Stage only new P.A.C.T.O. package/docs/memory artifacts if committing. No deployment, Instagram messaging, automated posting or global config rewrites. Do not place credentials into source or shared memory.
