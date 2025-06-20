// Game Timer Component with Real-time Synchronization
// Displays and synchronizes game timers across all players

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRealtimeGame } from '../../hooks/useRealtimeGame';
import { TimerSyncEvent } from '../../types/realtime';
import { GameStatus } from '../../types/game';

interface GameTimerProps {
  gameId?: string;
  phase: GameStatus;
  duration: number; // Total duration in seconds
  onTimeUp?: () => void;
  onTimerSync?: (timeRemaining: number) => void;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const GameTimer: React.FC<GameTimerProps> = ({
  gameId,
  phase,
  duration,
  onTimeUp,
  onTimerSync,
  showProgress = true,
  size = 'md',
  className = ''
}) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isActive, setIsActive] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { 
    addEventListener, 
    removeEventListener, 
    broadcastTimerSync,
    isConnected,
    activeGameId 
  } = useRealtimeGame({ gameId });

  // Handle timer sync events from other players
  const handleTimerSync = useCallback((event: TimerSyncEvent) => {
    if (event.data.phase === phase) {
      const serverTime = event.data.serverTime;
      const eventTimeRemaining = event.data.timeRemaining;
      const now = Date.now();
      
      // Calculate time drift and adjust
      const timeDrift = now - serverTime;
      const adjustedTimeRemaining = Math.max(0, eventTimeRemaining - Math.floor(timeDrift / 1000));
      
      setTimeRemaining(adjustedTimeRemaining);
      setLastSyncTime(now);
      
      onTimerSync?.(adjustedTimeRemaining);
    }
  }, [phase, onTimerSync]);

  // Set up timer sync event listener
  useEffect(() => {
    addEventListener('timer_sync', handleTimerSync);
    
    return () => {
      removeEventListener('timer_sync', handleTimerSync);
    };
  }, [addEventListener, removeEventListener, handleTimerSync]);

  // Start/stop timer based on phase and connection
  useEffect(() => {
    const shouldBeActive = isConnected && activeGameId && 
      ['drawing', 'voting'].includes(phase);
    
    setIsActive(shouldBeActive);
    
    if (shouldBeActive) {
      setTimeRemaining(duration);
    }
  }, [isConnected, activeGameId, phase, duration]);

  // Timer countdown logic
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = Math.max(0, prev - 1);
          
          // Broadcast timer sync every 10 seconds or when time is up
          if (newTime % 10 === 0 || newTime === 0) {
            broadcastTimerSync(newTime, phase, duration).catch(err => {
              console.warn('Failed to broadcast timer sync:', err);
            });
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, timeRemaining, broadcastTimerSync, phase, duration]);

  // Handle time up
  useEffect(() => {
    if (timeRemaining === 0 && isActive) {
      onTimeUp?.();
    }
  }, [timeRemaining, isActive, onTimeUp]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-16 h-16',
          text: 'text-sm',
          progress: 'stroke-2'
        };
      case 'md':
        return {
          container: 'w-20 h-20',
          text: 'text-base',
          progress: 'stroke-3'
        };
      case 'lg':
        return {
          container: 'w-24 h-24',
          text: 'text-lg',
          progress: 'stroke-4'
        };
      default:
        return {
          container: 'w-20 h-20',
          text: 'text-base',
          progress: 'stroke-3'
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const progress = duration > 0 ? (timeRemaining / duration) * 100 : 0;
  const circumference = 2 * Math.PI * 45; // radius of 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Get color based on time remaining
  const getTimerColor = () => {
    const percentage = (timeRemaining / duration) * 100;
    if (percentage > 50) return 'text-green-600';
    if (percentage > 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = () => {
    const percentage = (timeRemaining / duration) * 100;
    if (percentage > 50) return 'stroke-green-500';
    if (percentage > 25) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  if (!isActive) {
    return (
      <div className={`flex items-center justify-center ${sizeClasses.container} ${className}`}>
        <div className="text-gray-400 text-center">
          <div className={`${sizeClasses.text} font-mono`}>--:--</div>
          <div className="text-xs">Waiting</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center ${sizeClasses.container} ${className}`}>
      {showProgress && (
        <svg
          className="absolute inset-0 w-full h-full transform -rotate-90"
          viewBox="0 0 100 100"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="3"
            className={`${getProgressColor()} transition-all duration-1000 ease-linear`}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
      )}
      
      <div className="text-center z-10">
        <div className={`${sizeClasses.text} font-mono font-bold ${getTimerColor()}`}>
          {formatTime(timeRemaining)}
        </div>
        {lastSyncTime && (
          <div className="text-xs text-gray-500">
            Synced
          </div>
        )}
      </div>
    </div>
  );
};

export default GameTimer;
