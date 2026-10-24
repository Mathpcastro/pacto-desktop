# Desktop API

`window.pacto.request(action,args)` and `window.pacto.onEvent(callback)` implement the contract in the desktop plan. Inference actions return immediately after the project is persisted with `planning` or `generating`; durable progress arrives as project events. A single inference operation may run at a time. Cancellation preserves completed images and previous image versions.

Profiles also accept optional string fields `freebie`, `differentiators`, `territories`. Slide indexes are 1-based. `versions` is read-only metadata for preserved native image revisions; the renderer cannot inject image bytes through `saveProject`. References enter through `importReference` and profile validation.

`PACTO_USER_DATA` overrides the app data folder for integration tests. `PACTO_DEV_URL` accepts only a local `http://127.0.0.1` URL in unpackaged development. Neither setting bypasses authentication. The app uses its own CODEX_HOME; account connect/logout never changes the global Codex login. Browser OAuth opens in the user's default browser (only `https` OpenAI/ChatGPT auth hosts are accepted); Codex's local callback completes the login and the app window is brought back to front.

Export is refused until every slide has a real PNG matching its current copy; edited content marks art as `outdated` until regenerated. The Electron save flow normalizes exported copies to 1080 × 1350 pixels using native raster resizing; source aspect ratio must be within 0.02 of 4:5. Images outside that tolerance require regeneration rather than cropping. Raw native originals and all revisions remain unchanged. The native save dialog returns `cancelled:true` when dismissed. Output contains `01.png` etc. plus `legenda.txt`.

`generateSlides` without a `slideId` generates only missing or outdated images; an explicit `slideId` regenerates that slide and preserves older revisions. Conversational replies and Radar requests can return no new slides without changing an existing approved plan. Missing briefing details should produce concise questions before a plan is invented.

Codex runs in a private home, with OS shell, inherited plugins/MCPs and host skills disabled. Native `image_gen.imagegen` is invoked through the sandboxed `functions.exec` wrapper when the selected model requires code-mode. That wrapper host must remain enabled for image generation; it is separate from OS shell execution.
