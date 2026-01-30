import { Command } from './Command';
import { Album, PageElement } from '../types';

export class UpdateElementCommand implements Command<Album> {
    readonly type = 'UPDATE_ELEMENT';

    constructor(
        public readonly pageId: string,
        public readonly elementId: string,
        public readonly updates: Partial<PageElement>,
        public readonly oldValues: Partial<PageElement>,
        public readonly groupId?: string
    ) { }

    execute(state: Album): Album {
        return {
            ...state,
            pages: state.pages.map(p =>
                p.id === this.pageId
                    ? {
                        ...p,
                        elements: p.elements.map(e =>
                            e.id === this.elementId
                                ? { ...e, ...this.updates }
                                : e
                        ),
                    }
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
                    ? {
                        ...p,
                        elements: p.elements.map(e =>
                            e.id === this.elementId
                                ? { ...e, ...this.oldValues }
                                : e
                        ),
                    }
                    : p
            ),
            updatedAt: Date.now(),
        };
    }

    merge(nextCommand: Command<Album>): Command<Album> | null {
        if (
            nextCommand instanceof UpdateElementCommand &&
            nextCommand.groupId &&
            this.groupId === nextCommand.groupId &&
            this.pageId === nextCommand.pageId &&
            this.elementId === nextCommand.elementId
        ) {
            return new UpdateElementCommand(
                this.pageId,
                this.elementId,
                { ...this.updates, ...nextCommand.updates },
                this.oldValues,
                this.groupId
            );
        }
        return null;
    }
}

export class AddElementCommand implements Command<Album> {
    readonly type = 'ADD_ELEMENT';

    constructor(
        public readonly pageId: string,
        public readonly element: PageElement
    ) { }

    execute(state: Album): Album {
        return {
            ...state,
            pages: state.pages.map(p =>
                p.id === this.pageId
                    ? { ...p, elements: [...p.elements, this.element] }
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
                    ? {
                        ...p,
                        elements: p.elements.filter(e => e.id !== this.element.id),
                    }
                    : p
            ),
            updatedAt: Date.now(),
        };
    }
}

export class DeleteElementCommand implements Command<Album> {
    readonly type = 'DELETE_ELEMENT';

    constructor(
        public readonly pageId: string,
        public readonly element: PageElement
    ) { }

    execute(state: Album): Album {
        return {
            ...state,
            pages: state.pages.map(p =>
                p.id === this.pageId
                    ? {
                        ...p,
                        elements: p.elements.filter(e => e.id !== this.element.id),
                    }
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
                    ? { ...p, elements: [...p.elements, this.element] }
                    : p
            ),
            updatedAt: Date.now(),
        };
    }
}

export class MoveElementCommand implements Command<Album> {
    readonly type = 'MOVE_ELEMENT';

    constructor(
        public readonly fromPageId: string,
        public readonly toPageId: string,
        public readonly elementId: string
    ) { }

    execute(state: Album): Album {
        if (this.fromPageId === this.toPageId) return state;

        const fromPage = state.pages.find(p => p.id === this.fromPageId);
        if (!fromPage) return state;

        const elementToMove = fromPage.elements.find(e => e.id === this.elementId);
        if (!elementToMove) return state;

        return {
            ...state,
            pages: state.pages.map(p => {
                if (p.id === this.fromPageId) {
                    return {
                        ...p,
                        elements: p.elements.filter(e => e.id !== this.elementId)
                    };
                }
                if (p.id === this.toPageId) {
                    return {
                        ...p,
                        elements: [...p.elements, elementToMove]
                    };
                }
                return p;
            }),
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        if (this.fromPageId === this.toPageId) return state;

        const fromPage = state.pages.find(p => p.id === this.toPageId);
        if (!fromPage) return state;

        const elementToMove = fromPage.elements.find(e => e.id === this.elementId);
        if (!elementToMove) return state;

        return {
            ...state,
            pages: state.pages.map(p => {
                if (p.id === this.toPageId) {
                    return {
                        ...p,
                        elements: p.elements.filter(e => e.id !== this.elementId)
                    };
                }
                if (p.id === this.fromPageId) {
                    return {
                        ...p,
                        elements: [...p.elements, elementToMove]
                    };
                }
                return p;
            }),
            updatedAt: Date.now(),
        };
    }

    merge(nextCommand: Command<Album>): Command<Album> | null {
        return null;
    }
}
