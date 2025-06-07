import React from 'react';
import { motion } from 'framer-motion';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  centered?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ 
  title, 
  subtitle, 
  icon,
  centered = true,
  className = '',
  children
}) => {
  const alignmentClass = centered ? 'text-center' : 'text-left';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      className={`mb-8 md:mb-12 ${alignmentClass} ${className}`}
    >
      {icon && (
        <div className={`mb-4 ${centered ? 'flex justify-center' : ''}`}>
          {icon}
        </div>
      )}
      
      <h2 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-4 transform rotate-[-1deg]">
        {title}
      </h2>
      
      {subtitle && (
        <p className={`text-medium-gray text-lg font-body ${centered ? 'max-w-2xl mx-auto' : 'max-w-2xl'}`}>
          {subtitle}
        </p>
      )}
      
      {children}
    </motion.div>
  );
};

export default SectionHeader;