import React from 'react';

export const MoveBackwardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="7" y="5" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M5 9H15V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
