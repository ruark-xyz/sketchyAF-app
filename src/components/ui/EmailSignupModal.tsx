import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, FormProvider } from 'react-hook-form';
import { X, Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import { supabase } from '../../utils/supabase';

interface EmailSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  email: string;
}

const EmailSignupModal: React.FC<EmailSignupModalProps> = ({ isOpen, onClose }) => {
  const [submissionState, setSubmissionState] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle');

  const methods = useForm<FormData>({
    defaultValues: {
      email: ''
    },
    mode: 'onChange'
  });

  const {
    handleSubmit,
    reset,
    register,
    formState: { errors }
  } = methods;

  // Set up validation rules
  React.useEffect(() => {
    register('email', {
      required: 'We need your email to reach you!',
      pattern: {
        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
        message: "That doesn't look like a real email... 🤔"
      }
    });
  }, [register]);
  
  const onSubmit = async (data: FormData) => {
    setSubmissionState('loading');

    try {
      // Insert new email into waitlist - let database handle duplicates
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert([
          {
            email: data.email.toLowerCase().trim(),
            signed_up_at: new Date().toISOString()
          }
        ]);

      if (insertError) {
        // Handle duplicate email constraint error specifically
        if (insertError.code === '23505') {
          setSubmissionState('duplicate');
          setTimeout(() => {
            setSubmissionState('idle');
          }, 4000);
          return;
        }
        throw new Error(insertError.message || 'Failed to save email. Please try again.');
      }

      setSubmissionState('success');
      reset();

      // Auto-close after success
      setTimeout(() => {
        setSubmissionState('idle');
        onClose();
      }, 3000);

    } catch (error) {
      console.error('Error submitting email to waitlist:', error);
      setSubmissionState('error');

      // Reset error state after 4 seconds
      setTimeout(() => {
        setSubmissionState('idle');
      }, 4000);
    }
  };

  // Close modal on escape key
  React.useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Don't render anything if not open
  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <div id="email-signup-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
          className="relative bg-white rounded-lg border-2 border-dark p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] hand-drawn max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-medium-gray hover:text-dark transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
          
          {submissionState === 'success' ? (
            // Success State
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 300 }}
                className="flex justify-center mb-4"
              >
                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-success" />
                </div>
              </motion.div>
              
              <h2 className="font-heading font-bold text-2xl text-dark mb-3 transform rotate-[-1deg]">
                You're in, sketchlord! 🎨
              </h2>
              
              <p className="text-medium-gray mb-4">
                We'll slide into your inbox the moment we're ready to serve up some sketchy goodness. 
                Prepare for chaos!
              </p>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-medium-gray"
              >
                This window will close automatically...
              </motion.div>
            </motion.div>
          ) : (
            // Form State
            <>
              <div className="text-center mb-6">
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-heading font-bold text-2xl text-dark mb-2 transform rotate-[-1deg]"
                >
                  Easy now. We're still cooking! 👨‍🍳
                </motion.h2>
                
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-medium-gray text-lg"
                >
                  Drop your email below and you'll be the first to know when we go live with all the sketchy goodness!
                </motion.p>
              </div>
              
              {(submissionState === 'error' || submissionState === 'duplicate') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 p-3 bg-error/10 border border-error text-error rounded-md flex items-center text-sm"
                >
                  <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                  <span>
                    {submissionState === 'duplicate'
                      ? "You're already on the list, sketchlord! We'll reach out when it's time to draw! 🎨"
                      : "Oops! Something went sketchy on our end. Please try again!"
                    }
                  </span>
                </motion.div>
              )}
              
              <FormProvider {...methods}>
                <motion.form
                  onSubmit={handleSubmit(onSubmit)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-4"
                >
                  <div className="relative">
                    <Input
                      name="email"
                      type="email"
                      placeholder="your.artistic.email@example.com"
                      aria-label="Email address"
                      className="pr-12 border-2 border-dark hand-drawn text-center"
                      error={errors.email?.message}
                    />
                    <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-medium-gray" size={20} />
                  </div>
                
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={submissionState === 'loading' || submissionState === 'duplicate'}
                >
                  {submissionState === 'loading' ? (
                    <div className="flex items-center justify-center">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="mr-2 h-5 w-5 border-2 border-dark border-t-transparent rounded-full"
                      />
                      <span>Cooking up your spot...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Send size={20} className="mr-2" />
                      <span>Count Me In!</span>
                    </div>
                  )}
                </Button>
                </motion.form>
              </FormProvider>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6 text-center"
              >
                <p className="text-xs text-medium-gray">
                  By signing up, you agree to receive updates about SketchyAF. 
                  We promise not to spam you with boring stuff. 🎭
                </p>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
  
  return createPortal(modalContent, document.body);
};

export default EmailSignupModal;