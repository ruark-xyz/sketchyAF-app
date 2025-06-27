// Simplified Timer Hook - Display Only, No Logic
// Pure display component that shows server-calculated time remaining

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';

interface SimpleTimerState {
  timeRemaining: number | null;
  phaseDuration: number | null;
  phase: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UseSimpleTimerOptions {
  gameId: string;
  refreshInterval?: number; // seconds (default: 5)
}

export function useSimpleTimer({ gameId, refreshInterval = 5 }: UseSimpleTimerOptions) {
  const [state, setState] = useState<SimpleTimerState>({
    timeRemaining: null,
    phaseDuration: null,
    phase: null,
    isLoading: false,
    error: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const displayIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch timer state from server
  const fetchTimerState = async () => {
    if (!gameId) return;

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { data, error } = await supabase.functions.invoke('get-game-timer', {
        body: { gameId }
      });

      if (error) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error.message || 'Failed to fetch timer' 
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        timeRemaining: data.timeRemaining,
        phaseDuration: data.phaseDuration,
        phase: data.phase,
        isLoading: false,
        error: null
      }));

    } catch (err) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }));
    }
  };

  // Set up periodic refresh from server
  useEffect(() => {
    if (!gameId) return;

    // Initial fetch
    fetchTimerState();

    // Set up periodic refresh
    intervalRef.current = setInterval(fetchTimerState, refreshInterval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [gameId, refreshInterval]);

  // Client-side countdown for smooth display (between server refreshes)
  useEffect(() => {
    if (state.timeRemaining !== null && state.timeRemaining > 0) {
      displayIntervalRef.current = setInterval(() => {
        setState(prev => {
          if (prev.timeRemaining === null || prev.timeRemaining <= 0) {
            return prev;
          }
          return {
            ...prev,
            timeRemaining: Math.max(0, prev.timeRemaining - 1)
          };
        });
      }, 1000);
    } else {
      if (displayIntervalRef.current) {
        clearInterval(displayIntervalRef.current);
        displayIntervalRef.current = null;
      }
    }

    return () => {
      if (displayIntervalRef.current) {
        clearInterval(displayIntervalRef.current);
      }
    };
  }, [state.timeRemaining]);

  // Format time for display
  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds < 0) return '--:--';
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    timeRemaining: state.timeRemaining,
    phaseDuration: state.phaseDuration,
    phase: state.phase,
    formattedTime: formatTime(state.timeRemaining),
    isLoading: state.isLoading,
    error: state.error,
    refresh: fetchTimerState
  };
}
