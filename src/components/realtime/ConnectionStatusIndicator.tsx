// Connection Status Indicator Component
// Shows real-time connection status with visual feedback

import React from 'react';
import { ConnectionStatus } from '../../types/realtime';

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  status,
  showText = false,
  size = 'md',
  className = ''
}) => {
  const getStatusConfig = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-green-500',
          text: 'Connected',
          icon: '●',
          pulse: false
        };
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          text: 'Connecting...',
          icon: '●',
          pulse: true
        };
      case 'reconnecting':
        return {
          color: 'bg-orange-500',
          text: 'Reconnecting...',
          icon: '●',
          pulse: true
        };
      case 'disconnected':
        return {
          color: 'bg-gray-500',
          text: 'Disconnected',
          icon: '●',
          pulse: false
        };
      case 'error':
        return {
          color: 'bg-red-500',
          text: 'Connection Error',
          icon: '●',
          pulse: false
        };
      default:
        return {
          color: 'bg-gray-500',
          text: 'Unknown',
          icon: '●',
          pulse: false
        };
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          dot: 'w-2 h-2',
          text: 'text-xs'
        };
      case 'md':
        return {
          dot: 'w-3 h-3',
          text: 'text-sm'
        };
      case 'lg':
        return {
          dot: 'w-4 h-4',
          text: 'text-base'
        };
      default:
        return {
          dot: 'w-3 h-3',
          text: 'text-sm'
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = getSizeClasses(size);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative">
        <div
          className={`
            ${config.color} 
            ${sizeClasses.dot} 
            rounded-full
            ${config.pulse ? 'animate-pulse' : ''}
          `}
        />
        {config.pulse && (
          <div
            className={`
              absolute inset-0 
              ${config.color} 
              ${sizeClasses.dot} 
              rounded-full 
              animate-ping 
              opacity-75
            `}
          />
        )}
      </div>
      
      {showText && (
        <span className={`${sizeClasses.text} text-gray-700 dark:text-gray-300`}>
          {config.text}
        </span>
      )}
    </div>
  );
};

export default ConnectionStatusIndicator;
