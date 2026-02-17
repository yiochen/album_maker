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
}

export const DraggablePoolImage: React.FC<DraggablePoolImageProps> = ({ image }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: image.id,
        data: image,
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="pool-image"
            data-testid="pool-image"
            style={{
                opacity: isDragging ? 0.5 : 1,
                cursor: 'grab',
            }}
        >
            <img
                src={image.thumbnailUrl}
                alt={image.filename}
                title={image.filename}
                loading="lazy"
                data-width-px={image.width}
                data-height-px={image.height}
            />
        </div>
    );
};
