import { useEffect, useRef, useMemo } from 'react';
import * as fabric from 'fabric';
import { CustomFabricObject } from './fabricTypes';
import { PageElement } from '../types';
import {
    useCurrentSpreadIndex,
    useIsEditingText,
    useSelectedPageSide,
    useUIStore,
} from '../states/uiStore';
import { useAlbumSpreads, useDeleteElement, useAddElements } from '../states/albumStore';

/** Small normalized offset applied when pasting to the same page. */
const PASTE_OFFSET = 0.02;

/** Determines page side from an element's box center x. */
function elementPageSide(el: PageElement): 'left' | 'right' {
    return (el.box.x1 + el.box.x2) / 2 < 0.5 ? 'left' : 'right';
}

/** Deep-clone elements with new IDs. */
function cloneElements(elements: PageElement[]): PageElement[] {
    return elements.map(el => ({
        ...el,
        id: crypto.randomUUID(),
        box: { ...el.box },
        content: { ...el.content },
    })) as PageElement[];
}

/**
 * Shift elements from one page side to the other.
 * Left page: x in [0, 0.5), Right page: x in [0.5, 1.0].
 * To move left→right: add 0.5. To move right→left: subtract 0.5.
 */
function shiftElementsToPageSide(
    elements: PageElement[],
    targetSide: 'left' | 'right',
): PageElement[] {
    return elements.map(el => {
        const currentSide = elementPageSide(el);
        if (currentSide === targetSide) return el;

        const offset = targetSide === 'right' ? 0.5 : -0.5;
        return {
            ...el,
            box: {
                x1: Math.max(0, Math.min(1, el.box.x1 + offset)),
                y1: el.box.y1,
                x2: Math.max(0, Math.min(1, el.box.x2 + offset)),
                y2: el.box.y2,
            },
        } as PageElement;
    });
}

/** Apply a small offset to all elements' boxes, clamping to [0, 1]. */
function applyPasteOffset(elements: PageElement[]): PageElement[] {
    return elements.map(el => ({
        ...el,
        box: {
            x1: Math.min(1, el.box.x1 + PASTE_OFFSET),
            y1: Math.min(1, el.box.y1 + PASTE_OFFSET),
            x2: Math.min(1, el.box.x2 + PASTE_OFFSET),
            y2: Math.min(1, el.box.y2 + PASTE_OFFSET),
        },
    })) as PageElement[];
}

interface UseCanvasKeyboardEventsProps {
    fabricCanvas: fabric.Canvas | null;
}

export const useCanvasKeyboardEvents = ({ fabricCanvas }: UseCanvasKeyboardEventsProps) => {
    const spreads = useAlbumSpreads();
    const currentSpreadIndex = useCurrentSpreadIndex();
    const spread = useMemo(() => spreads[currentSpreadIndex], [spreads, currentSpreadIndex]);
    const isEditingText = useIsEditingText();
    const selectedPageSide = useSelectedPageSide();

    const onElementDelete = useDeleteElement();
    const addElements = useAddElements();

    // Store actions accessed via getState to avoid re-subscribing on every clipboard change
    const setSelectedElementIds = useUIStore(state => state.setSelectedElementIds);
    const setElementClipboard = useUIStore(state => state.setElementClipboard);

    const onElementDeleteRef = useRef(onElementDelete);
    const addElementsRef = useRef(addElements);
    const spreadRef = useRef(spread);
    const isEditingTextRef = useRef(isEditingText);
    const selectedPageSideRef = useRef(selectedPageSide);
    const setSelectedElementIdsRef = useRef(setSelectedElementIds);
    const setElementClipboardRef = useRef(setElementClipboard);

    useEffect(() => {
        onElementDeleteRef.current = onElementDelete;
        addElementsRef.current = addElements;
        spreadRef.current = spread;
        isEditingTextRef.current = isEditingText;
        selectedPageSideRef.current = selectedPageSide;
        setSelectedElementIdsRef.current = setSelectedElementIds;
        setElementClipboardRef.current = setElementClipboard;
    }, [onElementDelete, addElements, spread, isEditingText, selectedPageSide, setSelectedElementIds, setElementClipboard]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) && !target.closest('.canvas-container')) {
                return;
            }

            const isMod = e.ctrlKey || e.metaKey;

            // ---- COPY (Ctrl/Cmd+C) ----
            if (isMod && e.key === 'c') {
                if (isEditingTextRef.current) return;

                const canvas = fabricCanvas;
                if (!canvas) return;
                const activeObj = canvas.getActiveObject();
                if (!activeObj) return;

                const currentSpread = spreadRef.current;
                if (!currentSpread) return;

                // Gather selected element IDs from Fabric
                let selectedIds: string[];
                if (activeObj.type === 'activeSelection') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const objects = (activeObj as any).getObjects() as CustomFabricObject[];
                    selectedIds = objects.map(o => o.data?.id).filter((id): id is string => !!id);
                } else {
                    const id = (activeObj as CustomFabricObject).data?.id;
                    selectedIds = id ? [id] : [];
                }

                if (selectedIds.length === 0) return;

                // Find matching PageElement objects
                const idSet = new Set(selectedIds);
                const matchedElements = currentSpread.elements.filter(el => idSet.has(el.id));
                if (matchedElements.length === 0) return;

                // Deep-clone for clipboard
                const cloned = cloneElements(matchedElements);
                const pageSide = elementPageSide(matchedElements[0]);

                setElementClipboardRef.current(cloned, currentSpread.id, pageSide);
                e.preventDefault();
                return;
            }

            // ---- PASTE (Ctrl/Cmd+V) ----
            if (isMod && e.key === 'v') {
                if (isEditingTextRef.current) return;

                const state = useUIStore.getState();
                if (state.clipboardType !== 'elements' || state.clipboardElements.length === 0) return;

                const currentSpread = spreadRef.current;
                if (!currentSpread) return;

                const targetSide = selectedPageSideRef.current;
                const sameSpread = state.clipboardSourceSpreadId === currentSpread.id;
                const sameSide = state.clipboardSourcePageSide === targetSide;

                let newElements = cloneElements(state.clipboardElements);

                if (sameSpread && sameSide) {
                    // Same page: apply offset
                    newElements = applyPasteOffset(newElements);
                } else {
                    // Different page: shift coordinates to target side, no offset
                    newElements = shiftElementsToPageSide(newElements, targetSide);
                }

                addElementsRef.current(currentSpread.id, newElements);
                setSelectedElementIdsRef.current(newElements.map(el => el.id));

                // Update clipboard for cascading paste (next paste uses new positions)
                setElementClipboardRef.current(
                    cloneElements(newElements),
                    currentSpread.id,
                    targetSide,
                );

                e.preventDefault();
                return;
            }

            // ---- DELETE / BACKSPACE ----
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Don't delete the element when user is typing in a text element
                if (isEditingTextRef.current) return;

                const canvas = fabricCanvas;
                if (!canvas) return;
                const activeObj = canvas.getActiveObject() as CustomFabricObject;

                // Handle single object selection
                if (activeObj && activeObj.data?.id) {
                    const id = activeObj.data.id;
                    canvas.discardActiveObject();
                    onElementDeleteRef.current(spreadRef.current.id, id);
                    setSelectedElementIdsRef.current([]);
                    canvas.requestRenderAll();
                    return;
                }

                // Handle active selection (multi-selection)
                if (activeObj && activeObj.type === 'activeSelection') {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const objects = (activeObj as any).getObjects() as CustomFabricObject[];
                    const idsToDelete = objects.map(o => o.data?.id).filter((id): id is string => !!id);

                    if (idsToDelete.length > 0) {
                        canvas.discardActiveObject();
                        idsToDelete.forEach(id => {
                            onElementDeleteRef.current(spreadRef.current.id, id);
                        });
                        setSelectedElementIdsRef.current([]);
                        canvas.requestRenderAll();
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [fabricCanvas]);
};
