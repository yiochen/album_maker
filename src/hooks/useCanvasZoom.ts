import { useState, useCallback, useRef, useEffect } from 'react';
import type React from 'react';

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
    const [isFitMode, setIsFitMode] = useState(true);
    const isZoomInitialized = useRef(false);

    // Auto-Fit Logic
    const calculateFitZoom = useCallback(() => {
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

    const fitToViewport = useCallback(() => {
        setIsFitMode(true);
        calculateFitZoom();
    }, [calculateFitZoom]);

    const toggleFitMode = useCallback(() => {
        setIsFitMode((prev) => {
            const next = !prev;
            if (next) {
                calculateFitZoom();
            }
            return next;
        });
    }, [calculateFitZoom]);

    const setZoomPercent = useCallback((value: React.SetStateAction<number>) => {
        setIsFitMode(false);
        setZoom(value);
    }, []);

    useEffect(() => {
        if (!isZoomInitialized.current && canvasWidth > 0) {
            const timer = setTimeout(() => {
                calculateFitZoom();
                isZoomInitialized.current = true;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [calculateFitZoom, canvasWidth]);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        const handleResize = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (isFitMode) {
                    calculateFitZoom();
                }
            }, 100);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('resize', handleResize);
        };
    }, [calculateFitZoom, isFitMode]);

    useEffect(() => {
        const viewport = containerRef.current;
        if (!viewport) return;

        let timeout: ReturnType<typeof setTimeout>;
        const observer = new ResizeObserver(() => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (isZoomInitialized.current && isFitMode) {
                    calculateFitZoom();
                }
            }, 100);
        });

        observer.observe(viewport);

        return () => {
            clearTimeout(timeout);
            observer.disconnect();
        };
    }, [containerRef, calculateFitZoom, isFitMode]);

    return { zoom, setZoom: setZoomPercent, fitToViewport, toggleFitMode, isFitMode };
};
