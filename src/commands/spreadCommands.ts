import { Command } from './Command';
import { Album, Spread, TemplateId } from '../types';
import { createNewSpread } from '../services/storage';

export class AddSpreadCommand implements Command<Album> {
    readonly type = 'ADD_SPREAD';
    private newSpread: Spread | null = null;
    private actualIndex: number = -1;

    constructor(
        public readonly templateId?: TemplateId,
        public readonly insertAt?: number
    ) { }

    execute(state: Album): Album {
        if (!this.newSpread) {
            this.newSpread = createNewSpread(this.templateId);
        }

        const newSpreads = [...state.spreads];
        this.actualIndex = this.insertAt !== undefined && this.insertAt >= 0 && this.insertAt <= newSpreads.length
            ? this.insertAt
            : newSpreads.length;

        newSpreads.splice(this.actualIndex, 0, this.newSpread);

        return {
            ...state,
            spreads: newSpreads,
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        if (!this.newSpread) return state;
        return {
            ...state,
            spreads: state.spreads.filter(s => s.id !== this.newSpread!.id),
            updatedAt: Date.now(),
        };
    }
}

export class AddSpreadsCommand implements Command<Album> {
    readonly type = 'ADD_SPREADS';
    private newSpreads: Spread[] = [];
    private actualIndex: number = -1;

    constructor(
        public readonly count: number = 2,
        public readonly templateId?: TemplateId,
        public readonly insertAt?: number
    ) { }

    execute(state: Album): Album {
        if (this.newSpreads.length === 0) {
            // Calculate available slots based on maxPages setting (approx. 2 pages per spread)
            const maxPages = state.settings?.maxPages ?? 40;
            const maxSpreads = Math.ceil(maxPages / 2);
            const availableSlots = maxSpreads - state.spreads.length;

            // Default to 1 spread if count not specified in a spread-centric way
            const spreadsToAdd = Math.min(this.count, availableSlots);

            if (spreadsToAdd > 0) {
                this.newSpreads = Array.from({ length: spreadsToAdd }, () =>
                    createNewSpread(this.templateId)
                );
            }
        }

        if (this.newSpreads.length === 0) return state;

        const newSpreads = [...state.spreads];
        this.actualIndex = this.insertAt !== undefined && this.insertAt >= 0 && this.insertAt <= newSpreads.length
            ? this.insertAt
            : newSpreads.length;

        newSpreads.splice(this.actualIndex, 0, ...this.newSpreads);

        return {
            ...state,
            spreads: newSpreads,
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        if (this.newSpreads.length === 0) return state;
        const idsToRemove = new Set(this.newSpreads.map(s => s.id));
        return {
            ...state,
            spreads: state.spreads.filter(s => !idsToRemove.has(s.id)),
            updatedAt: Date.now(),
        };
    }
}

export class DeleteSpreadCommand implements Command<Album> {
    readonly type = 'DELETE_SPREAD';

    constructor(
        public readonly spreadId: string,
        public readonly spread: Spread,
        public readonly index: number
    ) { }

    execute(state: Album): Album {
        if (state.spreads.length <= 1) return state;

        return {
            ...state,
            spreads: state.spreads.filter(s => s.id !== this.spreadId),
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        const newSpreads = [...state.spreads];
        newSpreads.splice(this.index, 0, this.spread);

        return {
            ...state,
            spreads: newSpreads,
            updatedAt: Date.now(),
        };
    }
}

export class ReorderSpreadsCommand implements Command<Album> {
    readonly type = 'REORDER_SPREADS';

    constructor(
        public readonly fromIndex: number,
        public readonly toIndex: number
    ) { }

    execute(state: Album): Album {
        const newSpreads = [...state.spreads];
        const [removed] = newSpreads.splice(this.fromIndex, 1);
        newSpreads.splice(this.toIndex, 0, removed);

        return {
            ...state,
            spreads: newSpreads,
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        const newSpreads = [...state.spreads];
        const [removed] = newSpreads.splice(this.toIndex, 1);
        newSpreads.splice(this.fromIndex, 0, removed);

        return {
            ...state,
            spreads: newSpreads,
            updatedAt: Date.now(),
        };
    }
}

export class UpdateSpreadCommand implements Command<Album> {
    readonly type = 'UPDATE_SPREAD';

    private newVersionId: string | null = null;

    constructor(
        public readonly spreadId: string,
        public readonly updates: Partial<Spread>,
        public readonly oldValues: Partial<Spread>
    ) { }

    execute(state: Album): Album {
        if (!this.newVersionId) {
            this.newVersionId = crypto.randomUUID();
        }

        return {
            ...state,
            spreads: state.spreads.map(s =>
                s.id === this.spreadId
                    ? { ...s, ...this.updates, versionId: this.newVersionId! }
                    : s
            ),
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        return {
            ...state,
            spreads: state.spreads.map(s =>
                s.id === this.spreadId
                    ? { ...s, ...this.oldValues, versionId: this.oldValues.versionId || s.versionId }
                    : s
            ),
            updatedAt: Date.now(),
        };
    }
}

export class DeleteSpreadsCommand implements Command<Album> {
    readonly type = 'DELETE_SPREADS';

    constructor(
        public readonly spreadIds: string[],
        public readonly originalSpreads: { spread: Spread, index: number }[]
    ) { }

    execute(state: Album): Album {
        const idsToRemove = new Set(this.spreadIds);
        const remainingSpreads = state.spreads.filter(s => !idsToRemove.has(s.id));

        if (remainingSpreads.length < 1) return state;

        return {
            ...state,
            spreads: remainingSpreads,
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        const newSpreads = [...state.spreads];
        // Insert back in increasing index order to maintain relative positions
        const sortedSpreads = [...this.originalSpreads].sort((a, b) => a.index - b.index);

        for (const item of sortedSpreads) {
            newSpreads.splice(item.index, 0, item.spread);
        }

        return {
            ...state,
            spreads: newSpreads,
            updatedAt: Date.now(),
        };
    }
}
