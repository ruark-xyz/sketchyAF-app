import React from 'react';

interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
  background?: 'cream' | 'white' | 'off-white' | 'primary' | 'secondary';
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  border?: boolean;
}

const SectionContainer: React.FC<SectionContainerProps> = ({ 
  children, 
  className = '',
  background = 'white',
  padding = 'lg',
  border = false
}) => {
  const backgroundClasses = {
    cream: 'bg-cream',
    white: 'bg-white',
    'off-white': 'bg-off-white',
    primary: 'bg-primary/10',
    secondary: 'bg-secondary/10'
  };

  const paddingClasses = {
    sm: 'py-8',
    md: 'py-12', 
    lg: 'py-16',
    xl: 'py-24'
  };

  const borderClass = border ? 'border-y-2 border-dark' : '';

  return (
    <section className={`${backgroundClasses[background]} ${paddingClasses[padding]} ${borderClass} ${className}`}>
      {children}
    </section>
  );
};

export default SectionContainer;