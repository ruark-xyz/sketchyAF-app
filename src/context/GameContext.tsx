import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useRealtimeGame } from '../hooks/useRealtimeGame';
import {
  GameContextType,
  GameState,
  GameActions,
  GameContextAction,
  GamePhase,
  PlayerStatus,
  INITIAL_GAME_STATE,
  PHASE_TRANSITIONS
} from '../types/gameContext';
import { GameService } from '../services/GameService';
import { SubmissionService } from '../services/SubmissionService';
import { VotingService } from '../services/VotingService';
import { Game, GameParticipant, Submission, Vote } from '../types/game';
import { GameStateMachine, createGameStateMachine } from '../utils/gameStateMachine';
import { DataSynchronizationManager, createDataSynchronizationManager } from '../utils/dataSynchronization';
import { GameErrorHandler, createGameErrorHandler } from '../utils/errorHandling';

// Create the game context
const GameContext = createContext<GameContextType | undefined>(undefined);

// Game state reducer
function gameStateReducer(state: GameState, action: GameContextAction): GameState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    
    case 'SET_CURRENT_GAME':
      return { 
        ...state, 
        currentGame: action.payload,
        isInGame: !!action.payload,
        gamePhase: action.payload ? (action.payload.status as GamePhase) : GamePhase.WAITING
      };
    
    case 'SET_GAME_PHASE':
      return { ...state, gamePhase: action.payload };
    
    case 'SET_PLAYER_STATUS':
      return { ...state, playerStatus: action.payload };
    
    case 'SET_PLAYER_READY':
      return { ...state, isReady: action.payload };
    
    case 'SET_SELECTED_BOOSTER_PACK':
      return { ...state, selectedBoosterPack: action.payload };
    
    case 'SET_HAS_SUBMITTED':
      return { ...state, hasSubmitted: action.payload };
    
    case 'SET_HAS_VOTED':
      return { ...state, hasVoted: action.payload };
    
    case 'SET_PARTICIPANTS':
      return { ...state, participants: action.payload };
    
    case 'SET_SUBMISSIONS':
      return { ...state, submissions: action.payload };
    
    case 'SET_VOTES':
      return { ...state, votes: action.payload };
    
    case 'SET_RESULTS':
      return { ...state, results: action.payload };
    
    case 'SET_TIMER':
      return { 
        ...state, 
        currentTimer: action.payload.timer,
        timerDuration: action.payload.duration,
        timerPhase: action.payload.phase
      };
    
    case 'RESET_STATE':
      return INITIAL_GAME_STATE;
    
    default:
      return state;
  }
}

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoggedIn } = useAuth();
  const [state, dispatch] = useReducer(gameStateReducer, INITIAL_GAME_STATE);

  // Real-time game hook
  const {
    isConnected,
    connectionStatus,
    activeGameId,
    initializeRealtime,
    joinGame: joinRealtimeGame,
    leaveGame: leaveRealtimeGame,
    broadcastPlayerReady,
    addEventListener,
    removeEventListener,
    error: realtimeError
  } = useRealtimeGame();

  // Refs for cleanup and state machine
  const isMountedRef = useRef(true);
  const currentGameIdRef = useRef<string | null>(null);
  const stateMachineRef = useRef<GameStateMachine | null>(null);
  const syncManagerRef = useRef<DataSynchronizationManager | null>(null);
  const errorHandlerRef = useRef<GameErrorHandler | null>(null);

  // Initialize state machine and sync manager
  useEffect(() => {
    if (!stateMachineRef.current) {
      stateMachineRef.current = createGameStateMachine(state);

      // Set up phase transition callbacks
      Object.values(GamePhase).forEach(phase => {
        stateMachineRef.current!.onPhaseTransition(phase, async (newState) => {
          // Update local state when phase transitions occur
          dispatch({ type: 'SET_GAME_PHASE', payload: newState.gamePhase });

          // Set appropriate timers for timed phases
          const expectedDuration = stateMachineRef.current!.getPhaseExpectedDuration();
          if (expectedDuration) {
            dispatch({
              type: 'SET_TIMER',
              payload: {
                timer: expectedDuration,
                duration: expectedDuration,
                phase: newState.gamePhase
              }
            });
          }
        });
      });
    }

    if (!syncManagerRef.current) {
      syncManagerRef.current = createDataSynchronizationManager();
    }

    if (!errorHandlerRef.current) {
      errorHandlerRef.current = createGameErrorHandler();

      // Set up error callbacks
      errorHandlerRef.current.onError('NETWORK_ERROR', (error) => {
        dispatch({ type: 'SET_ERROR', payload: error.userMessage });
      });

      errorHandlerRef.current.onError('AUTHENTICATION_ERROR', (error) => {
        dispatch({ type: 'SET_ERROR', payload: error.userMessage });
        // Could trigger logout here
      });

      errorHandlerRef.current.onError('REALTIME_ERROR', (error) => {
        dispatch({ type: 'SET_ERROR', payload: error.userMessage });
      });
    }
  }, []);

  // Update state machine when state changes
  useEffect(() => {
    if (stateMachineRef.current) {
      stateMachineRef.current.updateState(state);
    }
  }, [state]);

  // Update connection status and handle reconnection
  useEffect(() => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: connectionStatus });

    // Handle reconnection
    if (connectionStatus === 'connected' && state.connectionStatus === 'disconnected') {
      console.log('Reconnected, syncing state...');
      if (syncManagerRef.current) {
        syncManagerRef.current.handleReconnection(async () => {
          // Inline refresh function to avoid circular dependency
          if (!state.currentGame) return;

          try {
            dispatch({ type: 'SET_LOADING', payload: true });

            const gameResult = await GameService.getGame(state.currentGame.id);
            if (gameResult.success && gameResult.data) {
              dispatch({ type: 'SET_CURRENT_GAME', payload: gameResult.data });
              dispatch({ type: 'SET_PARTICIPANTS', payload: gameResult.data.participants || [] });
            }
          } catch (error) {
            console.error('Error refreshing game state:', error);
          } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        });
      }
    }
  }, [connectionStatus, state.connectionStatus, state.currentGame]);

  // Update realtime error
  useEffect(() => {
    if (realtimeError) {
      dispatch({ type: 'SET_ERROR', payload: realtimeError });
    }
  }, [realtimeError]);

  // Define refreshGameState early so it can be used in useEffect hooks
  const refreshGameState = useCallback(async (gameId?: string): Promise<void> => {
    const targetGameId = gameId || state.currentGame?.id;
    if (!targetGameId) return;

    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Fetch game data
      const gameResult = await GameService.getGame(targetGameId);
      if (gameResult.success && gameResult.data) {
        dispatch({ type: 'SET_CURRENT_GAME', payload: gameResult.data });
        dispatch({ type: 'SET_PARTICIPANTS', payload: gameResult.data.participants || [] });


      }

      // Fetch submissions
      const submissionsResult = await SubmissionService.getGameSubmissions(targetGameId);
      if (submissionsResult.success && submissionsResult.data) {
        dispatch({ type: 'SET_SUBMISSIONS', payload: submissionsResult.data });
      }

      // Fetch votes
      const votesResult = await VotingService.getGameVotes(targetGameId);
      if (votesResult.success && votesResult.data) {
        dispatch({ type: 'SET_VOTES', payload: votesResult.data });
      }

      // Check if current user has submitted or voted
      if (currentUser) {
        const userSubmission = await SubmissionService.getUserSubmission(targetGameId);
        dispatch({ type: 'SET_HAS_SUBMITTED', payload: userSubmission.success && !!userSubmission.data });

        const userVote = await VotingService.getUserVote(targetGameId);
        dispatch({ type: 'SET_HAS_VOTED', payload: userVote.success && !!userVote.data });
      }

    } catch (error) {
      console.error('Error refreshing game state:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to refresh game state' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentGame, currentUser]);

  // Initialize real-time connection when user is authenticated
  useEffect(() => {
    if (isLoggedIn && currentUser && !isConnected) {
      initializeRealtime().catch(error => {
        console.error('Failed to initialize real-time connection:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to connect to real-time service' });
      });
    }
  }, [isLoggedIn, currentUser, isConnected, initializeRealtime]);

  // Set up real-time event listeners
  useEffect(() => {
    if (!isConnected || !activeGameId) return;

    // Player joined event
    const handlePlayerJoined = (event: any) => {
      console.log('Player joined:', event);
      refreshGameState();
    };

    // Player left event
    const handlePlayerLeft = (event: any) => {
      console.log('Player left:', event);
      refreshGameState();
    };

    // Player ready event
    const handlePlayerReady = (event: any) => {
      console.log('Player ready status changed:', event);
      refreshGameState();
    };

    // Game phase changed event
    const handlePhaseChanged = (event: any) => {
      console.log('Game phase changed:', event);
      dispatch({ type: 'SET_GAME_PHASE', payload: event.data.newPhase });
      refreshGameState();
    };

    // Timer sync event
    const handleTimerSync = (event: any) => {
      console.log('Timer sync:', event);
      dispatch({
        type: 'SET_TIMER',
        payload: {
          timer: event.data.timeRemaining,
          duration: event.data.totalDuration,
          phase: event.data.phase
        }
      });
    };

    // Drawing submitted event
    const handleDrawingSubmitted = (event: any) => {
      console.log('Drawing submitted:', event);
      refreshGameState();
    };

    // Vote cast event
    const handleVoteCast = (event: any) => {
      console.log('Vote cast:', event);
      refreshGameState();
    };

    // Game completed event
    const handleGameCompleted = (event: any) => {
      console.log('Game completed:', event);
      dispatch({ type: 'SET_GAME_PHASE', payload: GamePhase.COMPLETED });
      refreshGameState();
    };

    // Add event listeners
    addEventListener('player_joined', handlePlayerJoined);
    addEventListener('player_left', handlePlayerLeft);
    addEventListener('player_ready', handlePlayerReady);
    addEventListener('phase_changed', handlePhaseChanged);
    addEventListener('timer_sync', handleTimerSync);
    addEventListener('drawing_submitted', handleDrawingSubmitted);
    addEventListener('vote_cast', handleVoteCast);
    addEventListener('game_completed', handleGameCompleted);

    // Cleanup
    return () => {
      removeEventListener('player_joined', handlePlayerJoined);
      removeEventListener('player_left', handlePlayerLeft);
      removeEventListener('player_ready', handlePlayerReady);
      removeEventListener('phase_changed', handlePhaseChanged);
      removeEventListener('timer_sync', handleTimerSync);
      removeEventListener('drawing_submitted', handleDrawingSubmitted);
      removeEventListener('vote_cast', handleVoteCast);
      removeEventListener('game_completed', handleGameCompleted);
    };
  }, [isConnected, activeGameId, addEventListener, removeEventListener, refreshGameState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper function to handle errors consistently
  const handleError = useCallback(async (error: any, context?: any): Promise<void> => {
    if (errorHandlerRef.current) {
      const gameError = await errorHandlerRef.current.handleError(error, {
        gamePhase: state.gamePhase,
        playerStatus: state.playerStatus,
        ...context
      });

      // Only update UI error state for user-facing errors
      if (gameError.severity !== 'low') {
        dispatch({ type: 'SET_ERROR', payload: gameError.userMessage });
      }
    } else {
      // Fallback error handling
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [state.gamePhase, state.playerStatus]);



  // Game Actions Implementation
  const joinGame = useCallback(async (gameId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('User must be authenticated to join game');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Join game in database
      const joinResult = await GameService.joinGame({
        game_id: gameId,
        selected_booster_pack: state.selectedBoosterPack || undefined
      });

      if (!joinResult.success) {
        throw new Error(joinResult.error || 'Failed to join game');
      }

      // Join real-time game
      const realtimeResult = await joinRealtimeGame(gameId);
      if (!realtimeResult.success) {
        throw new Error(realtimeResult.error || 'Failed to join real-time game');
      }

      // Fetch and set game data
      await refreshGameState(gameId);

      currentGameIdRef.current = gameId;
      dispatch({ type: 'SET_PLAYER_STATUS', payload: 'in_lobby' });

    } catch (error) {
      await handleError(error, { action: 'joinGame', gameId });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentUser, state.selectedBoosterPack, joinRealtimeGame, refreshGameState, handleError]);

  const leaveGame = useCallback(async (): Promise<void> => {
    if (!currentUser || !state.currentGame) {
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Leave game in database
      const leaveResult = await GameService.leaveGame(state.currentGame.id);
      if (!leaveResult.success) {
        console.warn('Failed to leave game in database:', leaveResult.error);
      }

      // Leave real-time game
      const realtimeResult = await leaveRealtimeGame();
      if (!realtimeResult.success) {
        console.warn('Failed to leave real-time game:', realtimeResult.error);
      }

      // Reset state
      dispatch({ type: 'RESET_STATE' });
      currentGameIdRef.current = null;

    } catch (error) {
      console.error('Error leaving game:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to leave game properly' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentUser, state.currentGame, leaveRealtimeGame]);

  const setPlayerReady = useCallback(async (ready: boolean): Promise<void> => {
    if (!currentUser || !state.currentGame) {
      throw new Error('Must be in a game to set ready status');
    }

    // Apply optimistic update
    const rollbackData = { isReady: state.isReady, playerStatus: state.playerStatus };
    const updateId = syncManagerRef.current?.applyOptimisticUpdate(
      'player_ready',
      { isReady: ready, playerStatus: ready ? 'ready' : 'in_lobby' },
      rollbackData
    );

    // Update local state immediately
    dispatch({ type: 'SET_PLAYER_READY', payload: ready });
    dispatch({ type: 'SET_PLAYER_STATUS', payload: ready ? 'ready' : 'in_lobby' });

    try {
      // Update ready status in database
      const result = await GameService.updateReadyStatus(state.currentGame.id, ready);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update ready status');
      }

      // Broadcast ready status
      await broadcastPlayerReady(ready, state.selectedBoosterPack || undefined);

      // Confirm optimistic update
      if (updateId) {
        syncManagerRef.current?.confirmOptimisticUpdate(updateId);
      }

    } catch (error) {
      // Rollback optimistic update
      if (updateId) {
        const rollback = syncManagerRef.current?.rollbackOptimisticUpdate(updateId);
        if (rollback) {
          dispatch({ type: 'SET_PLAYER_READY', payload: rollback.isReady });
          dispatch({ type: 'SET_PLAYER_STATUS', payload: rollback.playerStatus });
        }
      }

      await handleError(error, { action: 'setPlayerReady' });
      throw error;
    }
  }, [currentUser, state.currentGame, state.selectedBoosterPack, state.isReady, state.playerStatus, broadcastPlayerReady]);

  const selectBoosterPack = useCallback(async (packId: string | null): Promise<void> => {
    if (!currentUser || !state.currentGame) {
      throw new Error('Must be in a game to select booster pack');
    }

    try {
      // For now, we'll just update local state and broadcast the change
      // The booster pack selection will be handled when joining the game
      dispatch({ type: 'SET_SELECTED_BOOSTER_PACK', payload: packId });

      // If already in game, broadcast the change
      if (state.isInGame) {
        await broadcastPlayerReady(state.isReady, packId || undefined);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to select booster pack';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [currentUser, state.currentGame, state.isReady, state.isInGame, broadcastPlayerReady]);

  // Continue with more actions in next part...
  const submitDrawing = useCallback(async (drawingData: any, drawingUrl: string): Promise<void> => {
    if (!currentUser || !state.currentGame) {
      throw new Error('Must be in a game to submit drawing');
    }

    try {
      const result = await SubmissionService.submitDrawing({
        game_id: state.currentGame.id,
        drawing_data: drawingData,
        drawing_url: drawingUrl
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit drawing');
      }

      dispatch({ type: 'SET_HAS_SUBMITTED', payload: true });
      await refreshGameState();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit drawing';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [currentUser, state.currentGame, refreshGameState]);

  const castVote = useCallback(async (submissionId: string): Promise<void> => {
    if (!currentUser || !state.currentGame) {
      throw new Error('Must be in a game to cast vote');
    }

    try {
      const result = await VotingService.castVote({
        game_id: state.currentGame.id,
        submission_id: submissionId
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to cast vote');
      }

      dispatch({ type: 'SET_HAS_VOTED', payload: true });
      await refreshGameState();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cast vote';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [currentUser, state.currentGame, refreshGameState]);



  const clearError = useCallback((): void => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const resetGameState = useCallback((): void => {
    dispatch({ type: 'RESET_STATE' });
    currentGameIdRef.current = null;
    if (stateMachineRef.current) {
      stateMachineRef.current.reset(INITIAL_GAME_STATE);
    }
  }, []);

  // State machine actions
  const checkPhaseTransitions = useCallback(async (): Promise<void> => {
    if (stateMachineRef.current) {
      await stateMachineRef.current.checkAndExecuteTransitions();
    }
  }, []);

  const forcePhaseTransition = useCallback(async (targetPhase: GamePhase): Promise<boolean> => {
    if (stateMachineRef.current) {
      return await stateMachineRef.current.forceTransitionTo(targetPhase);
    }
    return false;
  }, []);

  // Auto-check transitions when relevant state changes
  useEffect(() => {
    if (state.currentGame && stateMachineRef.current) {
      // Check transitions when participants, submissions, or votes change
      checkPhaseTransitions();
    }
  }, [state.participants, state.submissions, state.votes, checkPhaseTransitions]);

  // Timer countdown effect
  useEffect(() => {
    if (state.currentTimer && state.currentTimer > 0) {
      const interval = setInterval(() => {
        dispatch({
          type: 'SET_TIMER',
          payload: {
            timer: Math.max(0, state.currentTimer! - 1),
            duration: state.timerDuration,
            phase: state.timerPhase
          }
        });
      }, 1000);

      return () => clearInterval(interval);
    } else if (state.currentTimer === 0 && stateMachineRef.current) {
      // Timer expired, check for transitions
      checkPhaseTransitions();
    }
  }, [state.currentTimer, checkPhaseTransitions]);

  // Actions object
  const actions: GameActions = {
    joinGame,
    leaveGame,
    setPlayerReady,
    selectBoosterPack,
    submitDrawing,
    castVote,
    refreshGameState,
    clearError,
    resetGameState
  };

  // Context value
  const value: GameContextType = {
    ...state,
    actions
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

// Custom hook to use the game context
export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  
  return context;
};

// Re-export custom hooks for convenience
export {
  useGamePhase,
  useGameTimer,
  usePlayerActions,
  useGameActions,
  useGameState,
  useGameConnection,
  useGameData,
  useGameManagement,
  useGameValidation,
  useGameProgress
} from '../hooks/useGameContext';

export default GameContext;
