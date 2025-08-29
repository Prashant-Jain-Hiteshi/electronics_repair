import React from 'react';
import { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';

export interface FormFieldProps {
  /** The label for the form field */
  label?: string;
  /** The name of the form field */
  name: string;
  /** Optional description or help text */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Error message or error object from react-hook-form */
  error?: FieldError | string | null;
  /** Whether the field has been touched */
  touched?: boolean;
  /** Whether to show error messages */
  showError?: boolean;
  /** Additional class name for the container */
  className?: string;
  /** Additional class name for the label */
  labelClassName?: string;
  /** Additional class name for the description */
  descriptionClassName?: string;
  /** Additional class name for the error message */
  errorClassName?: string;
  /** The form field element */
  children: React.ReactElement;
  /** Optional HTML id for the field */
  id?: string;
  /** Optional HTML for attribute for the label */
  htmlFor?: string;
  /** Optional direction for the label and field */
  direction?: 'vertical' | 'horizontal';
  /** Optional width of the label in a horizontal layout */
  labelWidth?: string;
  /** Optional width of the field in a horizontal layout */
  fieldWidth?: string;
  /** Optional alignment of the field in a horizontal layout */
  align?: 'start' | 'center' | 'end';
  /** Register function from react-hook-form */
  register?: UseFormRegisterReturn;
}

/**
 * A wrapper component for form fields that provides consistent styling and error handling.
 * Can be used with any form field component.
 */
const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  description,
  required = false,
  error: errorProp,
  touched = true,
  showError = true,
  className = '',
  labelClassName = '',
  descriptionClassName = '',
  errorClassName = '',
  children,
  id,
  htmlFor,
  direction = 'vertical',
  labelWidth = 'w-1/3',
  fieldWidth = 'w-2/3',
  align = 'start',
  register,
  ...props
}) => {
  const fieldId = id || name;
  const labelFor = htmlFor || fieldId;
  
  // Get error message from error prop
  const errorMessage = typeof errorProp === 'string' 
    ? errorProp 
    : errorProp?.message;
    
  const showErrorMessage = showError && touched && errorMessage;
  
  // Clone the child element and add props
  const field = React.cloneElement(children, {
    id: fieldId,
    name,
    'aria-invalid': showErrorMessage ? 'true' : 'false',
    'aria-describedby': description ? `${fieldId}-description` : undefined,
    ...(register || {}),
    ...children.props,
  });

  // Alignment classes
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
  }[align];

  // Render horizontal layout
  if (direction === 'horizontal') {
    return (
      <div className={cn('flex', alignClasses, className)} {...props}>
        {label && (
          <div className={cn('pr-4 pt-2', labelWidth)}>
            <label
              htmlFor={labelFor}
              className={cn(
                'block text-sm font-medium text-gray-700',
                required && 'after:ml-0.5 after:text-red-500 after:content-["*"]',
                labelClassName
              )}
            >
              {label}
            </label>
            {description && (
              <p
                id={`${fieldId}-description`}
                className={cn('mt-1 text-xs text-gray-500', descriptionClassName)}
              >
                {description}
              </p>
            )}
          </div>
        )}
        <div className={cn(fieldWidth)}>
          {field}
          {showErrorMessage && (
            <p 
              className={cn('mt-1 text-sm text-red-600', errorClassName)}
              id={`${fieldId}-error`}
              role="alert"
            >
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Render vertical layout (default)
  return (
    <div className={cn('space-y-1', className)} {...props}>
      {label && (
        <label
          htmlFor={labelFor}
          className={cn(
            'block text-sm font-medium text-gray-700',
            required && 'after:ml-0.5 after:text-red-500 after:content-["*"]',
            labelClassName
          )}
        >
          {label}
        </label>
      )}
      {description && (
        <p
          id={`${fieldId}-description`}
          className={cn('text-xs text-gray-500', descriptionClassName)}
        >
          {description}
        </p>
      )}
      {field}
      {showErrorMessage && (
        <p 
          className={cn('mt-1 text-sm text-red-600', errorClassName)}
          id={`${fieldId}-error`}
          role="alert"
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default FormField;
