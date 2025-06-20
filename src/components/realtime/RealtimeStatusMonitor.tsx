// Real-time Status Monitor Component
// Displays connection health, error information, and system status

import React, { useState, useEffect } from 'react';
import { useRealtimeGame } from '../../hooks/useRealtimeGame';
import { RealtimeErrorHandler } from '../../utils/realtimeErrorHandler';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';

interface RealtimeStatusMonitorProps {
  showDetails?: boolean;
  showErrors?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

interface SystemStatus {
  isConnected: boolean;
  connectionStatus: string;
  isDegraded: boolean;
  totalErrors: number;
  recentErrors: number;
  errorsByCode: Record<string, number>;
  activeGameId: string | null;
  gamePresenceCount: number;
}

const RealtimeStatusMonitor: React.FC<RealtimeStatusMonitorProps> = ({
  showDetails = false,
  showErrors = false,
  autoRefresh = true,
  refreshInterval = 5000,
  className = ''
}) => {
  const { 
    isConnected, 
    connectionStatus, 
    activeGameId, 
    gamePresence,
    error 
  } = useRealtimeGame();
  
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    isConnected: false,
    connectionStatus: 'disconnected',
    isDegraded: false,
    totalErrors: 0,
    recentErrors: 0,
    errorsByCode: {},
    activeGameId: null,
    gamePresenceCount: 0
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Update system status
  const updateSystemStatus = () => {
    const errorHandler = RealtimeErrorHandler.getInstance();
    const errorStats = errorHandler.getErrorStats();

    setSystemStatus({
      isConnected,
      connectionStatus,
      isDegraded: errorStats.isDegraded,
      totalErrors: errorStats.totalErrors,
      recentErrors: errorStats.recentErrors,
      errorsByCode: errorStats.errorsByCode,
      activeGameId,
      gamePresenceCount: gamePresence.length
    });
  };

  // Auto-refresh system status
  useEffect(() => {
    updateSystemStatus();

    if (autoRefresh) {
      const interval = setInterval(updateSystemStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [
    isConnected, 
    connectionStatus, 
    activeGameId, 
    gamePresence, 
    autoRefresh, 
    refreshInterval
  ]);

  // Get status color based on system health
  const getStatusColor = () => {
    if (!systemStatus.isConnected) return 'text-red-600';
    if (systemStatus.isDegraded) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Get status text
  const getStatusText = () => {
    if (!systemStatus.isConnected) return 'Offline';
    if (systemStatus.isDegraded) return 'Degraded';
    return 'Healthy';
  };

  // Format error code for display
  const formatErrorCode = (code: string) => {
    return code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <ConnectionStatusIndicator 
            status={connectionStatus} 
            size="sm" 
          />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Real-time Status
            </div>
            <div className={`text-xs ${getStatusColor()}`}>
              {getStatusText()}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          {systemStatus.activeGameId && (
            <div className="flex items-center space-x-1">
              <span>Game:</span>
              <span className="font-mono">{systemStatus.activeGameId.slice(0, 8)}</span>
            </div>
          )}
          
          {systemStatus.gamePresenceCount > 0 && (
            <div className="flex items-center space-x-1">
              <span>Players:</span>
              <span className="font-medium">{systemStatus.gamePresenceCount}</span>
            </div>
          )}

          {systemStatus.recentErrors > 0 && (
            <div className="flex items-center space-x-1 text-red-500">
              <span>Errors:</span>
              <span className="font-medium">{systemStatus.recentErrors}</span>
            </div>
          )}

          <div className="text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-3">
          {/* Connection details */}
          {showDetails && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Connection Details
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className={`ml-2 font-medium ${getStatusColor()}`}>
                    {systemStatus.connectionStatus}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Health:</span>
                  <span className={`ml-2 font-medium ${getStatusColor()}`}>
                    {getStatusText()}
                  </span>
                </div>
                {systemStatus.activeGameId && (
                  <>
                    <div className="col-span-2">
                      <span className="text-gray-500">Active Game:</span>
                      <span className="ml-2 font-mono text-xs">
                        {systemStatus.activeGameId}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Players Online:</span>
                      <span className="ml-2 font-medium">
                        {systemStatus.gamePresenceCount}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Error information */}
          {showErrors && systemStatus.totalErrors > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Error Summary
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Errors:</span>
                  <span className="font-medium">{systemStatus.totalErrors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Recent (5min):</span>
                  <span className={`font-medium ${systemStatus.recentErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {systemStatus.recentErrors}
                  </span>
                </div>
                
                {Object.keys(systemStatus.errorsByCode).length > 0 && (
                  <div className="mt-2">
                    <div className="text-gray-500 mb-1">Error Types:</div>
                    <div className="space-y-1">
                      {Object.entries(systemStatus.errorsByCode).map(([code, count]) => (
                        <div key={code} className="flex justify-between text-xs">
                          <span className="text-gray-600">{formatErrorCode(code)}:</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
              <div className="text-xs text-red-800 dark:text-red-200">
                <div className="font-medium">Current Error:</div>
                <div className="mt-1 font-mono">{error}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={updateSystemStatus}
              className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              Refresh
            </button>
            
            {systemStatus.totalErrors > 0 && (
              <button
                onClick={() => {
                  RealtimeErrorHandler.getInstance().clearErrors();
                  updateSystemStatus();
                }}
                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Clear Errors
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeStatusMonitor;
