# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication language

- Always communicate with the user in Chinese (简体中文).
- When presenting choices to the user (e.g., AskUserQuestion), the question text and all options must be written in Chinese.

## Commands

- Install dependencies: `npm install`
- Start the desktop app in development: `npm run dev`
- Build the renderer for production: `npm run build`
- Preview the renderer build in a browser: `npm run preview`

## Development notes

- `npm run dev` starts Vite on port `5173` and then launches Electron after the port is reachable.
- `vite.config.js` uses `strictPort: true`, so development startup fails instead of switching ports when `5173` is already occupied.
- There is currently no lint, test, or single-test command configured in `package.json`.

## High-level architecture

This repository is an Electron desktop app with a React renderer. The app is focused on a single workflow: import one or more `.ncm` files, choose an output directory and bitrate, run conversion in the Electron main process, and stream per-file progress back to the renderer.

### Process boundaries

- `electron/main.js` owns the desktop shell, native dialogs, and the full conversion pipeline.
- `electron/preload.js` is the only bridge between renderer and main process. Renderer code should call `window.electronAPI` instead of importing Electron APIs directly.
- `src/` contains the React UI. The renderer is responsible for queue state, user actions, and displaying progress, but not for file I/O or conversion.

### Conversion pipeline

The real conversion path lives entirely in `electron/`:

1. `electron/main.js` receives `convert:start` with the queued tasks, output directory, and bitrate.
2. For each task, `main.js` calls `decodeNcmFile()` from `electron/ncmDecoder.js`.
3. `electron/ncmDecoder.js` parses the NCM container, decrypts the embedded key and metadata, extracts cover art, and returns decoded audio bytes plus normalized metadata.
4. `main.js` passes that result into `convertDecodedAudio()` from `electron/converter.js`.
5. `electron/converter.js` writes a temporary decoded audio file, invokes `ffmpeg-static` through `fluent-ffmpeg` to create the final MP3, ensures output filenames do not collide, and writes ID3 tags plus cover art with `node-id3`.
6. `main.js` emits `convert:progress` events back to the renderer throughout the process and returns a final success/error result list when the queue finishes.

Important implication: if you change conversion behavior, check both `electron/ncmDecoder.js` and `electron/converter.js`, then verify the payload shape still matches what `src/App.jsx` expects from progress events.

### Renderer data flow

- `src/main.jsx` mounts the single-page React app.
- `src/App.jsx` is the stateful orchestration layer. It owns the queue, selected bitrate, chosen output directory, conversion status, progress aggregation, and failure export.
- Presentation components under `src/components/` are mostly stateless and receive callbacks/state from `App.jsx`.
- Queue items are identified by generated `task.id` values in the renderer; progress updates from the main process are reconciled against those IDs.

When changing queue behavior, start with `src/App.jsx` first. That file is the source of truth for when files can be added, when conversion can start, and how progress updates alter UI state.

## UI and product constraints reflected in code

- The app is intentionally single-purpose: NCM to MP3 only.
- Batch conversion is supported, but the current main-process implementation handles the queue sequentially.
- Output filenames are auto-renamed on collision instead of overwriting existing MP3 files.
- Failure export is generated in the renderer as a plain text download from the current failed task list.
- The visual design is centralized in `src/styles.css`; there is no component-scoped styling setup.
- Use the color prototype design file as the color reference for UI changes.
- Use the interface prototype design as the design guideline for layout and interaction changes.

## Known repository-specific caveats

- The repository currently contains `node_modules/` and `dist/`; avoid using those directories to infer project architecture.
- Because `npm run dev` depends on port `5173`, startup issues are often caused by an older dev instance still running.
- There is no packaging configuration yet for shipping the Electron app installer; current build scripts only produce the Vite renderer bundle.
