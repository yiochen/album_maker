import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface ViewportSize {
    innerWidth: number;
    innerHeight: number;
    paddingLeft: number;
    paddingTop: number;
}

interface UseCanvasViewportLayoutOptions {
    containerRef: React.RefObject<HTMLDivElement | null>;
    canvasWidth: number;
    canvasHeight: number;
    zoom: number;
}

const getViewportMetrics = (viewport: HTMLDivElement): ViewportSize => {
    const styles = window.getComputedStyle(viewport);
    const paddingLeft = Number.parseFloat(styles.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(styles.paddingRight) || 0;
    const paddingTop = Number.parseFloat(styles.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(styles.paddingBottom) || 0;

    return {
        innerWidth: Math.max(0, viewport.clientWidth - paddingLeft - paddingRight),
        innerHeight: Math.max(0, viewport.clientHeight - paddingTop - paddingBottom),
        paddingLeft,
        paddingTop,
    };
};

export const useCanvasViewportLayout = ({
    containerRef,
    canvasWidth,
    canvasHeight,
    zoom,
}: UseCanvasViewportLayoutOptions) => {
    const zoomedWidth = canvasWidth * (zoom / 100);
    const zoomedHeight = canvasHeight * (zoom / 100);

    const [viewportSize, setViewportSize] = useState<ViewportSize>({
        innerWidth: 0,
        innerHeight: 0,
        paddingLeft: 0,
        paddingTop: 0,
    });

    useEffect(() => {
        const viewport = containerRef.current;
        if (!viewport) return;

        const updateSize = () => {
            setViewportSize(getViewportMetrics(viewport));
        };

        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(viewport);
        updateSize();

        return () => resizeObserver.disconnect();
    }, [containerRef]);

    const marginLeft = Math.max(0, (viewportSize.innerWidth - zoomedWidth) / 2);
    const marginTop = Math.max(0, (viewportSize.innerHeight - zoomedHeight) / 2);

    const previousZoomRef = useRef(zoom);
    useLayoutEffect(() => {
        const viewport = containerRef.current;
        if (!viewport) return;

        const previousZoom = previousZoomRef.current;
        if (previousZoom === zoom) return;

        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;
        const { innerWidth, innerHeight, paddingLeft, paddingTop } = getViewportMetrics(viewport);

        const previousZoomedWidth = canvasWidth * (previousZoom / 100);
        const previousZoomedHeight = canvasHeight * (previousZoom / 100);
        const previousMarginLeft = Math.max(0, (innerWidth - previousZoomedWidth) / 2);
        const previousMarginTop = Math.max(0, (innerHeight - previousZoomedHeight) / 2);

        const prevContentX = Math.max(0, viewport.scrollLeft - (paddingLeft + previousMarginLeft));
        const prevContentY = Math.max(0, viewport.scrollTop - (paddingTop + previousMarginTop));
        const ratio = zoom / previousZoom;
        const nextContentX = prevContentX * ratio;
        const nextContentY = prevContentY * ratio;

        const nextScrollLeft = nextContentX + paddingLeft + marginLeft;
        const nextScrollTop = nextContentY + paddingTop + marginTop;

        const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewportWidth);
        const maxScrollTop = Math.max(0, viewport.scrollHeight - viewportHeight);

        viewport.scrollLeft = Math.min(maxScrollLeft, Math.max(0, nextScrollLeft));
        viewport.scrollTop = Math.min(maxScrollTop, Math.max(0, nextScrollTop));

        previousZoomRef.current = zoom;
    }, [canvasHeight, canvasWidth, containerRef, marginLeft, marginTop, zoom]);

    return {
        zoomedWidth,
        zoomedHeight,
        marginLeft,
        marginTop,
    };
};
