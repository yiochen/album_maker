import React from 'react';

export const ShapesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="3" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2" />
    <circle cx="17.5" cy="8.5" r="3.5" stroke="currentColor" strokeWidth="2" />
    <path d="M7 19L10.5 13H3.5L7 19Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
