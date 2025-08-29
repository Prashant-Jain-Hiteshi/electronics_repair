// Common validation patterns
export const patterns = {
  name: /^[a-zA-Z\s'-]{2,50}$/, // Letters, spaces, hyphens, apostrophes, 2-50 chars
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\d{10}$/, // 10 digits
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, // Min 8 chars, 1 upper, 1 lower, 1 number, 1 special char
  numeric: /^\d+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  url: /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  pincode: /^[1-9][0-9]{5}$/,
  gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  aadhaar: /^[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}$/,
};

// Common validation error messages
export const messages = {
  required: 'This field is required',
  invalid: (field: string) => `Please enter a valid ${field}`,
  minLength: (length: number) => `Must be at least ${length} characters`,
  maxLength: (length: number) => `Cannot exceed ${length} characters`,
  exactLength: (length: number) => `Must be exactly ${length} characters`,
  password: 'Must be at least 8 characters with uppercase, lowercase, number, and special character',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid 10-digit phone number',
  name: 'Only letters, spaces, hyphens, and apostrophes are allowed',
  number: 'Must be a valid number',
  min: (min: number) => `Must be at least ${min}`,
  max: (max: number) `Cannot be more than ${max}`,
  url: 'Please enter a valid URL',
  date: 'Please enter a valid date (YYYY-MM-DD)',
  time: 'Please enter a valid time (HH:MM)',
  pincode: 'Please enter a valid 6-digit pincode',
  gstin: 'Please enter a valid GSTIN',
  pan: 'Please enter a valid PAN',
  aadhaar: 'Please enter a valid Aadhaar number',
};

// Validation functions
export const validators = {
  required: (value: string) => (value ? null : messages.required),
  minLength: (length: number) => (value: string) =>
    value.length >= length ? null : messages.minLength(length),
  maxLength: (length: number) => (value: string) =>
    value.length <= length ? null : messages.maxLength(length),
  exactLength: (length: number) => (value: string) =>
    value.length === length ? null : messages.exactLength(length),
  pattern: (pattern: RegExp, error: string) => (value: string) =>
    pattern.test(value) ? null : error,
  email: (value: string) =>
    patterns.email.test(value) ? null : messages.email,
  phone: (value: string) =>
    patterns.phone.test(value) ? null : messages.phone,
  password: (value: string) =>
    patterns.password.test(value) ? null : messages.password,
  name: (value: string) =>
    patterns.name.test(value) ? null : messages.name,
  number: (value: string) =>
    patterns.numeric.test(value) ? null : messages.number,
  url: (value: string) =>
    patterns.url.test(value) ? null : messages.url,
  date: (value: string) =>
    patterns.date.test(value) ? null : messages.date,
  time: (value: string) =>
    patterns.time.test(value) ? null : messages.time,
  pincode: (value: string) =>
    patterns.pincode.test(value) ? null : messages.pincode,
  gstin: (value: string) =>
    patterns.gstin.test(value) ? null : messages.gstin,
  pan: (value: string) =>
    patterns.pan.test(value) ? null : messages.pan,
  aadhaar: (value: string) =>
    patterns.aadhaar.test(value) ? null : messages.aadhaar,
};

// Helper function to validate a field against multiple validators
export const validateField = (value: string, validations: Array<(value: string) => string | null>) => {
  for (const validate of validations) {
    const error = validate(value);
    if (error) return error;
  }
  return null;
};

// Common field validations
export const fieldValidations = {
  firstName: [
    validators.required,
    validators.minLength(2),
    validators.maxLength(50),
    validators.name,
  ],
  lastName: [
    validators.required,
    validators.minLength(1),
    validators.maxLength(50),
    validators.name,
  ],
  email: [
    validators.required,
    validators.email,
  ],
  phone: [
    validators.required,
    validators.phone,
  ],
  password: [
    validators.required,
    validators.password,
  ],
  address: [
    validators.required,
    validators.minLength(10),
    validators.maxLength(200),
  ],
  pincode: [
    validators.required,
    validators.pincode,
  ],
  city: [
    validators.required,
    validators.minLength(2),
    validators.maxLength(50),
  ],
  state: [
    validators.required,
    validators.minLength(2),
    validators.maxLength(50),
  ],
  country: [
    validators.required,
    validators.minLength(2),
    validators.maxLength(50),
  ],
  gstin: [
    validators.gstin,
  ],
  pan: [
    validators.pan,
  ],
  aadhaar: [
    validators.aadhaar,
  ],
  date: [
    validators.required,
    validators.date,
  ],
  time: [
    validators.required,
    validators.time,
  ],
  url: [
    validators.url,
  ],
  number: [
    validators.required,
    validators.number,
  ],
};

// Helper function to validate a form
export const validateForm = (formData: Record<string, string>, fields: Record<string, Array<(value: string) => string | null>>) => {
  const errors: Record<string, string | null> = {};
  let isValid = true;

  Object.entries(fields).forEach(([field, validations]) => {
    const value = formData[field] || '';
    const error = validateField(value, validations);
    if (error) {
      errors[field] = error;
      isValid = false;
    } else {
      errors[field] = null;
    }
  });

  return { isValid, errors };
};

// Hook for form validation
export const useFormValidation = (initialState: Record<string, string>) => {
  const [formData, setFormData] = React.useState(initialState);
  const [errors, setErrors] = React.useState<Record<string, string | null>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
  };

  const validateField = (name: string, validations: Array<(value: string) => string | null>) => {
    const error = validateField(formData[name] || '', validations);
    setErrors(prev => ({
      ...prev,
      [name]: error,
    }));
    return error === null;
  };

  const validateForm = (fields: Record<string, Array<(value: string) => string | null>>) => {
    const { isValid, errors: newErrors } = validateForm(formData, fields);
    setErrors(newErrors);
    return isValid;
  };

  return {
    formData,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateField,
    validateForm,
    setFormData,
    setErrors,
    setTouched,
  };
};
