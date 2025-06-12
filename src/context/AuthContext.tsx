import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { User, AuthContextType, UserProfile } from '../types/auth';
import { Country } from '../types';

// Export User type for backward compatibility
export type { User };

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state and set up auth listener
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          setError(error.message);
        } else {
          setSession(session);
          if (session?.user) {
            await fetchUserProfile(session.user.id);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);

        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setCurrentUser(null);
        }

        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        // If profile doesn't exist, we'll create it in the signup process
        return;
      }

      if (data) {
        setCurrentUser({
          id: data.id,
          email: data.email,
          username: data.username,
          avatar_url: data.avatar_url,
          is_subscriber: data.is_subscriber,
          subscription_tier: data.subscription_tier,
          created_at: data.created_at,
          last_active: data.last_active
        });
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  // Login with email and password
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      // User profile will be fetched automatically via the auth state change listener
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with email
  const signupWithEmail = async (email: string, username: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // First, check if username is already taken
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .single();

      if (existingUser) {
        throw new Error('Username is already taken');
      }

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // If signup successful but email confirmation is required
      if (data.user && !data.session) {
        // User needs to confirm email
        setError('Please check your email and click the confirmation link to complete your registration.');
        return;
      }

      // User profile will be created automatically via database trigger
      // and fetched via the auth state change listener
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during signup';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with social provider
  const signupWithSocial = async (provider: 'google' | 'facebook' | 'twitter'): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any, // Supabase supports these providers
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // OAuth flow will redirect to the callback URL
      // User profile will be created automatically via database trigger
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `An error occurred during ${provider} signup`;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Login with social provider
  const loginWithSocial = async (provider: 'google' | 'facebook' | 'twitter'): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as any, // Supabase supports these providers
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // OAuth flow will redirect to the callback URL
      // User profile will be fetched automatically via the auth state change listener
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `An error occurred during ${provider} login`;
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateUserProfile = async (updates: Partial<User>): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!currentUser) {
        throw new Error('No user is currently logged in');
      }

      // Update user profile in database
      const { data, error } = await supabase
        .from('users')
        .update({
          username: updates.username,
          avatar_url: updates.avatar_url,
        })
        .eq('id', currentUser.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update local state
      if (data) {
        setCurrentUser({
          ...currentUser,
          username: data.username,
          avatar_url: data.avatar_url,
          last_active: data.last_active
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw new Error(error.message);
      }

      // Clear local state
      setCurrentUser(null);
      setSession(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during logout';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw new Error(error.message);
      }

      // Success - user will receive email with reset link
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during password reset';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error
  const clearError = (): void => {
    setError(null);
  };

  // Context value
  const value: AuthContextType = {
    currentUser,
    session,
    isLoggedIn: !!currentUser && !!session,
    isLoading,
    error,
    login,
    signupWithEmail,
    signupWithSocial,
    loginWithSocial,
    logout,
    resetPassword,
    clearError,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;