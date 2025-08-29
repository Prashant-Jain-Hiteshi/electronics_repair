import React from 'react';
import { FieldError } from 'react-hook-form';

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
  error?: FieldError | string | null;
  touched?: boolean;
  showError?: boolean;
  containerClass?: string;
  labelClass?: string;
  textareaClass?: string;
  errorClass?: string;
  required?: boolean;
  rows?: number;
}

const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  name,
  error,
  touched = true,
  showError = true,
  containerClass = '',
  labelClass = '',
  textareaClass = '',
  errorClass = '',
  required = false,
  rows = 3,
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
      <div className="mt-1">
        <textarea
          id={name}
          name={name}
          rows={rows}
          className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
            showErrorMessage
              ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300'
          } ${textareaClass}`}
          aria-invalid={showErrorMessage ? 'true' : 'false'}
          aria-describedby={`${name}-error`}
          {...props}
        />
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

export default FormTextarea;
