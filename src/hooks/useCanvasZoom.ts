import { useState, useCallback, useRef, useEffect } from 'react';

interface UseCanvasZoomProps {
    canvasWidth: number;
    canvasHeight: number;
    containerRef: React.RefObject<HTMLDivElement | null>;
}

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
        const padding = 64;
        const availableWidth = viewport.clientWidth - padding;
        const availableHeight = viewport.clientHeight - padding;

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
