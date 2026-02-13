import { Command } from './Command';
import { Album, PageElement } from '../types';

export class UpdateElementCommand implements Command<Album> {
    readonly type = 'UPDATE_ELEMENT';

    constructor(
        public readonly spreadId: string,
        public readonly elementId: string,
        public readonly updates: Partial<PageElement>,
        public readonly oldValues: Partial<PageElement>,
        public readonly groupId?: string
    ) { }

    execute(state: Album): Album {
        return {
            ...state,
            spreads: state.spreads.map(s =>
                s.id === this.spreadId
                    ? {
                        ...s,
                        elements: s.elements.map(e =>
                            e.id === this.elementId
                                ? {
                                    ...e,
                                    ...this.updates,
                                    content: this.updates.content
                                        ? { ...e.content, ...this.updates.content }
                                        : e.content,
                                }
                                : e
                        ),
                    }
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
                    ? {
                        ...s,
                        elements: s.elements.map(e =>
                            e.id === this.elementId
                                ? {
                                    ...e,
                                    ...this.oldValues,
                                    content: this.oldValues.content
                                        ? { ...e.content, ...this.oldValues.content }
                                        : e.content,
                                }
                                : e
                        ),
                    }
                    : s
            ),
            updatedAt: Date.now(),
        };
    }

    merge(nextCommand: Command<Album>): Command<Album> | null {
        if (
            nextCommand instanceof UpdateElementCommand &&
            nextCommand.groupId &&
            this.groupId === nextCommand.groupId &&
            this.spreadId === nextCommand.spreadId &&
            this.elementId === nextCommand.elementId
        ) {
            return new UpdateElementCommand(
                this.spreadId,
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
        public readonly spreadId: string,
        public readonly element: PageElement
    ) { }

    execute(state: Album): Album {
        return {
            ...state,
            spreads: state.spreads.map(s =>
                s.id === this.spreadId
                    ? { ...s, elements: [...s.elements, this.element] }
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
                    ? {
                        ...s,
                        elements: s.elements.filter(e => e.id !== this.element.id),
                    }
                    : s
            ),
            updatedAt: Date.now(),
        };
    }
}

export class DeleteElementCommand implements Command<Album> {
    readonly type = 'DELETE_ELEMENT';

    constructor(
        public readonly spreadId: string,
        public readonly element: PageElement
    ) { }

    execute(state: Album): Album {
        return {
            ...state,
            spreads: state.spreads.map(s =>
                s.id === this.spreadId
                    ? {
                        ...s,
                        elements: s.elements.filter(e => e.id !== this.element.id),
                    }
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
                    ? { ...s, elements: [...s.elements, this.element] }
                    : s
            ),
            updatedAt: Date.now(),
        };
    }
}

export class MoveElementCommand implements Command<Album> {
    readonly type = 'MOVE_ELEMENT';

    constructor(
        public readonly fromSpreadId: string,
        public readonly toSpreadId: string,
        public readonly elementId: string,
        public readonly updates?: Partial<PageElement>,
        public readonly oldValues?: Partial<PageElement>
    ) { }

    execute(state: Album): Album {
        if (this.fromSpreadId === this.toSpreadId) return state;

        const fromSpread = state.spreads.find(s => s.id === this.fromSpreadId);
        if (!fromSpread) return state;

        const elementToMove = fromSpread.elements.find(e => e.id === this.elementId);
        if (!elementToMove) return state;

        return {
            ...state,
            spreads: state.spreads.map(s => {
                if (s.id === this.fromSpreadId) {
                    return {
                        ...s,
                        elements: s.elements.filter(e => e.id !== this.elementId)
                    };
                }
                if (s.id === this.toSpreadId) {
                    const movedElement = this.updates
                        ? {
                            ...elementToMove,
                            ...this.updates,
                            content: this.updates.content
                                ? { ...elementToMove.content, ...this.updates.content }
                                : elementToMove.content,
                        }
                        : elementToMove;
                    return {
                        ...s,
                        elements: [...s.elements, movedElement]
                    };
                }
                return s;
            }),
            updatedAt: Date.now(),
        };
    }

    undo(state: Album): Album {
        if (this.fromSpreadId === this.toSpreadId) return state;

        const fromSpread = state.spreads.find(s => s.id === this.toSpreadId);
        if (!fromSpread) return state;

        const elementToMove = fromSpread.elements.find(e => e.id === this.elementId);
        if (!elementToMove) return state;

        return {
            ...state,
            spreads: state.spreads.map(s => {
                if (s.id === this.toSpreadId) {
                    return {
                        ...s,
                        elements: s.elements.filter(e => e.id !== this.elementId)
                    };
                }
                if (s.id === this.fromSpreadId) {
                    const restoredElement = this.oldValues
                        ? {
                            ...elementToMove,
                            ...this.oldValues,
                            content: this.oldValues.content
                                ? { ...elementToMove.content, ...this.oldValues.content }
                                : elementToMove.content,
                        }
                        : elementToMove;
                    return {
                        ...s,
                        elements: [...s.elements, restoredElement]
                    };
                }
                return s;
            }),
            updatedAt: Date.now(),
        };
    }

    merge(): Command<Album> | null {
        return null;
    }
}
