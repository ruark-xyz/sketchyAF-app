// Simple Queue Management Hook
// Handles only queue join/leave operations - navigation is handled by server events

import { useState, useCallback } from 'react';
import { MatchmakingService } from '../services/MatchmakingService';
import { useAuth } from '../context/AuthContext';

export interface MatchmakingPreferences {
  maxPlayers?: number;
  roundDuration?: number;
  categories?: string[];
}

export interface UseSimpleQueueReturn {
  // Queue state
  isInQueue: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  joinQueue: (preferences?: MatchmakingPreferences) => Promise<void>;
  leaveQueue: () => Promise<void>;
  clearError: () => void;
}

export function useSimpleQueue(): UseSimpleQueueReturn {
  const { isLoggedIn } = useAuth();
  
  // State
  const [isInQueue, setIsInQueue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Join queue
  const joinQueue = useCallback(async (preferences?: MatchmakingPreferences) => {
    if (!isLoggedIn) {
      setError('You must be logged in to join the queue');
      return;
    }

    setIsLoading(true);
    clearError();

    try {
      console.log('useSimpleQueue: Joining queue...');
      const result = await MatchmakingService.joinQueue(preferences);
      
      if (result.success) {
        setIsInQueue(true);
        console.log('useSimpleQueue: Successfully joined queue');
      } else {
        setError(result.error || 'Failed to join queue');
        console.error('useSimpleQueue: Failed to join queue:', result.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMsg);
      console.error('useSimpleQueue: Exception joining queue:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, clearError]);

  // Leave queue
  const leaveQueue = useCallback(async () => {
    setIsLoading(true);
    clearError();

    try {
      console.log('useSimpleQueue: Leaving queue...');
      const result = await MatchmakingService.leaveQueue();
      
      if (result.success) {
        setIsInQueue(false);
        console.log('useSimpleQueue: Successfully left queue');
      } else {
        setError(result.error || 'Failed to leave queue');
        console.error('useSimpleQueue: Failed to leave queue:', result.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to leave queue';
      setError(errorMsg);
      console.error('useSimpleQueue: Exception leaving queue:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);

  return {
    // Queue state
    isInQueue,
    isLoading,
    error,
    
    // Actions
    joinQueue,
    leaveQueue,
    clearError
  };
}
