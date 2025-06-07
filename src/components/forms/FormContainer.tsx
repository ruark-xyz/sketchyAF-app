import React from 'react';
import ContentCard from '../ui/ContentCard';

interface FormContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

const FormContainer: React.FC<FormContainerProps> = ({ 
  children, 
  title, 
  subtitle,
  className = ''
}) => {
  return (
    <ContentCard 
      className={`max-w-md mx-auto ${className}`}
      padding="lg"
      shadow="lg"
    >
      {(title || subtitle) && (
        <div className="mb-6 text-center">
          {title && (
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-dark mb-2">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-medium-gray font-body">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      {children}
    </ContentCard>
  );
};

export default FormContainer;