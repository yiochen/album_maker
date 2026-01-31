# Hooks Directory (`src/hooks`)

## Purpose
Contains custom React hooks that encapsulate state management and complex logic, separating it from UI components.

## Key Logic
- **`useHistory`**: Manages the application state stack (past/present/future) and integrates with the Command Pattern.
- **Canvas Hooks**: Logic for canvas rendering (`useCanvasRender`), interaction (`useCanvasInteraction`), and thumbnails (`useCanvasThumbnail`) is split to reduce complexity.
- **State Sync**: The project prefers the "state from props" pattern—deriving state during render or using immediate conditional updates—over `useEffect` for syncing props to state, to avoid render loops.

## Rules of Engagement
- **Do** separate complex logic from components into custom hooks.
- **Do** use `useHistory` for any state that requires Undo/Redo support.
- **Do not** use `useEffect` to sync state with props if it can be derived during render.
- **Do not** suppress `react-hooks/exhaustive-deps` unless absolutely necessary and documented.
