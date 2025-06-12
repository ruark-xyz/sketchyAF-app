import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../../utils/supabase';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Seo from '../../components/utils/Seo';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

const ResetPassword: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<ResetPasswordFormData>();
  const password = watch('password', '');

  useEffect(() => {
    // Check if we have the required tokens for password reset
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      setError('Invalid password reset link. Please request a new password reset.');
    }
  }, [searchParams]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password
      });

      if (error) {
        throw new Error(error.message);
      }

      setIsSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/uiux/login?message=password_updated');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating your password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <>
        <Seo
          title="Password Updated"
          description="Your password has been successfully updated."
        />
        
        <section className="min-h-screen py-20 bg-cream flex items-center justify-center">
          <motion.div 
            className="w-full max-w-md mx-auto bg-white rounded-lg border-2 border-dark p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] hand-drawn text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-center mb-4">
              <CheckCircle size={48} className="text-success" />
            </div>
            <h2 className="font-heading font-bold text-2xl mb-2">Password Updated!</h2>
            <p className="text-medium-gray mb-6">
              Your password has been successfully updated. You will be redirected to the login page shortly.
            </p>
            <Button variant="primary" to="/uiux/login">
              Go to Login
            </Button>
          </motion.div>
        </section>
      </>
    );
  }

  return (
    <>
      <Seo
        title="Reset Password"
        description="Create a new password for your SketchyAF account."
      />
      
      <section className="min-h-screen py-20 bg-cream flex items-center justify-center">
        <motion.div 
          className="w-full max-w-md mx-auto bg-white rounded-lg border-2 border-dark p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] hand-drawn"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6 flex justify-between items-center">
            <button 
              onClick={() => navigate('/uiux/login')} 
              className="text-dark hover:text-primary transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-dark">Reset Password</h2>
            <div className="w-6"></div>
          </div>
          
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-error/10 border border-error rounded-lg flex items-center gap-2"
            >
              <AlertCircle size={16} className="text-error flex-shrink-0" />
              <span className="text-error text-sm">{error}</span>
            </motion.div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div className="relative">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="Enter your new password"
                  error={errors.password?.message}
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters"
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: "Password must contain at least one uppercase letter, one lowercase letter, and one number"
                    }
                  })}
                />
                <Lock className="absolute right-3 bottom-3 text-medium-gray" size={20} />
              </div>
              
              <div className="relative">
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm your new password"
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword', { 
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                />
                <Lock className="absolute right-3 bottom-3 text-medium-gray" size={20} />
              </div>
            </div>
            
            <Button
              type="submit"
              variant="primary"
              className="w-full mt-6"
              disabled={isLoading}
            >
              {isLoading ? 'Updating Password...' : 'Update Password'}
            </Button>
          </form>
        </motion.div>
      </section>
    </>
  );
};

export default ResetPassword;
