import React from 'react';
import { useFormContext } from 'react-hook-form';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

const Input: React.FC<InputProps> = ({ 
  name, 
  label, 
  error, 
  wrapperClassName = '',
  className = '',
  ...props 
}) => {
  // Check if within a form context
  const formContext = useFormContext();
  const isInForm = formContext && name;

  // Combine dynamic and passed-in classes
  const inputClasses = `w-full px-4 py-3 rounded-md transition-colors duration-200 bg-white focus:ring-2 focus:ring-primary focus:border-primary font-body ${
    error ? 'border-red bg-red-50' : 'border-dark'
  } ${className}`;

  return (
    <div className={`w-full ${wrapperClassName}`}>
      {label && (
        <label htmlFor={name} className="block mb-1 font-heading font-bold text-dark">
          {label}
        </label>
      )}
      
      {isInForm ? (
        <input
          id={name}
          {...formContext.register(name)}
          className={inputClasses}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        />
      ) : (
        <input
          id={name}
          name={name}
          className={inputClasses}
          aria-invalid={error ? 'true' : 'false'}
          {...props}
        />
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red font-body">{error}</p>
      )}
    </div>
  );
};

export default Input;