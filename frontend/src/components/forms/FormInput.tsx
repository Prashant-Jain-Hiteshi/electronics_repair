import React from 'react';
import { FieldError } from 'react-hook-form';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: FieldError | string | null;
  touched?: boolean;
  showError?: boolean;
  containerClass?: string;
  labelClass?: string;
  inputClass?: string;
  errorClass?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  name,
  error,
  touched = true,
  showError = true,
  containerClass = '',
  labelClass = '',
  inputClass = '',
  errorClass = '',
  required = false,
  leftIcon,
  rightIcon,
  ...props
}) => {
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const showErrorMessage = showError && touched && errorMessage;

  return (
    <div className={`space-y-1 ${containerClass}`}>
      <label 
        htmlFor={name}
        className={`block text-sm font-medium text-gray-700 ${labelClass}`}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative rounded-md shadow-sm">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={name}
          name={name}
          className={`block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
            leftIcon ? 'pl-10' : 'pl-3'
          } ${rightIcon ? 'pr-10' : 'pr-3'} ${
            showErrorMessage
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300'
          } ${inputClass}`}
          aria-invalid={showErrorMessage ? 'true' : 'false'}
          aria-describedby={`${name}-error`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {rightIcon}
          </div>
        )}
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

export default FormInput;
