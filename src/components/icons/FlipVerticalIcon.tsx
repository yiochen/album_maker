import React from 'react';

export const FlipVerticalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M4 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M6 6V10H18V6L15 8H9L6 6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M6 18V14H18V18L15 16H9L6 18Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);
