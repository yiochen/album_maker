import React from 'react';

export const TemplatesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
    <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="2" />
    <line x1="9" y1="9" x2="9" y2="21" stroke="currentColor" strokeWidth="2" />
  </svg>
);
