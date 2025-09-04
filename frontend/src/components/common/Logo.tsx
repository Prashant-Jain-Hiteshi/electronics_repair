import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'icon' | 'full';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'default',
  size = 'md',
  className = '',
  showIcon = true,
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  const icon = (
    <svg
      className={cn(
        'text-blue-600',
        sizeClasses[size],
        variant === 'icon' ? 'block' : 'flex-shrink-0'
      )}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12zm0-2c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm-1-16a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 11-2 0V9.414l-4.293 4.293a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L11 11.586l3.586-3.586H12a1 1 0 01-1-1zm-6 10a1 1 0 01-1-1v-4a1 1 0 112 0v2.586l2.293-2.293a1 1 0 011.414 1.414L7.414 16H12a1 1 0 110 2H6z"
        fill="currentColor"
      />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={cn('inline-block', className)} {...props}>
        {icon}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', className)} {...props}>
      {showIcon && icon}
      <span
        className={cn(
          'font-bold text-gray-900',
          showIcon ? 'ml-2' : '',
          textSizes[size],
          variant === 'full' ? 'block' : 'hidden sm:block'
        )}
      >
        RepairHub
      </span>
    </div>
  );
};

export default Logo;
