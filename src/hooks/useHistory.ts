import { useState, useCallback } from 'react';
import type { Command } from '../commands/Command';

interface HistoryState<T> {
    past: Command<T>[];
    present: T;
    future: Command<T>[];
}

export function useHistory<T>(initialState: T) {
    const [history, setHistory] = useState<HistoryState<T>>({
        past: [],
        present: initialState,
        future: [],
    });

    const canUndo = history.past.length > 0;
    const canRedo = history.future.length > 0;

    const undo = useCallback(() => {
        setHistory((prev) => {
            if (prev.past.length === 0) return prev;

            const newPast = [...prev.past];
            const command = newPast.pop()!;
            const newFuture = [command, ...prev.future];
            const newPresent = command.undo(prev.present);

            return {
                past: newPast,
                present: newPresent,
                future: newFuture,
            };
        });
    }, []);

    const redo = useCallback(() => {
        setHistory((prev) => {
            if (prev.future.length === 0) return prev;

            const newFuture = [...prev.future];
            const command = newFuture.shift()!;
            const newPast = [...prev.past, command];
            const newPresent = command.execute(prev.present);

            return {
                past: newPast,
                present: newPresent,
                future: newFuture,
            };
        });
    }, []);

    const dispatch = useCallback((command: Command<T>) => {
        setHistory((prev) => {
            const newPast = [...prev.past];
            const lastCommand = newPast[newPast.length - 1];

            // Try to merge if possible
            if (lastCommand && lastCommand.merge) {
                const merged = lastCommand.merge(command);
                if (merged) {
                    // To correctly apply the merged command, we must first undo the last command
                    // to get back to the state before the transaction started.
                    const previousState = lastCommand.undo(prev.present);
                    const newPresent = merged.execute(previousState);

                    newPast[newPast.length - 1] = merged;

                    return {
                        past: newPast,
                        present: newPresent,
                        future: [],
                    };
                }
            }

            // If not merged
            const newPresent = command.execute(prev.present);
            return {
                past: [...newPast, command],
                present: newPresent,
                future: [],
            };
        });
    }, []);

    const set = useCallback((newState: T) => {
        setHistory({
            past: [],
            present: newState,
            future: [],
        });
    }, []);

    return {
        state: history.present,
        dispatch,
        undo,
        redo,
        canUndo,
        canRedo,
        set,
    };
}
