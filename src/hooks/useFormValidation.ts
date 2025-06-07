import { useState, useCallback } from 'react';

// Validation rule types
export type ValidationRule = {
  required?: {
    value: boolean;
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
  pattern?: {
    value: RegExp;
    message: string;
  };
  custom?: {
    validate: (value: any) => boolean | string;
    message?: string;
  };
  email?: {
    message: string;
  };
  confirmPassword?: {
    passwordField: string;
    message: string;
  };
};

export type ValidationSchema = Record<string, ValidationRule>;

export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
}

// Email validation regex
const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

// Custom hook for form validation
export function useFormValidation(
  initialValues: Record<string, any> = {},
  validationSchema: ValidationSchema = {}
) {
  const [formState, setFormState] = useState<FormState>({
    values: initialValues,
    errors: {},
    touched: {},
    isValid: true,
    isSubmitting: false,
  });

  // Validate a single field
  const validateField = useCallback((name: string, value: any): string => {
    const rules = validationSchema[name];
    if (!rules) return '';

    // Required validation
    if (rules.required?.value && (!value || value.toString().trim() === '')) {
      return rules.required.message;
    }

    // Skip other validations if field is empty and not required
    if (!value || value.toString().trim() === '') {
      return '';
    }

    // Email validation
    if (rules.email && !EMAIL_REGEX.test(value)) {
      return rules.email.message;
    }

    // Min length validation
    if (rules.minLength && value.toString().length < rules.minLength.value) {
      return rules.minLength.message;
    }

    // Max length validation
    if (rules.maxLength && value.toString().length > rules.maxLength.value) {
      return rules.maxLength.message;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.value.test(value)) {
      return rules.pattern.message;
    }

    // Confirm password validation
    if (rules.confirmPassword) {
      const passwordValue = formState.values[rules.confirmPassword.passwordField];
      if (value !== passwordValue) {
        return rules.confirmPassword.message;
      }
    }

    // Custom validation
    if (rules.custom) {
      const result = rules.custom.validate(value);
      if (typeof result === 'string') {
        return result;
      }
      if (result === false) {
        return rules.custom.message || 'Invalid value';
      }
    }

    return '';
  }, [validationSchema, formState.values]);

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    Object.keys(validationSchema).forEach(fieldName => {
      const error = validateField(fieldName, formState.values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setFormState(prev => ({
      ...prev,
      errors: newErrors,
      isValid,
    }));

    return isValid;
  }, [formState.values, validateField, validationSchema]);

  // Set field value
  const setValue = useCallback((name: string, value: any) => {
    setFormState(prev => {
      const newValues = { ...prev.values, [name]: value };
      const error = validateField(name, value);
      
      return {
        ...prev,
        values: newValues,
        errors: { ...prev.errors, [name]: error },
        touched: { ...prev.touched, [name]: true },
      };
    });
  }, [validateField]);

  // Set multiple values
  const setValues = useCallback((values: Record<string, any>) => {
    setFormState(prev => ({
      ...prev,
      values: { ...prev.values, ...values },
    }));
  }, []);

  // Set field as touched
  const setTouched = useCallback((name: string, touched: boolean = true) => {
    setFormState(prev => ({
      ...prev,
      touched: { ...prev.touched, [name]: touched },
    }));
  }, []);

  // Set error for a field
  const setError = useCallback((name: string, error: string) => {
    setFormState(prev => ({
      ...prev,
      errors: { ...prev.errors, [name]: error },
    }));
  }, []);

  // Clear errors
  const clearErrors = useCallback(() => {
    setFormState(prev => ({
      ...prev,
      errors: {},
    }));
  }, []);

  // Reset form
  const reset = useCallback((newValues?: Record<string, any>) => {
    setFormState({
      values: newValues || initialValues,
      errors: {},
      touched: {},
      isValid: true,
      isSubmitting: false,
    });
  }, [initialValues]);

  // Set submitting state
  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setFormState(prev => ({
      ...prev,
      isSubmitting,
    }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback((onSubmit: (values: Record<string, any>) => Promise<void> | void) => {
    return async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      const isValid = validateForm();
      
      if (!isValid) {
        // Mark all fields as touched to show validation errors
        const allTouched = Object.keys(validationSchema).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {}
        );
        setFormState(prev => ({
          ...prev,
          touched: { ...prev.touched, ...allTouched },
        }));
        return;
      }

      try {
        setSubmitting(true);
        await onSubmit(formState.values);
      } catch (error) {
        console.error('Form submission error:', error);
        // Handle submission error if needed
      } finally {
        setSubmitting(false);
      }
    };
  }, [formState.values, validateForm, validationSchema, setSubmitting]);

  return {
    values: formState.values,
    errors: formState.errors,
    touched: formState.touched,
    isValid: formState.isValid,
    isSubmitting: formState.isSubmitting,
    setValue,
    setValues,
    setTouched,
    setError,
    clearErrors,
    reset,
    setSubmitting,
    validateField,
    validateForm,
    handleSubmit,
  };
}

// Common validation schemas
export const commonValidations = {
  email: {
    required: { value: true, message: 'Email is required' },
    email: { message: 'Please enter a valid email address' },
  },
  password: {
    required: { value: true, message: 'Password is required' },
    minLength: { value: 8, message: 'Password must be at least 8 characters' },
  },
  username: {
    required: { value: true, message: 'Username is required' },
    minLength: { value: 3, message: 'Username must be at least 3 characters' },
    maxLength: { value: 20, message: 'Username must not exceed 20 characters' },
    pattern: { 
      value: /^[a-zA-Z0-9_]+$/, 
      message: 'Username can only contain letters, numbers, and underscores' 
    },
  },
  confirmPassword: {
    required: { value: true, message: 'Please confirm your password' },
    confirmPassword: { 
      passwordField: 'password', 
      message: 'Passwords do not match' 
    },
  },
};</parameter>