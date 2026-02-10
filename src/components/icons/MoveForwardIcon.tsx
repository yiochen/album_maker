import React from 'react';

export const MoveForwardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="5" y="7" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M9 5H19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
