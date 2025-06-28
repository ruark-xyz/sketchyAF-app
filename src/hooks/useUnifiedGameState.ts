// Unified Game State Hook - Single Source of Truth
// Eliminates dual state management between gamePhase and currentGame.status

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { useRealtimeGame } from './useRealtimeGame';
import { Game, GameStatus } from '../types/game';
import { PubNubGameService } from '../services/PubNubService';
import { useAuth } from '../context/AuthContext';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface GameState {
  game: Game | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
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

  // Debug log to confirm hook is being called
  console.log('🎮 useUnifiedGameState hook called:', {
    providedGameId: gameId,
    searchParamsGameId: searchParams.get('gameId'),
    effectiveGameId,
    autoNavigate,
    hasCurrentUser: !!currentUser,
    currentUserId: currentUser?.id,
    timestamp: new Date().toISOString()
  });

  // Direct PubNub service for phase change events (like match notifications)
  const pubNubServiceRef = useRef<PubNubGameService | null>(null);
  const eventListenerRegistered = useRef<string | null>(null); // Track which game has listener registered
  const hookInitialized = useRef<string | null>(null); // Track which game has been fully initialized

  // Supabase Realtime channel for game status updates
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  const [state, setState] = useState<GameState>({
    game: null,
    isLoading: false,
    error: null,
    lastUpdated: 0
  });



  const navigationInProgressRef = useRef(false);

  // Load game data
  const loadGame = useCallback(async (id: string, retryCount = 0) => {
    if (!id) return;

    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    try {
      // Loading state is already set in useEffect, no need to set it again

      console.log(`🔄 Loading game ${id} (attempt ${retryCount + 1}/${maxRetries + 1})`, {
        gameId: id,
        retryCount,
        maxRetries,
        currentTime: new Date().toISOString(),
        currentLocation: window.location.pathname + window.location.search,
        calledFrom: new Error().stack?.split('\n')[2]?.trim()
      });

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
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.log(`Game ${id} load error:`, error);

        // If game not found and we haven't exhausted retries, try again
        if (error.code === 'PGRST116' && retryCount < maxRetries) {
          console.log(`Game ${id} not found, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          // Keep loading state true during retry
          setTimeout(() => {
            loadGame(id, retryCount + 1);
          }, retryDelay);
          return;
        }

        console.log(`Game ${id} failed after ${retryCount + 1} attempts:`, error.message);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message
        }));
        return;
      }

      console.log(`✅ Game ${id} loaded successfully:`, {
        id: data.id,
        status: data.status,
        phase_expires_at: data.phase_expires_at,
        current_phase_duration: data.current_phase_duration,
        current_players: data.current_players,
        max_players: data.max_players,
        prompt: data.prompt,
        participants: data.game_participants?.length || 0,
        submissions: data.submissions?.length || 0,
        loadTime: new Date().toISOString()
      });

      console.log('🎯 Setting game state and triggering potential navigation for game:', id);
      setState(prev => {
        const statusChanged = prev.game?.status !== data.status;
        console.log('🔍 Game state update:', {
          previousStatus: prev.game?.status,
          newStatus: data.status,
          statusChanged,
          willTriggerNavigation: statusChanged && autoNavigate
        });

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
        console.log('🔗 Manually joining game channel:', id);
        joinGame(id).then(result => {
          if (result.success) {
            console.log('✅ Successfully joined game channel:', id);
          } else {
            console.error('❌ Failed to join game channel:', result.error);
          }
        });
      }

      // SIMPLIFIED APPROACH: Always use direct PubNub setup for reliability
      console.log('🔧 Setting up direct PubNub service for phase change events');
      setupPhaseChangeListener(id);



    } catch (err) {
      // For other errors, also retry if we haven't exhausted attempts
      if (retryCount < maxRetries) {
        console.log(`Error loading game ${id}, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries}):`, err);
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
        console.log('🔍 handleGameUpdate: No previous game, skipping navigation');
        return prev;
      }

      const newGame = { ...prev.game, ...updatedGame };
      const statusChanged = prev.game.status !== newGame.status;

      console.log('🔍 handleGameUpdate: Navigation check', {
        previousStatus: prev.game.status,
        newStatus: newGame.status,
        statusChanged,
        autoNavigate,
        navigationInProgress: navigationInProgressRef.current,
        effectiveGameId,
        willNavigate: statusChanged && autoNavigate && !navigationInProgressRef.current,
        currentLocation: window.location.pathname + window.location.search,
        timestamp: new Date().toISOString(),
        gameData: {
          id: newGame.id,
          phaseExpiresAt: newGame.phase_expires_at,
          currentPlayers: newGame.current_players,
          maxPlayers: newGame.max_players
        }
      });

      // Trigger navigation if status changed and auto-navigation is enabled
      if (statusChanged && autoNavigate && !navigationInProgressRef.current) {
        navigationInProgressRef.current = true;
        console.log(`🚀 useUnifiedGameState: Status changed from ${prev.game.status} to ${newGame.status}, navigating...`);

        // Determine target route based on new status
        const getRouteForStatus = (status: GameStatus): string => {
          const baseParams = effectiveGameId ? `?gameId=${effectiveGameId}` : '';

          switch (status) {
            case 'waiting':
            case 'briefing':
              return `/uiux/pre-round${baseParams}`;
            case 'drawing':
              return `/uiux/draw${baseParams}`;
            case 'voting':
              return `/uiux/voting${baseParams}`;
            case 'results':
              return `/uiux/results${baseParams}`;
            case 'completed':
            case 'cancelled':
              return `/uiux/lobby${baseParams}`;
            default:
              return `/uiux/lobby${baseParams}`;
          }
        };

        const targetRoute = getRouteForStatus(newGame.status);
        console.log(`🧭 useUnifiedGameState: Navigating to ${targetRoute}`);

        // Small delay to prevent rapid navigation conflicts
        setTimeout(() => {
          console.log(`🚦 useUnifiedGameState: Executing navigation to ${targetRoute}`);
          navigate(targetRoute, { replace: true });

          // Reset navigation lock after navigation
          setTimeout(() => {
            console.log(`🔓 useUnifiedGameState: Navigation lock released`);
            navigationInProgressRef.current = false;
          }, 1000);
        }, 100);
      } else if (!statusChanged) {
        console.log('🔍 handleGameUpdate: Status unchanged, no navigation needed');
      } else if (!autoNavigate) {
        console.log('🔍 handleGameUpdate: Auto-navigation disabled, skipping navigation');
      } else if (navigationInProgressRef.current) {
        console.log('🔍 handleGameUpdate: Navigation already in progress, skipping');
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
      console.log('✅ Phase change listener already registered for game:', gameId);
      return;
    }

    try {
      console.log('🔧 Setting up phase change listener for game:', {
        gameId,
        userId: currentUser.id,
        currentTime: new Date().toISOString(),
        existingService: !!pubNubServiceRef.current,
        registeredGame: eventListenerRegistered.current
      });

      const service = new PubNubGameService();
      console.log('🔧 Initializing PubNub service...');
      await service.initialize(currentUser.id);
      console.log('✅ PubNub service initialized successfully');
      pubNubServiceRef.current = service;

      // Track last reload time to prevent spam
      let lastReloadTime = 0;
      const RELOAD_THROTTLE_MS = 3000; // 3 seconds minimum between reloads

      // Game event handler - handles phase changes and vote updates
      const handleGameEvent = (event: any) => {
        console.log('🎯 Game event received via PubNub:', {
          type: event?.type,
          gameId: event?.gameId,
          timestamp: event?.timestamp,
          data: event?.data,
          fullEvent: event
        });
        console.log('🔍 Event check:', {
          hasEvent: !!event,
          eventType: event?.type,
          eventGameId: event?.gameId,
          targetGameId: gameId,
          isPhaseChange: event?.type === 'phase_changed',
          isVoteCast: event?.type === 'vote_cast',
          gameIdMatch: event?.gameId === gameId,
          shouldProcess: event && event.gameId === gameId && ['phase_changed', 'vote_cast'].includes(event.type),
          currentTime: new Date().toISOString(),
          currentLocation: window.location.pathname + window.location.search
        });

        if (event && event.gameId === gameId) {
          if (event.type === 'phase_changed') {
            console.log(`🔄 Processing phase change: ${event.data?.previousPhase} → ${event.data?.newPhase}`);
            console.log('🔍 Phase change event details:', {
              previousPhase: event.data?.previousPhase,
              newPhase: event.data?.newPhase,
              hasGameObject: !!event.data?.game,
              gameObjectStatus: event.data?.game?.status,
              gameObjectId: event.data?.game?.id,
              eventTimestamp: event.timestamp,
              eventData: event.data,
              currentTime: new Date().toISOString()
            });

            // Check if we have the full game object in the event
            if (event.data?.game) {
              console.log('✨ Using game object from phase change event for navigation');
              console.log('🔍 Game object from event:', {
                id: event.data.game.id,
                status: event.data.game.status,
                previousPhase: event.data?.previousPhase,
                newPhase: event.data?.newPhase,
                phaseExpiresAt: event.data.game.phase_expires_at,
                currentPlayers: event.data.game.current_players
              });

              // Use handleGameUpdate to trigger navigation logic
              if (typeof handleGameUpdate === 'function') {
                console.log('🚀 Calling handleGameUpdate with game object from PubNub event');
                handleGameUpdate(event.data.game);
              } else {
                console.error('❌ handleGameUpdate is not a function:', handleGameUpdate);
              }
            } else {
              // Throttle reloads to prevent infinite loops
              const now = Date.now();
              if (now - lastReloadTime > RELOAD_THROTTLE_MS) {
                console.log('🔄 No game object in phase change event, reloading from database (throttled)');
                lastReloadTime = now;
                loadGame(gameId);
              } else {
                console.log('⏳ Reload throttled, skipping to prevent loop');
              }
            }
          } else if (event.type === 'vote_cast') {
            // Throttle reloads to prevent infinite loops
            const now = Date.now();
            if (now - lastReloadTime > RELOAD_THROTTLE_MS) {
              console.log('🗳️ Processing vote cast event - refreshing game state (throttled)');
              lastReloadTime = now;
              loadGame(gameId);
            } else {
              console.log('⏳ Vote reload throttled, skipping to prevent loop');
            }
          } else {
            // Throttle reloads to prevent infinite loops
            const now = Date.now();
            if (now - lastReloadTime > RELOAD_THROTTLE_MS) {
              console.log(`🔄 Processing other game event (${event.type}) - refreshing game state (throttled)`);
              lastReloadTime = now;
              loadGame(gameId);
            } else {
              console.log('⏳ Other event reload throttled, skipping to prevent loop');
            }
          }
        } else {
          console.log('❌ Event conditions not met');
        }
      };

      // Subscribe to game channel
      console.log('🔗 Joining game channel:', gameId);
      await service.joinGameChannel(gameId);
      console.log('✅ Successfully joined game channel');

      console.log('📡 Subscribing to game events...');
      await service.subscribeToGameEvents(gameId, handleGameEvent);
      console.log('✅ Successfully subscribed to game events');

      // Mark as registered to prevent duplicate subscriptions
      eventListenerRegistered.current = gameId;

    } catch (error) {
      console.error('❌ Failed to set up phase change listener:', error);
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
          return `/uiux/pre-round${baseParams}`;
        case 'drawing':
          return `/uiux/draw${baseParams}`;
        case 'voting':
          return `/uiux/voting${baseParams}`;
        case 'results':
          return `/uiux/results${baseParams}`;
        case 'completed':
        case 'cancelled':
          return `/uiux/lobby${baseParams}`;
        default:
          return `/uiux/lobby${baseParams}`;
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
    console.log('useUnifiedGameState: effectiveGameId changed:', effectiveGameId);

    // Skip if this game has already been initialized (prevents timer re-renders from re-initializing)
    if (hookInitialized.current === effectiveGameId) {
      console.log('🔄 Game already initialized, skipping re-initialization:', effectiveGameId);
      return;
    }

    // Cleanup previous PubNub subscription if gameId changed
    if (eventListenerRegistered.current && eventListenerRegistered.current !== effectiveGameId) {
      console.log('🧹 Cleaning up previous PubNub subscription for:', eventListenerRegistered.current);
      if (pubNubServiceRef.current) {
        pubNubServiceRef.current.leaveGameChannel(eventListenerRegistered.current);
      }
      eventListenerRegistered.current = null;
      hookInitialized.current = null;
    }

    if (effectiveGameId) {
      console.log('useUnifiedGameState: Loading game:', effectiveGameId);
      // Mark this game as initialized to prevent re-initialization
      hookInitialized.current = effectiveGameId;

      // Set loading state immediately and synchronously
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      loadGame(effectiveGameId);
    } else {
      console.log('useUnifiedGameState: No gameId, resetting state');
      // Cleanup PubNub subscription when no gameId
      if (eventListenerRegistered.current && pubNubServiceRef.current) {
        console.log('🧹 Cleaning up PubNub subscription (no gameId)');
        pubNubServiceRef.current.leaveGameChannel(eventListenerRegistered.current);
        eventListenerRegistered.current = null;
      }
      hookInitialized.current = null;
      setState({
        game: null,
        isLoading: false,
        error: null,
        lastUpdated: 0
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

  // Supabase Realtime subscription for game status changes
  useEffect(() => {
    if (!effectiveGameId || !autoNavigate) return;

    console.log('🔗 Setting up Supabase Realtime subscription for game:', effectiveGameId);

    // Clean up existing subscription
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    // Create a new channel for this game
    const channel = supabase
      .channel(`game-status-${effectiveGameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${effectiveGameId}`
        },
        (payload) => {
          console.log('📡 Realtime game status update received:', payload);
          if (payload.new && payload.old) {
            const newGame = payload.new;
            const oldGame = payload.old;

            // Only trigger navigation if status actually changed
            if (newGame.status !== oldGame.status) {
              console.log(`🔄 Realtime detected status change: ${oldGame.status} → ${newGame.status}`);
              handleGameUpdate(newGame);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
      });

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        console.log('🔌 Cleaning up Supabase Realtime subscription');
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [effectiveGameId, autoNavigate, handleGameUpdate]);



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 useUnifiedGameState: Cleaning up on unmount');
      if (eventListenerRegistered.current && pubNubServiceRef.current) {
        console.log('🧹 Cleaning up PubNub subscription on unmount:', eventListenerRegistered.current);
        pubNubServiceRef.current.leaveGameChannel(eventListenerRegistered.current);
        eventListenerRegistered.current = null;
      }
      if (realtimeChannelRef.current) {
        console.log('🔌 Cleaning up Supabase Realtime subscription on unmount');
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
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

    // Real-time connection
    isConnected,
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
