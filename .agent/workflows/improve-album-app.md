---
description: Background information for the Photo Album Maker project and how to proceed with changes.
---

# Project Background: Photo Album Maker

This project is a high-performance, web-based Photo Album Maker. It emphasizes a smooth user experience, responsive interactions, and offline-first capabilities. The following is some background. This is not a task. Please take a look at the following carefully.

## Technology Stack

- **Core**: React 19 (Functional components, Hooks).
- **Canvas Engine**: [Fabric.js v6+](https://fabricjs.com/) for rendering and direct object manipulation.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) for shared app state (`albumStore`, `uiStore`).
- **History (Undo/Redo)**: A custom **Command Pattern** implementation in `src/commands/`.
- **Persistence**: [Dexie.js](https://dexie.org/) (IndexedDB) for local storage and photo caching.
- **Drag and Drop**: [@dnd-kit](https://dnd-kit.com/) for UI-level dragging (e.g., from pool to canvas).
- **Service Workers**: For client-side image proxying and caching.

## Core Concepts & Data Model

### 1. The Spread Model
An album is composed of **Spreads**. Each spread represents two facing pages (or a single large display area).
- **Pixels are Absolute**: Layouts are calculated in absolute pixels based on `album.settings` (pageWidth, pageHeight).
- **Elements**: Visual objects (mostly images) placed on a spread.

### 2. The Box Model
Elements use a 4-point box model for positioning:
```typescript
box: { x1: number, y1: number, x2: number, y2: number }
```
- `x1, y1` is Top-Left.
- `x2, y2` is Bottom-Right.
- These coordinates are **relative** (0.0 to 1.0) to the spread dimensions, ensuring scalability.

### 3. React-to-Fabric Synchronization
The application uses a **one-way sync** pattern:
- **Source of Truth**: The Zustand `albumStore`.
- **Sync Hook**: `useReactToFabricSync.ts` monitors the state and updates the Fabric.js canvas objects.
- **Interactions**: Fabric.js handles low-level dragging/resizing. On `object:modified`, a Command is dispatched to update the React state.

## Rules of Engagement for Agents

### 1. State Mutations
**Never** mutate the Zustand state directly in components for layout changes.
- Use the **Command Pattern**: `import { MoveElementCommand } from '../commands/MoveElementCommand'`.
- This ensures **Undo/Redo** functionality works correctly.
- Batch continuous interactions (like dragging) using `groupId`.

### 2. UI Performance
- Use **Zustand Selectors** (e.g., `useAlbumStore(s => s.album.name)`) instead of destructuring the whole state to prevent unnecessary re-renders.
- Keep the `Canvas` component lean; offload logic to hooks like `useCanvasInteraction` or `useReactToFabricSync`.

### 3. File Organization
- `src/commands/`: Command implementations (must have `AGENTS.md` docs).
- `src/states/`: Zustand store definitions.
- `src/hooks/`: Business logic and sync hooks.
- `src/components/`: Pure React UI components.

### 4. Quality Standards
- **Typing**: Strict TypeScript. No `any`.
- **Linting**: Run `npm run lint` before finishing.
- **Building**: Run `npm run build` to ensure no regressions in schema generation or types.
- **Code style**: You should follow code-style-guide.md when implementing changes.
- **Dependency management**: Be cautious about adding an dependency. Always consult user first before adding dependency. Be practical and suggest if something should be done without dependency or if something is better managed by an additional dependency for code simplicity and maintenability.

### 5. Interaction with user
- Do not start implementation unless user give clear signal.
- When user issue a request to add a feature or fix a bug, treat it as a invitation for discussion instead of a command to start execution. You should think all cases, and take into consideration of the current codebase, provide alternatives, and discuss pros and cons of each solution. You should try to provide alternatives.

Make sure you understand the above and simply acknowledge to user. User will then issue request after your reply.