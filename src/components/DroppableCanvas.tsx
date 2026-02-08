/**
 * DroppableCanvas - Wrapper that makes the canvas a droppable target for @dnd-kit.
 *
 * This component wraps the canvas wrapper div with useDroppable hook,
 * allowing images to be dropped from the ImagePool onto the canvas.
 */
import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableCanvasProps {
    /** Unique ID for this droppable area */
    id: string;
    /** Content to render inside the droppable area */
    children: React.ReactNode;
    /** Additional class name */
    className?: string;
    /** Style object */
    style?: React.CSSProperties;
    /** Data test ID */
    'data-testid'?: string;
}

export const DroppableCanvas: React.FC<DroppableCanvasProps> = ({
    id,
    children,
    className,
    style,
    'data-testid': testId,
}) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`${className || ''} ${isOver ? 'drop-active' : ''}`.trim()}
            style={style}
            data-testid={testId}
        >
            {children}
        </div>
    );
};
