import { create } from 'zustand';
import type { Album, Spread, PageElement, PoolImage, TemplateId, AlbumSettings } from '../types';
import {
    UpdateElementCommand,
    AddElementCommand,
    DeleteElementCommand,
    MoveElementCommand
} from '../commands/elementCommands';
import {
    AddSpreadCommand,
    AddSpreadsCommand,
    DeleteSpreadCommand,
    ReorderSpreadsCommand,
    UpdateSpreadCommand
} from '../commands/spreadCommands';
import {
    SetAlbumNameCommand,
    SetSettingsCommand
} from '../commands/albumCommands';
import {
    AddToPoolCommand,
    RemoveFromPoolCommand,
    ClearPoolCommand
} from '../commands/poolCommands';
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
    addSpread: (templateId?: TemplateId) => void;
    addSpreads: (count?: number, templateId?: TemplateId) => void;
    deleteSpread: (spreadId: string) => void;
    reorderSpreads: (fromIndex: number, toIndex: number) => void;
    updateSpread: (spreadId: string, updates: Partial<Spread>) => void;
    addElement: (spreadId: string, element: PageElement) => void;
    updateElement: (spreadId: string, elementId: string, updates: Partial<PageElement>, groupId?: string) => void;
    deleteElement: (spreadId: string, elementId: string) => void;
    addToPool: (images: PoolImage[]) => void;
    removeFromPool: (imageId: string) => void;
    clearPool: () => void;
    moveElement: (fromSpreadId: string, toSpreadId: string, elementId: string, updates?: Partial<PageElement>) => void;

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

        addSpread: (templateId?: TemplateId) => {
            commandManager.execute(new AddSpreadCommand(templateId));
            syncState();
        },

        addSpreads: (count: number = 1, templateId?: TemplateId) => {
            commandManager.execute(new AddSpreadsCommand(count, templateId));
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

        updateElement: (spreadId: string, elementId: string, updates: Partial<PageElement>, groupId?: string) => {
            const album = get().album;
            if (!album) return;
            const spread = album.spreads.find(s => s.id === spreadId);
            if (!spread) return;
            const element = spread.elements.find(e => e.id === elementId);
            if (!element) return;

            const oldValues: Partial<PageElement> = {};
            for (const key of Object.keys(updates) as Array<keyof PageElement>) {

                setVal(oldValues, key, element[key]);
            }

            commandManager.execute(new UpdateElementCommand(spreadId, elementId, updates, oldValues, groupId));
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
            commandManager.execute(new AddToPoolCommand(images));
            syncState();
        },

        removeFromPool: (imageId: string) => {
            commandManager.execute(new RemoveFromPoolCommand(imageId));
            syncState();
        },

        clearPool: () => {
            commandManager.execute(new ClearPoolCommand());
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
                        setVal(oldValues, key, el[key]);
                    }
                }
            }
            commandManager.execute(new MoveElementCommand(fromSpreadId, toSpreadId, elementId, updates, oldValues));
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
