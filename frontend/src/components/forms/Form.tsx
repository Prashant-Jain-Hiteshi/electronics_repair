import React, { ReactNode } from 'react';
import { FormProvider, SubmitHandler, useForm, UseFormProps, UseFormReturn, FieldValues } from 'react-hook-form';

export interface FormProps<TFieldValues extends FieldValues> {
  /** Form children, can include form fields and other elements */
  children: ReactNode | ((methods: UseFormReturn<TFieldValues>) => ReactNode);
  /** Form submission handler */
  onSubmit: SubmitHandler<TFieldValues>;
  /** Optional form configuration */
  formOptions?: UseFormProps<TFieldValues>;
  /** Custom class for the form element */
  className?: string;
  /** Show a loading state on form submission */
  isLoading?: boolean;
  /** Show a success state after submission */
  isSuccess?: boolean;
  /** Error message to display above the form */
  error?: string | null;
  /** Success message to display above the form */
  successMessage?: string | null;
  /** Additional elements to render below the form */
  footerContent?: ReactNode;
  /** Disable the form */
  disabled?: boolean;
  /** Reset form after successful submission */
  resetOnSubmit?: boolean;
  /** Additional form props */
  [key: string]: any;
}

/**
 * A flexible form component that handles form state, validation, and submission.
 * Uses React Hook Form under the hood with Yup for validation.
 */
function Form<TFieldValues extends FieldValues>({
  children,
  onSubmit,
  formOptions = {},
  className = 'space-y-6',
  isLoading = false,
  isSuccess = false,
  error = null,
  successMessage = null,
  footerContent,
  disabled = false,
  resetOnSubmit = true,
  ...props
}: FormProps<TFieldValues>) {
  const methods = useForm<TFieldValues>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    ...formOptions,
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitSuccessful },
  } = methods;

  // Reset form after successful submission if needed
  React.useEffect(() => {
    if (isSubmitSuccessful && resetOnSubmit) {
      reset(formOptions.defaultValues as any);
    }
  }, [isSubmitSuccessful, reset, resetOnSubmit, formOptions.defaultValues]);

  // Disable form fields when form is disabled
  React.useEffect(() => {
    const formElements = document.querySelectorAll('input, select, textarea, button');
    formElements.forEach((element) => {
      if (element instanceof HTMLInputElement || 
          element instanceof HTMLSelectElement || 
          element instanceof HTMLTextAreaElement ||
          element instanceof HTMLButtonElement) {
        element.disabled = disabled || isLoading;
      }
    });
  }, [disabled, isLoading]);

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className={className}
        noValidate
        {...props}
      >
        {/* Global form error message */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Success message */}
        {isSuccess && successMessage && (
          <div className="mb-4 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form fields */}
        {typeof children === 'function' ? children(methods) : children}

        {/* Form footer */}
        {footerContent}
      </form>
    </FormProvider>
  );
}

export default Form;
