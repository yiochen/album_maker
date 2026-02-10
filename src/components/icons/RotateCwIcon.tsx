import React from 'react';

export const RotateCwIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M20 12a8 8 0 1 1-2.34-5.66"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path d="M20 4V9H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
