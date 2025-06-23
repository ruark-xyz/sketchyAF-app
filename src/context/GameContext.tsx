import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Game, GameStatus, Submission, BoosterPack, ServiceResponse } from '../types/game';
import { User } from '../types/auth';
import { ImageAsset } from '../types/assets';
import { GameService } from '../services/GameService';
import { RealtimeGameService } from '../services/RealtimeGameService';
import { SubmissionService } from '../services/SubmissionService';
import { UnifiedGameService } from '../services/UnifiedGameService';
import { DrawingExportService } from '../services/DrawingExportService';
import { boosterPackAnalyticsService } from '../services/BoosterPackAnalyticsService';
import { useAuth } from './AuthContext';
import { useRealtimeGame } from '../hooks/useRealtimeGame';

// Game Drawing Context Interface
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

// Game Context Interface
export interface GameContextType {
  // Current Game State
  currentGame: Game | null;
  gameParticipants: any[];
  isGameHost: boolean;
  isParticipant: boolean;
  
  // Drawing Context
  drawingContext: GameDrawingContext | null;
  
  // Game Actions
  createGame: (prompt: string, options?: any) => Promise<ServiceResponse<Game>>;
  joinGame: (gameId: string, boosterPackId?: string) => Promise<ServiceResponse<void>>;
  leaveGame: () => Promise<ServiceResponse<void>>;
  startGame: () => Promise<ServiceResponse<void>>;
  transitionGameStatus: (newStatus: GameStatus) => Promise<ServiceResponse<void>>;
  
  // Drawing Actions
  initializeDrawingSession: (gameId: string) => Promise<void>;
  submitDrawing: (drawingData: any, imageBlob?: Blob) => Promise<ServiceResponse<Submission>>;
  saveDrawingProgress: (drawingData: any) => Promise<void>;
  loadDrawingProgress: () => Promise<any>;
  
  // State
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

// Create the context
const GameContext = createContext<GameContextType | undefined>(undefined);

// Game Context Provider
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoggedIn } = useAuth();
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [gameParticipants, setGameParticipants] = useState<any[]>([]);
  const [drawingContext, setDrawingContext] = useState<GameDrawingContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Services
  const unifiedGameService = useRef(UnifiedGameService.getInstance());
  const drawingExportService = useRef(DrawingExportService.getInstance());

  // Real-time game integration
  const {
    initializeRealtime,
    joinGame: joinRealtimeGame,
    leaveGame: leaveRealtimeGame,
    addEventListener,
    removeEventListener,
    isConnected
  } = useRealtimeGame();

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
          setError('Failed to initialize game services');
        }
      }
    };

    initializeServices();
  }, [currentUser, isLoggedIn, isConnected, initializeRealtime]);

  // Computed properties
  const isGameHost = currentGame?.created_by === currentUser?.id;
  const isParticipant = gameParticipants.some(p => p.user_id === currentUser?.id);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Create game
  const createGame = useCallback(async (prompt: string, options: any = {}): Promise<ServiceResponse<Game>> => {
    if (!currentUser) {
      return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await unifiedGameService.current.createGame({
        prompt,
        max_players: options.maxPlayers || 4,
        round_duration: options.roundDuration || 60,
        voting_duration: options.votingDuration || 30
      });

      if (result.success && result.data) {
        setCurrentGame(result.data);
      } else {
        setError(result.error || 'Failed to create game');
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'UNKNOWN_ERROR' };
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Join game
  const joinGame = useCallback(async (gameId: string, boosterPackId?: string): Promise<ServiceResponse<void>> => {
    if (!currentUser) {
      return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Join game using unified service
      const result = await unifiedGameService.current.joinGame({
        game_id: gameId,
        selected_booster_pack: boosterPackId
      });

      if (result.success) {
        // Get updated game data
        const gameResult = await unifiedGameService.current.getGameById(gameId);
        if (gameResult.success && gameResult.data) {
          setCurrentGame(gameResult.data);
          setGameParticipants(gameResult.data.participants);
        }
      } else {
        setError(result.error || 'Failed to join game');
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'UNKNOWN_ERROR' };
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Leave game
  const leaveGame = useCallback(async (): Promise<ServiceResponse<void>> => {
    if (!currentGame || !currentUser) {
      return { success: true };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Leave game using unified service
      const result = await unifiedGameService.current.leaveGame(currentGame.id);

      if (result.success) {
        // Clear game state
        setCurrentGame(null);
        setGameParticipants([]);
        setDrawingContext(null);
      } else {
        setError(result.error || 'Failed to leave game');
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'UNKNOWN_ERROR' };
    } finally {
      setIsLoading(false);
    }
  }, [currentGame, currentUser]);

  // Start game
  const startGame = useCallback(async (): Promise<ServiceResponse<void>> => {
    if (!currentGame || !isGameHost) {
      return { success: false, error: 'Not authorized to start game', code: 'UNAUTHORIZED' };
    }

    return await transitionGameStatus('drawing');
  }, [currentGame, isGameHost]);

  // Transition game status
  const transitionGameStatus = useCallback(async (newStatus: GameStatus): Promise<ServiceResponse<void>> => {
    if (!currentGame) {
      return { success: false, error: 'No active game', code: 'NO_GAME' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await unifiedGameService.current.transitionGameStatus(currentGame.id, newStatus, currentGame.status);

      if (result.success) {
        // Update local game state
        setCurrentGame(prev => prev ? { ...prev, status: newStatus } : null);

        // Initialize drawing session if transitioning to drawing phase
        if (newStatus === 'drawing') {
          await initializeDrawingSession(currentGame.id);
        }
      } else {
        setError(result.error || 'Failed to transition game status');
      }

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'UNKNOWN_ERROR' };
    } finally {
      setIsLoading(false);
    }
  }, [currentGame]);

  // Initialize drawing session
  const initializeDrawingSession = useCallback(async (gameId: string): Promise<void> => {
    if (!currentGame || !currentUser) return;

    // Create drawing context
    const newDrawingContext: GameDrawingContext = {
      gameId,
      prompt: currentGame.prompt,
      timeRemaining: currentGame.round_duration,
      isDrawingPhase: true, // Always true when initializing drawing session
      canSubmit: true,
      hasSubmitted: false,
      availableAssets: [], // Will be populated by booster pack integration
      submitDrawing: async (drawingData: any) => {
        await submitDrawing(drawingData);
      },
      saveProgress: async (drawingData: any) => {
        await saveDrawingProgress(drawingData);
      },
      loadProgress: async () => {
        return await loadDrawingProgress();
      }
    };

    setDrawingContext(newDrawingContext);
  }, [currentGame, currentUser]);

  // Submit drawing
  const submitDrawing = useCallback(async (drawingData: any, imageBlob?: Blob): Promise<ServiceResponse<Submission>> => {
    if (!currentGame || !currentUser || !drawingContext) {
      return { success: false, error: 'Invalid drawing session', code: 'INVALID_SESSION' };
    }

    if (drawingContext.hasSubmitted) {
      return { success: false, error: 'Drawing already submitted', code: 'ALREADY_SUBMITTED' };
    }

    setIsLoading(true);
    setError(null);

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
        currentGame.id,
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
        currentGame.round_duration - drawingContext.timeRemaining,
        finalImageBlob.size,
        'png',
        drawingContext.selectedBoosterPack?.id
      );

      // Submit to database using unified service
      const submissionResult = await unifiedGameService.current.submitDrawing({
        game_id: currentGame.id,
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
              currentGame.id,
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
        setError(submissionResult.error || 'Failed to submit drawing');
        return submissionResult;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return { success: false, error: errorMsg, code: 'UNKNOWN_ERROR' };
    } finally {
      setIsLoading(false);
    }
  }, [currentGame, currentUser, drawingContext]);

  // Save drawing progress
  const saveDrawingProgress = useCallback(async (drawingData: any): Promise<void> => {
    if (!currentGame || !currentUser) return;

    try {
      const progressKey = `drawing_progress_${currentGame.id}_${currentUser.id}`;
      const progressData = {
        ...drawingData,
        timestamp: Date.now(),
        gameId: currentGame.id,
        userId: currentUser.id
      };

      localStorage.setItem(progressKey, JSON.stringify(progressData));

      // Also save a backup with timestamp for recovery
      const backupKey = `drawing_backup_${currentGame.id}_${currentUser.id}_${Date.now()}`;
      localStorage.setItem(backupKey, JSON.stringify(progressData));

      // Clean up old backups (keep only last 5)
      const allKeys = Object.keys(localStorage);
      const backupKeys = allKeys
        .filter(key => key.startsWith(`drawing_backup_${currentGame.id}_${currentUser.id}_`))
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
          !key.includes(currentGame.id)
        );
        oldProgressKeys.forEach(key => localStorage.removeItem(key));

        // Retry save
        const progressKey = `drawing_progress_${currentGame.id}_${currentUser.id}`;
        localStorage.setItem(progressKey, JSON.stringify(drawingData));
      } catch (retryErr) {
        console.error('Failed to save drawing progress after cleanup:', retryErr);
      }
    }
  }, [currentGame, currentUser]);

  // Load drawing progress
  const loadDrawingProgress = useCallback(async (): Promise<any> => {
    if (!currentGame || !currentUser) return null;

    try {
      const progressKey = `drawing_progress_${currentGame.id}_${currentUser.id}`;
      const saved = localStorage.getItem(progressKey);

      if (saved) {
        const parsedData = JSON.parse(saved);

        // Validate the data belongs to current game/user
        if (parsedData.gameId === currentGame.id && parsedData.userId === currentUser.id) {
          return parsedData;
        } else {
          console.warn('Saved progress data mismatch, clearing...');
          localStorage.removeItem(progressKey);
        }
      }

      // Try to recover from backup if main save failed
      const allKeys = Object.keys(localStorage);
      const backupKeys = allKeys
        .filter(key => key.startsWith(`drawing_backup_${currentGame.id}_${currentUser.id}_`))
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
  }, [currentGame, currentUser]);

  // Context value
  const value: GameContextType = {
    // Current Game State
    currentGame,
    gameParticipants,
    isGameHost,
    isParticipant,

    // Drawing Context
    drawingContext,

    // Game Actions
    createGame,
    joinGame,
    leaveGame,
    startGame,
    transitionGameStatus,

    // Drawing Actions
    initializeDrawingSession,
    submitDrawing,
    saveDrawingProgress,
    loadDrawingProgress,

    // State
    isLoading,
    error,
    clearError
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

export default GameContext;
