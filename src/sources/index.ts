import { PhotoSource, isInitializableSource } from './types';
import { googlePhotosSource } from './googlePhotos';
import { dummyColorsSource } from './dummyColors';

// Re-export types
export * from './types';

// Registry of all available sources
const sources: Map<string, PhotoSource> = new Map();

// Register built-in sources
sources.set(googlePhotosSource.id, googlePhotosSource);
sources.set(dummyColorsSource.id, dummyColorsSource);

// Get a source by ID
export const getSource = (id: string): PhotoSource | undefined => {
    return sources.get(id);
};

// Get all available sources
export const getAllSources = (): PhotoSource[] => {
    return Array.from(sources.values());
};

// Register a new source (for plugins/extensions)
export const registerSource = (source: PhotoSource): void => {
    if (sources.has(source.id)) {
        console.warn(`Source with id "${source.id}" already registered, overwriting`);
    }
    sources.set(source.id, source);
};

// Unregister a source
export const unregisterSource = (id: string): boolean => {
    return sources.delete(id);
};

// Initialize all sources that need initialization
export const initializeSources = async (): Promise<void> => {
    const initPromises = Array.from(sources.values())
        .filter(isInitializableSource)
        .map(source => source.initialize().catch(err => {
            console.error(`Failed to initialize source ${source.id}:`, err);
        }));

    await Promise.all(initPromises);
};

// Export source instances for direct access
export { googlePhotosSource } from './googlePhotos';
export { dummyColorsSource } from './dummyColors';
