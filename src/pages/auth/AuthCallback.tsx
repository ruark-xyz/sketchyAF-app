import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          navigate('/uiux/login?error=auth_callback_failed');
          return;
        }

        if (data.session) {
          // Successfully authenticated, redirect to home or intended page
          const redirectTo = new URLSearchParams(window.location.search).get('redirectTo') || '/';
          navigate(redirectTo);
        } else {
          // No session found, redirect to login
          navigate('/uiux/login');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        navigate('/uiux/login?error=auth_callback_failed');
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-dark font-medium">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
