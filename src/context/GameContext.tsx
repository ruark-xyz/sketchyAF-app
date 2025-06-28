import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react';
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
import { UnifiedGameService } from '../services/UnifiedGameService';
import { DrawingExportService } from '../services/DrawingExportService';
import { boosterPackAnalyticsService } from '../services/BoosterPackAnalyticsService';
import { Game, GameParticipant, Submission, Vote, GameStatus, BoosterPack, ServiceResponse } from '../types/game';
import { User } from '../types/auth';
import { ImageAsset } from '../types/assets';
import { GameStateMachine, createGameStateMachine } from '../utils/gameStateMachine';
import { DataSynchronizationManager, createDataSynchronizationManager } from '../utils/dataSynchronization';
import { GameErrorHandler, createGameErrorHandler } from '../utils/errorHandling';
import { GameFlowController } from '../services/GameFlowController';

// Game Drawing Context Interface - Enhanced for integration
export interface GameDrawingContext {
  // Game State
  gameId: string;
  prompt: string;
  timeRemaining: number;
  isDrawingPhase: boolean;
  canSubmit: boolean;

  // Drawing State
  hasSubmitted: boolean;
  submissionId?: string;
  drawingData?: any;

  // Booster Packs
  selectedBoosterPack?: BoosterPack;
  availableAssets: ImageAsset[];

  // Actions
  submitDrawing: (drawingData: any) => Promise<void>;
  saveProgress: (drawingData: any) => Promise<void>;
  loadProgress: () => Promise<any>;
}

// Extended Game Context Type - Combines both approaches
export interface ExtendedGameContextType extends GameContextType {
  // Drawing Context (from HEAD)
  drawingContext: GameDrawingContext | null;

  // Additional Drawing Actions (from HEAD)
  initializeDrawingSession: (gameId: string) => Promise<void>;
  submitDrawingWithExport: (drawingData: any, imageBlob?: Blob) => Promise<ServiceResponse<Submission>>;
  saveDrawingProgress: (drawingData: any) => Promise<void>;
  loadDrawingProgress: () => Promise<any>;

  // Game Management Actions (from HEAD)
  createGame: (prompt: string, options?: any) => Promise<ServiceResponse<Game>>;
  startGame: () => Promise<ServiceResponse<void>>;
  transitionGameStatus: (newStatus: GameStatus) => Promise<ServiceResponse<void>>;

  // Computed Properties (from HEAD)
  isGameHost: boolean;
  isParticipant: boolean;
  gameParticipants: any[];
}

// Create the game context
const GameContext = createContext<ExtendedGameContextType | undefined>(undefined);

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

  // Drawing-specific state (from HEAD)
  const [drawingContext, setDrawingContext] = useState<GameDrawingContext | null>(null);

  // Services
  const unifiedGameService = useRef(UnifiedGameService.getInstance());
  const drawingExportService = useRef(DrawingExportService.getInstance());

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

  // Initialize services when user is available
  useEffect(() => {
    const initializeServices = async () => {
      if (currentUser && isLoggedIn) {
        try {
          // Initialize unified game service
          await unifiedGameService.current.initialize(currentUser);

          // Initialize real-time if not connected
          if (!isConnected) {
            await initializeRealtime();
          }
        } catch (error) {
          console.error('Failed to initialize game services:', error);
          dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize game services' });
        }
      }
    };

    initializeServices();
  }, [currentUser, isLoggedIn, isConnected, initializeRealtime]);

  // Computed properties (from HEAD)
  const isGameHost = state.currentGame?.created_by === currentUser?.id;
  const isParticipant = state.participants.some(p => p.user_id === currentUser?.id);
  const gameParticipants = state.participants;

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

              // Transform participants to include user details
              const participantsWithUser = (gameResult.data.participants || []).map(p => ({
                ...p,
                username: p.username || 'Unknown',
                avatar_url: p.avatar_url
              }));
              dispatch({ type: 'SET_PARTICIPANTS', payload: participantsWithUser });
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

        // Transform participants to include user details
        const participantsWithUser = (gameResult.data.participants || []).map(p => ({
          ...p,
          username: p.username || 'Unknown',
          avatar_url: p.avatar_url
        }));
        dispatch({ type: 'SET_PARTICIPANTS', payload: participantsWithUser });

        // Set current user's selected booster pack and ready status from participants data
        if (currentUser && gameResult.data.participants) {
          const currentUserParticipant = gameResult.data.participants.find(p => p.user_id === currentUser.id);
          if (currentUserParticipant) {
            dispatch({ type: 'SET_SELECTED_BOOSTER_PACK', payload: currentUserParticipant.selected_booster_pack || null });
            dispatch({ type: 'SET_PLAYER_READY', payload: currentUserParticipant.is_ready });
          }
        }

        // Update game phase based on game status - THIS WAS MISSING!
        const gamePhaseMap: Record<GameStatus, GamePhase> = {
          'waiting': GamePhase.WAITING,
          'briefing': GamePhase.BRIEFING,
          'drawing': GamePhase.DRAWING,
          'voting': GamePhase.VOTING,
          'results': GamePhase.RESULTS,
          'completed': GamePhase.COMPLETED,
          'cancelled': GamePhase.COMPLETED
        };

        const newGamePhase = gamePhaseMap[gameResult.data.status];
        if (newGamePhase && newGamePhase !== state.gamePhase) {
          console.log('refreshGameState: Updating game phase:', {
            previousPhase: state.gamePhase.toString(),
            newPhase: newGamePhase.toString(),
            gameStatus: gameResult.data.status
          });
          dispatch({ type: 'SET_GAME_PHASE', payload: newGamePhase });
        }
      } else {
        console.error('refreshGameState: Failed to fetch game data:', gameResult.error);
      }

      // Fetch submissions
      console.log('GameContext: Fetching submissions for game:', targetGameId);
      const submissionsResult = await SubmissionService.getGameSubmissions(targetGameId);
      console.log('GameContext: Submissions result:', {
        success: submissionsResult.success,
        dataLength: submissionsResult.data?.length,
        error: submissionsResult.error
      });
      if (submissionsResult.success && submissionsResult.data) {
        console.log('GameContext: Setting submissions:', submissionsResult.data.length);
        dispatch({ type: 'SET_SUBMISSIONS', payload: submissionsResult.data });
      } else {
        console.error('GameContext: Failed to fetch submissions:', submissionsResult.error);
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

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Create game (from HEAD)
  const createGame = useCallback(async (prompt: string, options: any = {}): Promise<ServiceResponse<Game>> => {
    if (!currentUser) {
      return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const result = await unifiedGameService.current.createGame({
        prompt,
        max_players: options.maxPlayers || 4,
        round_duration: options.roundDuration || 60,
        voting_duration: options.votingDuration || 30
      });

      if (result.success && result.data) {
        dispatch({ type: 'SET_CURRENT_GAME', payload: result.data });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error || 'Failed to create game' });
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, error: errorMsg, code: 'UNKNOWN_ERROR' };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentUser]);

  // Join game (integrated from both branches)
  const joinGame = useCallback(async (gameId: string, boosterPackId?: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('User must be authenticated to join game');
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Join game in database
      const joinResult = await GameService.joinGame({
        game_id: gameId,
        selected_booster_pack: boosterPackId || state.selectedBoosterPack || undefined
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

  // Leave game (integrated from both branches)
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
      setDrawingContext(null);
      currentGameIdRef.current = null;

    } catch (error) {
      console.error('Error leaving game:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to leave game properly' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [currentUser, state.currentGame, leaveRealtimeGame]);

  // Start game (from HEAD)
  const startGame = useCallback(async (): Promise<ServiceResponse<void>> => {
    if (!state.currentGame || !isGameHost) {
      return { success: false, error: 'Not authorized to start game', code: 'UNAUTHORIZED' };
    }

    return await transitionGameStatus('drawing');
  }, [state.currentGame, isGameHost]);

  // Transition game status (from HEAD) - Updated to use GameFlowController
  const transitionGameStatus = useCallback(async (newStatus: GameStatus): Promise<ServiceResponse<void>> => {
    if (!state.currentGame) {
      return { success: false, error: 'No active game', code: 'NO_GAME' };
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Use GameFlowController for centralized, reliable transitions

      const result = await GameFlowController.transitionToPhase(
        state.currentGame.id,
        newStatus,
        { triggeredBy: 'manual' }
      );

      // Convert GameFlowController result to ServiceResponse format
      const serviceResult: ServiceResponse<void> = {
        success: result.success,
        error: result.error,
        code: result.success ? undefined : 'TRANSITION_ERROR'
      };

      if (serviceResult.success) {
        // Fetch updated game data from database to get timestamps
        const gameResult = await GameService.getGame(state.currentGame.id);
        if (gameResult.success && gameResult.data) {
          dispatch({ type: 'SET_CURRENT_GAME', payload: gameResult.data });
          dispatch({ type: 'SET_PARTICIPANTS', payload: gameResult.data.participants || [] });

          // Update state machine to match the new game status
          if (stateMachineRef.current) {
            const gamePhaseMap: Record<GameStatus, GamePhase> = {
              'waiting': GamePhase.WAITING,
              'briefing': GamePhase.BRIEFING,
              'drawing': GamePhase.DRAWING,
              'voting': GamePhase.VOTING,
              'results': GamePhase.RESULTS,
              'completed': GamePhase.COMPLETED,
              'cancelled': GamePhase.COMPLETED
            };

            const newGamePhase = gamePhaseMap[newStatus];
            if (newGamePhase) {
              stateMachineRef.current.updateState({
                gamePhase: newGamePhase,
                currentGame: gameResult.data
              });
              dispatch({ type: 'SET_GAME_PHASE', payload: newGamePhase });
            }
          }

          // Initialize drawing session if transitioning to drawing phase
          if (newStatus === 'drawing') {
            await initializeDrawingSession(state.currentGame.id);
          }
        } else {
          // Fallback to local update if fetch fails
          dispatch({ type: 'SET_CURRENT_GAME', payload: { ...state.currentGame, status: newStatus } });

          if (newStatus === 'drawing') {
            await initializeDrawingSession(state.currentGame.id);
          }
        }
      } else {
        dispatch({ type: 'SET_ERROR', payload: serviceResult.error || 'Failed to transition game status' });
      }

      return serviceResult;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, error: errorMsg, code: 'UNKNOWN_ERROR' };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentGame]);

  // Initialize drawing session (from HEAD)
  const initializeDrawingSession = useCallback(async (gameId: string): Promise<void> => {
    console.log('GameContext: initializeDrawingSession called for gameId:', gameId, {
      hasCurrentGame: !!state.currentGame,
      hasCurrentUser: !!currentUser,
      gameStatus: state.currentGame?.status,
      roundDuration: state.currentGame?.round_duration,
      drawingStartedAt: state.currentGame?.drawing_started_at
    });

    if (!state.currentGame || !currentUser) {
      console.log('GameContext: Cannot initialize drawing session - missing game or user');
      return;
    }

    // Check if game is in a drawable state
    if (!['drawing', 'briefing'].includes(state.currentGame.status)) {
      console.log('GameContext: Game is not in a drawable state:', state.currentGame.status);
      // Still create context for non-drawing phases to show UI
    }

    // Calculate actual time remaining based on when drawing phase started
    let timeRemaining = state.currentGame.round_duration;

    if (state.currentGame.drawing_started_at) {
      const drawingStartTime = new Date(state.currentGame.drawing_started_at).getTime();
      const currentTime = Date.now();
      const elapsedSeconds = Math.floor((currentTime - drawingStartTime) / 1000);
      timeRemaining = Math.max(0, state.currentGame.round_duration - elapsedSeconds);
      console.log('GameContext: Calculated time remaining:', {
        drawingStartTime,
        currentTime,
        elapsedSeconds,
        timeRemaining
      });
    }

    // Get selected booster pack data if available
    let selectedBoosterPackData: BoosterPack | undefined;
    if (state.selectedBoosterPack) {
      try {
        const { BoosterPackService } = await import('../services/BoosterPackService');
        const result = await BoosterPackService.getPackById(state.selectedBoosterPack);
        if (result.success && result.data) {
          selectedBoosterPackData = result.data;
        }
      } catch (error) {
        console.warn('Failed to fetch selected booster pack data:', error);
      }
    }

    // Create drawing context
    const newDrawingContext: GameDrawingContext = {
      gameId,
      prompt: state.currentGame.prompt,
      timeRemaining,
      isDrawingPhase: true, // Always true when initializing drawing session
      canSubmit: true,
      hasSubmitted: false,
      selectedBoosterPack: selectedBoosterPackData,
      availableAssets: [], // Will be populated by booster pack integration
      submitDrawing: async (drawingData: any) => {
        await submitDrawingWithExport(drawingData);
      },
      saveProgress: async (drawingData: any) => {
        await saveDrawingProgress(drawingData);
      },
      loadProgress: async () => {
        return await loadDrawingProgress();
      }
    };

    console.log('GameContext: Setting drawing context:', newDrawingContext);
    setDrawingContext(newDrawingContext);
  }, [state.currentGame, state.selectedBoosterPack, currentUser]);

  // Submit drawing with export (from HEAD)
  const submitDrawingWithExport = useCallback(async (drawingData: any, imageBlob?: Blob): Promise<ServiceResponse<Submission>> => {
    if (!state.currentGame || !currentUser || !drawingContext) {
      return { success: false, error: 'Invalid drawing session', code: 'INVALID_SESSION' };
    }

    if (drawingContext.hasSubmitted) {
      return { success: false, error: 'Drawing already submitted', code: 'ALREADY_SUBMITTED' };
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Extract elements, app state, and files
      const { elements, appState, files } = drawingData;

      console.log('GameContext: Received drawing data:', {
        elementCount: elements?.length || 0,
        filesCount: files ? Object.keys(files).length : 0,
        files: files
      });

      if (!elements || elements.length === 0) {
        return { success: false, error: 'Drawing is empty', code: 'EMPTY_DRAWING' };
      }

      // Export drawing to image if not provided
      let finalImageBlob = imageBlob;
      let drawingUrl = '';
      let thumbnailUrl = '';

      if (!finalImageBlob) {
        const exportResult = await drawingExportService.current.exportToImage(
          elements,
          appState,
          { format: 'png', scale: 1, backgroundColor: '#ffffff' },
          files
        );

        if (!exportResult.success || !exportResult.data) {
          return {
            success: false,
            error: exportResult.error || 'Failed to export drawing',
            code: 'EXPORT_FAILED'
          };
        }

        finalImageBlob = exportResult.data;
      }

      // Upload image to Supabase Storage
      const uploadResult = await drawingExportService.current.uploadToStorage(
        finalImageBlob,
        state.currentGame.id,
        currentUser.id,
        { generateThumbnail: true }
      );

      if (!uploadResult.success || !uploadResult.data) {
        return {
          success: false,
          error: uploadResult.error || 'Failed to upload drawing',
          code: 'UPLOAD_FAILED'
        };
      }

      drawingUrl = uploadResult.data.url;
      thumbnailUrl = uploadResult.data.thumbnailUrl || '';

      // Extract metadata
      const metadata = drawingExportService.current.extractMetadata(
        elements,
        appState,
        state.currentGame.round_duration - drawingContext.timeRemaining,
        finalImageBlob.size,
        'png',
        drawingContext.selectedBoosterPack?.id
      );

      // Submit to database using unified service
      const submissionResult = await unifiedGameService.current.submitDrawing({
        game_id: state.currentGame.id,
        drawing_data: drawingData,
        drawing_url: drawingUrl,
        drawing_thumbnail_url: thumbnailUrl,
        canvas_width: metadata.canvasWidth,
        canvas_height: metadata.canvasHeight,
        element_count: metadata.elementCount,
        drawing_time_seconds: metadata.drawingTime
      });

      if (submissionResult.success && submissionResult.data) {
        // Track booster pack usage if applicable (temporarily disabled due to missing table)
        if (drawingContext.selectedBoosterPack && metadata.assetsUsed.length > 0) {
          // TODO: Re-enable when asset_usage_events table is created
          console.log('Booster pack usage tracking disabled - missing asset_usage_events table');
          /*
          try {
            await boosterPackAnalyticsService.trackBoosterPackUsage(
              currentUser.id,
              state.currentGame.id,
              drawingContext.selectedBoosterPack.id,
              metadata.assetsUsed
            );
          } catch (error) {
            console.warn('Failed to track booster pack usage:', error);
            // Don't fail submission if analytics fails
          }
          */
        }

        // Update drawing context
        setDrawingContext(prev => prev ? {
          ...prev,
          hasSubmitted: true,
          submissionId: submissionResult.data!.id,
          canSubmit: false,
          drawingData
        } : null);

        return submissionResult;
      } else {
        dispatch({ type: 'SET_ERROR', payload: submissionResult.error || 'Failed to submit drawing' });
        return submissionResult;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      return { success: false, error: errorMsg, code: 'UNKNOWN_ERROR' };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentGame, currentUser, drawingContext]);

  // Save drawing progress (from HEAD)
  const saveDrawingProgress = useCallback(async (drawingData: any): Promise<void> => {
    if (!state.currentGame || !currentUser) return;

    try {
      const progressKey = `drawing_progress_${state.currentGame.id}_${currentUser.id}`;
      const progressData = {
        ...drawingData,
        timestamp: Date.now(),
        gameId: state.currentGame.id,
        userId: currentUser.id
      };

      localStorage.setItem(progressKey, JSON.stringify(progressData));

      // Also save a backup with timestamp for recovery
      const backupKey = `drawing_backup_${state.currentGame.id}_${currentUser.id}_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(progressData));

      // Clean up old backups (keep only last 5)
      const allKeys = Object.keys(localStorage);
      const backupKeys = allKeys
        .filter(key => key.startsWith(`drawing_backup_${state.currentGame!.id}_${currentUser.id}_`))
        .sort()
        .reverse();

      // Remove old backups beyond the first 5
      backupKeys.slice(5).forEach(key => {
        localStorage.removeItem(key);
      });

    } catch (err) {
      console.warn('Failed to save drawing progress:', err);
      // Try to clear some space and retry once
      try {
        // Clear old progress data from other games
        const allKeys = Object.keys(localStorage);
        const oldProgressKeys = allKeys.filter(key =>
          key.startsWith('drawing_progress_') &&
          !key.includes(state.currentGame!.id)
        );
        oldProgressKeys.forEach(key => localStorage.removeItem(key));

        // Retry save
        const progressKey = `drawing_progress_${state.currentGame.id}_${currentUser.id}`;
        localStorage.setItem(progressKey, JSON.stringify(drawingData));
      } catch (retryErr) {
        console.error('Failed to save drawing progress after cleanup:', retryErr);
      }
    }
  }, [state.currentGame, currentUser]);

  // Load drawing progress (from HEAD)
  const loadDrawingProgress = useCallback(async (): Promise<any> => {
    if (!state.currentGame || !currentUser) return null;

    try {
      const progressKey = `drawing_progress_${state.currentGame.id}_${currentUser.id}`;
      const saved = localStorage.getItem(progressKey);

      if (saved) {
        const parsedData = JSON.parse(saved);

        // Validate the data belongs to current game/user
        if (parsedData.gameId === state.currentGame.id && parsedData.userId === currentUser.id) {
          return parsedData;
        } else {
          console.warn('Saved progress data mismatch, clearing...');
          localStorage.removeItem(progressKey);
        }
      }

      // Try to recover from backup if main save failed
      const allKeys = Object.keys(localStorage);
      const backupKeys = allKeys
        .filter(key => key.startsWith(`drawing_backup_${state.currentGame!.id}_${currentUser.id}_`))
        .sort()
        .reverse();

      if (backupKeys.length > 0) {
        const latestBackup = localStorage.getItem(backupKeys[0]);
        if (latestBackup) {
          console.log('Recovering drawing from backup');
          return JSON.parse(latestBackup);
        }
      }

      return null;
    } catch (err) {
      console.warn('Failed to load drawing progress:', err);
      return null;
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
      dispatch({ type: 'SET_GAME_PHASE', payload: event.data.newPhase });
      refreshGameState();
    };

    // Timer sync event
    const handleTimerSync = (event: any) => {
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

  // Auto-check transitions when relevant state changes
  // DISABLED: Using GameFlowController for centralized transitions instead
  // useEffect(() => {
  //   if (state.currentGame && stateMachineRef.current) {
  //     // Only auto-transition for certain phases to prevent aggressive transitions
  //     // Skip auto-transitions for briefing phase to allow proper timing
  //     if (state.gamePhase !== GamePhase.BRIEFING) {
  //       const checkPhaseTransitions = async () => {
  //         if (stateMachineRef.current) {
  //           await stateMachineRef.current.checkAndExecuteTransitions();
  //         }
  //       };
  //       checkPhaseTransitions();
  //     }
  //   }
  // }, [state.participants, state.submissions, state.votes]);

  // Server-synchronized timer effect (replaces client-side countdown)
  useEffect(() => {
    // Server-side timer synchronization is now handled by useServerTimer hook
    // Client-side countdown is only for display purposes between server syncs
    // All timer-based phase transitions are handled server-side

    // Note: Individual components should use useServerTimer hook for timer display
    // This context maintains timer state for backward compatibility

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
    }
    // REMOVED: All timer-based auto-transitions now handled server-side
    // Client-side timer expiration no longer triggers phase transitions
  }, [state.currentTimer]);

  // Game Actions from main branch
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
      // Update local state immediately for responsive UI
      dispatch({ type: 'SET_SELECTED_BOOSTER_PACK', payload: packId });

      // Persist selection to database if already in game
      if (state.isInGame) {
        const result = await GameService.updateSelectedBoosterPack(state.currentGame.id, packId);
        if (!result.success) {
          // Revert local state on failure
          dispatch({ type: 'SET_SELECTED_BOOSTER_PACK', payload: state.selectedBoosterPack });
          throw new Error(result.error || 'Failed to update booster pack selection');
        }

        // Broadcast the change via real-time if service is ready
        // Don't fail the entire operation if real-time broadcast fails
        try {
          if (activeGameId && isConnected) {
            await broadcastPlayerReady(state.isReady, packId || undefined);
          }
        } catch (realtimeError) {
          console.warn('Failed to broadcast booster pack selection via real-time:', realtimeError);
          // Don't throw - the database update succeeded, which is the important part
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to select booster pack';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [currentUser, state.currentGame, state.isReady, state.isInGame, state.selectedBoosterPack, activeGameId, isConnected, broadcastPlayerReady]);

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

  const resetGameState = useCallback((): void => {
    dispatch({ type: 'RESET_STATE' });
    setDrawingContext(null);
    currentGameIdRef.current = null;
    if (stateMachineRef.current) {
      stateMachineRef.current.reset(INITIAL_GAME_STATE);
    }
  }, []);

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

  // Extended context value combining both approaches
  const value: ExtendedGameContextType = {
    // State from main branch
    ...state,
    actions,

    // Drawing Context (from HEAD)
    drawingContext,

    // Additional Drawing Actions (from HEAD)
    initializeDrawingSession,
    submitDrawingWithExport,
    saveDrawingProgress,
    loadDrawingProgress,

    // Game Management Actions (from HEAD)
    createGame,
    startGame,
    transitionGameStatus,

    // Computed Properties (from HEAD)
    isGameHost,
    isParticipant,
    gameParticipants
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

// Custom hook to use the game context
export const useGame = (): ExtendedGameContextType => {
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
