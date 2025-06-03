import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { BoosterPack } from '../../types';
import Button from './Button';

interface PackPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pack: BoosterPack | null;
}

const PackPreviewModal: React.FC<PackPreviewModalProps> = ({ isOpen, onClose, pack }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Close on escape key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);
  
  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);
  
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Don't render anything if there's no pack
  if (!pack) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black bg-opacity-70">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-auto"
            ref={modalRef}
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-medium-gray hover:text-dark transition-colors z-10"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
            
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
                <div className="w-full md:w-1/3 h-48 rounded-lg overflow-hidden">
                  <img 
                    src={pack.image} 
                    alt={pack.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="w-full md:w-2/3">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="font-heading font-bold text-2xl">{pack.name}</h2>
                    <span className={`px-4 py-1 text-sm font-semibold rounded-full ${
                      pack.type === 'premium' ? 'bg-primary text-white' : 
                      pack.type === 'paid' ? 'bg-secondary text-white' : 
                      'bg-success text-white'
                    }`}>
                      {pack.price}
                    </span>
                  </div>
                  
                  <p className="text-medium-gray mb-4">{pack.description}</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-heading font-semibold text-xl mb-4">Includes:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {pack.items.map((item, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-off-white rounded-md p-4 text-center"
                    >
                      <p className="font-medium">{item}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              <div className="mt-8 text-center">
                {pack.type === 'premium' ? (
                  <Button variant="primary" to="/premium">
                    Become Premium AF
                  </Button>
                ) : pack.type === 'paid' ? (
                  <Button variant="primary" href="#">
                    Buy for {pack.price}
                  </Button>
                ) : (
                  <Button variant="primary" href="#">
                    Add to My Collection
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
  
  return createPortal(modalContent, document.body);
};

export default PackPreviewModal;