import { useEffect, useRef, useCallback, useState } from 'react';
import { thumbnailDB } from '../db';

interface FetchRequest {
    id: string;
    url: string;
    type: 'thumbnail' | 'full';
}

interface FetchResponse {
    id: string;
    success: boolean;
    blob?: Blob;
    error?: string;
}

interface PendingRequest {
    resolve: (blob: Blob) => void;
    reject: (error: Error) => void;
    url: string;
    size?: number;
}

export const useImageWorker = () => {
    const workerRef = useRef<Worker | null>(null);
    const pendingRef = useRef<Map<string, PendingRequest>>(new Map());
    const [isReady, setIsReady] = useState(false);

    // Initialize worker
    useEffect(() => {
        const worker = new Worker(
            new URL('../workers/imageFetcher.worker.ts', import.meta.url),
            { type: 'module' }
        );

        worker.onmessage = async (event: MessageEvent<FetchResponse>) => {
            const { id, success, blob, error } = event.data;
            const pending = pendingRef.current.get(id);

            if (!pending) return;

            pendingRef.current.delete(id);

            if (success && blob) {
                // Cache the blob if it's a thumbnail
                if (pending.size) {
                    await thumbnailDB.set(pending.url, blob, pending.size);
                }
                pending.resolve(blob);
            } else {
                pending.reject(new Error(error || 'Failed to fetch image'));
            }
        };

        worker.onerror = (error) => {
            console.error('Image worker error:', error);
        };

        workerRef.current = worker;
        setIsReady(true);

        return () => {
            worker.terminate();
            workerRef.current = null;
        };
    }, []);

    // Fetch image via worker
    const fetchImage = useCallback(
        async (url: string, type: 'thumbnail' | 'full' = 'thumbnail', size?: number): Promise<Blob> => {
            // Check cache first for thumbnails
            if (type === 'thumbnail') {
                const cached = await thumbnailDB.get(url);
                if (cached) {
                    return cached;
                }
            }

            if (!workerRef.current) {
                throw new Error('Worker not initialized');
            }

            const id = crypto.randomUUID();

            return new Promise((resolve, reject) => {
                pendingRef.current.set(id, { resolve, reject, url, size });

                const request: FetchRequest = { id, url, type };
                workerRef.current!.postMessage(request);
            });
        },
        []
    );

    // Fetch multiple images
    const fetchImages = useCallback(
        async (
            urls: string[],
            type: 'thumbnail' | 'full' = 'thumbnail',
            size?: number,
            onProgress?: (loaded: number, total: number) => void
        ): Promise<Map<string, Blob>> => {
            const results = new Map<string, Blob>();
            let loaded = 0;

            await Promise.allSettled(
                urls.map(async (url) => {
                    try {
                        const blob = await fetchImage(url, type, size);
                        results.set(url, blob);
                    } catch {
                        // Ignore individual failures
                    } finally {
                        loaded++;
                        onProgress?.(loaded, urls.length);
                    }
                })
            );

            return results;
        },
        [fetchImage]
    );

    // Create object URL from blob (with auto-cleanup)
    const createImageUrl = useCallback((blob: Blob): string => {
        return URL.createObjectURL(blob);
    }, []);

    return {
        isReady,
        fetchImage,
        fetchImages,
        createImageUrl,
    };
};
