# State Management (`src/states`)

## Overview
We use **Zustand** for state management to avoid prop drilling and separate concerns. The state is divided into multiple stores:

1.  **`albumStore.ts`**: Manages the core data model (`Album`) and Undo/Redo logic.
    -   **Data Model**: Uses a **normalized box model** (`x1, y1, x2, y2` floats) for element positioning.
    -   **Command Pattern**: Mutations to the album MUST go through the `CommandManager`.
2.  **`uiStore.ts`**: Manages ephemeral UI state.
    -   `currentSpreadIndex`: Which spread is currently being viewed/edited.
    -   `selectedElementId` / `selectedPageId`: Selection state.
    -   `isImagePoolOpen`, `isSettingsOpen`: Panel visibility.
    -   `isSnappingEnabled`: Interaction preferences.

## Rules of Engagement
-   **Do** use individual selector hooks (e.g., `useAlbum()`, `useCurrentSpreadIndex()`) in components to minimize re-renders.
-   **Do not** destructure the entire store object (e.g., `const { ... } = useAlbumStore()`) in large components, as this causes re-renders on any state change.
-   **Command Pattern**: Mutations to the album MUST go through the `CommandManager` (wrapped by `albumStore` actions) to ensure Undo/Redo works.

## Integration
-   **`AlbumEditor.tsx`**: Acts as the main orchestrator but now relies on stores instead of holding state itself.
-   **Hooks**: Custom hooks like `useAutoSave` and `useKeyboardShortcuts` can now subscribe to stores directly.
