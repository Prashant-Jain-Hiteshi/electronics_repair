import React from 'react';
import { FieldError } from 'react-hook-form';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  options: SelectOption[];
  error?: FieldError | string | null;
  touched?: boolean;
  showError?: boolean;
  containerClass?: string;
  labelClass?: string;
  selectClass?: string;
  errorClass?: string;
  required?: boolean;
  placeholder?: string;
  leftIcon?: React.ReactNode;
}

const FormSelect: React.FC<FormSelectProps> = ({
  label,
  name,
  options,
  error,
  touched = true,
  showError = true,
  containerClass = '',
  labelClass = '',
  selectClass = '',
  errorClass = '',
  required = false,
  placeholder = 'Select an option',
  leftIcon,
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
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {leftIcon}
          </div>
        )}
        <select
          id={name}
          name={name}
          className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md ${
            leftIcon ? 'pl-10' : 'pl-3'
          } ${
            showErrorMessage
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300'
          } ${selectClass}`}
          aria-invalid={showErrorMessage ? 'true' : 'false'}
          aria-describedby={`${name}-error`}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
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

export default FormSelect;
