// Simplified Game Timer Component
// Display-only timer that shows server-calculated time remaining

import React from 'react';
import { useSimpleTimer } from '../../hooks/useSimpleTimer';
import { GameStatus } from '../../types/game';

interface GameTimerProps {
  gameId: string;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const GameTimer: React.FC<GameTimerProps> = ({
  gameId,
  showProgress = true,
  size = 'md',
  className = ''
}) => {
  // Simple timer display using server state
  const {
    timeRemaining,
    phaseDuration,
    phase,
    formattedTime,
    isLoading,
    error
  } = useSimpleTimer({ gameId });

  // Calculate progress for display
  const progress = phaseDuration && timeRemaining !== null
    ? Math.max(0, Math.min(100, ((phaseDuration - timeRemaining) / phaseDuration) * 100))
    : 0;

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

  // Calculate display values
  const effectiveTimeRemaining = timeRemaining ?? 0;
  const circumference = 2 * Math.PI * 45; // radius of 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Get color based on time remaining percentage
  const getTimerColor = () => {
    if (error) return 'text-red-600';
    if (isLoading) return 'text-gray-500';
    if (effectiveTimeRemaining === 0) return 'text-red-600';

    if (progress < 50) return 'text-green-600';
    if (progress < 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = () => {
    if (error) return 'stroke-red-500';
    if (isLoading) return 'stroke-gray-400';

    if (progress < 50) return 'stroke-green-500';
    if (progress < 75) return 'stroke-yellow-500';
    return 'stroke-red-500';
  };

  // Show different states
  if (error) {
    return (
      <div className={`flex items-center justify-center ${sizeClasses.container} ${className}`}>
        <div className="text-red-500 text-center">
          <div className={`${sizeClasses.text} font-mono`}>--:--</div>
          <div className="text-xs">Error</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${sizeClasses.container} ${className}`}>
        <div className="text-gray-500 text-center">
          <div className={`${sizeClasses.text} font-mono`}>--:--</div>
          <div className="text-xs">Loading...</div>
        </div>
      </div>
    );
  }

  if (timeRemaining === null) {
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
          {formattedTime}
        </div>
        <div className="text-xs text-gray-500">
          {phase || 'Timer'}
        </div>
      </div>
    </div>
  );
};

export default GameTimer;
