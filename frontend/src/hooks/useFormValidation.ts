import { useForm as useReactHookForm, UseFormProps, FieldValues, UseFormReturn, DeepPartial } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useCallback, useEffect } from 'react';
import { messages } from '@/utils/validators';

// Type for validation rules
type ValidationRules = {
  [key: string]: yup.AnySchema;
};

// Type for form field configuration
type FormFieldConfig = {
  required?: boolean | string;
  pattern?: {
    value: RegExp;
    message: string;
  };
  minLength?: {
    value: number;
    message: string;
  };
  maxLength?: {
    value: number;
    message: string;
  };
  min?: {
    value: number | string | Date;
    message: string;
  };
  max?: {
    value: number | string | Date;
    message: string;
  };
  validate?: (value: any) => boolean | string;
  custom?: yup.AnySchema;
};

// Type for form configuration
type FormConfig<T extends FieldValues> = {
  defaultValues?: DeepPartial<T>;
  validationSchema?: yup.ObjectSchema<any>;
  validationRules?: Partial<Record<keyof T, FormFieldConfig>>;
  onSubmit: (data: T) => Promise<void> | void;
  onError?: (errors: any, e: any) => void;
  onSuccess?: (data: T) => void;
};

/**
 * Custom hook for form handling with validation
 * @param config Form configuration including validation rules and callbacks
 * @returns Form methods and state from react-hook-form
 */
export function useFormValidation<T extends FieldValues>({
  defaultValues,
  validationSchema,
  validationRules,
  onSubmit,
  onError,
  onSuccess,
}: FormConfig<T>): UseFormReturn<T> {
  // Generate Yup schema from validation rules if no schema is provided
  const generatedSchema = useCallback(() => {
    if (validationSchema) return validationSchema;
    if (!validationRules) return yup.object().shape({});

    const schema: ValidationRules = {};
    
    Object.entries(validationRules).forEach(([field, rules]) => {
      if (!rules) return;
      
      let fieldSchema = yup.mixed();
      
      // Handle required
      if (rules.required) {
        const message = typeof rules.required === 'string' ? rules.required : messages.required;
        fieldSchema = fieldSchema.required(message);
      }
      
      // Handle pattern
      if (rules.pattern) {
        fieldSchema = fieldSchema.matches(rules.pattern.value, rules.pattern.message);
      }
      
      // Handle minLength
      if (rules.minLength) {
        fieldSchema = fieldSchema.min(rules.minLength.value, rules.minLength.message);
      }
      
      // Handle maxLength
      if (rules.maxLength) {
        fieldSchema = fieldSchema.max(rules.maxLength.value, rules.maxLength.message);
      }
      
      // Handle min
      if (rules.min) {
        fieldSchema = fieldSchema.min(rules.min.value, rules.min.message);
      }
      
      // Handle max
      if (rules.max) {
        fieldSchema = fieldSchema.max(rules.max.value, rules.max.message);
      }
      
      // Handle custom validation
      if (rules.validate) {
        fieldSchema = fieldSchema.test({
          name: 'custom',
          exclusive: true,
          message: 'Invalid value',
          test: rules.validate,
        });
      }
      
      // Handle custom Yup schema
      if (rules.custom) {
        fieldSchema = rules.custom;
      }
      
      schema[field] = fieldSchema;
    });
    
    return yup.object().shape(schema);
  }, [validationSchema, validationRules]);

  // Initialize form with react-hook-form
  const methods = useReactHookForm<T>({
    defaultValues: defaultValues as any,
    resolver: validationSchema || validationRules ? yupResolver(generatedSchema()) : undefined,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    criteriaMode: 'all',
  });

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: T, e?: React.BaseSyntheticEvent) => {
      try {
        const result = await onSubmit(data);
        onSuccess?.(data);
        return result;
      } catch (error) {
        onError?.(methods.formState.errors, error);
        throw error;
      }
    },
    [onSubmit, onError, onSuccess, methods.formState.errors]
  );

  // Reset form when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      methods.reset(defaultValues as any);
    }
  }, [defaultValues, methods]);

  return {
    ...methods,
    handleSubmit: methods.handleSubmit(handleSubmit),
  };
}

// Re-export commonly used types and utilities
export type { FieldError, UseFormReturn, UseFormProps, FieldValues } from 'react-hook-form';
export { yup } from 'yup';
