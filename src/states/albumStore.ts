import { create } from 'zustand';
import type { Album, Spread, PageElement, PoolImage, AlbumSettings } from '../types';
import {
    UpdateElementCommand,
    AddElementCommand,
    AddElementsCommand,
    DeleteElementCommand,
    MoveElementCommand,
    ReorderElementCommand
} from '../commands/elementCommands';
import {
    AddSpreadCommand,
    AddSpreadsCommand,
    DeleteSpreadCommand,
    DeleteSpreadsCommand,
    DeletePagesCommand,
    InsertPagesCommand,
    ReorderSpreadsCommand,
    UpdateSpreadCommand,
} from '../commands/spreadCommands';
import type { LogicalPage } from '../commands/spreadCommands';
import {
    SetAlbumNameCommand,
    SetSettingsCommand
} from '../commands/albumCommands';
import { CommandManager } from '../commands/commandManager';
import { setVal } from '../utils/typeUtil';


// Command Manager Instance (shared singleton for the store)
const commandManager = new CommandManager<Album>();

interface AlbumState {
    album: Album | null;
    canUndo: boolean;
    canRedo: boolean;

    // Actions
    setAlbum: (album: Album) => void;

    // Command wrappers
    setName: (name: string) => void;
    setSettings: (settings: Partial<AlbumSettings>) => void;
    addSpread: (index?: number) => void;
    addSpreads: (count?: number, index?: number) => void;
    deleteSpread: (spreadId: string) => void;
    deleteSpreads: (spreadIds: string[]) => void;
    deletePages: (pageNumbers: number[]) => void;
    insertPages: (pages: LogicalPage[], atPageIndex?: number) => void;
    reorderSpreads: (fromIndex: number, toIndex: number) => void;
    updateSpread: (spreadId: string, updates: Partial<Spread>) => void;
    addElement: (spreadId: string, element: PageElement) => void;
    addElements: (spreadId: string, elements: PageElement[]) => void;
    updateElement: (spreadId: string, elementId: string, updates: Partial<PageElement>, groupId?: string) => void;
    updateElementTransient: (spreadId: string, elementId: string, updates: Partial<PageElement>) => void;
    deleteElement: (spreadId: string, elementId: string) => void;
    addToPool: (images: PoolImage[]) => void;
    removeFromPool: (imageId: string) => void;
    clearPool: () => void;
    moveElement: (fromSpreadId: string, toSpreadId: string, elementId: string, updates?: Partial<PageElement>) => void;
    reorderElement: (spreadId: string, elementId: string, fromIndex: number, toIndex: number) => void;

    // History Actions
    undo: () => void;
    redo: () => void;
}

export const useAlbumStore = create<AlbumState>((set, get) => {
    // Helper to sync state from command manager
    const syncState = () => {
        set({
            album: commandManager.getState(),
            canUndo: commandManager.canUndo(),
            canRedo: commandManager.canRedo(),
        });
    };

    return {
        album: null,
        canUndo: false,
        canRedo: false,

        setAlbum: (album: Album) => {
            commandManager.setInitialState(album);
            syncState();
        },

        setName: (name: string) => {
            const album = get().album;
            if (!album) return;
            commandManager.execute(new SetAlbumNameCommand(name, album.name));
            syncState();
        },

        setSettings: (settings: Partial<AlbumSettings>) => {
            const album = get().album;
            if (!album) return;
            const oldValues: Partial<AlbumSettings> = {};
            for (const key of Object.keys(settings) as Array<keyof AlbumSettings>) {

                setVal(oldValues, key, album.settings[key]);
            }
            commandManager.execute(new SetSettingsCommand(settings, oldValues));
            syncState();
        },

        addSpread: (index?: number) => {
            commandManager.execute(new AddSpreadCommand(index));
            syncState();
        },

        addSpreads: (count: number = 1, index?: number) => {
            commandManager.execute(new AddSpreadsCommand(count, index));
            syncState();
        },

        deleteSpread: (spreadId: string) => {
            const album = get().album;
            if (!album) return;
            const index = album.spreads.findIndex(s => s.id === spreadId);
            if (index === -1) return;
            const spread = album.spreads[index];
            commandManager.execute(new DeleteSpreadCommand(spreadId, spread, index));
            syncState();
        },

        deleteSpreads: (spreadIds: string[]) => {
            const album = get().album;
            if (!album) return;

            const idsToDelete = new Set(spreadIds);
            const validIds = new Set<string>();

            // Identify valid IDs to delete
            album.spreads.forEach((spread) => {
                if (idsToDelete.has(spread.id)) {
                    validIds.add(spread.id);
                }
            });

            // Ensure at least one spread remains
            if (album.spreads.length - validIds.size < 1) {
                if (album.spreads.length > 0) {
                    // Keep the first spread (mimics legacy behavior)
                    validIds.delete(album.spreads[0].id);
                }
            }

            if (validIds.size === 0) return;

            // Gather full spread objects for the command (for Undo)
            const spreadsToDelete: { spread: Spread, index: number }[] = [];
            album.spreads.forEach((spread, index) => {
                if (validIds.has(spread.id)) {
                    spreadsToDelete.push({ spread, index });
                }
            });

            commandManager.execute(new DeleteSpreadsCommand(Array.from(validIds), spreadsToDelete));
            syncState();
        },

        deletePages: (pageNumbers: number[]) => {
            const album = get().album;
            if (!album || pageNumbers.length === 0) return;
            commandManager.execute(new DeletePagesCommand(pageNumbers));
            syncState();
        },

        insertPages: (pages: LogicalPage[], atPageIndex?: number) => {
            const album = get().album;
            if (!album || pages.length === 0) return;
            commandManager.execute(new InsertPagesCommand(pages, atPageIndex));
            syncState();
        },

        reorderSpreads: (fromIndex: number, toIndex: number) => {
            commandManager.execute(new ReorderSpreadsCommand(fromIndex, toIndex));
            syncState();
        },

        updateSpread: (spreadId: string, updates: Partial<Spread>) => {
            const album = get().album;
            if (!album) return;
            const spread = album.spreads.find(s => s.id === spreadId);
            if (!spread) return;

            const oldValues: Partial<Spread> = {};
            for (const key of Object.keys(updates) as Array<keyof Spread>) {

                setVal(oldValues, key, spread[key]);
            }

            commandManager.execute(new UpdateSpreadCommand(spreadId, updates, oldValues));
            syncState();
        },

        addElement: (spreadId: string, element: PageElement) => {
            commandManager.execute(new AddElementCommand(spreadId, element));
            syncState();
        },

        addElements: (spreadId: string, elements: PageElement[]) => {
            if (elements.length === 0) return;
            commandManager.execute(new AddElementsCommand(spreadId, elements));
            syncState();
        },

        updateElement: (spreadId: string, elementId: string, updates: Partial<PageElement>, groupId?: string) => {
            const album = get().album;
            if (!album) return;
            const spread = album.spreads.find(s => s.id === spreadId);
            if (!spread) return;
            const element = spread.elements.find(e => e.id === elementId);
            if (!element) return;

            const oldValues: Partial<PageElement> = {};
            for (const key of Object.keys(updates) as Array<keyof PageElement>) {
                if (key === 'content' && updates.content) {
                    // Deep capture: only store the sub-fields of content that are being updated
                    const oldContent: Partial<typeof element.content> = {};
                    for (const ck of Object.keys(updates.content) as Array<keyof typeof element.content>) {
                        (oldContent as Record<string, unknown>)[ck] = element.content[ck];
                    }
                    (oldValues as Record<string, unknown>).content = oldContent;
                } else {
                    setVal(oldValues, key, element[key]);
                }
            }

            commandManager.execute(new UpdateElementCommand(spreadId, elementId, updates, oldValues, groupId));
            syncState();
        },

        updateElementTransient: (spreadId: string, elementId: string, updates: Partial<PageElement>) => {
            const album = get().album;
            if (!album) return;

            const spread = album.spreads.find(s => s.id === spreadId);
            if (!spread) return;
            const element = spread.elements.find(e => e.id === elementId);
            if (!element) return;

            const newAlbum: Album = {
                ...album,
                spreads: album.spreads.map(s =>
                    s.id === spreadId
                        ? {
                            ...s,
                            versionId: crypto.randomUUID(),
                            elements: s.elements.map(e =>
                                e.id === elementId
                                    ? ({
                                        ...e,
                                        ...updates,
                                        content: updates.content
                                            ? { ...e.content, ...updates.content }
                                            : e.content,
                                    } as PageElement)
                                    : e
                            ),
                        }
                        : s
                ),
                updatedAt: Date.now(),
            };

            commandManager.updatePresent(newAlbum);
            syncState();
        },

        deleteElement: (spreadId: string, elementId: string) => {
            const album = get().album;
            if (!album) return;
            const spread = album.spreads.find(s => s.id === spreadId);
            if (!spread) return;
            const element = spread.elements.find(e => e.id === elementId);
            if (!element) return;

            commandManager.execute(new DeleteElementCommand(spreadId, element));
            syncState();
        },

        addToPool: (images: PoolImage[]) => {
            const album = get().album;
            if (!album) return;

            // Deduplicate and reorder:
            // 1. Identify which images are already in the pool based on (sourceId, sourceImageId)
            const newImageMap = new Map<string, PoolImage>();
            images.forEach(img => {
                const key = `${img.sourceId}/${img.sourceImageId}`;
                newImageMap.set(key, img);
            });

            // 2. Remove any existing versions of these images from the current pool
            const filteredPool = album.imagePool.filter(img => {
                const key = `${img.sourceId}/${img.sourceImageId}`;
                return !newImageMap.has(key);
            });

            // 3. Prepend the new images (which includes updated versions of re-added ones)
            const newAlbum = {
                ...album,
                imagePool: [...images, ...filteredPool],
                updatedAt: Date.now(),
            };

            commandManager.updatePresent(newAlbum);
            syncState();
        },

        removeFromPool: (imageId: string) => {
            const album = get().album;
            if (!album) return;

            const newAlbum = {
                ...album,
                imagePool: album.imagePool.filter(img => img.id !== imageId),
                updatedAt: Date.now(),
            };

            commandManager.updatePresent(newAlbum);
            syncState();
        },

        clearPool: () => {
            const album = get().album;
            if (!album) return;

            const newAlbum = {
                ...album,
                imagePool: [],
                updatedAt: Date.now(),
            };

            commandManager.updatePresent(newAlbum);
            syncState();
        },

        moveElement: (fromSpreadId: string, toSpreadId: string, elementId: string, updates?: Partial<PageElement>) => {
            const album = get().album;
            if (!album) return;
            let oldValues: Partial<PageElement> | undefined;
            if (updates) {
                const spread = album.spreads.find(s => s.id === fromSpreadId);
                const el = spread?.elements.find(e => e.id === elementId);
                if (el) {
                    oldValues = {};
                    for (const key of Object.keys(updates) as Array<keyof PageElement>) {
                        if (key === 'content' && updates.content) {
                            const oldContent: Partial<typeof el.content> = {};
                            for (const ck of Object.keys(updates.content) as Array<keyof typeof el.content>) {
                                (oldContent as Record<string, unknown>)[ck] = el.content[ck];
                            }
                            (oldValues as Record<string, unknown>).content = oldContent;
                        } else {
                            setVal(oldValues, key, el[key]);
                        }
                    }
                }
            }
            commandManager.execute(new MoveElementCommand(fromSpreadId, toSpreadId, elementId, updates, oldValues));
            syncState();
        },

        reorderElement: (spreadId: string, elementId: string, fromIndex: number, toIndex: number) => {
            commandManager.execute(new ReorderElementCommand(spreadId, elementId, fromIndex, toIndex));
            syncState();
        },

        undo: () => {
            commandManager.undo();
            syncState();
        },

        redo: () => {
            commandManager.redo();
            syncState();
        }
    };
});

// ============ Selector Helper Hooks ============
// These hooks provide optimized selectors for specific state slices

/** Select the entire album object */
export const useAlbum = () => useAlbumStore(state => state.album);

/** Select album settings */
export const useAlbumSettings = () => useAlbumStore(state => state.album?.settings);

/** Select album spreads array */
export const useAlbumSpreads = () => useAlbumStore(state => state.album?.spreads || []);

/** Select album ID */
export const useAlbumId = () => useAlbumStore(state => state.album?.id);

/** Select album name */
export const useAlbumName = () => useAlbumStore(state => state.album?.name);

/** Select album image pool */
export const useAlbumImagePool = () => useAlbumStore(state => state.album?.imagePool || []);

/** Select page width from settings */
export const usePageWidth = () => useAlbumStore(state => state.album?.settings.pageWidth);

/** Select page height from settings */
export const usePageHeight = () => useAlbumStore(state => state.album?.settings.pageHeight);

/** Select whether undo is available */
export const useCanUndo = () => useAlbumStore(state => state.canUndo);

/** Select whether redo is available */
export const useCanRedo = () => useAlbumStore(state => state.canRedo);

/** Select addElement action */
export const useAddElement = () => useAlbumStore(state => state.addElement);

/** Select addElements (batch) action */
export const useAddElements = () => useAlbumStore(state => state.addElements);

/** Select updateElement action */
export const useUpdateElement = () => useAlbumStore(state => state.updateElement);

/** Select updateElementTransient action (no history entry) */
export const useUpdateElementTransient = () => useAlbumStore(state => state.updateElementTransient);

/** Select deleteElement action */
export const useDeleteElement = () => useAlbumStore(state => state.deleteElement);

/** Select addSpreads action */
export const useAddSpreads = () => useAlbumStore(state => state.addSpreads);

/** Select deleteSpread action */
export const useDeleteSpread = () => useAlbumStore(state => state.deleteSpread);

/** Select deleteSpreads action */
export const useDeleteSpreads = () => useAlbumStore(state => state.deleteSpreads);

/** Select deletePages action */
export const useDeletePages = () => useAlbumStore(state => state.deletePages);

/** Select insertPages action */
export const useInsertPages = () => useAlbumStore(state => state.insertPages);

/** Select undo action */
export const useUndo = () => useAlbumStore(state => state.undo);

/** Select redo action */
export const useRedo = () => useAlbumStore(state => state.redo);

/** Select setName action */
export const useSetName = () => useAlbumStore(state => state.setName);

/** Select setSettings action */
export const useSetSettings = () => useAlbumStore(state => state.setSettings);

/** Select addToPool action */
export const useAddToPool = () => useAlbumStore(state => state.addToPool);

/** Select updateSpread action */
export const useUpdateSpread = () => useAlbumStore(state => state.updateSpread);

/** Select reorderElement action */
export const useReorderElement = () => useAlbumStore(state => state.reorderElement);
