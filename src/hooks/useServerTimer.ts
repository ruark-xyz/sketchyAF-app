// useServerTimer Hook - Server-synchronized timer for game phases
// Replaces client-side timer logic with server-authoritative timing

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { GameStatus } from '../types/game';

interface ServerTimerState {
  timeRemaining: number | null;
  phaseDuration: number | null;
  phaseExpiresAt: string | null;
  serverTime: string | null;
  phase: GameStatus | null;
  isActive: boolean;
  isExpired: boolean;
  lastSyncTime: number;
  syncError: boolean;
  isLoading: boolean;
}

interface UseServerTimerOptions {
  gameId: string;
  syncInterval?: number; // seconds between server syncs (default: 10)
  enableFallback?: boolean; // enable direct database fallback (default: true)
  onTimerExpired?: () => void;
  onSyncError?: (error: Error) => void;
}

interface UseServerTimerReturn extends ServerTimerState {
  sync: () => Promise<void>;
  forceSync: () => Promise<void>;
  reset: () => void;
}

export function useServerTimer(options: UseServerTimerOptions): UseServerTimerReturn {
  const {
    gameId,
    syncInterval = 10,
    enableFallback = true,
    onTimerExpired,
    onSyncError
  } = options;

  // State
  const [state, setState] = useState<ServerTimerState>({
    timeRemaining: null,
    phaseDuration: null,
    phaseExpiresAt: null,
    serverTime: null,
    phase: null,
    isActive: false,
    isExpired: false,
    lastSyncTime: 0,
    syncError: false,
    isLoading: false
  });

  // Refs for intervals and callbacks
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const displayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimerExpiredRef = useRef(onTimerExpired);
  const onSyncErrorRef = useRef(onSyncError);

  // Update callback refs
  useEffect(() => {
    onTimerExpiredRef.current = onTimerExpired;
    onSyncErrorRef.current = onSyncError;
  }, [onTimerExpired, onSyncError]);

  // Sync with server using Edge Function
  const syncWithServer = useCallback(async (): Promise<void> => {
    if (!gameId) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('get-game-timer', {
        body: { gameId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      const now = Date.now();
      const serverTimeMs = new Date(data.serverTime).getTime();
      const serverOffset = serverTimeMs - now;

      setState(prev => ({
        ...prev,
        timeRemaining: data.timeRemaining,
        phaseDuration: data.phaseDuration,
        phaseExpiresAt: data.phaseExpiresAt,
        serverTime: data.serverTime,
        phase: data.phase as GameStatus,
        isActive: data.timeRemaining !== null && data.timeRemaining > 0,
        isExpired: data.timeRemaining === 0,
        lastSyncTime: now,
        syncError: false,
        isLoading: false
      }));

      console.log('Server timer sync successful:', {
        gameId,
        timeRemaining: data.timeRemaining,
        phase: data.phase,
        serverOffset: Math.round(serverOffset / 1000) + 's'
      });

    } catch (error) {
      console.error('Failed to sync with server timer:', error);

      if (enableFallback) {
        try {
          // Try direct database query as fallback
          const fallbackTime = await getFallbackTimerFromDatabase(gameId);
          if (fallbackTime !== null) {
            setState(prev => ({
              ...prev,
              ...fallbackTime,
              syncError: false,
              isLoading: false
            }));
            console.log('Fallback timer sync successful');
            return;
          }
        } catch (fallbackError) {
          console.error('Fallback timer sync also failed:', fallbackError);
        }
      }

      // Both primary and fallback failed
      setState(prev => ({
        ...prev,
        syncError: true,
        isLoading: false
      }));

      if (onSyncErrorRef.current) {
        onSyncErrorRef.current(error instanceof Error ? error : new Error('Unknown sync error'));
      }
    }
  }, [gameId, enableFallback]);

  // Fallback function for direct database timer calculation
  const getFallbackTimerFromDatabase = useCallback(async (gameId: string): Promise<Partial<ServerTimerState> | null> => {
    try {
      const { data: timerData, error } = await supabase
        .rpc('get_game_timer_state', { game_uuid: gameId });

      if (error || !timerData || timerData.length === 0) {
        return null;
      }

      const timer = timerData[0];
      const now = Date.now();

      return {
        timeRemaining: timer.time_remaining,
        phaseDuration: timer.phase_duration,
        phaseExpiresAt: timer.phase_expires_at,
        serverTime: timer.server_time,
        phase: timer.phase as GameStatus,
        isActive: timer.time_remaining !== null && timer.time_remaining > 0,
        isExpired: timer.time_remaining === 0,
        lastSyncTime: now
      };
    } catch (error) {
      console.error('Fallback database query failed:', error);
      return null;
    }
  }, []);

  // Force immediate sync
  const forceSync = useCallback(async (): Promise<void> => {
    await syncWithServer();
  }, [syncWithServer]);

  // Reset timer state
  const reset = useCallback(() => {
    setState({
      timeRemaining: null,
      phaseDuration: null,
      phaseExpiresAt: null,
      serverTime: null,
      phase: null,
      isActive: false,
      isExpired: false,
      lastSyncTime: 0,
      syncError: false,
      isLoading: false
    });
  }, []);

  // Client-side display countdown (between server syncs)
  useEffect(() => {
    if (state.isActive && state.timeRemaining !== null && state.timeRemaining > 0) {
      displayIntervalRef.current = setInterval(() => {
        setState(prev => {
          if (prev.timeRemaining === null || prev.timeRemaining <= 0) {
            return prev;
          }

          const newTimeRemaining = Math.max(0, prev.timeRemaining - 1);
          const wasExpired = prev.isExpired;
          const isNowExpired = newTimeRemaining === 0;

          // Trigger expiration callback if timer just expired
          if (!wasExpired && isNowExpired && onTimerExpiredRef.current) {
            onTimerExpiredRef.current();
          }

          return {
            ...prev,
            timeRemaining: newTimeRemaining,
            isExpired: isNowExpired,
            isActive: newTimeRemaining > 0
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
        displayIntervalRef.current = null;
      }
    };
  }, [state.isActive, state.timeRemaining]);

  // Set up periodic server sync
  useEffect(() => {
    if (gameId && syncInterval > 0) {
      // Initial sync
      syncWithServer();

      // Set up periodic sync
      syncIntervalRef.current = setInterval(syncWithServer, syncInterval * 1000);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [gameId, syncInterval, syncWithServer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (displayIntervalRef.current) {
        clearInterval(displayIntervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    sync: syncWithServer,
    forceSync,
    reset
  };
}
