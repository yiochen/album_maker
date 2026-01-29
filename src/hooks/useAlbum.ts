import { useCallback, useMemo } from 'react';
import type { Album, Page, PageElement, PoolImage, TemplateId, AlbumSettings } from '../types';
import { useHistory } from './useHistory';
import {
    UpdateElementCommand,
    AddElementCommand,
    DeleteElementCommand
} from '../commands/elementCommands';
import {
    AddPageCommand,
    AddPagesCommand,
    DeletePageCommand,
    ReorderPagesCommand,
    UpdatePageCommand
} from '../commands/pageCommands';
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

    const addPage = useCallback((templateId?: TemplateId) => {
        dispatch(new AddPageCommand(templateId));
    }, [dispatch]);

    const addPages = useCallback((count: number = 2, templateId?: TemplateId) => {
        dispatch(new AddPagesCommand(count, templateId));
    }, [dispatch]);

    const deletePage = useCallback((pageId: string) => {
        const index = album.pages.findIndex(p => p.id === pageId);
        if (index === -1) return;
        const page = album.pages[index];
        dispatch(new DeletePageCommand(pageId, page, index));
    }, [dispatch, album.pages]);

    const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
        dispatch(new ReorderPagesCommand(fromIndex, toIndex));
    }, [dispatch]);

    const updatePage = useCallback((pageId: string, updates: Partial<Page>) => {
        const page = album.pages.find(p => p.id === pageId);
        if (!page) return;

        const oldValues: Partial<Page> = {};
        for (const key of Object.keys(updates) as Array<keyof Page>) {
            // @ts-expect-error - Partial types handling
            oldValues[key] = page[key];
        }

        dispatch(new UpdatePageCommand(pageId, updates, oldValues));
    }, [dispatch, album.pages]);

    const addElement = useCallback((pageId: string, element: PageElement) => {
        dispatch(new AddElementCommand(pageId, element));
    }, [dispatch]);

    const updateElement = useCallback(
        (pageId: string, elementId: string, updates: Partial<PageElement>, groupId?: string) => {
            const page = album.pages.find(p => p.id === pageId);
            if (!page) return;
            const element = page.elements.find(e => e.id === elementId);
            if (!element) return;

            const oldValues: Partial<PageElement> = {};
            for (const key of Object.keys(updates) as Array<keyof PageElement>) {
                // @ts-expect-error - Partial types handling
                oldValues[key] = element[key];
            }

            dispatch(new UpdateElementCommand(pageId, elementId, updates, oldValues, groupId));
        },
        [dispatch, album.pages]
    );

    const deleteElement = useCallback((pageId: string, elementId: string) => {
        const page = album.pages.find(p => p.id === pageId);
        if (!page) return;
        const element = page.elements.find(e => e.id === elementId);
        if (!element) return;

        dispatch(new DeleteElementCommand(pageId, element));
    }, [dispatch, album.pages]);

    const addToPool = useCallback((images: PoolImage[]) => {
        dispatch(new AddToPoolCommand(images));
    }, [dispatch]);

    const removeFromPool = useCallback((imageId: string) => {
        dispatch(new RemoveFromPoolCommand(imageId));
    }, [dispatch]);

    const clearPool = useCallback(() => {
        dispatch(new ClearPoolCommand());
    }, [dispatch]);

    return useMemo(
        () => ({
            album,
            setAlbum,
            setName,
            setSettings,
            addPage,
            addPages,
            deletePage,
            reorderPages,
            updatePage,
            addElement,
            updateElement,
            deleteElement,
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
            addPage,
            addPages,
            deletePage,
            reorderPages,
            updatePage,
            addElement,
            updateElement,
            deleteElement,
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
