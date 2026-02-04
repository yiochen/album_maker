import type { Command } from './Command';

export class CommandManager<T> {
    private past: Command<T>[] = [];
    private future: Command<T>[] = [];
    private present: T | null = null;

    constructor(initialState?: T) {
        if (initialState) {
            this.present = initialState;
        }
    }

    setInitialState(state: T) {
        this.present = state;
        this.past = [];
        this.future = [];
    }

    getState(): T | null {
        return this.present;
    }

    canUndo(): boolean {
        return this.past.length > 0;
    }

    canRedo(): boolean {
        return this.future.length > 0;
    }

    execute(command: Command<T>) {
        if (!this.present) {
            console.error('CommandManager: No state initialized');
            return;
        }

        const lastCommand = this.past[this.past.length - 1];

        // Try to merge if possible
        if (lastCommand && lastCommand.merge) {
            const merged = lastCommand.merge(command);
            if (merged) {
                // To correctly apply the merged command, we must first undo the last command
                // to get back to the state before the transaction started.
                const previousState = lastCommand.undo(this.present);
                const newPresent = merged.execute(previousState);

                this.past[this.past.length - 1] = merged;
                this.present = newPresent;
                this.future = []; // Clear future on new action
                return;
            }
        }

        // Standard execution
        const newPresent = command.execute(this.present);
        this.past.push(command);
        this.present = newPresent;
        this.future = [];
    }

    undo() {
        if (this.past.length === 0 || !this.present) return;

        const command = this.past.pop()!;
        this.future.unshift(command);
        this.present = command.undo(this.present);
    }

    redo() {
        if (this.future.length === 0 || !this.present) return;

        const command = this.future.shift()!;
        this.past.push(command);
        this.present = command.execute(this.present);
    }
}
