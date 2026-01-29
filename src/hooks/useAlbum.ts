import { useReducer, useCallback, useMemo } from 'react';
import { Album, Page, PageElement, AlbumAction, PoolImage, TemplateId } from '../types';
import { createNewPage } from '../services/storage';

// Album reducer
const albumReducer = (state: Album, action: AlbumAction): Album => {
    switch (action.type) {
        case 'SET_ALBUM':
            return action.payload;

        case 'SET_NAME':
            return { ...state, name: action.payload };

        case 'ADD_PAGE': {
            const newPage = createNewPage(action.payload?.templateId);
            return {
                ...state,
                pages: [...state.pages, newPage],
            };
        }

        case 'DELETE_PAGE': {
            if (state.pages.length <= 1) return state;
            return {
                ...state,
                pages: state.pages.filter(p => p.id !== action.payload),
            };
        }

        case 'REORDER_PAGES': {
            const { fromIndex, toIndex } = action.payload;
            const pages = [...state.pages];
            const [removed] = pages.splice(fromIndex, 1);
            pages.splice(toIndex, 0, removed);
            return { ...state, pages };
        }

        case 'UPDATE_PAGE': {
            const { pageId, updates } = action.payload;
            return {
                ...state,
                pages: state.pages.map(p =>
                    p.id === pageId ? { ...p, ...updates } : p
                ),
            };
        }

        case 'ADD_ELEMENT': {
            const { pageId, element } = action.payload;
            return {
                ...state,
                pages: state.pages.map(p =>
                    p.id === pageId
                        ? { ...p, elements: [...p.elements, element] }
                        : p
                ),
            };
        }

        case 'UPDATE_ELEMENT': {
            const { pageId, elementId, updates } = action.payload;
            return {
                ...state,
                pages: state.pages.map(p =>
                    p.id === pageId
                        ? {
                            ...p,
                            elements: p.elements.map(e =>
                                e.id === elementId ? { ...e, ...updates } : e
                            ),
                        }
                        : p
                ),
            };
        }

        case 'DELETE_ELEMENT': {
            const { pageId, elementId } = action.payload;
            return {
                ...state,
                pages: state.pages.map(p =>
                    p.id === pageId
                        ? { ...p, elements: p.elements.filter(e => e.id !== elementId) }
                        : p
                ),
            };
        }

        case 'ADD_TO_POOL':
            return {
                ...state,
                imagePool: [...state.imagePool, ...action.payload],
            };

        case 'CLEAR_POOL':
            return { ...state, imagePool: [] };

        default:
            return state;
    }
};

export interface UseAlbumReturn {
    album: Album;
    // Album actions
    setAlbum: (album: Album) => void;
    setName: (name: string) => void;
    // Page actions
    addPage: (templateId?: TemplateId) => void;
    deletePage: (pageId: string) => void;
    reorderPages: (fromIndex: number, toIndex: number) => void;
    updatePage: (pageId: string, updates: Partial<Page>) => void;
    // Element actions
    addElement: (pageId: string, element: PageElement) => void;
    updateElement: (pageId: string, elementId: string, updates: Partial<PageElement>) => void;
    deleteElement: (pageId: string, elementId: string) => void;
    // Image pool actions
    addToPool: (images: PoolImage[]) => void;
    clearPool: () => void;
}

export const useAlbum = (initialAlbum: Album): UseAlbumReturn => {
    const [album, dispatch] = useReducer(albumReducer, initialAlbum);

    const setAlbum = useCallback((newAlbum: Album) => {
        dispatch({ type: 'SET_ALBUM', payload: newAlbum });
    }, []);

    const setName = useCallback((name: string) => {
        dispatch({ type: 'SET_NAME', payload: name });
    }, []);

    const addPage = useCallback((templateId?: TemplateId) => {
        dispatch({ type: 'ADD_PAGE', payload: templateId ? { templateId } : undefined });
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

    const clearPool = useCallback(() => {
        dispatch({ type: 'CLEAR_POOL' });
    }, []);

    return useMemo(
        () => ({
            album,
            setAlbum,
            setName,
            addPage,
            deletePage,
            reorderPages,
            updatePage,
            addElement,
            updateElement,
            deleteElement,
            addToPool,
            clearPool,
        }),
        [
            album,
            setAlbum,
            setName,
            addPage,
            deletePage,
            reorderPages,
            updatePage,
            addElement,
            updateElement,
            deleteElement,
            addToPool,
            clearPool,
        ]
    );
};
