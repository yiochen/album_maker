export interface Command<T> {
    // A unique identifier for the type of action (e.g., 'MOVE_ELEMENT')
    readonly type: string;
    // A unique identifier for the interaction session (e.g., generated on MouseDown)
    // Commands with the same groupId generally merge together.
    readonly groupId?: string;
    // Applies the change and returns the new full state
    execute(state: T): T;
    // Reverts the change and returns the restored state
    undo(state: T): T;
    // Attempts to merge a new command into this one.
    // Returns a NEW Command if merged, or null if they cannot be merged.
    merge?(nextCommand: Command<T>): Command<T> | null;
}
