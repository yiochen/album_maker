import React, { useMemo, useState } from 'react';

interface PageHalfThumbnailProps {
    imageUrl: string;
    side: 'left' | 'right';
    width: number;
    height: number;
    alt: string;
    className?: string;
}

interface NaturalSize {
    width: number;
    height: number;
}

export const PageHalfThumbnail: React.FC<PageHalfThumbnailProps> = ({
    imageUrl,
    side,
    width,
    height,
    alt,
    className,
}) => {
    const [naturalSize, setNaturalSize] = useState<NaturalSize | null>(null);

    const imageStyle = useMemo<React.CSSProperties>(() => {
        if (!naturalSize || naturalSize.width <= 0 || naturalSize.height <= 0) {
            return {
                width: width * 2,
                height,
                left: side === 'left' ? 0 : -width,
                top: 0,
            };
        }

        const halfNaturalWidth = naturalSize.width / 2;
        const scale = Math.min(width / halfNaturalWidth, height / naturalSize.height);
        const drawWidth = naturalSize.width * scale;
        const drawHeight = naturalSize.height * scale;
        const halfDrawWidth = drawWidth / 2;
        const drawLeft = side === 'left'
            ? width / 2 - halfDrawWidth / 2
            : width / 2 - (halfDrawWidth * 3) / 2;
        const drawTop = (height - drawHeight) / 2;

        return {
            width: drawWidth,
            height: drawHeight,
            left: drawLeft,
            top: drawTop,
        };
    }, [naturalSize, side, width, height]);

    return (
        <div
            className={`page-half-thumbnail ${className ?? ''}`.trim()}
            style={{ width, height }}
            data-testid={`page-half-thumbnail-${side}`}
        >
            <img
                src={imageUrl}
                alt={alt}
                className="page-half-thumbnail-image"
                loading="lazy"
                draggable={false}
                onLoad={(e) => {
                    setNaturalSize({
                        width: e.currentTarget.naturalWidth,
                        height: e.currentTarget.naturalHeight,
                    });
                }}
                style={imageStyle}
            />
        </div>
    );
};
