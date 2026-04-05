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
}

export const DraggablePoolImage: React.FC<DraggablePoolImageProps> = ({ image, isUsed = false }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: image.id,
        data: image,
    });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`pool-image${isUsed ? ' pool-image-used' : ''}`}
            data-testid="pool-image"
            data-used={isUsed ? 'true' : 'false'}
            style={{
                opacity: isDragging ? 0.5 : undefined,
                cursor: 'grab',
                position: 'relative',
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
