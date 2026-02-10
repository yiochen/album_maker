import React from 'react';

export const FlipHorizontalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12 4V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M6 6H10V18H6L8 15V9L6 6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M18 6H14V18H18L16 15V9L18 6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
