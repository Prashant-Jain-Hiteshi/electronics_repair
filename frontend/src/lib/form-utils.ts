import * as yup from 'yup';
import { messages } from '@/utils/validators';

/**
 * Creates a Yup validation schema for a form field based on the given configuration
 */
export function createFieldSchema(config: {
  type?: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required?: boolean | string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  matches?: {
    regex: RegExp;
    message: string;
  };
  oneOf?: {
    values: any[];
    message: string;
  };
  email?: boolean;
  url?: boolean;
  uuid?: boolean;
  phone?: boolean;
  custom?: (schema: yup.AnySchema) => yup.AnySchema;
} = {}) {
  const {
    type = 'string',
    required,
    min,
    max,
    minLength,
    maxLength,
    matches,
    oneOf,
    email = false,
    url = false,
    uuid = false,
    phone = false,
    custom,
  } = config;

  let schema: yup.AnySchema;

  // Initialize schema based on type
  switch (type) {
    case 'number':
      schema = yup.number().typeError(messages.number);
      break;
    case 'boolean':
      schema = yup.boolean();
      break;
    case 'date':
      schema = yup.date().typeError(messages.date);
      break;
    case 'array':
      schema = yup.array();
      break;
    case 'object':
      schema = yup.object();
      break;
    case 'string':
    default:
      schema = yup.string().trim();
  }

  // Apply validations based on configuration
  if (required) {
    const message = typeof required === 'string' ? required : messages.required;
    schema = schema.required(message);
  }

  if (min !== undefined) {
    schema = schema.min(min, messages.min(min));
  }

  if (max !== undefined) {
    schema = schema.max(max, messages.max(max));
  }

  if (minLength !== undefined) {
    schema = schema.min(minLength, messages.minLength(minLength));
  }

  if (maxLength !== undefined) {
    schema = schema.max(maxLength, messages.maxLength(maxLength));
  }

  if (matches) {
    schema = schema.matches(matches.regex, matches.message);
  }

  if (oneOf) {
    schema = schema.oneOf(oneOf.values, oneOf.message);
  }

  if (email) {
    schema = schema.email(messages.email);
  }

  if (url) {
    schema = schema.url(messages.url);
  }

  if (uuid) {
    schema = schema.uuid('Must be a valid UUID');
  }

  if (phone) {
    schema = schema.matches(/^\d{10}$/, messages.phone);
  }

  // Apply custom validation if provided
  if (custom) {
    schema = custom(schema);
  }

  return schema;
}

/**
 * Creates a Yup validation schema for a form
 */
export function createFormSchema<T extends Record<string, any>>(fields: {
  [K in keyof T]: ReturnType<typeof createFieldSchema>;
}) {
  return yup.object().shape(fields as any);
}

/**
 * Helper to format form errors from Yup validation
 */
export function formatYupErrors(error: yup.ValidationError) {
  const errors: Record<string, string> = {};
  
  if (error.inner) {
    error.inner.forEach((err) => {
      if (err.path) {
        errors[err.path] = err.message;
      }
    });
  } else if (error.path) {
    errors[error.path] = error.message;
  }
  
  return errors;
}

/**
 * Helper to format form data before submission
 */
export function formatFormData<T extends Record<string, any>>(
  data: T,
  formatters: {
    [K in keyof T]?: (value: T[K]) => any;
  } = {}
) {
  const formattedData = { ...data };
  
  Object.entries(formatters).forEach(([key, formatter]) => {
    if (key in formattedData && formatter) {
      formattedData[key as keyof T] = formatter(formattedData[key as keyof T]);
    }
  });
  
  return formattedData;
}

/**
 * Helper to set form field values from an object
 */
export function setFormValues<T extends Record<string, any>>(
  setValue: (name: string, value: any) => void,
  values: T,
  formatters: {
    [K in keyof T]?: (value: T[K]) => any;
  } = {}
) {
  Object.entries(values).forEach(([key, value]) => {
    const formatter = formatters[key as keyof T];
    const formattedValue = formatter ? formatter(value as any) : value;
    setValue(key, formattedValue);
  });
}

/**
 * Helper to get form field values as an object
 */
export function getFormValues<T extends Record<string, any>>(
  getValues: () => T,
  fields: (keyof T)[]
): Partial<T> {
  const values = getValues();
  const result: Partial<T> = {};
  
  fields.forEach((field) => {
    result[field] = values[field];
  });
  
  return result;
}

/**
 * Helper to check if a form is valid
 */
export async function isFormValid<T>(
  schema: yup.ObjectSchema<any>,
  values: T
): Promise<{ isValid: boolean; errors: Record<string, string> }> {
  try {
    await schema.validate(values, { abortEarly: false });
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return {
        isValid: false,
        errors: formatYupErrors(error),
      };
    }
    return { isValid: false, errors: { _: 'Validation failed' } };
  }
}
