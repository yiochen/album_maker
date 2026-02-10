import React from 'react';

export const LockIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect
      x="5"
      y="10"
      width="14"
      height="10"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M8 10V7a4 4 0 1 1 8 0v3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
