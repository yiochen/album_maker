import { Command } from './Command';
import { Album, Page, TemplateId } from '../types';
import { createNewPage } from '../services/storage';

export class AddPageCommand implements Command<Album> {
    readonly type = 'ADD_PAGE';
    private newPage: Page | null = null;

    constructor(public readonly templateId?: TemplateId) {}

    execute(state: Album): Album {
        if (!this.newPage) {
            this.newPage = createNewPage(this.templateId);
        }

        return {
            ...state,
            pages: [...state.pages, this.newPage],
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        if (!this.newPage) return state;
        return {
            ...state,
            pages: state.pages.filter(p => p.id !== this.newPage!.id),
            updatedAt: Date.now(),
        };
    }
}

export class AddPagesCommand implements Command<Album> {
    readonly type = 'ADD_PAGES';
    private newPages: Page[] = [];

    constructor(
        public readonly count: number = 2,
        public readonly templateId?: TemplateId
    ) {}

    execute(state: Album): Album {
        if (this.newPages.length === 0) {
            const maxPages = state.settings?.maxPages ?? 40;
            const availableSlots = maxPages - state.pages.length;
            const pagesToAdd = Math.min(this.count, availableSlots);

            if (pagesToAdd > 0) {
                this.newPages = Array.from({ length: pagesToAdd }, () =>
                    createNewPage(this.templateId)
                );
            }
        }

        if (this.newPages.length === 0) return state;

        return {
            ...state,
            pages: [...state.pages, ...this.newPages],
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        if (this.newPages.length === 0) return state;
        const idsToRemove = new Set(this.newPages.map(p => p.id));
        return {
            ...state,
            pages: state.pages.filter(p => !idsToRemove.has(p.id)),
            updatedAt: Date.now(),
        };
    }
}

export class DeletePageCommand implements Command<Album> {
    readonly type = 'DELETE_PAGE';

    constructor(
        public readonly pageId: string,
        public readonly page: Page,
        public readonly index: number
    ) {}

    execute(state: Album): Album {
        if (state.pages.length <= 1) return state;

        return {
            ...state,
            pages: state.pages.filter(p => p.id !== this.pageId),
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        const newPages = [...state.pages];
        newPages.splice(this.index, 0, this.page);

        return {
            ...state,
            pages: newPages,
            updatedAt: Date.now(),
        };
    }
}

export class ReorderPagesCommand implements Command<Album> {
    readonly type = 'REORDER_PAGES';

    constructor(
        public readonly fromIndex: number,
        public readonly toIndex: number
    ) {}

    execute(state: Album): Album {
        const newPages = [...state.pages];
        const [removed] = newPages.splice(this.fromIndex, 1);
        newPages.splice(this.toIndex, 0, removed);

        return {
            ...state,
            pages: newPages,
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        const newPages = [...state.pages];
        const [removed] = newPages.splice(this.toIndex, 1);
        newPages.splice(this.fromIndex, 0, removed);

        return {
            ...state,
            pages: newPages,
            updatedAt: Date.now(),
        };
    }
}

export class UpdatePageCommand implements Command<Album> {
    readonly type = 'UPDATE_PAGE';

    constructor(
        public readonly pageId: string,
        public readonly updates: Partial<Page>,
        public readonly oldValues: Partial<Page>
    ) {}

    execute(state: Album): Album {
        return {
            ...state,
            pages: state.pages.map(p =>
                p.id === this.pageId
                    ? { ...p, ...this.updates }
                    : p
            ),
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        return {
            ...state,
            pages: state.pages.map(p =>
                p.id === this.pageId
                    ? { ...p, ...this.oldValues }
                    : p
            ),
            updatedAt: Date.now(),
        };
    }
}
