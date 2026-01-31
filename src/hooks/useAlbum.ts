import { useCallback, useMemo } from 'react';
import type { Album, Spread, PageElement, PoolImage, TemplateId, AlbumSettings } from '../types';
import { useHistory } from './useHistory';
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

export const useAlbum = (initialAlbum: Album) => {
    const { state: album, dispatch, undo, redo, canUndo, canRedo, set } = useHistory<Album>(initialAlbum);

    // Memoized actions
    const setAlbum = useCallback((newAlbum: Album) => {
        set(newAlbum);
    }, [set]);

    const setName = useCallback((name: string) => {
        dispatch(new SetAlbumNameCommand(name, album.name));
    }, [dispatch, album.name]);

    const setSettings = useCallback((settings: Partial<AlbumSettings>) => {
        const oldValues: Partial<AlbumSettings> = {};
        for (const key of Object.keys(settings) as Array<keyof AlbumSettings>) {
            // @ts-expect-error - Partial types handling
            oldValues[key] = album.settings[key];
        }
        dispatch(new SetSettingsCommand(settings, oldValues));
    }, [dispatch, album.settings]);

    const addSpread = useCallback((templateId?: TemplateId) => {
        dispatch(new AddSpreadCommand(templateId));
    }, [dispatch]);

    const addSpreads = useCallback((count: number = 1, templateId?: TemplateId) => {
        dispatch(new AddSpreadsCommand(count, templateId));
    }, [dispatch]);

    const deleteSpread = useCallback((spreadId: string) => {
        const index = album.spreads.findIndex(s => s.id === spreadId);
        if (index === -1) return;
        const spread = album.spreads[index];
        dispatch(new DeleteSpreadCommand(spreadId, spread, index));
    }, [dispatch, album.spreads]);

    const reorderSpreads = useCallback((fromIndex: number, toIndex: number) => {
        dispatch(new ReorderSpreadsCommand(fromIndex, toIndex));
    }, [dispatch]);

    const updateSpread = useCallback((spreadId: string, updates: Partial<Spread>) => {
        const spread = album.spreads.find(s => s.id === spreadId);
        if (!spread) return;

        const oldValues: Partial<Spread> = {};
        for (const key of Object.keys(updates) as Array<keyof Spread>) {
            // @ts-expect-error - Partial types handling
            oldValues[key] = spread[key];
        }

        dispatch(new UpdateSpreadCommand(spreadId, updates, oldValues));
    }, [dispatch, album.spreads]);

    const addElement = useCallback((spreadId: string, element: PageElement) => {
        dispatch(new AddElementCommand(spreadId, element));
    }, [dispatch]);

    const updateElement = useCallback(
        (spreadId: string, elementId: string, updates: Partial<PageElement>, groupId?: string) => {
            const spread = album.spreads.find(s => s.id === spreadId);
            if (!spread) return;
            const element = spread.elements.find(e => e.id === elementId);
            if (!element) return;

            const oldValues: Partial<PageElement> = {};
            for (const key of Object.keys(updates) as Array<keyof PageElement>) {
                // @ts-expect-error - Partial types handling
                oldValues[key] = element[key];
            }

            dispatch(new UpdateElementCommand(spreadId, elementId, updates, oldValues, groupId));
        },
        [dispatch, album.spreads]
    );

    const deleteElement = useCallback((spreadId: string, elementId: string) => {
        const spread = album.spreads.find(s => s.id === spreadId);
        if (!spread) return;
        const element = spread.elements.find(e => e.id === elementId);
        if (!element) return;

        dispatch(new DeleteElementCommand(spreadId, element));
    }, [dispatch, album.spreads]);

    const addToPool = useCallback((images: PoolImage[]) => {
        dispatch(new AddToPoolCommand(images));
    }, [dispatch]);

    const removeFromPool = useCallback((imageId: string) => {
        dispatch(new RemoveFromPoolCommand(imageId));
    }, [dispatch]);

    const clearPool = useCallback(() => {
        dispatch(new ClearPoolCommand());
    }, [dispatch]);

    const moveElement = useCallback((fromSpreadId: string, toSpreadId: string, elementId: string, updates?: Partial<PageElement>) => {
        let oldValues: Partial<PageElement> | undefined;
        if (updates) {
            const spread = album.spreads.find(s => s.id === fromSpreadId);
            const el = spread?.elements.find(e => e.id === elementId);
            if (el) {
                oldValues = {};
                for (const key of Object.keys(updates) as Array<keyof PageElement>) {
                    // @ts-expect-error - Partial types handling
                    oldValues[key] = el[key];
                }
            }
        }
        dispatch(new MoveElementCommand(fromSpreadId, toSpreadId, elementId, updates, oldValues));
    }, [dispatch, album.spreads]);

    return useMemo(
        () => ({
            album,
            setAlbum,
            setName,
            setSettings,
            addSpread,
            addSpreads,
            deleteSpread,
            reorderSpreads,
            updateSpread,
            addElement,
            updateElement,
            deleteElement,
            moveElement,
            addToPool,
            removeFromPool,
            clearPool,
            undo,
            redo,
            canUndo,
            canRedo
        }),
        [
            album,
            setAlbum,
            setName,
            setSettings,
            addSpread,
            addSpreads,
            deleteSpread,
            reorderSpreads,
            updateSpread,
            addElement,
            updateElement,
            deleteElement,
            moveElement,
            addToPool,
            removeFromPool,
            clearPool,
            undo,
            redo,
            canUndo,
            canRedo
        ]
    );
};
