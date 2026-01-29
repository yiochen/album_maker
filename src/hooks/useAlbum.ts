import { useReducer, useCallback, useMemo } from 'react';
import type { Album, Page, PageElement, AlbumAction, PoolImage, TemplateId, AlbumSettings } from '../types';
import { createNewPage } from '../services/storage';

// Reducer for album state management
const albumReducer = (state: Album, action: AlbumAction): Album => {
    switch (action.type) {
        case 'SET_ALBUM':
            return action.payload;

        case 'SET_NAME':
            return { ...state, name: action.payload, updatedAt: Date.now() };

        case 'SET_SETTINGS':
            return {
                ...state,
                settings: { ...state.settings, ...action.payload },
                updatedAt: Date.now(),
            };

        case 'ADD_PAGE': {
            const newPage = createNewPage(action.payload?.templateId);
            return {
                ...state,
                pages: [...state.pages, newPage],
                updatedAt: Date.now(),
            };
        }

        case 'ADD_PAGES': {
            const count = action.payload?.count ?? 2;
            const maxPages = state.settings?.maxPages ?? 40;
            const availableSlots = maxPages - state.pages.length;
            const pagesToAdd = Math.min(count, availableSlots);

            if (pagesToAdd <= 0) return state;

            const newPages = Array.from({ length: pagesToAdd }, () =>
                createNewPage(action.payload?.templateId)
            );
            return {
                ...state,
                pages: [...state.pages, ...newPages],
                updatedAt: Date.now(),
            };
        }

        case 'DELETE_PAGE':
            if (state.pages.length <= 1) return state;
            return {
                ...state,
                pages: state.pages.filter(p => p.id !== action.payload),
                updatedAt: Date.now(),
            };

        case 'REORDER_PAGES': {
            const { fromIndex, toIndex } = action.payload;
            const newPages = [...state.pages];
            const [removed] = newPages.splice(fromIndex, 1);
            newPages.splice(toIndex, 0, removed);
            return { ...state, pages: newPages, updatedAt: Date.now() };
        }

        case 'UPDATE_PAGE':
            return {
                ...state,
                pages: state.pages.map(p =>
                    p.id === action.payload.pageId
                        ? { ...p, ...action.payload.updates }
                        : p
                ),
                updatedAt: Date.now(),
            };

        case 'ADD_ELEMENT':
            return {
                ...state,
                pages: state.pages.map(p =>
                    p.id === action.payload.pageId
                        ? { ...p, elements: [...p.elements, action.payload.element] }
                        : p
                ),
                updatedAt: Date.now(),
            };

        case 'UPDATE_ELEMENT':
            return {
                ...state,
                pages: state.pages.map(p =>
                    p.id === action.payload.pageId
                        ? {
                            ...p,
                            elements: p.elements.map(e =>
                                e.id === action.payload.elementId
                                    ? { ...e, ...action.payload.updates }
                                    : e
                            ),
                        }
                        : p
                ),
                updatedAt: Date.now(),
            };

        case 'DELETE_ELEMENT':
            return {
                ...state,
                pages: state.pages.map(p =>
                    p.id === action.payload.pageId
                        ? {
                            ...p,
                            elements: p.elements.filter(e => e.id !== action.payload.elementId),
                        }
                        : p
                ),
                updatedAt: Date.now(),
            };

        case 'ADD_TO_POOL':
            return {
                ...state,
                imagePool: [...state.imagePool, ...action.payload],
                updatedAt: Date.now(),
            };

        case 'REMOVE_FROM_POOL':
            return {
                ...state,
                imagePool: state.imagePool.filter(img => img.id !== action.payload),
                updatedAt: Date.now(),
            };

        case 'CLEAR_POOL':
            return { ...state, imagePool: [], updatedAt: Date.now() };

        default:
            return state;
    }
};

export const useAlbum = (initialAlbum: Album) => {
    const [album, dispatch] = useReducer(albumReducer, initialAlbum);

    // Memoized actions
    const setAlbum = useCallback((newAlbum: Album) => {
        dispatch({ type: 'SET_ALBUM', payload: newAlbum });
    }, []);

    const setName = useCallback((name: string) => {
        dispatch({ type: 'SET_NAME', payload: name });
    }, []);

    const setSettings = useCallback((settings: Partial<AlbumSettings>) => {
        dispatch({ type: 'SET_SETTINGS', payload: settings });
    }, []);

    const addPage = useCallback((templateId?: TemplateId) => {
        dispatch({ type: 'ADD_PAGE', payload: templateId ? { templateId } : undefined });
    }, []);

    const addPages = useCallback((count: number = 2, templateId?: TemplateId) => {
        dispatch({ type: 'ADD_PAGES', payload: { count, templateId } });
    }, []);

    const deletePage = useCallback((pageId: string) => {
        dispatch({ type: 'DELETE_PAGE', payload: pageId });
    }, []);

    const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
        dispatch({ type: 'REORDER_PAGES', payload: { fromIndex, toIndex } });
    }, []);

    const updatePage = useCallback((pageId: string, updates: Partial<Page>) => {
        dispatch({ type: 'UPDATE_PAGE', payload: { pageId, updates } });
    }, []);

    const addElement = useCallback((pageId: string, element: PageElement) => {
        dispatch({ type: 'ADD_ELEMENT', payload: { pageId, element } });
    }, []);

    const updateElement = useCallback(
        (pageId: string, elementId: string, updates: Partial<PageElement>) => {
            dispatch({ type: 'UPDATE_ELEMENT', payload: { pageId, elementId, updates } });
        },
        []
    );

    const deleteElement = useCallback((pageId: string, elementId: string) => {
        dispatch({ type: 'DELETE_ELEMENT', payload: { pageId, elementId } });
    }, []);

    const addToPool = useCallback((images: PoolImage[]) => {
        dispatch({ type: 'ADD_TO_POOL', payload: images });
    }, []);

    const removeFromPool = useCallback((imageId: string) => {
        dispatch({ type: 'REMOVE_FROM_POOL', payload: imageId });
    }, []);

    const clearPool = useCallback(() => {
        dispatch({ type: 'CLEAR_POOL' });
    }, []);

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
        ]
    );
};
