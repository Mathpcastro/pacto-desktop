# Conversation and discovery implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Check boxes track delivery.

**Goal:** Apply the approved calm home/discovery panel and let the paired Telegram user operate content, stories, brands and metrics through conversation with explicit publication approval.

**Architecture:** Retain Runtime as the source of truth. Discovery is a React dialog over home with real destinations, not another route. Telegram conversation uses the existing connected Codex account to select bounded application operations; a validated adapter executes them in a pinned profile and project context. Existing durable autopilot review callbacks retain publication authority; language model output cannot authorize publishing.

**Tech Stack:** Electron, React, existing CSS/tokens, Node test runner and Playwright; Telegram Bot API transport already implemented. No dependencies or new hosting.

## Approved references and boundaries

- Approved standalone proposal: `C:/Users/Admin2/Documents/Codex/2026-11-02/qual-o-jeito-mais-f-cil/outputs/carrossell-proposta-v2/index.html`; visual brief: sibling workspace `work/panel-v2-usnhnbjv.qjs/brief.md`.
- Work only in `C:/Users/Admin2/Documents/pacto-app-telegram`, branch `codex/telegram-autopilot`. No push, merge, release or version bump.
- Preserve existing profile isolation, text approval, cover selection, template rendering, media, references and all studio actions. Existing interviews, file dialogs and credential setup remain on the computer where required.
- External Claude/Gemini CLI is existing agent mode; it does not mean the Telegram planner has those backends. Cards rendered from HTML/templates need no ChatGPT image generator. Native images depend on provider tools.

## Task 1 — Approved UI (UI implementer owns src and UI scripts)

Files: `src/App.jsx`, `src/components/Home.jsx`, `src/components/Autopilot.jsx`, `src/components/AgentSetup.jsx`, new `src/components/Capabilities.jsx`, relevant existing styles, `scripts/discovery-proof.mjs` and affected UI assertions.

- [x] Add focused browser checks first: home entry opens a dialog over active home; six goal categories have real destinations; Escape restores focus; external agent paths open AgentModal with correct provider; pilot is reachable from main navigation; creation draft/settings survive panel open/close and navigation.
- [x] Run the proof against original interface and record the expected missing-entry failure.
- [x] Implement the approved home: topic/format first, style/objective/size under adjustments; compact pilot state; recent projects; full content library accessible separately. Move Radar/references/results into clear goal destinations, preserving functional access and search.
- [x] Implement discovery dialog with six goals and existing app actions, no simulated success. Keep existing AgentModal setup and add accurate text about agent-built HTML/model cards vs native AI images. No secrets in UI state.
- [x] Dedicated pilot route uses existing Autopilot component; include honest conversational use instructions after core integration. Preserve Brand entry compatibility and existing account/preferences controls.
- [x] Run targeted proof at desktop, 1093x580/1280x800, mobile390, dark theme and scale125; >=13px, no horizontal or nested scrolling. Update old UI test navigation only where approved layout changed; preserve behavioral assertions.

## Task 2 — Conversational control (core implementer owns core and node tests)

Files: new `core/telegram-conversation.mjs`, `core/autopilot.mjs`, `core/autopilot-store.mjs`, `core/telegram.mjs`, `tests/telegram-conversation.test.mjs`, additional Telegram/autopilot regression tests as needed.

- [x] Write failing tests for unauthenticated text ignored; paired free text reaches conversation; busy planner cancellation remains responsive; duplicate/replayed updates cannot recreate content; profile scope persists; allowed content action executes and unknown/privileged actions fail; publish request generates review rather than calling Social.publish; changed project invalidates approval; restart does not silently replay running mutation; file/export size limits and credential redaction.
- [x] Extend operational store with backward-compatible conversation session: pinned profile/project, bounded history, durable inbox, recent update dedupe, pending actions. Existing version1 files migrate without losing jobs/configs. Running conversation after restart becomes interrupted with recovery text, never auto-repeat.
- [x] Implement schema-bound planner using existing `rt.codex.run`, no arbitrary tools/shell/network/file paths from model. Action allowlist maps to validated Runtime methods and narrowly scoped adapters, excludes credentials, login, system install, arbitrary URLs/files and publishing.
- [x] Expose status/projects/profiles/select context; create text/carousel/documents, revise text, approve text, covers/choose cover/generate cards, stories/edit/theme/CTA, Radar/reference modeling/replication, brand/design edits, metrics/posts/analytics, preview/export. Reuse normal app validation and workflows. Clarify project/brand ambiguity rather than picking across profiles. Do not switch desktop active profile for bot context.
- [x] Use same task completion semantics as autopilot (`job.done`); serialize planner vs Runtime jobs/autopilot; polling only queues text and remains available for `/cancelar`, `/status`, `/ajuda`, `/marcas`, `/projetos`. Cancellation affects only work owned by this conversation, not desktop tasks.
- [x] Conversations can explicitly request text approval and choose cover; do not automatically approve text or first AI cover when user just asks to create. New creation returns editable text first and asks next step; template generation may follow explicitly approved user request.
- [x] Publication/scheduling requests only create a fresh preview through durable existing autopilot review. Only authenticated callback approvals execute Social.publish/schedule; no intent `confirmed=true` escape. Require chosen accounts, current profile and project fingerprint.
- [x] Add Telegram sendDocument for ZIP/PDF and bounded attachment retrieval if feasible through existing validated media/reference paths; only paired user's own Telegram file IDs, size+type checks, safe generated filenames, no arbitrary local paths. If unsupported attachment kind, explain supported formats and recovery rather than silence.
- [x] Keep process alive for paired conversation even without enabled routine; `/parar` cancels current conversation task, doesn't disable OS routine silently. Ensure disconnect clears conversation queue/history and expired binding cannot execute queued work.
- [x] Run targeted node tests, existing autopilot/Telegram regression tests, then report capability matrix and any actual limitations.

## Task 3 — Integration, review and evidence (root)

- [x] Inspect both diffs for approved scope; independently review spec coverage then code correctness/safety with fresh reviewer. Fix actionable findings and recheck.
- [x] Run `npm test`, `npm run build`, `node scripts/renderer-regression.mjs`, `node scripts/ui-phases.mjs`, discovery proof, references and autopilot UI proofs as appropriate. Tests use temp profiles and simulated transport; real generation/posting is not part of those claims.
- [x] Capture real Electron screenshots of home, discovery, agents and pilot into user workspace outputs, clearly distinguish from previous HTML mockups.
- [x] Update project shared notes with current state, limitations and evidence; only selectively stage intended files and create local commit after checks. No global memory edits, credentials or production external actions.
- [x] Deliver concise outcome, real screenshots, validation and remaining integration limits, without claiming release/publication.
