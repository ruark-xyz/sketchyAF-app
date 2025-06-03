import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  to?: string;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  href,
  to,
  type = 'button',
  onClick,
  className = '',
  disabled = false,
}) => {
  // New hand-drawn style based on mood board
  const baseStyles = 'inline-flex items-center justify-center font-heading font-bold transition-all duration-300 hand-drawn transform rotate-0';
  
  const variantStyles = {
    primary: 'bg-green text-dark border-2 border-dark hover:bg-green/90 active:bg-green/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]',
    secondary: 'bg-secondary text-white border-2 border-dark hover:bg-secondary/90 active:bg-secondary/80 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.9)]',
    tertiary: 'bg-transparent text-primary underline decoration-2 decoration-wavy hover:text-primary/80',
  };
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-lg',
    lg: 'px-8 py-4 text-xl',
  };
  
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1 hover:rotate-1 active:translate-y-0 active:rotate-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.9)]';
  
  const styles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`;

  // Motion props for button animation
  const motionProps = {
    whileHover: disabled ? {} : { y: -4, rotate: 1 },
    whileTap: disabled ? {} : { y: 0, rotate: 0, boxShadow: '2px 2px 0px 0px rgba(0,0,0,0.9)' },
    transition: { type: 'spring', stiffness: 500, damping: 15 }
  };
  
  // Render as external link
  if (href) {
    return (
      <motion.a 
        href={href} 
        className={styles}
        target="_blank"
        rel="noopener noreferrer"
        {...motionProps}
      >
        {children}
      </motion.a>
    );
  }
  
  // Render as router link
  if (to) {
    return (
      <motion.div {...motionProps}>
        <Link to={to} className={styles}>
          {children}
        </Link>
      </motion.div>
    );
  }
  
  // Render as button
  return (
    <motion.button
      type={type}
      className={styles}
      onClick={onClick}
      disabled={disabled}
      {...motionProps}
    >
      {children}
    </motion.button>
  );
};

export default Button;