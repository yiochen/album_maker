import React from 'react';

/**
 * Text icon — stylized "T" representing the Add Text action.
 */
export const TextIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <path
            d="M5 6.5C5 5.67 5.67 5 6.5 5h11c.83 0 1.5.67 1.5 1.5V8h-1.5V6.5h-5V18H14v1.5h-4V18h1.5V6.5h-5V8H5V6.5Z"
            fill="currentColor"
        />
    </svg>
);
