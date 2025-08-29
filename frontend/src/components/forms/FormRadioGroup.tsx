import React from 'react';
import { FieldError } from 'react-hook-form';

export interface RadioOption {
  value: string | number;
  label: string | React.ReactNode;
  description?: string;
  disabled?: boolean;
}

interface FormRadioGroupProps {
  label: string;
  name: string;
  options: RadioOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  error?: FieldError | string | null;
  touched?: boolean;
  showError?: boolean;
  containerClass?: string;
  labelClass?: string;
  optionContainerClass?: string;
  optionClass?: string;
  errorClass?: string;
  required?: boolean;
  inline?: boolean;
}

const FormRadioGroup: React.FC<FormRadioGroupProps> = ({
  label,
  name,
  options,
  value,
  onChange,
  error,
  touched = true,
  showError = true,
  containerClass = '',
  labelClass = '',
  optionContainerClass = 'space-y-2',
  optionClass = 'relative flex items-start',
  errorClass = '',
  required = false,
  inline = false,
}) => {
  const errorMessage = typeof error === 'string' ? error : error?.message;
  const showErrorMessage = showError && touched && errorMessage;
  const groupId = `${name}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={containerClass}>
      <div className="space-y-2">
        <label className={`block text-sm font-medium text-gray-700 ${labelClass}`}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        
        <div className={`${inline ? 'flex flex-wrap gap-4' : ''} ${optionContainerClass}`}>
          {options.map((option) => {
            const optionId = `${groupId}-${option.value}`;
            const isChecked = value === option.value;
            
            return (
              <div key={option.value} className={`${inline ? 'flex-shrink-0' : ''} ${optionClass}`}>
                <div className="flex items-center h-5">
                  <input
                    id={optionId}
                    name={name}
                    type="radio"
                    checked={isChecked}
                    onChange={() => onChange(option.value)}
                    className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${
                      showErrorMessage
                        ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300'
                    }`}
                    aria-invalid={showErrorMessage ? 'true' : 'false'}
                    aria-describedby={showErrorMessage ? `${name}-error` : undefined}
                    disabled={option.disabled}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor={optionId}
                    className={`font-medium ${
                      option.disabled ? 'text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </label>
                  {option.description && (
                    <p className={`text-sm ${option.disabled ? 'text-gray-400' : 'text-gray-500'}`}>
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
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

export default FormRadioGroup;
