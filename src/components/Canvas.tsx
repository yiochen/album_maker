import React, { useState, useRef, useCallback } from 'react';
import { Page, PageElement, PoolImage } from '../types';
import { getTemplate } from '../templates/pageTemplates';
import { getMediaUrl, getThumbnailUrl } from '../services/googlePhotos';

interface CanvasProps {
    page: Page;
    selectedElementId: string | null;
    onElementSelect: (elementId: string | null) => void;
    onElementUpdate: (elementId: string, updates: Partial<PageElement>) => void;
    onElementDelete: (elementId: string) => void;
    onImageDrop: (image: PoolImage, position: { x: number; y: number }) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
    page,
    selectedElementId,
    onElementSelect,
    onElementUpdate,
    onElementDelete,
    onImageDrop,
}) => {
    const [zoom, setZoom] = useState(100);
    const [isDragOver, setIsDragOver] = useState(false);
    const canvasRef = useRef<HTMLDivElement>(null);
    const template = getTemplate(page.templateId);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const imageData = e.dataTransfer.getData('application/json');
        if (!imageData) return;

        try {
            const image: PoolImage = JSON.parse(imageData);
            const rect = canvasRef.current?.getBoundingClientRect();
            if (!rect) return;

            // Calculate drop position as percentage
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            onImageDrop(image, { x, y });
        } catch (error) {
            console.error('Failed to parse dropped image data:', error);
        }
    }, [onImageDrop]);

    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
        if (e.target === canvasRef.current) {
            onElementSelect(null);
        }
    }, [onElementSelect]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedElementId) {
                onElementDelete(selectedElementId);
            }
        } else if (e.key === 'Escape') {
            onElementSelect(null);
        }
    }, [selectedElementId, onElementSelect, onElementDelete]);

    return (
        <section className="canvas-container">
            <div
                className="canvas-viewport"
                onKeyDown={handleKeyDown}
                tabIndex={0}
            >
                <div
                    ref={canvasRef}
                    className={`canvas ${isDragOver ? 'drop-active' : ''}`}
                    style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'center center',
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleCanvasClick}
                >
                    {page.elements.length === 0 ? (
                        <div className="canvas-placeholder">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                                <path d="M21 15L16 10L11 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                <path d="M14 18L10 14L3 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <span className="canvas-placeholder-text">
                                Drag images here from the image pool
                            </span>
                            <span className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                                Template: {template.name}
                            </span>
                        </div>
                    ) : (
                        page.elements.map(element => (
                            <CanvasElement
                                key={element.id}
                                element={element}
                                isSelected={element.id === selectedElementId}
                                onSelect={() => onElementSelect(element.id)}
                                onUpdate={(updates) => onElementUpdate(element.id, updates)}
                            />
                        ))
                    )}
                </div>
            </div>

            <div className="canvas-controls">
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => setZoom(z => Math.max(25, z - 25))}
                    disabled={zoom <= 25}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
                <span className="zoom-display">{zoom}%</span>
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => setZoom(z => Math.min(200, z + 25))}
                    disabled={zoom >= 200}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
                <button
                    className="btn btn-ghost"
                    onClick={() => setZoom(100)}
                    style={{ marginLeft: 'var(--space-2)' }}
                >
                    Fit
                </button>
            </div>
        </section>
    );
};

interface CanvasElementProps {
    element: PageElement;
    isSelected: boolean;
    onSelect: () => void;
    onUpdate: (updates: Partial<PageElement>) => void;
}

const CanvasElement: React.FC<CanvasElementProps> = ({
    element,
    isSelected,
    onSelect,
    onUpdate,
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const elementRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect();
        setIsDragging(true);
        setDragStart({
            x: e.clientX - (element.position.x / 100) * (elementRef.current?.parentElement?.clientWidth || 0),
            y: e.clientY - (element.position.y / 100) * (elementRef.current?.parentElement?.clientHeight || 0),
        });
    }, [element.position, onSelect]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !elementRef.current?.parentElement) return;

        const parent = elementRef.current.parentElement;
        const newX = ((e.clientX - dragStart.x) / parent.clientWidth) * 100;
        const newY = ((e.clientY - dragStart.y) / parent.clientHeight) * 100;

        // Clamp to canvas bounds
        const clampedX = Math.max(0, Math.min(100 - element.size.width, newX));
        const clampedY = Math.max(0, Math.min(100 - element.size.height, newY));

        onUpdate({
            position: { x: clampedX, y: clampedY },
        });
    }, [isDragging, dragStart, element.size, onUpdate]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Attach global mouse listeners when dragging
    React.useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const imageUrl = getMediaUrl(element.imageUrl, 800);

    return (
        <div
            ref={elementRef}
            className={`canvas-element ${isSelected ? 'selected' : ''}`}
            style={{
                left: `${element.position.x}%`,
                top: `${element.position.y}%`,
                width: `${element.size.width}%`,
                height: `${element.size.height}%`,
            }}
            onMouseDown={handleMouseDown}
        >
            <img
                src={imageUrl}
                alt="Album element"
                draggable={false}
            />
        </div>
    );
};
