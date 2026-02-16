/**
 * DndWrapper - Provides drag-and-drop context for the album editor.
 *
 * This component wraps the DndContext and DragOverlay from @dnd-kit/core,
 * allowing images to be dragged from the ImagePool onto the Canvas.
 * The DragOverlay renders a preview that follows the cursor while
 * the original item stays in place.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { PoolImage } from '../types';
import { APP_CONFIG } from '../config';
import { DndDropContext, CanvasDropTarget } from '../contexts/DndDropContext';
import { toModelPx } from '../utils/imageUtils';

interface DndWrapperProps {
    /** Content to render inside the drag-and-drop context */
    children: React.ReactNode;
    /** CSS class name for the wrapper element */
    className?: string;
}

export const DndWrapper: React.FC<DndWrapperProps> = ({
    children,
    className,
}) => {
    const [activeImage, setActiveImage] = useState<PoolImage | null>(null);
    const [canvasDropTarget, setCanvasDropTarget] = useState<CanvasDropTarget | null>(null);

    // Track the last known pointer position globally during drag
    const lastPointerPosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // Track pointer move globally while dragging
    useEffect(() => {
        if (!activeImage) return;

        const handlePointerMove = (e: PointerEvent) => {
            lastPointerPosition.current = { x: e.clientX, y: e.clientY };
        };

        window.addEventListener('pointermove', handlePointerMove);
        return () => window.removeEventListener('pointermove', handlePointerMove);
    }, [activeImage]);

    // Configure sensors for both pointer (mouse) and touch
    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: {
            distance: 1, // Reduced to 1px to be more sensitive for tests and mouse
        },
    });
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: {
            delay: 100,
            tolerance: 5,
        },
    });
    const sensors = useSensors(pointerSensor, touchSensor);

    const registerCanvasDropTarget = useCallback((target: CanvasDropTarget | null) => {
        setCanvasDropTarget(target);
    }, []);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const image = event.active.data.current as PoolImage | undefined;
        if (image) {
            setActiveImage(image);

            // Initialize pointer position from activator event
            const activator = event.activatorEvent as PointerEvent | TouchEvent;
            if ('clientX' in activator) {
                lastPointerPosition.current = { x: activator.clientX, y: activator.clientY };
            } else if ('touches' in activator && activator.touches.length > 0) {
                lastPointerPosition.current = { x: activator.touches[0].clientX, y: activator.touches[0].clientY };
            }
        }
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const image = event.active.data.current as PoolImage | undefined;

        // Only call handler if dropped over the canvas
        if (image && event.over?.id === 'canvas' && canvasDropTarget) {
            const { wrapperRef, zoom, spreadId, onImageDrop } = canvasDropTarget;
            const rect = wrapperRef.current?.getBoundingClientRect();

            if (rect) {
                // Use the globally tracked pointer position
                const clientX = lastPointerPosition.current.x;
                const clientY = lastPointerPosition.current.y;

                // Convert viewport coordinates to canvas coordinates
                const domX = clientX - rect.left;
                const domY = clientY - rect.top;

                const scale = zoom / 100;
                const canvasX = domX / scale;
                const canvasY = domY / scale;

                // Convert to model pixels and call the handler
                onImageDrop(spreadId, image, {
                    x: toModelPx(canvasX),
                    y: toModelPx(canvasY),
                });
            }
        }

        setActiveImage(null);
    }, [canvasDropTarget]);

    const contextValue = {
        registerCanvasDropTarget,
        canvasDropTarget,
    };

    return (
        <DndDropContext.Provider value={contextValue}>
            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <main className={className}>
                    {children}
                </main>

                <DragOverlay dropAnimation={null}>
                    {activeImage ? (
                        <div
                            style={{
                                width: APP_CONFIG.DRAG_PREVIEW_SIZE,
                                height: APP_CONFIG.DRAG_PREVIEW_SIZE,
                                backgroundImage: `url(${activeImage.thumbnailUrl || activeImage.baseUrl})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                borderRadius: 8,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                opacity: 0.9,
                            }}
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </DndDropContext.Provider>
    );
};
