// Game Event Handler Component
// Handles real-time game events and provides callbacks for different game phases

import React, { useEffect, useCallback } from 'react';
import { useRealtimeGame } from '../../hooks/useRealtimeGame';
import { 
  GameEvent,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  PlayerReadyEvent,
  GameStartedEvent,
  GamePhaseChangedEvent,
  TimerSyncEvent,
  DrawingSubmittedEvent,
  VoteCastEvent,
  GameCompletedEvent,
  ConnectionStatusEvent
} from '../../types/realtime';

interface GameEventHandlerProps {
  gameId?: string;
  
  // Event callbacks
  onPlayerJoined?: (event: PlayerJoinedEvent) => void;
  onPlayerLeft?: (event: PlayerLeftEvent) => void;
  onPlayerReady?: (event: PlayerReadyEvent) => void;
  onGameStarted?: (event: GameStartedEvent) => void;
  onPhaseChanged?: (event: GamePhaseChangedEvent) => void;
  onTimerSync?: (event: TimerSyncEvent) => void;
  onDrawingSubmitted?: (event: DrawingSubmittedEvent) => void;
  onVoteCast?: (event: VoteCastEvent) => void;
  onGameCompleted?: (event: GameCompletedEvent) => void;
  onConnectionStatus?: (event: ConnectionStatusEvent) => void;
  
  // General event callback
  onGameEvent?: (event: GameEvent) => void;
  
  // Error callback
  onError?: (error: string) => void;
  
  children?: React.ReactNode;
}

const GameEventHandler: React.FC<GameEventHandlerProps> = ({
  gameId,
  onPlayerJoined,
  onPlayerLeft,
  onPlayerReady,
  onGameStarted,
  onPhaseChanged,
  onTimerSync,
  onDrawingSubmitted,
  onVoteCast,
  onGameCompleted,
  onConnectionStatus,
  onGameEvent,
  onError,
  children
}) => {
  const { 
    addEventListener, 
    removeEventListener, 
    error,
    isConnected,
    activeGameId 
  } = useRealtimeGame({ gameId });

  // Handle player joined events
  const handlePlayerJoined = useCallback((event: GameEvent) => {
    try {
      const playerJoinedEvent = event as PlayerJoinedEvent;
      onPlayerJoined?.(playerJoinedEvent);
      onGameEvent?.(event);
    } catch (err) {
      onError?.(`Error handling player joined event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [onPlayerJoined, onGameEvent, onError]);

  // Handle player left events
  const handlePlayerLeft = useCallback((event: GameEvent) => {
    try {
      const playerLeftEvent = event as PlayerLeftEvent;
      onPlayerLeft?.(playerLeftEvent);
      onGameEvent?.(event);
    } catch (err) {
      onError?.(`Error handling player left event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [onPlayerLeft, onGameEvent, onError]);

  // Handle player ready events
  const handlePlayerReady = useCallback((event: GameEvent) => {
    try {
      const playerReadyEvent = event as PlayerReadyEvent;
      onPlayerReady?.(playerReadyEvent);
      onGameEvent?.(event);
    } catch (err) {
      onError?.(`Error handling player ready event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [onPlayerReady, onGameEvent, onError]);

  // Handle game started events
  const handleGameStarted = useCallback((event: GameEvent) => {
    try {
      const gameStartedEvent = event as GameStartedEvent;
      onGameStarted?.(gameStartedEvent);
      onGameEvent?.(event);
    } catch (err) {
      onError?.(`Error handling game started event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [onGameStarted, onGameEvent, onError]);

  // Handle phase change events
  const handlePhaseChanged = useCallback((event: GameEvent) => {
    try {
      const phaseChangedEvent = event as GamePhaseChangedEvent;
      onPhaseChanged?.(phaseChangedEvent);
      onGameEvent?.(event);
    } catch (err) {
      onError?.(`Error handling phase changed event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [onPhaseChanged, onGameEvent, onError]);

  // Handle timer sync events
  const handleTimerSync = useCallback((event: GameEvent) => {
    try {
      const timerSyncEvent = event as TimerSyncEvent;
      onTimerSync?.(timerSyncEvent);
      onGameEvent?.(event);
    } catch (err) {
      onError?.(`Error handling timer sync event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [onTimerSync, onGameEvent, onError]);

  // Handle drawing submitted events
  const handleDrawingSubmitted = useCallback((event: GameEvent) => {
    try {
      const drawingSubmittedEvent = event as DrawingSubmittedEvent;
      onDrawingSubmitted?.(drawingSubmittedEvent);
      onGameEvent?.(event);
    } catch (err) {
      onError?.(`Error handling drawing submitted event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [onDrawingSubmitted, onGameEvent, onError]);

  // Handle vote cast events
  const handleVoteCast = useCallback((event: GameEvent) => {
    try {
      const voteCastEvent = event as VoteCastEvent;
      onVoteCast?.(voteCastEvent);
      onGameEvent?.(event);
    } catch (err) {
      onError?.(`Error handling vote cast event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [onVoteCast, onGameEvent, onError]);

  // Handle game completed events
  const handleGameCompleted = useCallback((event: GameEvent) => {
    try {
      const gameCompletedEvent = event as GameCompletedEvent;
      onGameCompleted?.(gameCompletedEvent);
      onGameEvent?.(event);
    } catch (err) {
      onError?.(`Error handling game completed event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [onGameCompleted, onGameEvent, onError]);

  // Handle connection status events
  const handleConnectionStatus = useCallback((event: GameEvent) => {
    try {
      const connectionStatusEvent = event as ConnectionStatusEvent;
      onConnectionStatus?.(connectionStatusEvent);
      onGameEvent?.(event);
    } catch (err) {
      onError?.(`Error handling connection status event: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [onConnectionStatus, onGameEvent, onError]);

  // Set up event listeners
  useEffect(() => {
    if (!isConnected || !activeGameId) {
      return;
    }

    // Add event listeners
    addEventListener('player_joined', handlePlayerJoined);
    addEventListener('player_left', handlePlayerLeft);
    addEventListener('player_ready', handlePlayerReady);
    addEventListener('game_started', handleGameStarted);
    addEventListener('phase_changed', handlePhaseChanged);
    addEventListener('timer_sync', handleTimerSync);
    addEventListener('drawing_submitted', handleDrawingSubmitted);
    addEventListener('vote_cast', handleVoteCast);
    addEventListener('game_completed', handleGameCompleted);
    addEventListener('connection_status', handleConnectionStatus);

    // Cleanup function
    return () => {
      removeEventListener('player_joined', handlePlayerJoined);
      removeEventListener('player_left', handlePlayerLeft);
      removeEventListener('player_ready', handlePlayerReady);
      removeEventListener('game_started', handleGameStarted);
      removeEventListener('phase_changed', handlePhaseChanged);
      removeEventListener('timer_sync', handleTimerSync);
      removeEventListener('drawing_submitted', handleDrawingSubmitted);
      removeEventListener('vote_cast', handleVoteCast);
      removeEventListener('game_completed', handleGameCompleted);
      removeEventListener('connection_status', handleConnectionStatus);
    };
  }, [
    isConnected,
    activeGameId,
    addEventListener,
    removeEventListener,
    handlePlayerJoined,
    handlePlayerLeft,
    handlePlayerReady,
    handleGameStarted,
    handlePhaseChanged,
    handleTimerSync,
    handleDrawingSubmitted,
    handleVoteCast,
    handleGameCompleted,
    handleConnectionStatus
  ]);

  // Handle errors from the real-time service
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // This component doesn't render anything by default, but can render children
  return <>{children}</>;
};

export default GameEventHandler;
