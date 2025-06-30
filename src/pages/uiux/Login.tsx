import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowLeft, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Seo from '../../components/utils/Seo';
import * as ROUTES from '../../constants/routes';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginWithSocial, error, isLoading, clearError } = useAuth();
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();
  
  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (err) {
      // Error is handled by the auth context
      console.error('Login error:', err);
    }
  };
  
  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'twitter') => {
    try {
      await loginWithSocial(provider);
      navigate('/');
    } catch (err) {
      // Error is handled by the auth context
      console.error(`${provider} login error:`, err);
    }
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1 
      } 
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
  };

  return (
    <>
      <Seo
        title="Log In to Your Account"
        description="Log in to your SketchyAF account to access your profile, play games, and view your stats."
      />
      
      <section className="min-h-screen py-20 bg-cream flex items-center justify-center">
        <motion.div 
          className="w-full max-w-md mx-auto bg-white rounded-lg border-2 border-dark p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] hand-drawn"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6 flex justify-between items-center">
            <Link to="/" className="text-dark hover:text-primary transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <h2 className="font-heading font-bold text-2xl md:text-3xl text-dark">Welcome Back!</h2>
            <div className="w-6"></div> {/* Empty div for spacing */}
          </div>
          
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
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              <motion.div variants={itemVariants}>
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
              </motion.div>
              
              <motion.div variants={itemVariants}>
                <div className="relative">
                  <Input
                    name="password"
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    error={errors.password?.message}
                    {...register('password', { 
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters"
                      }
                    })}
                  />
                  <Lock className="absolute right-3 bottom-3 text-medium-gray" size={20} />
                </div>
              </motion.div>
              
              <motion.div 
                variants={itemVariants}
                className="flex items-center justify-between"
              >
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-primary"
                    onChange={() => setShowPassword(!showPassword)}
                  />
                  <span className="text-medium-gray text-sm">Show password</span>
                </label>
                
                <Link
                  to="/forgot-password"
                  className="text-primary text-sm hover:underline"
                >
                  Forgot password?
                </Link>
              </motion.div>
              
              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent border-primary rounded-full"></div>
                      <span>Logging in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <LogIn size={20} className="mr-2" />
                      <span>Log In</span>
                    </div>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </form>
          
          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-light-gray"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-medium-gray">
                Or continue with
              </span>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleSocialLogin('google')}
              className="w-full inline-flex justify-center py-2 px-4 border border-light-gray rounded-md shadow-sm text-sm font-medium text-dark-gray bg-white hover:bg-gray-50"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 11V8H16V11H13V16H11V11H8V8H11Z" />
              </svg>
            </button>
            
            <button
              type="button"
              onClick={() => handleSocialLogin('facebook')}
              className="w-full inline-flex justify-center py-2 px-4 border border-light-gray rounded-md shadow-sm text-sm font-medium text-dark-gray bg-white hover:bg-gray-50"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </button>
            
            <button
              type="button"
              onClick={() => handleSocialLogin('twitter')}
              className="w-full inline-flex justify-center py-2 px-4 border border-light-gray rounded-md shadow-sm text-sm font-medium text-dark-gray bg-white hover:bg-gray-50"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </button>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-medium-gray">
              Don't have an account?{' '}
              <Link to={ROUTES.ROUTE_SIGNUP} className="text-primary font-semibold hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </motion.div>
      </section>
    </>
  );
};

export default Login;