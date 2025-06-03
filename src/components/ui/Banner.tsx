import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface BannerProps {
  isDismissible?: boolean;
  onDismiss?: () => void;
  children: React.ReactNode;
}

const Banner: React.FC<BannerProps> = ({ 
  children, 
  isDismissible = true,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Check local storage on mount
  useEffect(() => {
    const isBannerDismissed = localStorage.getItem('bannerDismissed') === 'true';
    if (isBannerDismissed) {
      setIsVisible(false);
    }
  }, []);

  const dismissBanner = () => {
    setIsVisible(false);
    localStorage.setItem('bannerDismissed', 'true');
    
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-accent text-dark border-b-2 border-dark shadow-md"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="w-0 flex-1 flex items-center justify-center md:justify-start">
            <p className="font-heading font-bold text-center md:text-left transform rotate-[-1deg]">
              {children}
            </p>
          </div>
          {isDismissible && (
            <div className="flex-shrink-0 ml-2">
              <button
                onClick={dismissBanner}
                className="p-1 rounded-full hover:bg-yellow-400 focus:outline-none border-2 border-dark"
                aria-label="Dismiss banner"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Banner;