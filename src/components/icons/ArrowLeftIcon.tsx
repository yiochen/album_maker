import React from 'react';

interface IconProps {
    width?: string | number;
    height?: string | number;
    className?: string;
}

export const ArrowLeftIcon: React.FC<IconProps> = ({ width = 24, height = 24, className = "" }) => (
    <svg
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
    </svg>
);
