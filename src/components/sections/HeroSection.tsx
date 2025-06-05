import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { ChevronDown, Mail, X, CheckCircle } from 'lucide-react';

interface HeroSectionProps {
  scrollToRef?: React.RefObject<HTMLElement>;
}

interface EmailFormData {
  email: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({ scrollToRef }) => {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors } 
  } = useForm<EmailFormData>();
  
  const scrollToContent = () => {
    if (scrollToRef && scrollToRef.current) {
      scrollToRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  const toggleEmailForm = () => {
    setShowEmailForm(true);
    // Reset form state when opening
    setSubmitStatus('idle');
  };
  
  const closeEmailForm = () => {
    setShowEmailForm(false);
    setSubmitStatus('idle');
    reset();
  };
  
  const onSubmit = async (data: EmailFormData) => {
    try {
      // For development, we'll simulate API call and store in localStorage
      console.log('Email submitted:', data.email);
      localStorage.setItem('subscribedEmail', data.email);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSubmitStatus('success');
      reset();
      
      // Reset success message after 5 seconds and close the form
      setTimeout(() => {
        setSubmitStatus('idle');
        setShowEmailForm(false);
      }, 5000);
    } catch (error) {
      console.error('Error submitting email:', error);
      setSubmitStatus('error');
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
            <Button 
              variant="primary" 
              size="lg" 
              onClick={toggleEmailForm}
            >
              Join a Game
            </Button>
            <Button variant="secondary" size="lg" to="/leaderboard">
              View Leaderboard
            </Button>
          </motion.div>
          
          {/* Email Signup Form */}
          <AnimatePresence>
            {showEmailForm && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mt-8"
              >
                {submitStatus === 'success' ? (
                  <motion.div 
                    className="bg-green/20 border-2 border-green p-6 rounded-lg mx-auto max-w-md hand-drawn"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex flex-col items-center">
                      <CheckCircle className="text-green h-12 w-12 mb-3" />
                      <h3 className="font-heading font-bold text-xl text-dark mb-2 transform rotate-[-2deg]">
                        You're in, sketchlord!
                      </h3>
                      <p className="text-dark mb-4 font-body">
                        We'll slide into your inbox when we launch. Prepare your drawing fingers.
                      </p>
                      <Button variant="tertiary" size="sm" onClick={closeEmailForm}>
                        Sweet, thanks!
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    className="border-2 border-dark p-6 rounded-lg mx-auto max-w-md bg-pink/20 hand-drawn"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <div className="flex justify-end">
                      <button 
                        onClick={closeEmailForm} 
                        className="text-dark hover:text-primary transition-colors"
                        aria-label="Close form"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    <h3 className="font-heading font-bold text-xl text-dark mb-2 transform rotate-[-2deg]">
                      Whoa there, eager beaver!
                    </h3>
                    <p className="text-dark mb-4 font-body">
                      We're still cooking up this masterpiece. Drop your email below and we'll let you know the second it's ready!
                    </p>
                    
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                      <div className="relative">
                        <Input
                          type="email"
                          name="email"
                          placeholder="your.sketchy@email.com"
                          error={errors.email?.message}
                          {...register('email', { 
                            required: 'Email is required',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: "That doesn't look like a real email..."
                            }
                          })}
                        />
                        <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-gray" size={20} />
                      </div>
                      
                      <div className="flex flex-wrap gap-3">
                        <Button 
                          type="submit" 
                          variant="primary" 
                          className="w-full sm:w-auto flex-grow"
                        >
                          {submitStatus === 'idle' ? "Notify Me!" : submitStatus === 'error' ? "Try Again" : "Sending..."}
                        </Button>
                        
                        <Button 
                          type="button"
                          variant="secondary" 
                          onClick={closeEmailForm}
                          className="w-full sm:w-auto"
                        >
                          Nah, I'll Wait
                        </Button>
                      </div>
                      
                      {submitStatus === 'error' && (
                        <p className="text-red text-sm text-center">
                          Oops! Something went wrong. Please try again.
                        </p>
                      )}
                      
                      <p className="text-xs text-center text-dark-gray">
                        We promise not to spam. Just a friendly heads-up when we launch!
                      </p>
                    </form>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
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