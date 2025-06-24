import { useState, useEffect, useCallback } from 'react';
import { MatchmakingService } from '../services/MatchmakingService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';

export interface MatchmakingPreferences {
  maxPlayers?: number;
  roundDuration?: number;
  categories?: string[];
}

export interface QueueStatus {
  inQueue: boolean;
  position?: number;
  joinedAt?: string;
  estimatedWaitTime?: number;
}

export interface UseMatchmakingReturn {
  // Queue state
  isInQueue: boolean;
  queuePosition: number | null;
  estimatedWaitTime: number | null;
  matchFound: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  joinQueue: (preferences?: MatchmakingPreferences) => Promise<void>;
  leaveQueue: () => Promise<void>;
  acceptMatch: () => Promise<void>;
  declineMatch: () => Promise<void>;
  
  // Polling control
  startPolling: () => void;
  stopPolling: () => void;
}

export function useMatchmaking(): UseMatchmakingReturn {
  const { currentUser, isLoggedIn } = useAuth();
  const { actions } = useGame();
  const navigate = useNavigate();
  
  // State
  const [isInQueue, setIsInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWaitTime, setEstimatedWaitTime] = useState<number | null>(null);
  const [matchFound, setMatchFound] = useState(false);
  const [matchGameId, setMatchGameId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Check queue status
  const checkQueueStatus = useCallback(async () => {
    if (!isLoggedIn) return;
    
    try {
      const result = await MatchmakingService.checkQueueStatus();
      
      if (result.success && result.data) {
        setIsInQueue(result.data.in_queue);
        
        if (result.data.in_queue) {
          setQueuePosition(result.data.position || null);
          setEstimatedWaitTime(result.data.estimated_wait_time || null);
        } else {
          setQueuePosition(null);
          setEstimatedWaitTime(null);
        }
      } else {
        console.warn('Failed to check queue status:', result.error);
      }
    } catch (err) {
      console.error('Error checking queue status:', err);
    }
  }, [isLoggedIn]);
  
  // Join queue
  const joinQueue = useCallback(async (preferences?: MatchmakingPreferences) => {
    if (!isLoggedIn) {
      setError('You must be logged in to join the queue');
      return;
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      const result = await MatchmakingService.joinQueue(preferences);
      
      if (result.success) {
        setIsInQueue(true);
        startPolling();
      } else {
        setError(result.error || 'Failed to join queue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, clearError]);
  
  // Leave queue
  const leaveQueue = useCallback(async () => {
    setIsLoading(true);
    clearError();
    
    try {
      const result = await MatchmakingService.leaveQueue();
      
      if (result.success) {
        setIsInQueue(false);
        setQueuePosition(null);
        setEstimatedWaitTime(null);
        stopPolling();
      } else {
        setError(result.error || 'Failed to leave queue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);
  
  // Accept match
  const acceptMatch = useCallback(async () => {
    if (!matchGameId) {
      setError('No match to accept');
      return;
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      // Join the game using GameContext
      await actions.joinGame(matchGameId);
      
      // Leave the matchmaking queue
      await MatchmakingService.leaveQueue();
      
      // Reset matchmaking state
      setIsInQueue(false);
      setMatchFound(false);
      setMatchGameId(null);
      stopPolling();
      
      // Navigate to pre-round briefing
      navigate('/uiux/pre-round');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setIsLoading(false);
    }
  }, [matchGameId, actions, navigate, clearError]);
  
  // Decline match
  const declineMatch = useCallback(async () => {
    setIsLoading(true);
    clearError();
    
    try {
      // Just reset match state and stay in queue
      setMatchFound(false);
      setMatchGameId(null);
      
      // Optionally leave queue if desired
      // await leaveQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);
  
  // Start polling for queue updates
  const startPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    const interval = setInterval(async () => {
      await checkQueueStatus();
      
      // Simulate match found for now (in real implementation, this would come from the server)
      // This is just for demonstration - in production, match found would be a server event
      if (isInQueue && queuePosition === 1 && !matchFound) {
        // 10% chance of finding a match each poll when in position 1
        if (Math.random() < 0.1) {
          const mockGameId = `game-${Date.now()}`;
          setMatchFound(true);
          setMatchGameId(mockGameId);
        }
      }
    }, 2000);
    
    setPollingInterval(interval);
  }, [pollingInterval, checkQueueStatus, isInQueue, queuePosition, matchFound]);
  
  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [pollingInterval]);
  
  // Check initial queue status on mount
  useEffect(() => {
    if (isLoggedIn) {
      checkQueueStatus();
    }
    
    return () => {
      stopPolling();
    };
  }, [isLoggedIn, checkQueueStatus, stopPolling]);
  
  return {
    isInQueue,
    queuePosition,
    estimatedWaitTime,
    matchFound,
    isLoading,
    error,
    joinQueue,
    leaveQueue,
    acceptMatch,
    declineMatch,
    startPolling,
    stopPolling
  };
}