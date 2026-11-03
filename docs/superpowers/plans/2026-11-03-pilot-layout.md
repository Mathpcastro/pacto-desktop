# Approved pilot layout implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development or executing-plans. Follow the approved HTML and preserve existing behavior. Work in the isolated branch only.

**Goal:** Apply the approved Telegram-first pilot screen to the real app, with separate connection, routine, review and conversation areas and setup on demand.

**Architecture:** Keep the existing Autopilot state, action guards and per-profile draft controller. Replace its presentation with the approved layout and native Dialog components. Use actual Runtime data for connection, routine and pending work; no prototype fixtures or fake service states in the product. Reuse the existing bounded Telegram-opening action for both pairing and an already linked bot.

**Stack:** React, existing tokens/CSS, SVG brand assets, Electron IPC, Node test runner and Playwright. No dependencies or new providers.

Approved reference: `C:/Users/Admin2/Documents/Codex/2026-11-02/qual-o-jeito-mais-f-cil/outputs/piloto-telegram-redesign/index.html`. Official Telegram SVG is in its assets folder. User approved after viewing dark/light, connected/disconnected, routine form and mobile previews.

## Task 1 — Real UI (design implementer)

Files: `src/components/Autopilot.jsx`, scoped `src/autopilot.css` or focused existing styles, `src/assets/telegram.svg`, import in `src/main.jsx`, pilot heading in `src/App.jsx`; optional small presentational components if helpful. UI scripts `scripts/autopilot-proof.mjs` and new `scripts/pilot-layout-proof.mjs`.

- [x] Add a focused Electron proof first and observe RED for the missing prominent connection/routine/review separation and configuration dialog. Keep the 14 existing pilot behavioral assertions, adapting navigation to dialogs without removing safety checks.
- [x] Apply the approved hierarchy: page title and brief subtitle, prominent Telegram connection block and logo, separate routine and review columns, short conversation examples and collapsed command help. Keep existing theme/palette/scale preferences. Do not copy the prototype control bar, fake connected states or fixture content.
- [x] Hide bot/token/pairing controls in an accessible connection Dialog, show clear token-saved/unpaired/paired/error states, preserve password/autocomplete protection and error redaction. Closing setup does not leak token into the main page. Scope of global bot/per-profile routine is explained in setup.
- [x] Summary of saved routine stays on the page; days/time/style/2–10 cards/accounts are in a configuration Dialog. Preserve drafts until saved or profile changes; preserve save/activation/dirty/busy/ChatGPT/account guards. No Instagram connection or model calls occur merely by opening settings.
- [x] Show actual pending jobs, progress, errors and uncertain-publication warnings. Keep retry/discard restrictions and real history accessible. If adding a preview Dialog, use the actual project/slide images only, and continue to require Telegram approval for pilot publication. Empty/deleted projects have honest fallbacks.
- [x] Connected CTA calls `openTelegramPair`: root extends it to open the validated linked bot when no pairing link is needed. No arbitrary browser URLs from renderer and no new external effects.
- [x] Preserve legacy Brand pilot entry. Add actual counterpart callbacks only if needed and in the two parent call sites. Match approved typography and layout at 1440, 1093×580/dark/125%, light, and 390px; >=13px, no horizontal or nested scrolling. Dialogs retain accessible names and Escape/focus/weekday keyboard behavior.
- [x] Run targeted real-IPC pilot proof and UI layout proof, build and relevant studio/discovery/regression proofs. Save real screenshots in `.cache/pilot-layout-proof` for root to copy to user outputs. No accounts, real messages, generation or public posts in UI tests.

## Task 2 — Paired Telegram opening (root)

Files: `core/runtime.mjs`, `tests/autopilot.test.mjs`.

- [x] Add failing tests: existing pairing URL still opens; paired validated bot opens `https://t.me/<username>`; absent/unpaired/expired/malformed bindings do not open arbitrary destinations.
- [x] Extend only `openTelegramPair`. Obtain pairing URL from current pilot status; otherwise use a validated bot username only when the binding is paired/active and token exists. Delegate to existing `dialogs.openTelegram`. Leave all approval/publication actions unchanged.
- [x] Run focused tests and full `npm test`.

## Task 3 — Review and delivery (root)

- [x] Inspect spec coverage and a fresh independent code/visual review. Fix concrete issues; verify native states rather than trusting HTML similarity or a passing build alone.
- [x] Run build, Node tests, real pilot/layout proof, studio phases, renderer, discovery and references checks as appropriate. Copy screenshot/report evidence to user workspace `outputs/piloto-implementado`.
- [x] Update shared project notes with observed validation and limits. Selectively commit only intended files. Preserve the worktree; no release/version change in this implementation task.
- [x] Deliver actual app screenshots and validation, clearly distinguishing them from the previously approved HTML.
