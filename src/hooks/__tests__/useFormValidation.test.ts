import { renderHook, act } from '@testing-library/react';
import { useFormValidation, commonValidations } from '../useFormValidation';

describe('useFormValidation Hook', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: '', password: '' })
    );

    expect(result.current.values).toEqual({ email: '', password: '' });
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
    expect(result.current.isValid).toBe(true);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('should set field value and validate', () => {
    const { result } = renderHook(() =>
      useFormValidation(
        { email: '' },
        { email: commonValidations.email }
      )
    );

    act(() => {
      result.current.setValue('email', 'invalid-email');
    });

    expect(result.current.values.email).toBe('invalid-email');
    expect(result.current.errors.email).toBe('Please enter a valid email address');
    expect(result.current.touched.email).toBe(true);
  });

  it('should validate email correctly', () => {
    const { result } = renderHook(() =>
      useFormValidation(
        { email: '' },
        { email: commonValidations.email }
      )
    );

    // Test invalid email
    act(() => {
      result.current.setValue('email', 'invalid-email');
    });
    expect(result.current.errors.email).toBe('Please enter a valid email address');

    // Test valid email
    act(() => {
      result.current.setValue('email', 'test@example.com');
    });
    expect(result.current.errors.email).toBe('');
  });

  it('should validate required fields', () => {
    const { result } = renderHook(() =>
      useFormValidation(
        { password: '' },
        { password: commonValidations.password }
      )
    );

    act(() => {
      result.current.setValue('password', '');
    });
    expect(result.current.errors.password).toBe('Password is required');

    act(() => {
      result.current.setValue('password', 'short');
    });
    expect(result.current.errors.password).toBe('Password must be at least 8 characters');

    act(() => {
      result.current.setValue('password', 'validpassword123');
    });
    expect(result.current.errors.password).toBe('');
  });

  it('should validate form correctly', () => {
    const { result } = renderHook(() =>
      useFormValidation(
        { email: '', password: '' },
        { 
          email: commonValidations.email,
          password: commonValidations.password 
        }
      )
    );

    // Test invalid form
    act(() => {
      result.current.setValue('email', 'invalid');
      result.current.setValue('password', 'short');
    });

    let isValid: boolean;
    act(() => {
      isValid = result.current.validateForm();
    });
    expect(isValid).toBe(false);

    // Test valid form
    act(() => {
      result.current.setValue('email', 'test@example.com');
      result.current.setValue('password', 'validpassword123');
    });

    act(() => {
      isValid = result.current.validateForm();
    });
    expect(isValid).toBe(true);
  });

  it('should reset form correctly', () => {
    const initialValues = { email: 'test@example.com', password: 'password123' };
    const { result } = renderHook(() =>
      useFormValidation(initialValues)
    );

    act(() => {
      result.current.setValue('email', 'changed@example.com');
      result.current.setError('email', 'Test error');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.errors).toEqual({});
    expect(result.current.touched).toEqual({});
  });
});</parameter>