import React from 'react';

export const NavigatorIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="3" y="3" width="7" height="10" rx="1" stroke="currentColor" strokeWidth="2" />
    <rect x="14" y="3" width="7" height="10" rx="1" stroke="currentColor" strokeWidth="2" />
    <rect x="3" y="16" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="2" />
    <rect x="14" y="16" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="2" />
  </svg>
);
