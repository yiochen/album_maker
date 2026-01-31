# Commands Directory (`src/commands`)

## Purpose
This directory implements the **Command Pattern** to manage application state changes, enabling Undo/Redo functionality and batched interactions.

## Key Logic
- **Command Interface**: Defined in `Command.ts`. All commands must implement `execute`, `undo`, and optionally `merge`.
- **Batching**: User interactions (like dragging) generate many small updates. These are batched into a single history entry using a unique `groupId` (generated on `MouseDown`) and the `merge` method.
- **State Management**: Commands are dispatched via the `useHistory` hook (in `src/hooks/`), which maintains the `past`, `present`, and `future` stacks.

## Rules of Engagement
- **Do** implement `undo` to exactly reverse the `execute` operation.
- **Do** use `groupId` for any continuous interaction (drag, resize) to prevent polluting the history stack.
- **Do not** put side effects (like API calls) directly inside `execute` if they cannot be undone synchronously or if they break the purity of the state transition.
- **Do not** modify the state object in place; always return a new state object (immutability).
