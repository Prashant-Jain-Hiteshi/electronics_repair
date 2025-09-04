import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { LoadingSpinner } from './LoadingSpinner';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost' | 'link';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  as?: React.ElementType;
  href?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  outline: 'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-blue-500',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-blue-500',
  link: 'bg-transparent text-blue-600 hover:text-blue-800 hover:underline p-0 h-auto',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1.5 text-xs',
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-base',
};

const iconSizeClasses: Record<ButtonSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  isLoading = false,
  loadingText,
  disabled = false,
  className = '',
  leftIcon,
  rightIcon,
  fullWidth = false,
  as: Component = 'button',
  ...props
}, ref) => {
  const isDisabled = disabled || isLoading;
  const showLoading = isLoading && !loadingText;
  const showLoadingWithText = isLoading && loadingText;

  const baseClasses = [
    'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2',
    variant !== 'link' ? 'border border-transparent' : '',
    variant === 'link' ? 'h-auto' : 'h-fit',
    fullWidth ? 'w-full' : '',
    isDisabled ? 'opacity-60 cursor-not-allowed' : '',
    variantClasses[variant],
    variant !== 'link' ? sizeClasses[size] : '',
    className,
  ].filter(Boolean).join(' ');

  const iconClasses = [
    'flex-shrink-0',
    variant === 'link' ? 'h-4 w-4' : iconSizeClasses[size],
    children ? (leftIcon ? 'mr-2' : 'ml-2') : '',
  ].filter(Boolean).join(' ');

  return (
    <Component
      ref={ref}
      type={Component === 'button' ? type : undefined}
      className={baseClasses}
      disabled={isDisabled}
      {...props}
    >
      {showLoading && (
        <span className="mr-2">
          <LoadingSpinner size={size} color={variant === 'outline' || variant === 'ghost' ? 'primary' : 'white'} />
        </span>
      )}
      {!isLoading && leftIcon && <span className={iconClasses}>{leftIcon}</span>}
      {showLoadingWithText ? loadingText : children}
      {!isLoading && rightIcon && <span className={iconClasses}>{rightIcon}</span>}
    </Component>
  );
});

Button.displayName = 'Button';

// Export button variants as separate components for convenience
export const PrimaryButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="primary" {...props} />
));
PrimaryButton.displayName = 'PrimaryButton';

export const SecondaryButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="secondary" {...props} />
));
SecondaryButton.displayName = 'SecondaryButton';

export const DangerButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="danger" {...props} />
));
DangerButton.displayName = 'DangerButton';

export const SuccessButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="success" {...props} />
));
SuccessButton.displayName = 'SuccessButton';

export const OutlineButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="outline" {...props} />
));
OutlineButton.displayName = 'OutlineButton';

export const GhostButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="ghost" {...props} />
));
GhostButton.displayName = 'GhostButton';

export const LinkButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="link" {...props} />
));
LinkButton.displayName = 'LinkButton';
