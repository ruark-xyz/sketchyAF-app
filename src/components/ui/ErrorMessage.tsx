import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  onRetry, 
  className = '' 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-red/10 border border-red text-red rounded-lg p-6 text-center ${className}`}
    >
      <div className="flex flex-col items-center space-y-4">
        <AlertCircle size={48} className="text-red" />
        <div>
          <h3 className="font-heading font-bold text-lg mb-2">Oops! Something went wrong</h3>
          <p className="text-sm">{message}</p>
        </div>
        {onRetry && (
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={onRetry}
            className="flex items-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default ErrorMessage;