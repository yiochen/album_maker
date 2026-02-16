import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Props for useCanvasZoom.
 */
interface UseCanvasZoomProps {
    /** The width of the canvas content. */
    canvasWidth: number;
    /** The height of the canvas content. */
    canvasHeight: number;
    /** Ref to the container element that limits the viewport. */
    containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Hook to manage the canvas zoom level.
 *
 * Handles initial auto-fitting to the viewport and window resize events.
 */
export const useCanvasZoom = ({
    canvasWidth,
    canvasHeight,
    containerRef,
}: UseCanvasZoomProps) => {
    const [zoom, setZoom] = useState(25);
    const isZoomInitialized = useRef(false);

    // Auto-Fit Logic
    const fitToViewport = useCallback(() => {
        if (!containerRef.current) return;
        const viewport = containerRef.current;
        const styles = window.getComputedStyle(viewport);
        const paddingX =
            (Number.parseFloat(styles.paddingLeft) || 0) +
            (Number.parseFloat(styles.paddingRight) || 0);
        const paddingY =
            (Number.parseFloat(styles.paddingTop) || 0) +
            (Number.parseFloat(styles.paddingBottom) || 0);

        const availableWidth = Math.max(1, viewport.clientWidth - paddingX);
        const availableHeight = Math.max(1, viewport.clientHeight - paddingY);

        const scaleX = availableWidth / canvasWidth;
        const scaleY = availableHeight / canvasHeight;
        const scale = Math.min(scaleX, scaleY);

        const zoomPercent = Math.max(10, Math.floor(scale * 100));
        setZoom(zoomPercent);
    }, [canvasWidth, canvasHeight, containerRef]);

    useEffect(() => {
        if (!isZoomInitialized.current && canvasWidth > 0) {
            const timer = setTimeout(() => {
                fitToViewport();
                isZoomInitialized.current = true;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [fitToViewport, canvasWidth]);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        const handleResize = () => {
            clearTimeout(timeout);
            timeout = setTimeout(fitToViewport, 100);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [fitToViewport]);

    return { zoom, setZoom, fitToViewport };
};
