import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { ChevronDown, Mail, Check, AlertCircle, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface HeroSectionProps {
  scrollToRef?: React.RefObject<HTMLElement>;
}

interface FormData {
  email: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({ scrollToRef }) => {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [submissionState, setSubmissionState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors } 
  } = useForm<FormData>();
  
  const scrollToContent = () => {
    if (scrollToRef && scrollToRef.current) {
      scrollToRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  const onSubmit = async (data: FormData) => {
    setSubmissionState('loading');
    
    try {
      // For development, we'll simulate API call and store in localStorage
      console.log('Email submitted:', data.email);
      localStorage.setItem('subscribedEmail', data.email);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSubmissionState('success');
      reset();
      
      // Reset form after 5 seconds
      setTimeout(() => {
        if (setSubmissionState) {
          setSubmissionState('idle');
          setShowEmailForm(false);
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error submitting email:', error);
      setSubmissionState('error');
    }
  };

  return (
    <section className="relative bg-cream min-h-[90vh] flex items-center">
      {/* Background grid pattern is handled by global CSS */}
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="absolute top-20 right-10 w-32 h-32 bg-turquoise border-2 border-dark rounded-xl transform rotate-12"
        ></motion.div>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="absolute bottom-20 left-10 w-40 h-40 bg-pink border-2 border-dark rounded-full"
        ></motion.div>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="absolute top-1/3 left-1/4 w-24 h-24 bg-orange border-2 border-dark rounded-xl transform -rotate-6"
        ></motion.div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white border-2 border-dark p-8 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.9)] max-w-4xl mx-auto"
        >
          <motion.h1 
            className="font-heading font-bold text-4xl sm:text-5xl md:text-6xl text-dark max-w-3xl mx-auto leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="text-secondary transform inline-block rotate-[-1deg]">DRAW</span> <span className="text-red transform inline-block rotate-[1deg]">FAST.</span> <br/>
            <span className="text-green transform inline-block rotate-[-2deg]">VOTE</span> <span className="text-accent transform inline-block rotate-[2deg]">FASTER.</span>
          </motion.h1>
          
          <motion.p
            className="mt-6 text-xl md:text-2xl text-dark max-w-2xl mx-auto font-body"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            The weird, wildly entertaining drawing game perfect for killing time anywhere. 
            Join 60-second rounds of frantic drawing and fun!
          </motion.p>
          
          <motion.div
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          >
            {/* Conditional rendering based on email form visibility */}
            {!showEmailForm ? (
              <>
                <Button 
                  variant="primary" 
                  size="lg" 
                  onClick={() => setShowEmailForm(true)}
                >
                  Join a Game
                </Button>
                <Button variant="secondary" size="lg" to="/leaderboard">
                  View Leaderboard
                </Button>
              </>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  {submissionState === 'success' ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className="bg-success/10 p-6 rounded-lg flex flex-col items-center border-2 border-success hand-drawn"
                    >
                      <Check size={48} className="text-success mb-2" />
                      <h3 className="font-heading font-bold text-xl transform rotate-[-2deg]">You're in, sketchlord!</h3>
                      <p className="mt-2 font-body">We'll slide into your inbox when we're ready to rumble.</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      layout
                      className="p-6 bg-green/10 rounded-lg border-2 border-green hand-drawn"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-heading font-bold text-xl transform rotate-[-2deg]">Easy now. We're still cooking.</h3>
                        <button 
                          onClick={() => setShowEmailForm(false)}
                          className="text-medium-gray hover:text-dark transition-colors"
                          aria-label="Close form"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <p className="font-body text-lg mb-4">Drop your email below and we'll let you know when we're ready to serve up some sketchy goodness!</p>
                      
                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="relative">
                          <Input
                            name="email"
                            type="email"
                            placeholder="your.artistic.email@example.com"
                            aria-label="Email address"
                            className="pr-10 border-2 border-dark hand-drawn"
                            error={errors.email?.message}
                            {...register('email', { 
                              required: 'Email is required',
                              pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: "That doesn't look like a real email..."
                              }
                            })}
                          />
                          <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark" size={20} />
                        </div>
                        
                        <div className="flex gap-3 justify-center">
                          <Button
                            type="submit"
                            variant="primary"
                            disabled={submissionState === 'loading'}
                          >
                            {submissionState === 'loading' ? (
                              <span className="flex items-center">
                                <motion.div 
                                  animate={{ rotate: 360 }}
                                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                  className="mr-2 h-5 w-5 border-2 border-dark border-t-transparent rounded-full"
                                />
                                Sending...
                              </span>
                            ) : (
                              "Notify Me!"
                            )}
                          </Button>
                          
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setShowEmailForm(false)}
                          >
                            No Thanks
                          </Button>
                        </div>
                        
                        {submissionState === 'error' && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 text-error flex items-center justify-center font-body"
                          >
                            <AlertCircle size={18} className="mr-2" />
                            <span>Oops! Something went wrong. Please try again.</span>
                          </motion.div>
                        )}
                        
                        <p className="text-xs text-medium-gray text-center">
                          By submitting your email, you agree to receive updates about SketchyAF. 
                          We promise not to spam you with boring stuff.
                        </p>
                      </form>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        </motion.div>
        
        <motion.div
          className="absolute bottom-8 left-0 right-0 flex justify-center cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          onClick={scrollToContent}
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <ChevronDown size={36} className="text-dark" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;