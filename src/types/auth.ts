import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { Country } from './index'

// Extended user interface that combines Supabase auth with our app-specific data
export interface User {
  id: string
  email: string
  username: string
  avatar_url?: string
  country?: Country
  is_subscriber?: boolean
  subscription_tier?: 'free' | 'premium'
  created_at?: string
  last_active?: string
}

// User profile interface for database operations
export interface UserProfile {
  id: string
  email: string
  username: string
  avatar_url?: string
  is_subscriber: boolean
  subscription_tier: 'free' | 'premium'
  created_at: string
  last_active: string
}

// Authentication context interface
export interface AuthContextType {
  currentUser: User | null
  session: Session | null
  isLoggedIn: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  signupWithEmail: (email: string, username: string, password: string) => Promise<void>
  signupWithSocial: (provider: 'google' | 'facebook' | 'twitter') => Promise<void>
  loginWithSocial: (provider: 'google' | 'facebook' | 'twitter') => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  clearError: () => void
  updateUserProfile: (updates: Partial<User>) => Promise<void>
}

// Supabase error types
export interface SupabaseError {
  message: string
  status?: number
}

// Authentication response types
export interface AuthResponse {
  user: User | null
  session: Session | null
  error: SupabaseError | null
}
