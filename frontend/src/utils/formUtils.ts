import { FieldError, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/types';

/**
 * Handles API errors by setting form errors
 * @param error The error object from the API
 * @param setError The setError function from react-hook-form
 * @param defaultMessage Default error message if no specific errors are found
 */
export const handleApiFormError = <T extends Record<string, any>>(
  error: any,
  setError: UseFormSetError<T>,
  defaultMessage = 'An error occurred while submitting the form.'
) => {
  const apiError = error as ApiError;
  
  // Handle validation errors (422 Unprocessable Entity)
  if (apiError.response?.status === 422 && apiError.response?.data?.errors) {
    const { errors } = apiError.response.data;
    
    // Set field-specific errors
    Object.entries(errors).forEach(([field, messages]) => {
      const fieldName = field as keyof T;
      const message = Array.isArray(messages) ? messages[0] : String(messages);
      
      setError(fieldName, {
        type: 'manual',
        message,
      });
    });
    
    return;
  }
  
  // Handle other types of errors
  const errorMessage = apiError.response?.data?.message || defaultMessage;
  
  // Set a general form error
  setError('root' as keyof T, {
    type: 'manual',
    message: errorMessage,
  });
};

/**
 * Formats form errors into a user-friendly message
 * @param errors The errors object from react-hook-form
 * @returns A formatted error message or null if no errors
 */
export const formatFormErrors = <T extends Record<string, any>>(
  errors: Record<keyof T, FieldError> & { root?: FieldError }
): string | null => {
  // Get all error messages
  const errorMessages = Object.entries(errors)
    .filter(([key]) => key !== 'root') // Exclude root errors
    .map(([_, error]) => error.message);
  
  // Add root error if it exists
  if (errors.root?.message) {
    errorMessages.push(errors.root.message);
  }
  
  return errorMessages.length > 0 ? errorMessages.join('\n') : null;
};

/**
 * Resets form fields to their default values
 * @param defaultValues The default values for the form
 * @param reset The reset function from react-hook-form
 */
export const resetForm = <T extends Record<string, any>>(
  defaultValues: T,
  reset: (values?: T) => void
) => {
  reset(defaultValues);
};

/**
 * Handles form submission with loading state and error handling
 * @param handler The form submission handler
 * @param setLoading Function to set loading state
 * @param onError Optional error callback
 * @returns A function that can be used as an onSubmit handler
 */
export const handleFormSubmit = <T extends Record<string, any>>(
  handler: (data: T) => Promise<void>,
  setLoading: (loading: boolean) => void,
  onError?: (error: any) => void
) => {
  return async (data: T) => {
    try {
      setLoading(true);
      await handler(data);
    } catch (error) {
      console.error('Form submission error:', error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };
};
