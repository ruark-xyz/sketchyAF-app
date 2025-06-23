import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { User } from '../types/auth';

// Simplified auth context type
type AuthContextType = {
  user: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  // Compatibility properties
  currentUser: User | null;
  isLoggedIn: boolean;
  logout: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithSocial: (provider: 'google' | 'facebook' | 'twitter') => Promise<void>;
  signupWithEmail: (email: string, username: string, password: string) => Promise<void>;
  signupWithSocial: (provider: 'google' | 'facebook' | 'twitter') => Promise<void>;
  error: string | null;
  clearError: () => void;
};

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to convert Supabase user to app user
const createAppUser = (supabaseUser: SupabaseUser): User => {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    username: supabaseUser.user_metadata?.username || supabaseUser.email?.split('@')[0] || 'User',
    avatar_url: supabaseUser.user_metadata?.avatar_url,
    country: supabaseUser.user_metadata?.country,
    is_subscriber: false,
    subscription_tier: 'free' as const,
    created_at: supabaseUser.created_at,
    last_active: new Date().toISOString()
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    // Get initial user state using getUser() for more reliable auth state
    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Initializing auth state...');
        const { data: { user }, error } = await supabase.auth.getUser();
        if (mounted && !initialized) {
          initialized = true;
          if (error) {
            console.warn('AuthContext: Auth initialization error:', error);
            // If the user doesn't exist in the database, clear the session
            if (error.message.includes('User from sub claim in JWT does not exist')) {
              console.log('AuthContext: Clearing invalid session...');
              await supabase.auth.signOut();
            }
            setUser(null);
            setSession(null);
          } else {
            console.log('AuthContext: User from getUser():', user ? 'authenticated' : 'not authenticated');
            setUser(user);
            // Get session if user exists
            if (user) {
              const { data: { session } } = await supabase.auth.getSession();
              console.log('AuthContext: Session from getSession():', session ? 'valid' : 'invalid');
              setSession(session);
            } else {
              setSession(null);
            }
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('AuthContext: Failed to initialize auth:', err);
        if (mounted && !initialized) {
          initialized = true;
          setUser(null);
          setSession(null);
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted && initialized) {
        console.log('AuthContext: Auth state change event:', event);
        // Only update state for meaningful events, ignore INITIAL_SESSION after initialization
        if (event !== 'INITIAL_SESSION') {
          setSession(session);
          setUser(session ? session.user : null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign out function
  const signOut = async (): Promise<void> => {
    console.log('AuthContext: Signing out...');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Social login function
  const loginWithSocial = async (provider: 'google' | 'facebook' | 'twitter'): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Social login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Signup with email function
  const signupWithEmail = async (email: string, username: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      });
      if (error) throw error;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Signup failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Social signup function
  const signupWithSocial = async (provider: 'google' | 'facebook' | 'twitter'): Promise<void> => {
    await loginWithSocial(provider); // Same as social login
  };

  // Clear error function
  const clearError = (): void => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    signOut,
    // Compatibility properties
    currentUser: user ? createAppUser(user) : null,
    isLoggedIn: !!user && !!session,
    logout: signOut, // Alias for compatibility
    login,
    loginWithSocial,
    signupWithEmail,
    signupWithSocial,
    error,
    clearError,
  };

  // Expose auth context globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).authDebug = {
      signOut,
      user,
      session,
      isLoggedIn: !!user && !!session,
      clearAuth: async () => {
        await supabase.auth.signOut();
        window.location.reload();
      }
    };
  }

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