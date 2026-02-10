import React from 'react';

export const ZoomOutIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="M8 11H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
