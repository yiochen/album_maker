import React from 'react';

export const LayoutIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 4v16" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3 10h9" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
