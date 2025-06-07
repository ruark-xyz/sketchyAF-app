import React from 'react';
import { motion } from 'framer-motion';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  subtitle, 
  children, 
  className = '' 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`text-center mb-12 md:mb-16 ${className}`}
    >
      <h1 className="font-heading font-bold text-3xl md:text-5xl text-dark mb-4 transform rotate-[-1deg]">
        {title}
      </h1>
      {subtitle && (
        <p className="text-medium-gray text-lg max-w-2xl mx-auto font-body">
          {subtitle}
        </p>
      )}
      {children}
    </motion.div>
  );
};

export default PageHeader;