import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRealtimeGame } from './useRealtimeGame';
import { GameService } from '../services/GameService';
import { UnifiedGameService } from '../services/UnifiedGameService';
import { Game, GameParticipant, ServiceResponse, GAME_CONSTANTS } from '../types/game';
import { GameEventType, PlayerJoinedEvent, PlayerLeftEvent, PlayerReadyEvent } from '../types/realtime';

export interface RealtimeLobbyState {
  // Game state
  game: Game | null;
  participants: GameParticipant[];
  playerCount: number;
  isGameFull: boolean;
  canAutoStart: boolean;
  
  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // User state
  isInLobby: boolean;
  isReady: boolean;
  hasJoined: boolean;
}

export interface UseRealtimeLobbyOptions {
  gameId?: string;
  autoJoin?: boolean;
  autoStart?: boolean; // Whether to auto-start when reaching max players
}

export interface UseRealtimeLobbyReturn extends RealtimeLobbyState {
  // Actions
  joinLobby: (gameId: string) => Promise<ServiceResponse<void>>;
  leaveLobby: () => Promise<ServiceResponse<void>>;
  toggleReady: () => Promise<ServiceResponse<void>>;
  refreshLobby: () => Promise<void>;
  
  // Events
  onGameStarted?: (gameId: string) => void;
  onPlayerJoined?: (participant: GameParticipant) => void;
  onPlayerLeft?: (userId: string) => void;
}

export const useRealtimeLobby = (
  options: UseRealtimeLobbyOptions = {},
  callbacks?: {
    onGameStarted?: (gameId: string) => void;
    onPlayerJoined?: (participant: GameParticipant) => void;
    onPlayerLeft?: (userId: string) => void;
    onError?: (error: string) => void;
  }
): UseRealtimeLobbyReturn => {
  const { currentUser, isLoggedIn } = useAuth();
  const { gameId: initialGameId, autoJoin = true, autoStart = true } = options;
  
  // State
  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<GameParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  
  // Real-time connection
  const {
    isConnected,
    activeGameId,
    gamePresence,
    initializeRealtime,
    joinGame: joinRealtimeGame,
    leaveGame: leaveRealtimeGame,
    broadcastPlayerReady,
    addEventListener,
    removeEventListener,
    addPresenceListener,
    removePresenceListener,
    error: realtimeError
  } = useRealtimeGame({ autoConnect: true });
  
  // Refs for stable callbacks
  const gameIdRef = useRef<string | null>(null);
  const autoStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Computed state
  const playerCount = participants.length;
  const isGameFull = game ? playerCount >= game.max_players : false;
  const isInLobby = hasJoined && !!activeGameId;
  const canAutoStart = autoStart && 
    game?.status === 'waiting' && 
    playerCount >= GAME_CONSTANTS.DEFAULT_PLAYERS && 
    participants.every(p => p.is_ready);
  
  // Clear error helper
  const clearError = useCallback(() => setError(null), []);
  
  // Refresh lobby data
  const refreshLobby = useCallback(async () => {
    if (!gameIdRef.current) return;
    
    try {
      // Fetch game data
      const gameResult = await GameService.getGame(gameIdRef.current);
      if (gameResult.success && gameResult.data) {
        setGame(gameResult.data);
      }
      
      // Fetch participants
      const participantsResult = await GameService.getGameParticipants(gameIdRef.current);
      if (participantsResult.success && participantsResult.data) {
        setParticipants(participantsResult.data);
        
        // Check if current user is in participants
        const userParticipant = participantsResult.data.find(p => p.user_id === currentUser?.id);
        if (userParticipant) {
          setHasJoined(true);
          setIsReady(userParticipant.is_ready);
        }
      }
    } catch (err) {
      console.error('Error refreshing lobby:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh lobby');
    }
  }, [currentUser?.id]);
  
  // Join lobby
  const joinLobby = useCallback(async (gameId: string): Promise<ServiceResponse<void>> => {
    if (!isLoggedIn || !currentUser) {
      const errorMsg = 'Must be logged in to join lobby';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'UNAUTHENTICATED' };
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      // Join game in database
      const joinResult = await GameService.joinGame({ game_id: gameId });
      if (!joinResult.success) {
        setError(joinResult.error || 'Failed to join game');
        return joinResult;
      }
      
      // Join real-time channel
      const realtimeResult = await joinRealtimeGame(gameId);
      if (!realtimeResult.success) {
        console.warn('Failed to join real-time channel:', realtimeResult.error);
        // Don't fail the entire operation
      }
      
      // Update state
      gameIdRef.current = gameId;
      setHasJoined(true);
      
      // Refresh lobby data
      await refreshLobby();
      
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'UNKNOWN_ERROR' };
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, currentUser, joinRealtimeGame, refreshLobby, clearError]);
  
  // Leave lobby
  const leaveLobby = useCallback(async (): Promise<ServiceResponse<void>> => {
    if (!gameIdRef.current || !currentUser) {
      return { success: false, error: 'Not in a lobby', code: 'INVALID_STATE' };
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      // Leave game in database
      const leaveResult = await GameService.leaveGame(gameIdRef.current);
      if (!leaveResult.success) {
        console.warn('Failed to leave game in database:', leaveResult.error);
      }
      
      // Leave real-time channel
      const realtimeResult = await leaveRealtimeGame();
      if (!realtimeResult.success) {
        console.warn('Failed to leave real-time channel:', realtimeResult.error);
      }
      
      // Reset state
      gameIdRef.current = null;
      setGame(null);
      setParticipants([]);
      setHasJoined(false);
      setIsReady(false);
      
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'UNKNOWN_ERROR' };
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, leaveRealtimeGame, clearError]);
  
  // Toggle ready status
  const toggleReady = useCallback(async (): Promise<ServiceResponse<void>> => {
    if (!gameIdRef.current || !hasJoined) {
      const errorMsg = 'Not in a lobby';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'INVALID_STATE' };
    }
    
    setIsLoading(true);
    clearError();
    
    try {
      const newReadyState = !isReady;
      
      // Update ready status in database
      const updateResult = await GameService.updateReadyStatus(gameIdRef.current, newReadyState);
      if (!updateResult.success) {
        setError(updateResult.error || 'Failed to update ready status');
        return updateResult;
      }
      
      // Broadcast ready status
      const broadcastResult = await broadcastPlayerReady(newReadyState);
      if (!broadcastResult.success) {
        console.warn('Failed to broadcast ready status:', broadcastResult.error);
      }
      
      // Update local state
      setIsReady(newReadyState);
      
      // Refresh lobby to get updated participant data
      await refreshLobby();
      
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'UNKNOWN_ERROR' };
    } finally {
      setIsLoading(false);
    }
  }, [gameIdRef.current, hasJoined, isReady, broadcastPlayerReady, refreshLobby, clearError]);
  
  // Auto-start game logic
  const checkAutoStart = useCallback(async () => {
    if (!canAutoStart || !gameIdRef.current) return;
    
    // Clear any existing timeout
    if (autoStartTimeoutRef.current) {
      clearTimeout(autoStartTimeoutRef.current);
    }
    
    // Set a short delay to allow for any final player updates
    autoStartTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('=== LOBBY AUTO-START INITIATED ===');
        console.log('Auto-starting game with', playerCount, 'players for game:', gameIdRef.current);

        // Transition game to briefing phase
        const startResult = await GameService.transitionGameStatus(gameIdRef.current!, 'briefing', 'waiting');
        if (startResult.success) {
          console.log('=== GAME STATUS TRANSITION SUCCESSFUL ===');
          console.log('Game successfully transitioned from waiting → briefing for game:', gameIdRef.current);

          // Trigger callback to notify parent components
          callbacks?.onGameStarted?.(gameIdRef.current!);

          console.log('Auto-start process completed successfully');
        } else {
          console.error('=== GAME STATUS TRANSITION FAILED ===');
          console.error('Failed to auto-start game:', startResult.error);
          setError(startResult.error || 'Failed to start game');
        }
      } catch (err) {
        console.error('=== AUTO-START ERROR ===');
        console.error('Error auto-starting game:', err);
        setError(err instanceof Error ? err.message : 'Failed to start game');
      }
    }, 1000); // 1 second delay
  }, [canAutoStart, playerCount, callbacks]);
  
  // Real-time event handlers
  const handlePlayerJoined = useCallback((event: PlayerJoinedEvent) => {
    console.log('Player joined lobby:', event);
    refreshLobby();
    callbacks?.onPlayerJoined?.({
      id: `${event.gameId}-${event.userId}`,
      game_id: event.gameId,
      user_id: event.userId,
      joined_at: event.data.joinedAt,
      is_ready: false
    });
  }, [refreshLobby, callbacks]);
  
  const handlePlayerLeft = useCallback((event: PlayerLeftEvent) => {
    console.log('Player left lobby:', event);
    refreshLobby();
    callbacks?.onPlayerLeft?.(event.userId);
  }, [refreshLobby, callbacks]);
  
  const handlePlayerReady = useCallback((event: PlayerReadyEvent) => {
    console.log('Player ready status changed:', event);
    refreshLobby();
  }, [refreshLobby]);
  
  // Initialize real-time connection
  useEffect(() => {
    if (currentUser && !isConnected) {
      initializeRealtime();
    }
  }, [currentUser, isConnected, initializeRealtime]);
  
  // Auto-join if gameId provided
  useEffect(() => {
    if (initialGameId && autoJoin && isLoggedIn && isConnected && !hasJoined) {
      joinLobby(initialGameId);
    }
  }, [initialGameId, autoJoin, isLoggedIn, isConnected, hasJoined, joinLobby]);
  
  // Set up real-time event listeners
  useEffect(() => {
    if (!isConnected) return;
    
    addEventListener('player_joined' as GameEventType, handlePlayerJoined);
    addEventListener('player_left' as GameEventType, handlePlayerLeft);
    addEventListener('player_ready' as GameEventType, handlePlayerReady);
    
    return () => {
      removeEventListener('player_joined' as GameEventType, handlePlayerJoined);
      removeEventListener('player_left' as GameEventType, handlePlayerLeft);
      removeEventListener('player_ready' as GameEventType, handlePlayerReady);
    };
  }, [isConnected, addEventListener, removeEventListener, handlePlayerJoined, handlePlayerLeft, handlePlayerReady]);
  
  // Check for auto-start when conditions change
  useEffect(() => {
    if (canAutoStart) {
      checkAutoStart();
    }
    
    return () => {
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
      }
    };
  }, [canAutoStart, checkAutoStart]);
  
  // Handle real-time errors
  useEffect(() => {
    if (realtimeError) {
      setError(realtimeError);
      callbacks?.onError?.(realtimeError);
    }
  }, [realtimeError, callbacks]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    // Game state
    game,
    participants,
    playerCount,
    isGameFull,
    canAutoStart,
    
    // Connection state
    isConnected,
    isLoading,
    error,
    
    // User state
    isInLobby,
    isReady,
    hasJoined,
    
    // Actions
    joinLobby,
    leaveLobby,
    toggleReady,
    refreshLobby
  };
};
