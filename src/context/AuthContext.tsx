import React, { createContext, useContext, useState, useEffect } from 'react';
import { Country } from '../types';
import { countries } from '../data/mockCountries';

// Define user type
export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  country?: Country; // Added country field
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
  updateUserProfile: (updates: Partial<User>) => Promise<void>; // Added method to update user profile
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in (from localStorage in this mock version)
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  // Login with email and password
  const login = async (email: string, password: string): Promise<void> => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with email
  const signupWithEmail = async (email: string, username: string, password: string): Promise<void> => {
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
        country: countries[Math.floor(Math.random() * countries.length)] // Random country
      };
      
      // In a real app, we would send this to an API
      // For mock purposes, we'll just simulate success and log the user in
      
      const { password: _, ...sanitizedUser } = newUser;
      
      // Save to state and localStorage
      setCurrentUser(sanitizedUser);
      localStorage.setItem('currentUser', JSON.stringify(sanitizedUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with social provider
  const signupWithSocial = async (provider: 'google' | 'facebook' | 'twitter'): Promise<void> => {
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
        country: countries[Math.floor(Math.random() * countries.length)] // Random country
      };
      
      console.log(`Mock signup with ${provider}:`, newUser);
      
      // Save to state and localStorage
      setCurrentUser(newUser);
      localStorage.setItem('currentUser', JSON.stringify(newUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : `An error occurred during ${provider} signup`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Login with social provider
  const loginWithSocial = async (provider: 'google' | 'facebook' | 'twitter'): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Create mock social user (in real app, this would be retrieved from the provider)
      const user = {
        id: '999',
        email: `${provider}user@example.com`,
        username: `${provider.charAt(0).toUpperCase() + provider.slice(1)}User`,
        avatar: `https://randomuser.me/api/portraits/${Math.random() > 0.5 ? 'men' : 'women'}/${Math.floor(Math.random() * 99)}.jpg`,
        country: countries[Math.floor(Math.random() * countries.length)] // Random country
      };
      
      console.log(`Mock login with ${provider}:`, user);
      
      // Save to state and localStorage
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
    } catch (err) {
      setError(err instanceof Error ? err.message : `An error occurred during ${provider} login`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateUserProfile = async (updates: Partial<User>): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (!currentUser) {
        throw new Error('No user is currently logged in');
      }
      
      // In a real app, we would send this to an API
      // For mock purposes, we'll just update the user in state
      const updatedUser = { ...currentUser, ...updates };
      
      // Save to state and localStorage
      setCurrentUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating profile');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = (): void => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
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
      
      // In a real app, send password reset email
      console.log(`Password reset requested for: ${email}`);
      
      // Simulating success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during password reset');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error
  const clearError = (): void => {
    setError(null);
  };

  // Context value
  const value = {
    currentUser,
    isLoggedIn: !!currentUser,
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