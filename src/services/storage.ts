import { Album, Page, TemplateId } from '../types';
import { getDefaultTemplateId } from '../templates/pageTemplates';

const STORAGE_KEY = 'album_editor_state';
const DEBOUNCE_MS = 1000;

let saveTimeout: number | null = null;

// Generate a new empty album
export const createNewAlbum = (): Album => ({
    id: crypto.randomUUID(),
    name: 'Untitled Album',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pages: [createNewPage()],
    imagePool: [],
});

// Generate a new empty page
export const createNewPage = (templateId: TemplateId = getDefaultTemplateId()): Page => ({
    id: crypto.randomUUID(),
    templateId,
    elements: [],
});

// Save album to localStorage with debouncing
export const saveToLocalStorage = (album: Album): void => {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    saveTimeout = window.setTimeout(() => {
        try {
            const updatedAlbum = {
                ...album,
                updatedAt: new Date().toISOString(),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlbum));
            console.log('Album auto-saved to localStorage');
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }, DEBOUNCE_MS);
};

// Save immediately without debounce
export const saveImmediately = (album: Album): void => {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }

    try {
        const updatedAlbum = {
            ...album,
            updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlbum));
        console.log('Album saved to localStorage');
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
};

// Load album from localStorage
export const loadFromLocalStorage = (): Album | null => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return null;

        const album = JSON.parse(data) as Album;

        // Validate basic structure
        if (!album.id || !album.pages || !Array.isArray(album.pages)) {
            console.warn('Invalid album data in localStorage');
            return null;
        }

        return album;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return null;
    }
};

// Clear localStorage
export const clearStorage = (): void => {
    localStorage.removeItem(STORAGE_KEY);
};

// Export album as JSON file
export const exportAsJSON = (album: Album): void => {
    try {
        const data = JSON.stringify(album, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${sanitizeFilename(album.name)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Failed to export as JSON:', error);
        throw new Error('Failed to export album');
    }
};

// Import album from JSON file
export const importFromJSON = (file: File): Promise<Album> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = event.target?.result as string;
                const album = JSON.parse(data) as Album;

                // Validate basic structure
                if (!album.id || !album.pages || !Array.isArray(album.pages)) {
                    throw new Error('Invalid album format');
                }

                // Assign new ID to avoid conflicts
                album.id = crypto.randomUUID();
                album.updatedAt = new Date().toISOString();

                resolve(album);
            } catch (error) {
                reject(new Error('Failed to parse album file'));
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
};

// Helper to sanitize filename
const sanitizeFilename = (name: string): string => {
    return name
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .toLowerCase() || 'album';
};
