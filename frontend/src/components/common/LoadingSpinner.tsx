import React from 'react';

interface LoadingSpinnerProps {
  fullPage?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ fullPage = false, className = '' }) => {
  const spinner = (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
