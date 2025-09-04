import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

const colorClasses = {
  primary: 'border-t-blue-600 border-r-blue-600 border-b-transparent border-l-transparent',
  secondary: 'border-t-gray-600 border-r-gray-600 border-b-transparent border-l-transparent',
  white: 'border-t-white border-r-white border-b-transparent border-l-transparent',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  return (
    <div className={`inline-block animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]} ${className}`}>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

// Full page loading spinner
export const PageLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-white bg-opacity-75 z-50">
    <LoadingSpinner size="lg" />
    {message && <p className="mt-4 text-gray-600">{message}</p>}
  </div>
);

// Button loading spinner
export const ButtonSpinner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`inline-flex items-center ${className}`}>
    <LoadingSpinner size="sm" color="white" className="mr-2" />
    <span>Processing...</span>
  </div>
);
