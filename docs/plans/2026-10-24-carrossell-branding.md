# Carrossell — implementation plan

> For agentic workers: implement this approved direction task-by-task using frontend-design implementation and evaluation agents for the UI. Preserve existing unrelated changes.

**Goal:** Ship production brand assets for approved direction 02, Instagram profile material, and the Carrossell app identity without changing tutorial-visible layout or fonts.

**Architecture:** One geometric SVG symbol generates all raster/native icons and is reused in the renderer. Existing light/dark tokens are updated without replacing controls or layout. The commercial product name changes while historical data location, appId, feed, package identity and IPC remain stable.

**Stack:** Electron, React, existing CSS, SVG, Electron rasterization, Node native icon containers.

## Tasks

- [x] Produce source SVGs: symbol, horizontal logo, orange/graphite icons and Instagram avatar. Preserve approved cards/chevron silhouette; avoid bitmap tracing.
- [x] Generate PNGs at desktop icon sizes, 1024px masters, 1080px Instagram avatars, multi-size Windows ICO and Mac ICNS. Verify dimensions and transparency, view assets at small sizes, save preview sheet.
- [x] Write Instagram display name, bio under 150 characters, suggested handle without claiming availability, and website link. Do not publish to Instagram.
- [x] Apply logo/name and palette via frontend-design implementer. Preserve all UI fonts, layout, nav, control positions, existing theme toggle, theme storage key and user-generated design choices.
- [x] Rename Electron window/notifications/product label, wire icons into package, pin historical PACTO userData directory before name changes. Keep appId, package name, IPC and update feed/aliases. Verify legacy path and override behavior.
- [x] Run npm test, npm run build, renderer regression and dedicated visual proof at normal/small window sizes in both themes. Frontend evaluator checks screenshots for layout/font preservation and contrast.
- [x] Build local Windows installer and smoke the packaged rebranded app with isolated data. Verify logo, title, packaged icons and storage identity. No release upload or remote deployment.
- [x] Save assets, brand guide, bio and verified evidence to Obsidian branding, update shared status and deliver clickable files.

## Approved scope and corrections

User approved Carrossell, then visual direction 02, then requested production assets and app branding. User explicitly corrected scope: keep fonts and layout because tutorials are already recorded. No new system-theme selector, no redesign, no new sidebar.

## Validation boundaries

UI test fixtures validate visual structure only; do not claim new AI generation evidence. Windows can validate ICO/installer; ICNS format can be verified here, but Mac application packaging/installation needs macOS. Preserve current 0.2.1 version until a separate release is requested; package locally without publishing.
