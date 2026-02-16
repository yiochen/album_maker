# Photo Album Editor - High Level Blueprint

## Project Overview

A web-based photo album editor built with React + TypeScript. It provides a Google Slides-like interface for creating photo album pages with drag-and-drop image placement, customizable templates, and multi-source photo import.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Database**: IndexedDB via Dexie.js
- **Styling**: Vanilla CSS with design tokens
- **Testing**: Cypress (E2E & Visual Regression)

## Architecture

The application is structured into modular layers. Please refer to the `AGENTS.md` file in each directory for specific implementation details and rules.

### Core Modules
- **[Commands](src/commands/AGENTS.md)**: Undo/Redo logic using the Command Pattern.
- **[Components](src/components/AGENTS.md)**: React UI components and Canvas logic (Fabric.js).
- **[Database](src/db/AGENTS.md)**: Client-side persistence with Dexie.js.
- **[Hooks](src/hooks/AGENTS.md)**: Custom logic hooks.
- **[Services](src/services/AGENTS.md)**: Stateless business logic (Export, Storage).
- **[Sources](src/sources/AGENTS.md)**: Plugin system for image providers (Google Photos, etc.).
- **[States](src/states/AGENTS.md)**: Global state management stores (Zustand).
- **[Workers](src/workers/AGENTS.md)**: Web Workers for background tasks.
- **Service Worker (`src/sw.ts`)**: Intercepts fetch requests for local image generation (dummy colors) and network image caching (Google Photos).

## Core Concepts

### Spread Model
The application operates on **Spreads** (typically 2 pages side-by-side) as the fundamental unit of design. While previously using "Pages", the datamodel and UI now focus on Spreads to enable seamless cross-page designing.

### Gapless Layout Engine (Normalized Coordinates)
Elements are positioned using **Normalized Coordinates** (0.0 to 1.0) stored in a `box` object (`x1, y1, x2, y2`). This allows for seamless resizing of spreads and resolution-independent layouts.
-   **Storage**: Database stores the normalized `box` model.
-   **Rendering**: The **Gapless Engine** converts these floats to integer pixels at render time using `calculateGaplessRect()`. This ensures that adjacent elements share the exact same integer pixel boundary, eliminating "white seams" caused by floating-point rounding errors.
-   **Resolution**: While layout is normalized, the application targets **300 PPI** (Pixels Per Inch) as the base print resolution for all scaling calculations.
-   **No Bleed**: This project does not currently handle print bleed. The canvas edges are treated as the final trim edges, and elements can be positioned freely across them if desired for simple overflow, but no explicit bleed safety logic is enforced.

## Directory Structure & Quick Links

```
src/
├── commands/     # Command Pattern (Undo/Redo) -> See src/commands/AGENTS.md
├── components/   # UI & Canvas -> See src/components/AGENTS.md
├── db/           # IndexedDB -> See src/db/AGENTS.md
├── hooks/        # React Hooks -> See src/hooks/AGENTS.md
├── services/     # Business Logic -> See src/services/AGENTS.md
├── sources/      # Image Sources -> See src/sources/AGENTS.md
├── states/       # Zustand Stores -> See src/states/AGENTS.md
├── templates/    # Layout Templates
├── types/        # TypeScript Definitions
├── utils/        # Utility Functions -> See src/utils/AGENTS.md
├── workers/      # Web Workers -> See src/workers/AGENTS.md
├── App.tsx       # Main Orchestrator
├── sw.ts         # Service Worker (compiled to sw.js by Vite plugin)
├── registerSW.ts # SW registration utility
└── index.css     # Global Styles
```

### Service Worker (`src/sw.ts`)
Compiled separately by a custom Vite plugin (esbuild) into `sw.js`. Handles two routes:
- **`/__local__/dummyColors/<hex>/<WxH>`**: Generates SVG responses on the fly (no network).
- **`lh3.googleusercontent.com/*`**: Cache-first strategy for Google Photos images, surviving URL expiration.

Registered via `src/registerSW.ts` from `main.tsx`. Uses `skipWaiting()` + `clients.claim()` for immediate activation.

## Global Rules of Engagement

1.  **Read Before You Write**: Always consult the local `AGENTS.md` in the directory you are working in.
2.  **Visual Regression**: We use `cypress-visual-regression`. Run `npm run cypress:ci` to verify changes, especially for Canvas rendering.
3.  **State Management**:
    *   Use **Zustand** stores (`src/states/`) for global state and history (Undo/Redo via `CommandManager`).
    *   Use `useReducer` or "State from Props" for complex local state.
    *   Avoid deep prop drilling; use composition or context where appropriate.
4.  **Testing**:
    *   Use `data-testid` for selectors.
    *   Close Modals explicitly in tests.
    *   Wait for Canvas rendering (Fabric.js) to settle before snapshots.
5.  **Performance**:
    *   Offload heavy tasks to Web Workers.
    *   Manage object lifecycles (especially Fabric.js objects) to avoid memory leaks.

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run Lint
npm run lint

# Run Tests
npm run test:e2e
```
