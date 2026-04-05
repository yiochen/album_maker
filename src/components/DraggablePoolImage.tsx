/**
 * DraggablePoolImage - An image in the pool that can be dragged using @dnd-kit.
 *
 * This component wraps a pool image with the useDraggable hook, allowing it
 * to be dragged onto the canvas. The image stays in place while DragOverlay
 * (in DndWrapper) shows the visual preview.
 */
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { PoolImage } from '../types';

/**
 * Props for the DraggablePoolImage component.
 */
interface DraggablePoolImageProps {
    /** The image object to display and drag. */
    image: PoolImage;
    /** Whether the image is already used on a spread. */
    isUsed?: boolean;
    /** Whether the image is selected in the pool. */
    isSelected?: boolean;
    /** 1-based selection order when selected. */
    selectionOrder?: number;
    /** Click handler for pool selection. */
    onClick?: (event: React.MouseEvent<HTMLDivElement>, image: PoolImage) => void;
}

export const DraggablePoolImage: React.FC<DraggablePoolImageProps> = ({
    image,
    isUsed = false,
    isSelected = false,
    selectionOrder,
    onClick,
}) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: image.id,
        data: image,
    });

    const pointerDownRef = React.useRef<{ x: number; y: number; multi: boolean } | null>(null);

    const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        pointerDownRef.current = {
            x: event.clientX,
            y: event.clientY,
            multi: event.metaKey || event.ctrlKey,
        };
    };

    const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        const pointerDown = pointerDownRef.current;
        pointerDownRef.current = null;
        if (!pointerDown) return;

        const movedX = Math.abs(event.clientX - pointerDown.x);
        const movedY = Math.abs(event.clientY - pointerDown.y);
        const isClick = movedX < 4 && movedY < 4;
        if (!isClick) return;

        onClick?.(event, image);
    };

    const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
        }
    };

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`pool-image${isUsed ? ' pool-image-used' : ''}${isSelected ? ' pool-image-selected' : ''}`}
            data-testid="pool-image"
            data-used={isUsed ? 'true' : 'false'}
            data-selected={isSelected ? 'true' : 'false'}
            style={{
                opacity: isDragging ? 0.5 : undefined,
                cursor: 'grab',
                position: 'relative',
            }}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
        >
            <img
                src={image.thumbnailUrl}
                alt={image.filename}
                title={image.filename}
                loading="lazy"
                data-width-px={image.width}
                data-height-px={image.height}
            />
            {isSelected && selectionOrder !== undefined && (
                <div className="pool-image-selection-badge" aria-hidden="true">
                    {selectionOrder}
                </div>
            )}
            {isUsed && (
                <div className="pool-image-used-badge" aria-hidden="true">
                    Used
                </div>
            )}
            {image.importStage && image.importStage !== 'done' && (
                <div
                    style={{
                        position: 'absolute',
                        left: 6,
                        right: 6,
                        bottom: 6,
                        padding: '6px 8px',
                        borderRadius: 8,
                        background: 'rgba(15, 23, 42, 0.8)',
                        color: '#fff',
                        fontSize: 12,
                    }}
                >
                    <div style={{ marginBottom: 4, textTransform: 'capitalize' }}>
                        {image.importStage === 'full' ? 'Loading full image' : `Loading ${image.importStage}`}
                    </div>
                    <div
                        style={{
                            height: 4,
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.24)',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                width: `${image.importProgress ?? 0}%`,
                                height: '100%',
                                background: '#fff',
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
