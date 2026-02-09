import React from 'react';

/**
 * Props for the LoadingScreen component.
 */
interface LoadingScreenProps {
  /** The message to display while loading. Defaults to "Loading...". */
  message?: string;
  /** Whether to show the spinning loader animation. Defaults to true. */
  showSpinner?: boolean;
}

/**
 * LoadingScreen component displays a full-screen loading indicator with an optional message.
 * Used during initial app load or heavy operations.
 */
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
