# Photo Album Editor - High Level Blueprint

## Project Overview

A web-based photo album editor built with React + TypeScript. It provides a Google Slides-like interface for creating spread layouts with drag-and-drop images, text overlays, templates, and export.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Database**: IndexedDB via Dexie.js
- **Canvas**: Fabric.js v7 (editor view), native OffscreenCanvas 2D (worker export)
- **Styling**: Vanilla CSS with design tokens
- **Testing**: Cypress (E2E + visual snapshots)

## Architecture

The app is organized into modular layers. Always consult the nearest `AGENTS.md` before modifying a module.

### Core Modules
- **[Commands](src/commands/AGENTS.md)**: Undo/Redo command pattern and merge/group behavior.
- **[Components](src/components/AGENTS.md)**: View layer, canvas shell, editor layout.
- **[Hooks](src/hooks/AGENTS.md)**: Canvas lifecycle, interactions, persistence, text editing orchestration.
- **[States](src/states/AGENTS.md)**: Global stores (`albumStore`, `uiStore`, `editorInfraStore`).
- **[Utils](src/utils/AGENTS.md)**: Pure render/math/conversion utilities used by editor and workers.
- **[Services](src/services/AGENTS.md)**: Stateless business logic (upload processing, text editor helpers, template layout, storage).
- **[Workers](src/workers/AGENTS.md)**: Export processor running off main thread.
- **[Sources](src/sources/AGENTS.md)**: Provider plugin layer (dummy, uploaded, Google Photos).
- **[Database](src/db/AGENTS.md)**: IndexedDB schema and persistence helpers.
- **Service Worker (`src/sw.ts`)**: Local image routes + Google Photos caching.

## Core Concepts

### Spread Model
The fundamental design unit is a **Spread** (two pages side by side). Elements are stored at spread scope.

### Text Editing Model (Product Rules)
- Enter text edit on **double-click**.
- Newly created text enters edit mode immediately.
- Fabric text is display/selection only; rich editing is handled by Tiptap DOM overlay.
- Overlay size on close is source of truth for final text box dimensions.
- Text formatting actions live in the floating text toolbar while editing.

### Gapless Normalized Layout
- Elements store normalized `box` edges (`x1,y1,x2,y2` in `[0,1]`).
- Rendering uses `calculateGaplessRect()` to snap box edges to shared integer pixel boundaries.
- Layout math targets **300 PPI model space**.
- Editor canvas renders in **96 PPI screen space** and uses conversion utilities.

### Image Quality Guardrail
- Image content includes optional `originalWidth`/`originalHeight`.
- `CanvasImageElement` computes effective print PPI and shows a **Low Res** pill when below 300 PPI.
- Badge sizing and spacing are zoom-compensated and adaptive for small on-screen frames.

## Directory Snapshot

```text
src/
├── commands/
├── components/
├── db/
├── hooks/
├── services/
├── sources/
├── states/
├── templates/
├── types/
├── utils/
├── workers/
├── sw.ts
└── registerSW.ts
```

## Service Worker (`src/sw.ts`)

Compiled separately by the Vite plugin. Handles:
- `__local__/dummyColors/...` generated image responses.
- Uploaded image local routes.
- Cache-first behavior for `lh3.googleusercontent.com` URLs.

Registered via `src/registerSW.ts` with `skipWaiting()` + `clients.claim()`.

## Global Rules of Engagement

1. **Read Before You Write**: Check local `AGENTS.md` first.
2. **State Mutation Discipline**: Persistent album edits must go through command-backed store actions.
3. **Unit Discipline**: Be explicit whether code is in normalized, model px (300), or canvas px (96).
4. **Render Parity**: Editor and worker export should produce matching visual results.
5. **Fabric v7 Uniform Scaling**: Keep `canvas.uniformScaling` synchronized with active image lock setting.
6. **Testing Discipline**: Prefer `data-testid`, deterministic waits, and no external auth dependencies unless under test.

## Development

```bash
npm install
npm run dev
npm run lint
npm run test:e2e
```
