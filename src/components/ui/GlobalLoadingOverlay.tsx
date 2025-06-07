import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import { useGlobalState } from '../../context/GlobalStateContext';

const GlobalLoadingOverlay: React.FC = () => {
  const { state } = useGlobalState();

  return (
    <AnimatePresence>
      {state.isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white p-8 rounded-lg border-2 border-dark hand-drawn shadow-xl text-center"
          >
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="font-heading font-semibold text-lg text-dark">
              {state.loadingMessage || 'Loading...'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GlobalLoadingOverlay;