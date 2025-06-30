import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useRealtimeGame } from './useRealtimeGame';
import { Game, GameStatus } from '../types/game';
import { PubNubGameService } from '../services/PubNubService';
import { useAuth } from '../context/AuthContext';
import EnhancedRealtimeManager, { type ConnectionStatus } from '../services/EnhancedRealtimeManager';
import * as ROUTES from '../constants/routes';

interface GameState {
  game: Game | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  connectionStatus: ConnectionStatus;
}

interface UseUnifiedGameStateOptions {
  gameId?: string;
  autoNavigate?: boolean; // Automatically navigate on phase changes
}

export function useUnifiedGameState({
  gameId,
  autoNavigate = true
}: UseUnifiedGameStateOptions = {}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const effectiveGameId = gameId || searchParams.get('gameId');
  const { currentUser } = useAuth();



  // Direct PubNub service for phase change events (like match notifications)
  const pubNubServiceRef = useRef<PubNubGameService | null>(null);
  const eventListenerRegistered = useRef<string | null>(null); // Track which game has listener registered
  const hookInitialized = useRef<string | null>(null); // Track which game has been fully initialized

  // Enhanced Supabase Realtime manager for game status updates
  const realtimeManager = EnhancedRealtimeManager.getInstance();
  const subscriptionIdRef = useRef<string | null>(null);

  const [state, setState] = useState<GameState>({
    game: null,
    isLoading: false,
    error: null,
    lastUpdated: 0,
    connectionStatus: {
      status: 'disconnected',
      reconnectAttempts: 0,
      isHealthy: false
    }
  });



  const navigationInProgressRef = useRef(false);

  // Load game data
  const loadGame = useCallback(async (id: string, retryCount = 0) => {
    if (!id) return;

    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    try {
      // Loading state is already set in useEffect, no need to set it again



      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          game_participants(
            user_id,
            is_ready,
            users(username, avatar_url)
          ),
          submissions(
            id,
            user_id,
            drawing_data,
            drawing_url,
            submitted_at,
            vote_count,
            users(username, avatar_url)
          ),
          votes(
            id,
            submission_id,
            voter_id,
            voted_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        // If game not found and we haven't exhausted retries, try again
        if (error.code === 'PGRST116' && retryCount < maxRetries) {
          // Keep loading state true during retry
          setTimeout(() => {
            loadGame(id, retryCount + 1);
          }, retryDelay);
          return;
        }
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message
        }));
        return;
      }



      setState(prev => {
        const statusChanged = prev.game?.status !== data.status;

        return {
          ...prev,
          game: data,
          isLoading: false,
          error: null,
          lastUpdated: Date.now()
        };
      });

      // Manually join game if not already joined
      if (joinGame && isInitialized && isConnected && activeGameId !== id) {
        joinGame(id);
      }

      // SIMPLIFIED APPROACH: Always use direct PubNub setup for reliability
      setupPhaseChangeListener(id);



    } catch (err) {
      // For other errors, also retry if we haven't exhausted attempts
      if (retryCount < maxRetries) {
        setTimeout(() => {
          loadGame(id, retryCount + 1);
        }, retryDelay);
        return;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load game'
      }));
    }
  }, []);

  // Handle real-time game updates
  const handleGameUpdate = useCallback((updatedGame: Partial<Game>) => {
    setState(prev => {
      if (!prev.game) {
        return prev;
      }

      const newGame = { ...prev.game, ...updatedGame };
      const statusChanged = prev.game.status !== newGame.status;

      // Trigger navigation if status changed and auto-navigation is enabled
      if (statusChanged && autoNavigate && !navigationInProgressRef.current) {
        navigationInProgressRef.current = true;

        // Determine target route based on new status
        const getRouteForStatus = (status: GameStatus): string => {
          const baseParams = effectiveGameId ? `?gameId=${effectiveGameId}` : '';

          switch (status) {
            case 'waiting':
            case 'briefing':
              return `${ROUTES.ROUTE_PRE_ROUND}${baseParams}`;
            case 'drawing':
              return `${ROUTES.ROUTE_DRAW}${baseParams}`;
            case 'voting':
              return `${ROUTES.ROUTE_VOTING}${baseParams}`;
            case 'results':
              return `${ROUTES.ROUTE_POST_GAME}${baseParams}`;
            case 'completed':
            case 'cancelled':
              return `${ROUTES.ROUTE_POST_GAME}${baseParams}`;
            default:
              return `${ROUTES.ROUTE_LOBBY}${baseParams}`;
          }
        };

        const targetRoute = getRouteForStatus(newGame.status);

        // Small delay to prevent rapid navigation conflicts
        setTimeout(() => {
          navigate(targetRoute, { replace: true });

          // Reset navigation lock after navigation
          setTimeout(() => {
            navigationInProgressRef.current = false;
          }, 1000);
        }, 100);
      }

      return {
        ...prev,
        game: newGame,
        lastUpdated: Date.now()
      };
    });
  }, [autoNavigate, effectiveGameId, navigate]);

  // Set up PubNub subscription for phase changes
  const setupPhaseChangeListener = useCallback(async (gameId: string) => {
    if (!currentUser) {
      return;
    }

    // Skip if already set up for this game
    if (eventListenerRegistered.current === gameId) {
      return;
    }

    try {
      const service = new PubNubGameService();
      await service.initialize(currentUser.id);
      pubNubServiceRef.current = service;

      // Track last reload time to prevent spam
      let lastReloadTime = 0;
      const RELOAD_THROTTLE_MS = 3000; // 3 seconds minimum between reloads

      // Game event handler - handles phase changes and vote updates
      const handleGameEvent = (event: any) => {

        if (event && event.gameId === gameId) {
          if (event.type === 'phase_changed') {
            // Check if we have the full game object in the event
            if (event.data?.game) {
              // Use handleGameUpdate to trigger navigation logic
              if (typeof handleGameUpdate === 'function') {
                handleGameUpdate(event.data.game);
              }
            } else {
              // Throttle reloads to prevent infinite loops
              const now = Date.now();
              if (now - lastReloadTime > RELOAD_THROTTLE_MS) {
                lastReloadTime = now;
                loadGame(gameId);
              }
            }
          } else if (event.type === 'vote_cast') {
            // Throttle reloads to prevent infinite loops
            const now = Date.now();
            if (now - lastReloadTime > RELOAD_THROTTLE_MS) {
              lastReloadTime = now;
              loadGame(gameId);
            }
          } else {
            // Throttle reloads to prevent infinite loops
            const now = Date.now();
            if (now - lastReloadTime > RELOAD_THROTTLE_MS) {
              lastReloadTime = now;
              loadGame(gameId);
            }
          }
        }
      };

      // Subscribe to game channel
      await service.joinGameChannel(gameId);

      await service.subscribeToGameEvents(gameId, handleGameEvent);

      // Mark as registered to prevent duplicate subscriptions
      eventListenerRegistered.current = gameId;

    } catch (error) {
      // Failed to set up phase change listener
    }
  }, [currentUser, loadGame, handleGameUpdate]);

  // Handle game status changes with navigation
  const handleStatusChange = useCallback((newStatus: GameStatus) => {
    if (navigationInProgressRef.current) {
      return;
    }

    navigationInProgressRef.current = true;



    // Determine target route based on new status
    const getRouteForStatus = (status: GameStatus): string => {
      const baseParams = effectiveGameId ? `?gameId=${effectiveGameId}` : '';

      switch (status) {
        case 'waiting':
        case 'briefing':
          return `${ROUTES.ROUTE_PRE_ROUND}${baseParams}`;
        case 'drawing':
          return `${ROUTES.ROUTE_DRAW}${baseParams}`;
        case 'voting':
          return `${ROUTES.ROUTE_VOTING}${baseParams}`;
        case 'completed':
        case 'cancelled':
          return `${ROUTES.ROUTE_POST_GAME}${baseParams}`;
        default:
          return `${ROUTES.ROUTE_LOBBY}${baseParams}`;
      }
    };

    const targetRoute = getRouteForStatus(newStatus);
    
    // Small delay to prevent rapid navigation conflicts
    setTimeout(() => {
      navigate(targetRoute, { replace: true });

      // Reset navigation lock after navigation
      setTimeout(() => {
        navigationInProgressRef.current = false;
      }, 1000);
    }, 100);

  }, [effectiveGameId, navigate]);

  // Set up real-time subscription
  const {
    isInitialized,
    isConnected,
    addEventListener,
    activeGameId,
    joinGame,
    error
  } = useRealtimeGame({
    gameId: effectiveGameId || ''
  });

  // PubNub subscription is now set up directly in loadGame function

  // Load game on mount or gameId change
  useEffect(() => {

    // Skip if this game has already been initialized (prevents timer re-renders from re-initializing)
    if (hookInitialized.current === effectiveGameId) {
      return;
    }

    // Cleanup previous PubNub subscription if gameId changed
    if (eventListenerRegistered.current && eventListenerRegistered.current !== effectiveGameId) {
      if (pubNubServiceRef.current) {
        pubNubServiceRef.current.leaveGameChannel(eventListenerRegistered.current);
      }
      eventListenerRegistered.current = null;
      hookInitialized.current = null;
    }

    if (effectiveGameId) {
      // Mark this game as initialized to prevent re-initialization
      hookInitialized.current = effectiveGameId;

      // Set loading state immediately and synchronously
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      loadGame(effectiveGameId);
    } else {
      // Cleanup PubNub subscription when no gameId
      if (eventListenerRegistered.current && pubNubServiceRef.current) {
        pubNubServiceRef.current.leaveGameChannel(eventListenerRegistered.current);
        eventListenerRegistered.current = null;
      }
      hookInitialized.current = null;
      setState({
        game: null,
        isLoading: false,
        error: null,
        lastUpdated: 0,
        connectionStatus: {
          status: 'disconnected',
          reconnectAttempts: 0,
          isHealthy: false
        }
      });
    }
  }, [effectiveGameId]); // Removed loadGame from deps since it has stable dependencies

  // Manual refresh
  const refresh = useCallback(() => {
    if (effectiveGameId) {
      loadGame(effectiveGameId);
    }
  }, [effectiveGameId]); // Removed loadGame from deps to prevent timer re-renders from affecting event listener setup

  // Navigation helpers
  const navigateToPhase = useCallback((phase: GameStatus) => {
    if (state.game) {
      handleStatusChange(phase);
    }
  }, [state.game, handleStatusChange]);

  // Supabase Realtime subscription for game status changes using singleton manager
  useEffect(() => {
    if (!effectiveGameId || !autoNavigate) {
      // Clean up existing subscription if gameId is removed
      if (subscriptionIdRef.current) {
        const [gameId] = subscriptionIdRef.current.split(':');
        realtimeManager.unsubscribeFromGameUpdates(
          gameId.replace('game-', ''),
          subscriptionIdRef.current.split(':')[1],
          handleGameUpdate
        );
        subscriptionIdRef.current = null;
      }
      return;
    }

    // Generate unique subscriber ID for this hook instance
    const subscriberId = `unified-game-state-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Subscribe using the enhanced manager
    const subscriptionId = realtimeManager.subscribeToGameUpdates(
      effectiveGameId,
      subscriberId,
      handleGameUpdate
    );

    subscriptionIdRef.current = subscriptionId;

    // Set up connection status monitoring
    const removeConnectionListener = realtimeManager.addConnectionListener((status) => {
      setState(prev => ({
        ...prev,
        connectionStatus: status
      }));
    });

    return () => {
      // Clean up subscription on unmount or dependency change
      if (subscriptionIdRef.current) {
        realtimeManager.unsubscribeFromGameUpdates(
          effectiveGameId,
          subscriberId,
          handleGameUpdate
        );
        subscriptionIdRef.current = null;
      }

      // Remove connection listener
      removeConnectionListener();
    };
  }, [effectiveGameId, autoNavigate, handleGameUpdate]);



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up PubNub subscription
      if (eventListenerRegistered.current && pubNubServiceRef.current) {
        pubNubServiceRef.current.leaveGameChannel(eventListenerRegistered.current);
        eventListenerRegistered.current = null;
      }

      // Clean up Supabase realtime subscription
      if (subscriptionIdRef.current && effectiveGameId) {
        const subscriberId = subscriptionIdRef.current.split(':')[1];
        realtimeManager.unsubscribeFromGameUpdates(
          effectiveGameId,
          subscriberId,
          handleGameUpdate
        );
        subscriptionIdRef.current = null;
      }
    };
  }, []);

  return {
    // Game state
    game: state.game,
    gameId: effectiveGameId,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    connectionStatus: state.connectionStatus,

    // Real-time connection (legacy compatibility)
    isConnected: state.connectionStatus.isHealthy,
    connectionError: error,
    recentEvents: [], // Placeholder for events

    // Actions
    refresh,
    navigateToPhase,

    // Computed properties
    currentStatus: state.game?.status || null,
    isActive: state.game && ['waiting', 'briefing', 'drawing', 'voting', 'results'].includes(state.game.status),
    canJoin: state.game && state.game.status === 'waiting' &&
             ((state.game as any).game_participants?.length || 0) < (state.game.max_players || 4)
  };
}