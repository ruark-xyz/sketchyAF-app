// React Hook for Real-time Game Functionality
// Provides easy interface for components to interact with real-time game features

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeGameService } from '../services/RealtimeGameService';
import { useAuth } from '../context/AuthContext';
import { 
  GameEvent,
  GameEventType,
  PresenceEvent,
  ConnectionStatus,
  GameEventHandler,
  PresenceEventHandler,
  ConnectionStatusHandler
} from '../types/realtime';
import { ServiceResponse } from '../types/game';

interface UseRealtimeGameOptions {
  gameId?: string;
  autoConnect?: boolean;
}

interface UseRealtimeGameReturn {
  // Connection state
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  isInitialized: boolean;
  
  // Game state
  activeGameId: string | null;
  gamePresence: string[];
  
  // Actions
  initializeRealtime: () => Promise<ServiceResponse<void>>;
  joinGame: (gameId: string) => Promise<ServiceResponse<void>>;
  leaveGame: () => Promise<ServiceResponse<void>>;
  broadcastPlayerReady: (isReady: boolean, selectedBoosterPack?: string) => Promise<ServiceResponse<void>>;
  broadcastTimerSync: (timeRemaining: number, phase: any, totalDuration: number) => Promise<ServiceResponse<void>>;
  refreshPresence: () => Promise<void>;
  
  // Event listeners
  addEventListener: (eventType: GameEventType, handler: GameEventHandler) => void;
  removeEventListener: (eventType: GameEventType, handler: GameEventHandler) => void;
  addPresenceListener: (handler: PresenceEventHandler) => void;
  removePresenceListener: (handler: PresenceEventHandler) => void;
  
  // Error state
  error: string | null;
  clearError: () => void;
}

export const useRealtimeGame = (options: UseRealtimeGameOptions = {}): UseRealtimeGameReturn => {
  const { currentUser, isLoggedIn } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [gamePresence, setGamePresence] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const realtimeServiceRef = useRef<RealtimeGameService | null>(null);
  const eventHandlersRef = useRef<Map<GameEventType, Set<GameEventHandler>>>(new Map());
  const presenceHandlersRef = useRef<Set<PresenceEventHandler>>(new Set());

  // Initialize real-time service
  const initializeRealtime = useCallback(async (): Promise<ServiceResponse<void>> => {
    if (!currentUser || !isLoggedIn) {
      const errorMsg = 'User not authenticated';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'UNAUTHENTICATED' };
    }

    try {
      if (!realtimeServiceRef.current) {
        realtimeServiceRef.current = RealtimeGameService.getInstance();
      }

      const result = await realtimeServiceRef.current.initialize(currentUser);
      
      if (result.success) {
        setIsInitialized(true);
        setError(null);
        
        // Set up connection status monitoring
        realtimeServiceRef.current.addConnectionStatusListener(handleConnectionStatusChange);
        
        // Set initial connection status
        const status = realtimeServiceRef.current.getConnectionStatus();
        setConnectionStatus(status);
      } else {
        setError(result.error || 'Failed to initialize real-time service');
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'INITIALIZATION_FAILED' };
    }
  }, [currentUser, isLoggedIn]);

  // Join a game
  const joinGame = useCallback(async (gameId: string): Promise<ServiceResponse<void>> => {
    if (!realtimeServiceRef.current || !isInitialized) {
      const errorMsg = 'Real-time service not initialized';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'NOT_INITIALIZED' };
    }

    try {
      const result = await realtimeServiceRef.current.joinGame(gameId);
      
      if (result.success) {
        setActiveGameId(gameId);
        setError(null);
        
        // Refresh presence after joining
        await refreshPresence();
      } else {
        setError(result.error || 'Failed to join game');
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'JOIN_FAILED' };
    }
  }, [isInitialized]);

  // Leave current game
  const leaveGame = useCallback(async (): Promise<ServiceResponse<void>> => {
    if (!realtimeServiceRef.current) {
      return { success: true }; // Nothing to leave
    }

    try {
      const result = await realtimeServiceRef.current.leaveGame();
      
      if (result.success) {
        setActiveGameId(null);
        setGamePresence([]);
        setError(null);
      } else {
        setError(result.error || 'Failed to leave game');
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'LEAVE_FAILED' };
    }
  }, []);

  // Broadcast player ready status
  const broadcastPlayerReady = useCallback(async (
    isReady: boolean,
    selectedBoosterPack?: string
  ): Promise<ServiceResponse<void>> => {
    if (!realtimeServiceRef.current) {
      const errorMsg = 'Real-time service not initialized';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'SERVICE_NOT_INITIALIZED' };
    }

    if (!activeGameId) {
      const errorMsg = 'No active game - must join a game first';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'NO_ACTIVE_GAME' };
    }

    try {
      const result = await realtimeServiceRef.current.broadcastPlayerReady(isReady, selectedBoosterPack);
      
      if (!result.success) {
        setError(result.error || 'Failed to broadcast player ready status');
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'BROADCAST_FAILED' };
    }
  }, [activeGameId]);

  // Broadcast timer sync
  const broadcastTimerSync = useCallback(async (
    timeRemaining: number, 
    phase: any, 
    totalDuration: number
  ): Promise<ServiceResponse<void>> => {
    if (!realtimeServiceRef.current || !activeGameId) {
      const errorMsg = 'No active game or real-time service not initialized';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'NO_ACTIVE_GAME' };
    }

    try {
      const result = await realtimeServiceRef.current.broadcastTimerSync(timeRemaining, phase, totalDuration);
      
      if (!result.success) {
        setError(result.error || 'Failed to broadcast timer sync');
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'BROADCAST_FAILED' };
    }
  }, [activeGameId]);

  // Refresh game presence
  const refreshPresence = useCallback(async (): Promise<void> => {
    if (!realtimeServiceRef.current || !activeGameId) {
      return;
    }

    try {
      const result = await realtimeServiceRef.current.getGamePresence();
      if (result.success && result.data) {
        setGamePresence(result.data);
      }
    } catch (err) {
      console.warn('Failed to refresh presence:', err);
    }
  }, [activeGameId]);

  // Event listener management
  const addEventListener = useCallback((eventType: GameEventType, handler: GameEventHandler): void => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set());
    }
    eventHandlersRef.current.get(eventType)!.add(handler);

    if (realtimeServiceRef.current) {
      realtimeServiceRef.current.addEventListener(eventType, handler);
    }
  }, []);

  const removeEventListener = useCallback((eventType: GameEventType, handler: GameEventHandler): void => {
    const handlers = eventHandlersRef.current.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }

    if (realtimeServiceRef.current) {
      realtimeServiceRef.current.removeEventListener(eventType, handler);
    }
  }, []);

  const addPresenceListener = useCallback((handler: PresenceEventHandler): void => {
    presenceHandlersRef.current.add(handler);

    if (realtimeServiceRef.current) {
      realtimeServiceRef.current.addPresenceListener(handler);
    }
  }, []);

  const removePresenceListener = useCallback((handler: PresenceEventHandler): void => {
    presenceHandlersRef.current.delete(handler);

    if (realtimeServiceRef.current) {
      realtimeServiceRef.current.removePresenceListener(handler);
    }
  }, []);

  // Clear error
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // Connection status handler
  const handleConnectionStatusChange: ConnectionStatusHandler = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    
    // Refresh presence when reconnected
    if (status === 'connected' && activeGameId) {
      refreshPresence();
    }
  }, [activeGameId, refreshPresence]);

  // Auto-initialize when user is available
  useEffect(() => {
    if (currentUser && isLoggedIn && !isInitialized && options.autoConnect !== false) {
      initializeRealtime();
    }
  }, [currentUser, isLoggedIn, isInitialized, initializeRealtime, options.autoConnect]);

  // Auto-join game if specified
  useEffect(() => {
    if (options.gameId && isInitialized && !activeGameId) {
      joinGame(options.gameId);
    }
  }, [options.gameId, isInitialized, activeGameId, joinGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realtimeServiceRef.current) {
        // Remove all event listeners
        eventHandlersRef.current.forEach((handlers, eventType) => {
          handlers.forEach(handler => {
            realtimeServiceRef.current?.removeEventListener(eventType, handler);
          });
        });

        presenceHandlersRef.current.forEach(handler => {
          realtimeServiceRef.current?.removePresenceListener(handler);
        });

        // Remove connection status listener
        realtimeServiceRef.current.removeConnectionStatusListener(handleConnectionStatusChange);
      }
    };
  }, [handleConnectionStatusChange]);

  return {
    // Connection state
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    isInitialized,
    
    // Game state
    activeGameId,
    gamePresence,
    
    // Actions
    initializeRealtime,
    joinGame,
    leaveGame,
    broadcastPlayerReady,
    broadcastTimerSync,
    refreshPresence,
    
    // Event listeners
    addEventListener,
    removeEventListener,
    addPresenceListener,
    removePresenceListener,
    
    // Error state
    error,
    clearError
  };
};
