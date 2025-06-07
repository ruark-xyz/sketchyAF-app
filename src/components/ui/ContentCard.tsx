import React from 'react';
import { motion } from 'framer-motion';

interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  border?: boolean;
  shadow?: 'sm' | 'md' | 'lg';
  background?: 'white' | 'off-white' | 'cream';
}

const ContentCard: React.FC<ContentCardProps> = ({ 
  children, 
  className = '',
  hover = false,
  padding = 'md',
  border = true,
  shadow = 'md',
  background = 'white'
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  };

  const backgroundClasses = {
    white: 'bg-white',
    'off-white': 'bg-off-white',
    cream: 'bg-cream'
  };

  const borderClass = border ? 'border-2 border-dark hand-drawn' : '';
  const hoverClass = hover ? 'hover:shadow-lg transition-shadow duration-300' : '';

  const cardClasses = `
    ${backgroundClasses[background]} 
    ${paddingClasses[padding]} 
    ${shadowClasses[shadow]} 
    ${borderClass} 
    ${hoverClass}
    rounded-lg overflow-hidden 
    ${className}
  `.trim();

  if (hover) {
    return (
      <motion.div
        className={cardClasses}
        whileHover={{ y: -5 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={cardClasses}>
      {children}
    </div>
  );
};

export default ContentCard;