import { Command } from './Command';
import { Album, PageElement } from '../types';

export class UpdateElementCommand implements Command<Album> {
    readonly type = 'UPDATE_ELEMENT';

    private newVersionId: string | null = null;

    constructor(
        public readonly spreadId: string,
        public readonly elementId: string,
        public readonly updates: Partial<PageElement>,
        public readonly oldValues: Partial<PageElement>,
        public readonly groupId?: string
    ) { }

    execute(state: Album): Album {
        if (!this.newVersionId) {
            this.newVersionId = crypto.randomUUID();
        }

        return {
            ...state,
            spreads: state.spreads.map(s =>
                s.id === this.spreadId
                    ? {
                        ...s,
                        versionId: this.newVersionId!,
                        elements: s.elements.map(e =>
                            e.id === this.elementId
                                ? ({
                                    ...e,
                                    ...this.updates,
                                    content: this.updates.content
                                        ? { ...e.content, ...this.updates.content }
                                        : e.content,
                                } as PageElement)
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
                        versionId: crypto.randomUUID(), // Always bump version on undo to trigger refresh
                        elements: s.elements.map(e =>
                            e.id === this.elementId
                                ? ({
                                    ...e,
                                    ...this.oldValues,
                                    content: this.oldValues.content
                                        ? { ...e.content, ...this.oldValues.content }
                                        : e.content,
                                } as PageElement)
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
                { ...this.updates, ...nextCommand.updates } as Partial<PageElement>,
                this.oldValues,
                this.groupId
            );
        }
        return null;
    }
}

export class AddElementCommand implements Command<Album> {
    readonly type = 'ADD_ELEMENT';

    private newVersionId: string | null = null;
    private oldVersionId: string | null = null;

    constructor(
        public readonly spreadId: string,
        public readonly element: PageElement
    ) { }

    execute(state: Album): Album {
        if (!this.newVersionId) {
            this.newVersionId = crypto.randomUUID();
        }

        return {
            ...state,
            spreads: state.spreads.map(s => {
                if (s.id === this.spreadId) {
                    if (!this.oldVersionId) this.oldVersionId = s.versionId;
                    return {
                        ...s,
                        versionId: this.newVersionId!,
                        elements: [...s.elements, this.element]
                    };
                }
                return s;
            }),
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
                        versionId: this.oldVersionId || s.versionId,
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

    private newVersionId: string | null = null;
    private oldVersionId: string | null = null;

    constructor(
        public readonly spreadId: string,
        public readonly element: PageElement
    ) { }

    execute(state: Album): Album {
        if (!this.newVersionId) {
            this.newVersionId = crypto.randomUUID();
        }

        return {
            ...state,
            spreads: state.spreads.map(s => {
                if (s.id === this.spreadId) {
                    if (!this.oldVersionId) this.oldVersionId = s.versionId;
                    return {
                        ...s,
                        versionId: this.newVersionId!,
                        elements: s.elements.filter(e => e.id !== this.element.id),
                    };
                }
                return s;
            }),
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
                        versionId: this.oldVersionId || s.versionId,
                        elements: [...s.elements, this.element]
                    }
                    : s
            ),
            updatedAt: Date.now(),
        };
    }
}

export class MoveElementCommand implements Command<Album> {
    readonly type = 'MOVE_ELEMENT';

    private newFromVersionId: string | null = null;
    private newToVersionId: string | null = null;
    private oldFromVersionId: string | null = null;
    private oldToVersionId: string | null = null;

    constructor(
        public readonly fromSpreadId: string,
        public readonly toSpreadId: string,
        public readonly elementId: string,
        public readonly updates?: Partial<PageElement>,
        public readonly oldValues?: Partial<PageElement>
    ) { }

    execute(state: Album): Album {
        if (this.fromSpreadId === this.toSpreadId) return state;

        if (!this.newFromVersionId) this.newFromVersionId = crypto.randomUUID();
        if (!this.newToVersionId) this.newToVersionId = crypto.randomUUID();

        const fromSpread = state.spreads.find(s => s.id === this.fromSpreadId);
        if (!fromSpread) return state;

        const elementToMove = fromSpread.elements.find(e => e.id === this.elementId);
        if (!elementToMove) return state;

        return {
            ...state,
            spreads: state.spreads.map(s => {
                if (s.id === this.fromSpreadId) {
                    if (!this.oldFromVersionId) this.oldFromVersionId = s.versionId;
                    return {
                        ...s,
                        versionId: this.newFromVersionId!,
                        elements: s.elements.filter(e => e.id !== this.elementId)
                    };
                }
                if (s.id === this.toSpreadId) {
                    if (!this.oldToVersionId) this.oldToVersionId = s.versionId;
                    const movedElement = this.updates
                        ? ({
                            ...elementToMove,
                            ...this.updates,
                            content: this.updates.content
                                ? { ...elementToMove.content, ...this.updates.content }
                                : elementToMove.content,
                        } as PageElement)
                        : elementToMove;
                    return {
                        ...s,
                        versionId: this.newToVersionId!,
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
                        versionId: this.oldToVersionId || s.versionId,
                        elements: s.elements.filter(e => e.id !== this.elementId)
                    };
                }
                if (s.id === this.fromSpreadId) {
                    const restoredElement = this.oldValues
                        ? ({
                            ...elementToMove,
                            ...this.oldValues,
                            content: this.oldValues.content
                                ? { ...elementToMove.content, ...this.oldValues.content }
                                : elementToMove.content,
                        } as PageElement)
                        : elementToMove;
                    return {
                        ...s,
                        versionId: this.oldFromVersionId || s.versionId,
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

/**
 * Command to reorder an element within a spread's elements array (z-order change).
 * Moves an element from one index to another, shifting other elements accordingly.
 */
export class ReorderElementCommand implements Command<Album> {
    readonly type = 'REORDER_ELEMENT';

    private newVersionId: string | null = null;
    private oldVersionId: string | null = null;

    constructor(
        public readonly spreadId: string,
        public readonly elementId: string,
        public readonly fromIndex: number,
        public readonly toIndex: number,
    ) { }

    execute(state: Album): Album {
        return this.applyReorder(state, this.fromIndex, this.toIndex);
    }

    undo(state: Album): Album {
        return this.applyReorder(state, this.toIndex, this.fromIndex);
    }

    merge(): Command<Album> | null {
        return null;
    }

    private applyReorder(state: Album, from: number, to: number): Album {
        if (!this.newVersionId) this.newVersionId = crypto.randomUUID();

        return {
            ...state,
            spreads: state.spreads.map(s => {
                if (s.id !== this.spreadId) return s;
                if (!this.oldVersionId) this.oldVersionId = s.versionId;

                const elements = [...s.elements];
                const [moved] = elements.splice(from, 1);
                elements.splice(to, 0, moved);
                const isUndo = from === this.toIndex && to === this.fromIndex;

                return {
                    ...s,
                    versionId: isUndo ? (this.oldVersionId || s.versionId) : this.newVersionId!,
                    elements
                };
            }),
            updatedAt: Date.now(),
        };
    }
}
