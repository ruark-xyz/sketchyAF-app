// Drawing Timer Hook - Manages drawing session timers with game synchronization
// Provides countdown logic, automatic submission, and real-time synchronization

import { useState, useEffect, useCallback, useRef } from 'react';
import { GameStatus } from '../types/game';
import { useGame } from '../context/GameContext';
import { useRealtimeGame } from './useRealtimeGame';
import { TimerSyncEvent } from '../types/realtime';

export interface UseDrawingTimerOptions {
  gameId?: string;
  autoSubmitOnExpiry?: boolean;
  syncInterval?: number; // Sync interval in seconds
  warningThresholds?: number[]; // Warning thresholds in seconds
}

export interface UseDrawingTimerReturn {
  // Timer State
  timeRemaining: number;
  totalDuration: number;
  isActive: boolean;
  isExpired: boolean;
  isPaused: boolean;
  
  // Timer Status
  phase: GameStatus | null;
  progress: number; // 0-1
  formattedTime: string;
  
  // Warning System
  isWarning: boolean;
  warningLevel: 'none' | 'low' | 'medium' | 'high';
  
  // Actions
  start: (duration: number, phase: GameStatus) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  sync: (timeRemaining: number, totalDuration: number) => void;
  
  // Event Handlers
  onTimeExpired: (callback: () => void) => void;
  onWarning: (callback: (level: string, timeRemaining: number) => void) => void;
  onSync: (callback: (timeRemaining: number) => void) => void;
  onAutoSubmit: (callback: () => void) => void;
}

export function useDrawingTimer(options: UseDrawingTimerOptions = {}): UseDrawingTimerReturn {
  const {
    gameId,
    autoSubmitOnExpiry = true,
    syncInterval = 5, // Sync every 5 seconds
    warningThresholds = [60, 30, 10] // 1 minute, 30 seconds, 10 seconds
  } = options;

  // State
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [phase, setPhase] = useState<GameStatus | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  // Refs for callbacks
  const timeExpiredCallbackRef = useRef<(() => void) | null>(null);
  const warningCallbackRef = useRef<((level: string, timeRemaining: number) => void) | null>(null);
  const syncCallbackRef = useRef<((timeRemaining: number) => void) | null>(null);
  const autoSubmitCallbackRef = useRef<(() => void) | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Game context
  const { currentGame, drawingContext, submitDrawing } = useGame();
  
  // Real-time integration
  const { 
    broadcastTimerSync, 
    addEventListener, 
    removeEventListener,
    isConnected 
  } = useRealtimeGame({ gameId });

  // Computed values
  const progress = totalDuration > 0 ? Math.max(0, Math.min(1, (totalDuration - timeRemaining) / totalDuration)) : 0;
  
  // Warning level calculation
  const warningLevel = (() => {
    if (!isActive || timeRemaining <= 0) return 'none';
    if (timeRemaining <= warningThresholds[2]) return 'high';
    if (timeRemaining <= warningThresholds[1]) return 'medium';
    if (timeRemaining <= warningThresholds[0]) return 'low';
    return 'none';
  })();
  
  const isWarning = warningLevel !== 'none';

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.floor(Math.abs(seconds) % 60);
    const sign = seconds < 0 ? '-' : '';
    return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const formattedTime = formatTime(timeRemaining);

  // Timer tick function
  const tick = useCallback(() => {
    setTimeRemaining(prev => {
      const newTime = prev - 1;
      
      // Check for warnings
      if (warningCallbackRef.current && isActive) {
        const currentLevel = (() => {
          if (newTime <= warningThresholds[2]) return 'high';
          if (newTime <= warningThresholds[1]) return 'medium';
          if (newTime <= warningThresholds[0]) return 'low';
          return 'none';
        })();
        
        if (currentLevel !== 'none' && warningThresholds.includes(newTime)) {
          warningCallbackRef.current(currentLevel, newTime);
        }
      }
      
      // Check for expiry
      if (newTime <= 0 && isActive) {
        setIsActive(false);
        setIsExpired(true);

        // Call expiry callback
        if (timeExpiredCallbackRef.current) {
          timeExpiredCallbackRef.current();
        }

        // Auto-submit if enabled and in drawing context
        if (autoSubmitOnExpiry && drawingContext && !drawingContext.hasSubmitted) {
          // Call auto-submit callback if available
          if (autoSubmitCallbackRef.current) {
            autoSubmitCallbackRef.current();
          } else {
            console.log('Auto-submit enabled but no callback provided');
          }
        }
      }
      
      return Math.max(0, newTime);
    });
  }, [isActive, warningThresholds, autoSubmitOnExpiry, drawingContext]);

  // Start timer
  const start = useCallback((duration: number, gamePhase: GameStatus) => {
    setTimeRemaining(duration);
    setTotalDuration(duration);
    setPhase(gamePhase);
    setIsActive(true);
    setIsPaused(false);
    setIsExpired(false);
    setLastSyncTime(Date.now());
  }, []);

  // Pause timer
  const pause = useCallback(() => {
    setIsPaused(true);
    setIsActive(false);
  }, []);

  // Resume timer
  const resume = useCallback(() => {
    setIsPaused(false);
    setIsActive(true);
  }, []);

  // Stop timer
  const stop = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
  }, []);

  // Reset timer
  const reset = useCallback(() => {
    setTimeRemaining(0);
    setTotalDuration(0);
    setIsActive(false);
    setIsPaused(false);
    setIsExpired(false);
    setPhase(null);
    setLastSyncTime(0);
  }, []);

  // Sync timer with external source
  const sync = useCallback((newTimeRemaining: number, newTotalDuration: number) => {
    setTimeRemaining(newTimeRemaining);
    setTotalDuration(newTotalDuration);
    setLastSyncTime(Date.now());
    
    if (syncCallbackRef.current) {
      syncCallbackRef.current(newTimeRemaining);
    }
  }, []);

  // Broadcast timer sync to other players
  const broadcastSync = useCallback(async () => {
    if (isConnected && phase && currentGame) {
      try {
        await broadcastTimerSync(timeRemaining, phase, totalDuration);
      } catch (error) {
        console.warn('Failed to broadcast timer sync:', error);
      }
    }
  }, [isConnected, phase, currentGame, timeRemaining, totalDuration, broadcastTimerSync]);

  // Event handler setters
  const onTimeExpired = useCallback((callback: () => void) => {
    timeExpiredCallbackRef.current = callback;
  }, []);

  const onWarning = useCallback((callback: (level: string, timeRemaining: number) => void) => {
    warningCallbackRef.current = callback;
  }, []);

  const onSync = useCallback((callback: (timeRemaining: number) => void) => {
    syncCallbackRef.current = callback;
  }, []);

  const onAutoSubmit = useCallback((callback: () => void) => {
    autoSubmitCallbackRef.current = callback;
  }, []);

  // Handle timer sync events from real-time
  const handleTimerSync = useCallback((event: TimerSyncEvent) => {
    if (event.data.gameId === currentGame?.id) {
      sync(event.data.timeRemaining, event.data.totalDuration);
    }
  }, [currentGame?.id, sync]);

  // Set up timer interval
  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, tick]);

  // Set up sync interval
  useEffect(() => {
    if (isActive && isConnected && syncInterval > 0) {
      syncIntervalRef.current = setInterval(broadcastSync, syncInterval * 1000);
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [isActive, isConnected, syncInterval, broadcastSync]);

  // Set up real-time event listeners
  useEffect(() => {
    addEventListener('timer_sync', handleTimerSync);
    
    return () => {
      removeEventListener('timer_sync', handleTimerSync);
    };
  }, [addEventListener, removeEventListener, handleTimerSync]);

  // Initialize timer from game context
  useEffect(() => {
    if (currentGame && drawingContext && currentGame.status === 'drawing' && !isActive) {
      start(drawingContext.timeRemaining, 'drawing');
    }
  }, [currentGame, drawingContext, isActive, start]);

  return {
    // Timer State
    timeRemaining,
    totalDuration,
    isActive,
    isExpired,
    isPaused,
    
    // Timer Status
    phase,
    progress,
    formattedTime,
    
    // Warning System
    isWarning,
    warningLevel,
    
    // Actions
    start,
    pause,
    resume,
    stop,
    reset,
    sync,
    
    // Event Handlers
    onTimeExpired,
    onWarning,
    onSync,
    onAutoSubmit
  };
}
