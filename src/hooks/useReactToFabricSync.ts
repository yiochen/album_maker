import { useEffect, useRef, useMemo } from 'react';
import * as fabric from 'fabric';
import { APP_CONFIG } from '../config';
import { renderSpread } from '../utils/fabricRenderer';
import { CustomFabricObject } from './fabricTypes';
import { useAlbumSettings, useAlbumSpreads, useUpdateElement } from '../states/albumStore';
import { useSelectedElementId, useCurrentSpreadIndex } from '../states/uiStore';

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
    const selectedElementId = useSelectedElementId();
    const onElementUpdate = useUpdateElement();

    const ppi = APP_CONFIG.PPI;

    // We use refs for the callbacks and the spread to avoid stale closures in the 
    // event handlers while minimizing useEffect re-subscriptions.
    const spreadRef = useRef(spread);
    const onElementUpdateRef = useRef(onElementUpdate);

    useEffect(() => {
        spreadRef.current = spread;
        onElementUpdateRef.current = onElementUpdate;
    }, [spread, onElementUpdate]);

    const modelWidth = settings ? settings.pageWidth * 2 * ppi : 0;
    const modelHeight = settings ? settings.pageHeight * ppi : 0;

    // Sync State to Fabric
    useEffect(() => {
        const sync = async () => {
            const canvas = fabricCanvas;
            if (!canvas || !spread || !settings) return;

            await renderSpread(spread, settings, canvas, {
                ppi: APP_CONFIG.PPI,
                interactivityOptions: {
                    zoom,
                    showPageSeam: true,
                    onContentTransformChange: (elementId, contentTransform) => {
                        const currentSpread = spreadRef.current;
                        if (!currentSpread) return;

                        const element = currentSpread.elements.find(e => e.id === elementId);
                        if (!element) return;

                        onElementUpdateRef.current(currentSpread.id, elementId, {
                            content: { ...element.content, contentTransform },
                        });
                    }
                }
            });

            // Handle selection after sync
            if (selectedElementId && canvas instanceof fabric.Canvas) {
                const obj = canvas.getObjects().find(o => (o as CustomFabricObject).data?.id === selectedElementId);
                if (obj && canvas.getActiveObject() !== obj) {
                    canvas.setActiveObject(obj);
                    canvas.requestRenderAll();
                }
            } else if (!selectedElementId && canvas instanceof fabric.Canvas) {
                canvas.discardActiveObject();
                canvas.requestRenderAll();
            }
        };

        sync();
    }, [fabricCanvas, spread, zoom, modelWidth, modelHeight, settings, selectedElementId]);
};
