import React from 'react';
import Input from '../ui/Input';

interface FormFieldProps {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  error?: string;
  icon?: React.ReactNode;
  required?: boolean;
  className?: string;
  [key: string]: any; // For other input props
}

const FormField: React.FC<FormFieldProps> = ({ 
  name,
  label,
  type = 'text',
  placeholder,
  error,
  icon,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className={`relative ${className}`}>
      <Input
        name={name}
        label={label}
        type={type}
        placeholder={placeholder}
        error={error}
        required={required}
        className={icon ? 'pr-12' : ''}
        {...props}
      />
      {icon && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-medium-gray">
          {icon}
        </div>
      )}
    </div>
  );
};

export default FormField;