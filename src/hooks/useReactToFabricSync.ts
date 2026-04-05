import { useEffect, useRef, useMemo } from 'react';
import * as fabric from 'fabric';
import { APP_CONFIG } from '../config';
import { isImageElement } from '../types';
import { renderSpread } from '../utils/fabricRenderer';
import { CustomFabricObject } from './fabricTypes';
import { useAlbumSettings, useAlbumSpreads, useUpdateElement } from '../states/albumStore';
import { useUIStore, useCurrentSpreadIndex } from '../states/uiStore';

/**
 * Props for useReactToFabricSync.
 */
interface UseReactToFabricSyncProps {
    /** The Fabric.js canvas instance. */
    fabricCanvas: fabric.Canvas | null;
    /** The current zoom level percentage. */
    zoom: number;
}

/**
 * Hook to synchronize the React state (album spread data) to the Fabric.js canvas.
 */
export const useReactToFabricSync = ({
    fabricCanvas,
    zoom,
}: UseReactToFabricSyncProps) => {
    const spreads = useAlbumSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const spread = useMemo(() => spreads[currentSpreadIndex], [spreads, currentSpreadIndex]);
    const settings = useAlbumSettings();
    const onElementUpdate = useUpdateElement();

    const ppi = APP_CONFIG.PPI;

    // We use refs for the callbacks and the spread to avoid stale closures in the
    // event handlers while minimizing useEffect re-subscriptions.
    const spreadRef = useRef(spread);
    const onElementUpdateRef = useRef(onElementUpdate);
    const syncLockRef = useRef<{ promise: Promise<void> | null }>({ promise: null });
    // Store selectedElementIds in a ref so selection restoration doesn't trigger re-renders.
    // Uses zustand subscribe for synchronous updates (React effects are async and can be stale
    // when read by a pending async renderSpread).
    const selectedElementIdsRef = useRef<string[]>([]);

    useEffect(() => {
        spreadRef.current = spread;
        onElementUpdateRef.current = onElementUpdate;
    }, [spread, onElementUpdate]);

    useEffect(() => {
        // Synchronously update the ref whenever the store changes, outside of render.
        const unsub = useUIStore.subscribe(
            (state) => { selectedElementIdsRef.current = state.selectedElementIds; }
        );
        // Initialize with current value
        selectedElementIdsRef.current = useUIStore.getState().selectedElementIds;
        return unsub;
    }, []);

    const modelWidth = settings ? settings.pageWidth * 2 * ppi : 0;
    const modelHeight = settings ? settings.pageHeight * ppi : 0;

    // Sync State to Fabric
    useEffect(() => {
        const performSync = async () => {
            const canvas = fabricCanvas;
            if (!canvas || !spread || !settings) return;

            await renderSpread(spread, settings, canvas, {
                ppi: APP_CONFIG.SCREEN_PPI,
                interactivityOptions: {
                    zoom,
                    showPageSeam: true,
                    onContentTransformChange: (elementId, contentTransform) => {
                        const currentSpread = spreadRef.current;
                        if (!currentSpread) return;

                        const element = currentSpread.elements.find(e => e.id === elementId);
                        if (!element || !isImageElement(element)) return;

                        onElementUpdateRef.current(currentSpread.id, elementId, {
                            content: { ...element.content, contentTransform },
                        });
                    }
                }
            });

            // Restore selection after sync (renderSpread destroys and recreates objects)
            const ids = selectedElementIdsRef.current;
            if (ids.length > 0 && canvas instanceof fabric.Canvas) {
                const objects = canvas.getObjects();
                const idSet = new Set(ids);
                const matchedObjects = objects.filter(o => {
                    const id = (o as CustomFabricObject).data?.id;
                    return id && idSet.has(id);
                });

                if (matchedObjects.length === 1) {
                    if (canvas.getActiveObject() !== matchedObjects[0]) {
                        canvas.setActiveObject(matchedObjects[0]);
                        canvas.requestRenderAll();
                    }
                } else if (matchedObjects.length > 1) {
                    const sel = new fabric.ActiveSelection(matchedObjects, { canvas });
                    canvas.setActiveObject(sel);
                    canvas.requestRenderAll();
                }
            } else if (ids.length === 0 && canvas instanceof fabric.Canvas) {
                canvas.discardActiveObject();
                canvas.requestRenderAll();
            }
        };

        const sync = () => {
            // Queue the sync to ensure sequential execution
            const currentPromise = syncLockRef.current.promise || Promise.resolve();
            const nextPromise = currentPromise.then(async () => {
                await performSync();
            }).catch(err => {
                console.error('Sync error:', err);
            });
            syncLockRef.current.promise = nextPromise;
        };

        sync();
        // NOTE: selectedElementIds is intentionally NOT in deps — it's read via ref
        // to avoid a render loop (selection change → sync → setActiveObject → selection event → repeat)
    }, [fabricCanvas, spread, zoom, modelWidth, modelHeight, settings]);
};
