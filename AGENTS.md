# Photo Album Editor - High Level Blueprint

## Project Overview

A web-based photo album editor built with React + TypeScript. It provides a Google Slides-like interface for creating photo album pages with drag-and-drop image placement, customizable templates, and multi-source photo import.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Database**: IndexedDB via Dexie.js
- **Styling**: Vanilla CSS with design tokens
- **Testing**: Cypress (E2E & Visual Regression)

## Architecture

The application is structured into modular layers. Please refer to the `AGENTS.md` file in each directory for specific implementation details and rules.

### Core Modules
- **[Commands](src/commands/AGENTS.md)**: Undo/Redo logic using the Command Pattern.
- **[Components](src/components/AGENTS.md)**: React UI components and Canvas logic (Fabric.js).
- **[Database](src/db/AGENTS.md)**: Client-side persistence with Dexie.js.
- **[Hooks](src/hooks/AGENTS.md)**: State management and custom logic hooks.
- **[Services](src/services/AGENTS.md)**: Stateless business logic (Export, Storage).
- **[Sources](src/sources/AGENTS.md)**: Plugin system for image providers (Google Photos, etc.).
- **[Workers](src/workers/AGENTS.md)**: Web Workers for background tasks.

## Directory Structure & Quick Links

```
src/
├── commands/     # Command Pattern (Undo/Redo) -> See src/commands/AGENTS.md
├── components/   # UI & Canvas -> See src/components/AGENTS.md
├── db/           # IndexedDB -> See src/db/AGENTS.md
├── hooks/        # React Hooks -> See src/hooks/AGENTS.md
├── services/     # Business Logic -> See src/services/AGENTS.md
├── sources/      # Image Sources -> See src/sources/AGENTS.md
├── templates/    # Layout Templates
├── types/        # TypeScript Definitions
├── utils/        # Utility Functions
├── workers/      # Web Workers -> See src/workers/AGENTS.md
├── App.tsx       # Main Orchestrator
└── index.css     # Global Styles
```

## Global Rules of Engagement

1.  **Read Before You Write**: Always consult the local `AGENTS.md` in the directory you are working in.
2.  **Visual Regression**: We use `cypress-visual-regression`. Run `npm run cypress:ci` to verify changes, especially for Canvas rendering.
3.  **State Management**:
    *   Use `useHistory` for undoable state.
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
