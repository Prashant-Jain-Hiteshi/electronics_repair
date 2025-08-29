import React from 'react';
import { FieldError } from 'react-hook-form';

interface FormCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string | React.ReactNode;
  name: string;
  error?: FieldError | string | null;
  touched?: boolean;
  showError?: boolean;
  containerClass?: string;
  labelClass?: string;
  checkboxClass?: string;
  errorClass?: string;
  required?: boolean;
  description?: string;
}

const FormCheckbox: React.FC<FormCheckboxProps> = ({
  label,
  name,
  error,
  touched = true,
  showError = true,
  containerClass = '',
  labelClass = '',
  checkboxClass = '',
  errorClass = '',
  required = false,
  description,
  ...props
}) => {
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const showErrorMessage = showError && touched && errorMessage;
  const checkboxId = `${name}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={containerClass}>
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id={checkboxId}
            name={name}
            type="checkbox"
            className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${
              showErrorMessage
                ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
                : 'border-gray-300'
            } ${checkboxClass}`}
            aria-invalid={showErrorMessage ? 'true' : 'false'}
            aria-describedby={showErrorMessage ? `${name}-error` : undefined}
            {...props}
          />
        </div>
        <div className="ml-3 text-sm">
          <label
            htmlFor={checkboxId}
            className={`font-medium text-gray-700 ${labelClass}`}
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {description && (
            <p className="text-gray-500">{description}</p>
          )}
        </div>
      </div>
      {showErrorMessage && (
        <p 
          className={`mt-1 text-sm text-red-600 ${errorClass}`} 
          id={`${name}-error`}
        >
          {errorMessage}
        </p>
      )}
    </div>
  );
};

export default FormCheckbox;
