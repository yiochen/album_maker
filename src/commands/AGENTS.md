# Commands Directory (`src/commands`)

## Purpose
This directory implements the **Command Pattern** to manage application state changes, enabling Undo/Redo functionality and batched interactions.

## Key Logic
- **Command Interface**: Defined in `Command.ts`. All commands must implement `execute`, `undo`, and optionally `merge`.
- **Batching**: User interactions (like dragging) generate many small updates. These are batched into a single history entry using a unique `groupId` (generated on `MouseDown`) and the `merge` method.
- **State Management**: Commands are dispatched via the `CommandManager` singleton used within `src/states/albumStore.ts`.

## Rules of Engagement
- **Do** implement `undo` to exactly reverse the `execute` operation.
- **Do** use `groupId` for any continuous interaction (drag, resize) to prevent polluting the history stack.
- **Do not** put side effects (like API calls) directly inside `execute` if they cannot be undone synchronously or if they break the purity of the state transition.
- **Do not** modify the state object in place; always return a new state object (immutability).
- **Deep merge `content`**: `PageElement.content` is a nested object (e.g., `ImageContent`). When applying `Partial<PageElement>` updates that include `content`, use `{ ...e.content, ...updates.content }` to avoid wiping sibling fields. This pattern is already implemented in `UpdateElementCommand` and `MoveElementCommand`.
- **Z-Order Management**: Elements are rendered in array order (`spread.elements`). Moving an element's index in this array effectively changes its z-order. `ReorderElementCommand` handles z-order reordering (e.g. Bring Forward, Send Backward) while maintaining clean undo history.
