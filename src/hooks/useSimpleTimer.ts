// Optimized Timer Hook - Display Only, No Logic
// Pure display component that shows server-calculated time remaining
// Uses PubNub events for immediate updates and reduced API polling

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { useRealtimeGame } from './useRealtimeGame';
import { GameEvent } from '../types/realtime';

interface SimpleTimerState {
  timeRemaining: number | null;
  phaseDuration: number | null;
  phase: string | null;
  isLoading: boolean;
  error: string | null;
}

interface UseSimpleTimerOptions {
  gameId: string;
  refreshInterval?: number; // seconds (default: 15 - reduced from 5 for better performance)
}

export function useSimpleTimer({ gameId, refreshInterval = 15 }: UseSimpleTimerOptions) {
  const [state, setState] = useState<SimpleTimerState>({
    timeRemaining: null,
    phaseDuration: null,
    phase: null,
    isLoading: false,
    error: null
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const displayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);

  // PubNub integration for immediate updates
  const { addEventListener, removeEventListener, isConnected } = useRealtimeGame({ gameId });

  // Fetch timer state from server (with throttling)
  const fetchTimerState = useCallback(async (force = false) => {
    if (!gameId) return;

    // Throttle API calls - don't fetch more than once every 5 seconds unless forced
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < 5000) {
      return;
    }
    lastFetchTimeRef.current = now;

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
  }, [gameId]);

  // PubNub event listeners for immediate timer updates
  useEffect(() => {
    if (!gameId || !addEventListener || !removeEventListener) return;

    const handlePhaseChanged = (event: GameEvent) => {
      console.log('🕐 Timer: Phase changed event received', event);

      // If the event includes full game data, extract timer info
      if (event.data?.game) {
        const game = event.data.game;
        if (game.current_phase_duration && game.phase_expires_at) {
          const now = new Date();
          const expiresAt = new Date(game.phase_expires_at);
          const timeRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));

          setState(prev => ({
            ...prev,
            timeRemaining,
            phaseDuration: game.current_phase_duration,
            phase: game.status,
            error: null
          }));

          console.log('🕐 Timer: Updated from PubNub event', {
            timeRemaining,
            phaseDuration: game.current_phase_duration,
            phase: game.status
          });
          return; // Skip API fetch since we have fresh data
        }
      }

      // Fallback: trigger immediate API refresh for phase changes
      fetchTimerState(true);
    };

    const handleTimerExpired = (event: GameEvent) => {
      console.log('⏰ Timer: Timer expired event received', event);
      // Trigger immediate refresh when timer expires
      fetchTimerState(true);
    };

    // Add event listeners
    addEventListener('phase_changed', handlePhaseChanged);
    addEventListener('timer_expired', handleTimerExpired);

    return () => {
      removeEventListener('phase_changed', handlePhaseChanged);
      removeEventListener('timer_expired', handleTimerExpired);
    };
  }, [gameId, addEventListener, removeEventListener, fetchTimerState]);

  // Set up periodic refresh from server (reduced frequency)
  useEffect(() => {
    if (!gameId) return;

    // Initial fetch
    fetchTimerState(true);

    // Set up periodic refresh (now less frequent due to PubNub events)
    intervalRef.current = setInterval(() => fetchTimerState(false), refreshInterval * 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [gameId, refreshInterval, fetchTimerState]);

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
