import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Seo from '../../components/utils/Seo';
import * as ROUTES from '../../constants/routes';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPassword: React.FC = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { resetPassword, error, isLoading, clearError } = useAuth();
  
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>();
  
  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await resetPassword(data.email);
      setIsSubmitted(true);
    } catch (err) {
      // Error is handled by the auth context
      console.error('Password reset error:', err);
    }
  };
  
  return (
    <>
      <Seo
        title="Forgot Password"
        description="Reset your SketchyAF account password to regain access to your account."
      />
      
      <section className="min-h-screen py-20 bg-cream flex items-center justify-center">
        <motion.div 
          className="w-full max-w-md mx-auto bg-white rounded-lg border-2 border-dark p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] hand-drawn"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6 flex justify-between items-center">
            <Link to={ROUTES.ROUTE_LOGIN} className="text-dark hover:text-primary transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-dark">Forgot Password</h2>
            <div className="w-6"></div> {/* Empty div for spacing */}
          </div>
          
          {isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="flex justify-center mb-4">
                <CheckCircle size={48} className="text-success" />
              </div>
              <h3 className="font-heading font-bold text-xl mb-2">Reset Link Sent!</h3>
              <p className="text-medium-gray mb-6">
                If an account exists with that email, we've sent instructions to reset your password. Please check your inbox.
              </p>
              <Button variant="primary" to={ROUTES.ROUTE_LOGIN}>
                Back to Login
              </Button>
            </motion.div>
          ) : (
            <>
              <p className="text-medium-gray mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              
              {error && (
                <motion.div 
                  className="mb-6 p-4 bg-red/10 border border-red text-red rounded-md flex items-center"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <AlertCircle size={20} className="mr-2 flex-shrink-0" />
                  <p>{error}</p>
                  <button 
                    onClick={clearError} 
                    className="ml-auto text-red hover:text-red/80"
                    aria-label="Dismiss error"
                  >
                    &times;
                  </button>
                </motion.div>
              )}
              
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      name="email"
                      label="Email"
                      type="email"
                      placeholder="your.email@example.com"
                      error={errors.email?.message}
                      {...register('email', { 
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address"
                        }
                      })}
                    />
                    <Mail className="absolute right-3 bottom-3 text-medium-gray" size={20} />
                  </div>
                  
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent border-primary rounded-full"></div>
                        <span>Sending...</span>
                      </div>
                    ) : "Reset Password"}
                  </Button>
                </div>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-medium-gray">
                  Remember your password?{' '}
                  <Link to="/login" className="text-primary font-semibold hover:underline">
                    Log In
                  </Link>
                </p>
              </div>
            </>
          )}
        </motion.div>
      </section>
    </>
  );
};

export default ForgotPassword;