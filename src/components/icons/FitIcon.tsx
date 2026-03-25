import React from 'react';

export const FitIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <polyline points="15,3 21,3 21,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="9,21 3,21 3,15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="21" y1="3" x2="14" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <line x1="3" y1="21" x2="10" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
