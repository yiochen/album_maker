import React from 'react';

export const CenterContentIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M12 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
