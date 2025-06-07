import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useGlobalState } from './GlobalStateContext';
import { Country } from '../types';
import { countries } from '../data/mockCountries';

// Define user type
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  country?: Country;
}

// Define context type
interface AuthContextType {
  currentUser: User | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signupWithEmail: (email: string, username: string, password: string) => Promise<void>;
  signupWithSocial: (provider: 'google' | 'facebook' | 'twitter') => Promise<void>;
  loginWithSocial: (provider: 'google' | 'facebook' | 'twitter') => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user data
const mockUsers = [
  {
    id: '1',
    email: 'user@example.com',
    password: 'password123',
    username: 'SketchyUser',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    country: countries[0] // US
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const { addNotification } = useGlobalState();

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const checkAuthStatus = () => {
      setIsLoading(true);
      try {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        localStorage.removeItem('currentUser');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Memoized computed values
  const isLoggedIn = useMemo(() => !!currentUser, [currentUser]);

  // Login with email and password
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Find user in mock data
      const user = mockUsers.find(u => u.email === email && u.password === password);
      
      if (!user) {
        throw new Error('Invalid email or password');
      }
      
      // Create a sanitized user object (without password)
      const { password: _, ...sanitizedUser } = user;
      
      // Save to state and localStorage
      setCurrentUser(sanitizedUser);
      localStorage.setItem('currentUser', JSON.stringify(sanitizedUser));
      
      addNotification({
        type: 'success',
        message: 'Successfully logged in!',
        duration: 3000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during login';
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  // Sign up with email
  const signupWithEmail = useCallback(async (email: string, username: string, password: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check if email already exists in mock data
      if (mockUsers.some(u => u.email === email)) {
        throw new Error('Email already in use');
      }
      
      // Create new user
      const newUser = {
        id: (mockUsers.length + 1).toString(),
        email,
        username,
        password,
        avatar: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 99)}.jpg`,
        country: countries[Math.floor(Math.random() * countries.length)]
      };
      
      const { password: _, ...sanitizedUser } = newUser;
      
      // Save to state and localStorage
      setCurrentUser(sanitizedUser);
      localStorage.setItem('currentUser', JSON.stringify(sanitizedUser));
      
      addNotification({
        type: 'success',
        message: 'Account created successfully!',
        duration: 3000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during signup';
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  // Sign up with social provider
  const signupWithSocial = useCallback(async (provider: 'google' | 'facebook' | 'twitter'): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Create mock social user
      const newUser = {
        id: (mockUsers.length + 1).toString(),
        email: `${provider}user${Math.floor(Math.random() * 1000)}@example.com`,
        username: `${provider.charAt(0).toUpperCase() + provider.slice(1)}User${Math.floor(Math.random() * 1000)}`,
        avatar: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 99)}.jpg`,
        country: countries[Math.floor(Math.random() * countries.length)]
      };
      
      // Save to state and localStorage
      setCurrentUser(newUser);
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      
      addNotification({
        type: 'success',
        message: `Successfully signed up with ${provider}!`,
        duration: 3000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `An error occurred during ${provider} signup`;
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  // Login with social provider
  const loginWithSocial = useCallback(async (provider: 'google' | 'facebook' | 'twitter'): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Create mock social user
      const user = {
        id: '999',
        email: `${provider}user@example.com`,
        username: `${provider.charAt(0).toUpperCase() + provider.slice(1)}User`,
        avatar: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 99)}.jpg`,
        country: countries[Math.floor(Math.random() * countries.length)]
      };
      
      // Save to state and localStorage
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      addNotification({
        type: 'success',
        message: `Successfully logged in with ${provider}!`,
        duration: 3000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `An error occurred during ${provider} login`;
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  // Update user profile
  const updateUserProfile = useCallback(async (updates: Partial<User>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (!currentUser) {
        throw new Error('No user is currently logged in');
      }
      
      const updatedUser = { ...currentUser, ...updates };
      
      // Save to state and localStorage
      setCurrentUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
      addNotification({
        type: 'success',
        message: 'Profile updated successfully!',
        duration: 3000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while updating profile';
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, addNotification]);

  // Logout
  const logout = useCallback((): void => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    
    addNotification({
      type: 'info',
      message: 'Successfully logged out',
      duration: 3000,
    });
  }, [addNotification]);

  // Reset password
  const resetPassword = useCallback(async (email: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check if email exists in mock data
      const user = mockUsers.find(u => u.email === email);
      
      if (!user) {
        throw new Error('No account found with this email address');
      }
      
      addNotification({
        type: 'success',
        message: 'Password reset instructions sent to your email',
        duration: 5000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during password reset';
      setError(errorMessage);
      addNotification({
        type: 'error',
        message: errorMessage,
        duration: 5000,
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  // Clear error
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // Context value with memoization
  const value = useMemo(() => ({
    currentUser,
    isLoggedIn,
    isLoading,
    error,
    login,
    signupWithEmail,
    signupWithSocial,
    loginWithSocial,
    logout,
    resetPassword,
    clearError,
    updateUserProfile,
  }), [
    currentUser,
    isLoggedIn,
    isLoading,
    error,
    login,
    signupWithEmail,
    signupWithSocial,
    loginWithSocial,
    logout,
    resetPassword,
    clearError,
    updateUserProfile,
  ]);

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

export default AuthContext;</parameter>