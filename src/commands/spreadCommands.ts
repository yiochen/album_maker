import { Command } from './Command';
import { Album, Spread, PageElement } from '../types';
import { createNewSpread } from '../services/storage';

/** A logical page extracted from a spread. */
export interface LogicalPage {
    elements: PageElement[];
    side: 'left' | 'right';
    background?: string;
}

function isElementOnLeft(el: PageElement): boolean {
    return el.box.x1 + el.box.x2 < 1;
}

/** Shift element x-coordinates when a page changes side within a spread. */
function shiftElementSide(el: PageElement, from: 'left' | 'right', to: 'left' | 'right'): PageElement {
    if (from === to) return el;
    const dx = to === 'right' ? 0.5 : -0.5;
    return {
        ...el,
        box: {
            ...el.box,
            x1: el.box.x1 + dx,
            x2: el.box.x2 + dx,
        },
    };
}

/** Extract logical pages from spreads. Returns a flat array of pages (2 per spread). */
export function extractPages(spreads: Spread[]): LogicalPage[] {
    const pages: LogicalPage[] = [];
    for (const spread of spreads) {
        const leftElements = spread.elements.filter(el => isElementOnLeft(el));
        const rightElements = spread.elements.filter(el => !isElementOnLeft(el));
        pages.push({ elements: leftElements, side: 'left', background: spread.background });
        pages.push({ elements: rightElements, side: 'right', background: spread.background });
    }
    return pages;
}

/** Pad to even count so we never have a half spread. */
function ensureEvenPages(pages: LogicalPage[]): LogicalPage[] {
    if (pages.length % 2 !== 0) {
        pages.push({ elements: [], side: 'right' });
    }
    return pages;
}

/** Re-pair logical pages into spreads. */
function pairPagesIntoSpreads(pages: LogicalPage[]): Spread[] {
    pages = ensureEvenPages(pages);
    const spreads: Spread[] = [];
    for (let i = 0; i < pages.length; i += 2) {
        const leftPage = pages[i];
        const rightPage = pages[i + 1]; // may be undefined if odd count

        const elements: PageElement[] = [
            ...leftPage.elements.map(el => shiftElementSide(el, leftPage.side, 'left')),
            ...(rightPage ? rightPage.elements.map(el => shiftElementSide(el, rightPage.side, 'right')) : []),
        ];

        spreads.push({
            id: crypto.randomUUID(),
            versionId: crypto.randomUUID(),
            elements,
            background: leftPage.background,
        });
    }
    return spreads;
}

export class AddSpreadCommand implements Command<Album> {
    readonly type = 'ADD_SPREAD';
    private newSpread: Spread | null = null;
    private actualIndex: number = -1;

    constructor(
        public readonly insertAt?: number
    ) { }

    execute(state: Album): Album {
        if (!this.newSpread) {
            this.newSpread = createNewSpread();
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
                    createNewSpread()
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

export class DeletePagesCommand implements Command<Album> {
    readonly type = 'DELETE_PAGES';
    private originalSpreads: Spread[] | null = null;

    constructor(
        public readonly pageNumbers: number[]
    ) { }

    execute(state: Album): Album {
        // Store original spreads for undo (only on first execute)
        if (!this.originalSpreads) {
            this.originalSpreads = state.spreads;
        }

        const pagesToDelete = new Set(this.pageNumbers);
        const allPages = extractPages(state.spreads);

        // Filter out deleted pages (pageNumbers are 1-based)
        const remainingPages = allPages.filter((_, i) => !pagesToDelete.has(i + 1));

        // Ensure at least one page remains
        if (remainingPages.length === 0) {
            if (allPages.length > 0) {
                remainingPages.push(allPages[0]);
            } else {
                return state;
            }
        }

        const newSpreads = pairPagesIntoSpreads(remainingPages);

        return {
            ...state,
            spreads: newSpreads,
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        if (!this.originalSpreads) return state;
        return {
            ...state,
            spreads: this.originalSpreads,
            updatedAt: Date.now(),
        };
    }
}

/** Deep-copy logical pages so pasted pages get independent element references. */
function deepCopyPages(pages: LogicalPage[]): LogicalPage[] {
    return pages.map(p => ({
        ...p,
        elements: p.elements.map(el => ({
            ...el,
            id: crypto.randomUUID(),
            box: { ...el.box },
        })),
    }));
}

export class InsertPagesCommand implements Command<Album> {
    readonly type = 'INSERT_PAGES';
    private originalSpreads: Spread[] | null = null;

    /**
     * @param pages Logical pages to insert (will be deep-copied).
     * @param atPageIndex 0-based index in the logical page array to insert before.
     *                    If undefined or past the end, appends.
     */
    constructor(
        public readonly pages: LogicalPage[],
        public readonly atPageIndex?: number
    ) { }

    execute(state: Album): Album {
        if (this.pages.length === 0) return state;

        if (!this.originalSpreads) {
            this.originalSpreads = state.spreads;
        }

        const allPages = extractPages(state.spreads);
        const insertIdx = this.atPageIndex !== undefined && this.atPageIndex >= 0 && this.atPageIndex <= allPages.length
            ? this.atPageIndex
            : allPages.length;

        const copied = deepCopyPages(this.pages);
        allPages.splice(insertIdx, 0, ...copied);

        // Enforce maxPages limit
        const maxPages = state.settings?.maxPages ?? 40;
        if (allPages.length > maxPages) {
            allPages.length = maxPages;
        }

        const newSpreads = pairPagesIntoSpreads(allPages);

        return {
            ...state,
            spreads: newSpreads,
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        if (!this.originalSpreads) return state;
        return {
            ...state,
            spreads: this.originalSpreads,
            updatedAt: Date.now(),
        };
    }
}
