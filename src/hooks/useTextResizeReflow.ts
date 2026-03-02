import { useCallback, useEffect, useRef } from 'react';
import type { TextContent, PageElement } from '../types';
import { useEditingTextElementId } from '../states/uiStore';
import { useUpdateElement } from '../states/albumStore';
import { getTextLayoutMeasurementService } from '../services/textLayoutMeasurementService';

interface RequestTextResizeReflowOptions {
    spreadId: string;
    elementId: string;
    content: TextContent;
    boxWidthPx: number;
    boxHeightPx: number;
    canvasWidth: number;
    groupId?: string;
}

/**
 * Reflows text runs after a Fabric resize commit so wrapped lines reflect
 * the new text box dimensions.
 */
export function useTextResizeReflow() {
    const updateElement = useUpdateElement();
    const editingTextElementId = useEditingTextElementId();
    const sequenceRef = useRef<Map<string, number>>(new Map());

    const requestReflowAfterResize = useCallback(async (options: RequestTextResizeReflowOptions) => {
        if (editingTextElementId === options.elementId) return;

        const nextSeq = (sequenceRef.current.get(options.elementId) ?? 0) + 1;
        sequenceRef.current.set(options.elementId, nextSeq);

        try {
            const runs = await getTextLayoutMeasurementService().measureRuns({
                content: options.content,
                boxWidthPx: options.boxWidthPx,
                boxHeightPx: options.boxHeightPx,
                canvasWidth: options.canvasWidth,
            });

            // Ignore stale measurements for the same element.
            if (sequenceRef.current.get(options.elementId) !== nextSeq) return;

            const updates = {
                content: {
                    runs,
                },
            } as unknown as Partial<PageElement>;

            updateElement(options.spreadId, options.elementId, updates, options.groupId);
        } catch (error) {
            console.error('Failed to reflow resized text element:', error);
        }
    }, [editingTextElementId, updateElement]);

    useEffect(() => {
        return () => {
            getTextLayoutMeasurementService().dispose();
        };
    }, []);

    return { requestReflowAfterResize };
}
