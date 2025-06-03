import React, { useState, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Mail, Check, AlertCircle } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface FormData {
  email: string;
}

const EmailSignup = forwardRef<HTMLElement>((props, ref) => {
  const [submissionState, setSubmissionState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const { 
    register, 
    handleSubmit, 
    reset,
    formState: { errors } 
  } = useForm<FormData>();
  
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
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        if (setSubmissionState) {
          setSubmissionState('idle');
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error submitting email:', error);
      setSubmissionState('error');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.2 
      } 
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const formVariants = {
    success: { scale: 0.98, opacity: 0 },
    visible: { scale: 1, opacity: 1 }
  };

  const successVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1 }
  };

  return (
    <section id="email-signup" ref={ref} className="py-16 bg-pink text-dark border-y-2 border-dark">
      <motion.div 
        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.h2 
          className="font-heading font-bold text-3xl md:text-4xl text-dark transform rotate-[-1deg]"
          variants={itemVariants}
        >
          Get Notified When We Launch
        </motion.h2>
        
        <motion.p 
          className="mt-4 text-dark text-xl font-body"
          variants={itemVariants}
        >
          Be the first to know when SketchyAF is ready for your terrible drawing skills.
        </motion.p>
        
        <motion.div 
          className="mt-8 max-w-md mx-auto"
          variants={itemVariants}
        >
          {submissionState === 'success' ? (
            <motion.div 
              className="bg-white text-dark rounded-lg p-6 flex flex-col items-center border-2 border-dark hand-drawn shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
              variants={successVariants}
              initial="hidden"
              animate="visible"
            >
              <Check size={48} className="mb-2" />
              <h3 className="font-heading font-bold text-xl transform rotate-[-2deg]">You're in, sketchlord!</h3>
              <p className="mt-2 font-body">We'll slide into your inbox when we launch.</p>
            </motion.div>
          ) : (
            <motion.form 
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col sm:flex-row gap-3"
              variants={formVariants}
              animate={submissionState === 'success' ? 'success' : 'visible'}
            >
              <div className="flex-grow relative">
                <Input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  aria-label="Email address"
                  className="pr-10 border-2 border-dark hand-drawn"
                  error={errors.email?.message}
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address"
                    }
                  })}
                />
                <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark" size={20} />
              </div>
              
              <Button
                type="submit"
                variant="primary"
                className="w-full sm:w-auto whitespace-nowrap"
                disabled={submissionState === 'loading'}
              >
                {submissionState === 'loading' ? 'Sending...' : 'Notify Me'}
              </Button>
            </motion.form>
          )}
          
          {submissionState === 'error' && (
            <motion.div 
              className="mt-3 text-dark flex items-center justify-center font-body"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={18} className="mr-2" />
              <span>Oops! Something went wrong. Please try again.</span>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
});

EmailSignup.displayName = 'EmailSignup';

export default EmailSignup;