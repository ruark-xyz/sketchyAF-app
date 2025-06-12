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
    let isMounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error('Error getting session:', error);
          setError(error.message);
          setSession(null);
          setCurrentUser(null);
        } else {
          setSession(session);
          if (session?.user) {
            // Wait for user profile to be fetched before setting loading to false
            try {
              await fetchUserProfile(session.user.id);
            } catch (profileError) {
              console.error('Error fetching user profile during initialization:', profileError);
              // Don't fail the entire auth process if profile fetch fails
              // The session is still valid, just set a basic user object
              if (isMounted) {
                const fallbackUser = {
                  id: session.user.id,
                  email: session.user.email || '',
                  username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
                  avatar_url: session.user.user_metadata?.avatar_url,
                  country: session.user.user_metadata?.country,
                  is_subscriber: false,
                  subscription_tier: 'free' as const,
                  created_at: session.user.created_at,
                  last_active: new Date().toISOString()
                };
                setCurrentUser(fallbackUser);
              }
            }
          } else {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        setError('Failed to initialize authentication');
        setSession(null);
        setCurrentUser(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        setIsLoading(true);
        setSession(session);

        if (session?.user) {
          // Only fetch user profile for certain events to avoid database connection issues
          // SIGNED_IN during initialization can have database connectivity issues
          // INITIAL_SESSION is fired after full initialization and is more reliable
          const shouldFetchProfile = event === 'INITIAL_SESSION' ||
                                   event === 'SIGNED_IN' && currentUser === null;

          if (shouldFetchProfile) {
            try {
              await fetchUserProfile(session.user.id);
            } catch (profileError) {
              console.error('Error fetching user profile during auth change:', profileError);
              // Don't fail the entire auth process if profile fetch fails
              if (isMounted) {
                const fallbackUser = {
                  id: session.user.id,
                  email: session.user.email || '',
                  username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
                  avatar_url: session.user.user_metadata?.avatar_url,
                  country: session.user.user_metadata?.country,
                  is_subscriber: false,
                  subscription_tier: 'free' as const,
                  created_at: session.user.created_at,
                  last_active: new Date().toISOString()
                };
                setCurrentUser(fallbackUser);
              }
            }
          } else {
            // For SIGNED_IN events during initialization, just create a basic user if we don't have one
            if (!currentUser && isMounted) {
              const basicUser = {
                id: session.user.id,
                email: session.user.email || '',
                username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
                avatar_url: session.user.user_metadata?.avatar_url,
                country: session.user.user_metadata?.country,
                is_subscriber: false,
                subscription_tier: 'free' as const,
                created_at: session.user.created_at,
                last_active: new Date().toISOString()
              };
              setCurrentUser(basicUser);
            }
          }
        } else {
          setCurrentUser(null);
        }

        if (isMounted) {
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch user profile from database with timeout
  const fetchUserProfile = async (userId: string): Promise<void> => {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Database query timeout after 5 seconds'));
      }, 5000); // 5 second timeout
    });

    try {
      // Race the database query against the timeout
      const queryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        // If profile doesn't exist (common for new users), throw error to handle gracefully
        if (error.code === 'PGRST116') {
          throw new Error('User profile not found');
        }

        // For other errors, also throw to handle gracefully
        throw new Error(`Database error: ${error.message}`);
      }

      if (data) {
        const userData = {
          id: data.id,
          email: data.email,
          username: data.username,
          avatar_url: data.avatar_url,
          country: data.country,
          is_subscriber: data.is_subscriber,
          subscription_tier: data.subscription_tier,
          created_at: data.created_at,
          last_active: data.last_active
        };

        setCurrentUser(userData);
      } else {
        throw new Error('No user data returned');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      // Re-throw the error so calling code can handle it
      throw err;
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
      // Don't set isLoading to false here - let the auth state change handler manage it
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login';
      setError(errorMessage);
      setIsLoading(false); // Only set loading to false on error
      throw new Error(errorMessage);
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
        setIsLoading(false); // Set loading to false for email confirmation case
        return;
      }

      // User profile will be created automatically via database trigger
      // and fetched via the auth state change listener
      // Don't set isLoading to false here - let the auth state change handler manage it
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during signup';
      setError(errorMessage);
      setIsLoading(false); // Only set loading to false on error
      throw new Error(errorMessage);
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
      // Don't set isLoading to false here - the redirect will handle the flow
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `An error occurred during ${provider} signup`;
      setError(errorMessage);
      setIsLoading(false); // Only set loading to false on error
      throw new Error(errorMessage);
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
      // Don't set isLoading to false here - the redirect will handle the flow
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `An error occurred during ${provider} login`;
      setError(errorMessage);
      setIsLoading(false); // Only set loading to false on error
      throw new Error(errorMessage);
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
  const isLoggedInComputed = !!currentUser && !!session;



  const value: AuthContextType = {
    currentUser,
    session,
    isLoggedIn: isLoggedInComputed,
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