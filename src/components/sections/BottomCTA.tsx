import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Mail, X, CheckCircle } from 'lucide-react';

interface BottomCTAProps {
  heading: string;
  subheading?: string;
  buttonText: string;
  buttonLink: string;
  isExternalLink?: boolean;
}

interface EmailFormData {
  email: string;
}

const BottomCTA: React.FC<BottomCTAProps> = ({
  heading,
  subheading,
  buttonText,
  buttonLink,
  isExternalLink = false,
}) => {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors } 
  } = useForm<EmailFormData>();
  
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
      setSubmitStatus('loading');
      
      // For development, we'll simulate API call and store in localStorage
      console.log('Email submitted:', data.email);
      localStorage.setItem('subscribedEmail', data.email);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSubmitStatus('success');
      reset();
      
      // Reset success message after 5 seconds and close the form
      setTimeout(() => {
        if (setSubmitStatus) {  // Check if component is still mounted
          setSubmitStatus('idle');
          setShowEmailForm(false);
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error submitting email:', error);
      setSubmitStatus('error');
    }
  };

  const handleButtonClick = () => {
    if (buttonLink === "#email-signup") {
      toggleEmailForm();
    }
  };

  return (
    <section className="bg-secondary py-16 md:py-24 border-y-2 border-dark">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-white border-2 border-dark p-8 hand-drawn shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
        >
          <h2 className="font-heading font-bold text-3xl md:text-4xl text-dark mb-4 transform rotate-[-1deg]">
            {heading}
          </h2>
          
          {subheading && (
            <p className="text-dark text-xl font-body max-w-3xl mx-auto mb-8">
              {subheading}
            </p>
          )}
          
          {isExternalLink ? (
            <Button 
              variant="primary" 
              size="lg" 
              href={buttonLink}
            >
              {buttonText}
            </Button>
          ) : (
            <Button 
              variant="primary" 
              size="lg" 
              to={buttonLink === "#email-signup" ? "#" : buttonLink}
              onClick={buttonLink === "#email-signup" ? handleButtonClick : undefined}
            >
              {buttonText}
            </Button>
          )}
          
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
                        You're in, doodle-master!
                      </h3>
                      <p className="text-dark mb-4 font-body">
                        We'll ping your inbox as soon as we're ready to unveil our masterpiece.
                      </p>
                      <Button variant="tertiary" size="sm" onClick={closeEmailForm}>
                        Awesome, thanks!
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    className="border-2 border-dark p-6 rounded-lg mx-auto max-w-md bg-orange/20 hand-drawn"
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
                      Easy now, sketch-fan!
                    </h3>
                    <p className="text-dark mb-4 font-body">
                      We're still polishing our pencils. Drop your email below and we'll let you know when we're ready to doodle!
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
                          disabled={submitStatus === 'loading'}
                        >
                          {submitStatus === 'idle' ? "Notify Me!" : 
                           submitStatus === 'loading' ? "Sending..." :
                           submitStatus === 'error' ? "Try Again" : "Sending..."}
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
      </div>
    </section>
  );
};

export default BottomCTA;
