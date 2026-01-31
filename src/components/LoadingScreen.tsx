import React from 'react';

interface LoadingScreenProps {
  message?: string;
  showSpinner?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "Loading...",
  showSpinner = true
}) => {
  return (
    <div className="app-container">
      <div className="loading-screen">
        {showSpinner && <div className="loading-spinner" />}
        <span>{message}</span>
      </div>
    </div>
  );
};
