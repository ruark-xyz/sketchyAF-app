// Unified Game Service - Integrates database and real-time game operations
// Provides a single interface for creating games with both database persistence and real-time channel setup

import { GameService } from './GameService';
import { RealtimeGameService } from './RealtimeGameService';
import { 
  Game, 
  CreateGameRequest, 
  ServiceResponse, 
  GameStatus,
  validateGameStatusTransition 
} from '../types/game';

export class UnifiedGameService {
  private static realtimeService: RealtimeGameService | null = null;

  /**
   * Initialize the unified service with real-time capabilities
   */
  static async initialize(userId: string): Promise<ServiceResponse<void>> {
    try {
      this.realtimeService = RealtimeGameService.getInstance();
      await this.realtimeService.initialize({ id: userId } as any); // Simplified user object
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize unified game service:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Initialization failed',
        code: 'INITIALIZATION_ERROR'
      };
    }
  }

  /**
   * Create a game with integrated database and real-time setup
   */
  static async createGameWithRealtime(request: CreateGameRequest): Promise<ServiceResponse<Game>> {
    try {
      // 1. Create game in database first
      const gameResult = await GameService.createGame(request);
      if (!gameResult.success || !gameResult.data) {
        return gameResult;
      }

      const game = gameResult.data;

      try {
        // 2. Initialize PubNub channels for the game
        if (this.realtimeService) {
          const realtimeResult = await this.initializeGameChannels(game.id);
          if (!realtimeResult.success) {
            console.warn('Failed to initialize real-time channels:', realtimeResult.error);
            // Don't fail the entire operation, but log the issue
          }

          // 3. Set up presence tracking
          await this.enablePresenceTracking(game.id);
        }

        return { success: true, data: game };
      } catch (realtimeError) {
        console.warn('Real-time setup failed, but game was created:', realtimeError);
        // Game was created successfully, real-time is optional
        return { success: true, data: game };
      }
    } catch (error) {
      console.error('Failed to create unified game session:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Game creation failed',
        code: 'CREATION_ERROR'
      };
    }
  }

  /**
   * Join a game with integrated database and real-time operations
   */
  static async joinGameWithRealtime(gameId: string): Promise<ServiceResponse<void>> {
    try {
      // 1. Join game in database
      const joinResult = await GameService.joinGame({ game_id: gameId });
      if (!joinResult.success) {
        return joinResult;
      }

      // 2. Join real-time channels
      if (this.realtimeService) {
        const realtimeJoinResult = await this.realtimeService.joinGame(gameId);
        if (!realtimeJoinResult.success) {
          console.warn('Failed to join real-time channels:', realtimeJoinResult.error);
          // Don't fail the operation, real-time is optional
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to join game with real-time:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to join game',
        code: 'JOIN_ERROR'
      };
    }
  }

  /**
   * Transition game status with integrated database and real-time updates
   */
  static async transitionGameStatusWithRealtime(
    gameId: string, 
    newStatus: GameStatus, 
    previousStatus?: GameStatus
  ): Promise<ServiceResponse<void>> {
    try {
      // Validate the transition first
      if (previousStatus) {
        const validation = validateGameStatusTransition(previousStatus, newStatus);
        if (!validation.success) {
          return validation;
        }
      }

      // 1. Update database status
      const transitionResult = await GameService.transitionGameStatus(gameId, newStatus, previousStatus);
      if (!transitionResult.success) {
        return transitionResult;
      }

      // 2. Broadcast real-time phase change (already handled in GameService, but ensure consistency)
      if (this.realtimeService && previousStatus) {
        try {
          await this.realtimeService.broadcastPhaseChange(newStatus, previousStatus);
        } catch (realtimeError) {
          console.warn('Failed to broadcast phase change:', realtimeError);
          // Don't fail the operation, real-time is optional
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to transition game status with real-time:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Status transition failed',
        code: 'TRANSITION_ERROR'
      };
    }
  }

  /**
   * Leave a game with cleanup of both database and real-time connections
   */
  static async leaveGameWithRealtime(gameId: string): Promise<ServiceResponse<void>> {
    try {
      // 1. Leave real-time channels first
      if (this.realtimeService) {
        try {
          await this.realtimeService.leaveGame();
        } catch (realtimeError) {
          console.warn('Failed to leave real-time channels:', realtimeError);
          // Continue with database cleanup
        }
      }

      // 2. Update database (mark as left)
      const leaveResult = await GameService.leaveGame(gameId);
      if (!leaveResult.success) {
        return leaveResult;
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to leave game with real-time cleanup:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to leave game',
        code: 'LEAVE_ERROR'
      };
    }
  }

  // Private helper methods

  /**
   * Initialize real-time channels for a game
   */
  private static async initializeGameChannels(gameId: string): Promise<ServiceResponse<void>> {
    try {
      if (!this.realtimeService) {
        return { success: false, error: 'Real-time service not initialized', code: 'SERVICE_NOT_INITIALIZED' };
      }

      // Join the game channel
      const joinResult = await this.realtimeService.joinGame(gameId);
      if (!joinResult.success) {
        return joinResult;
      }

      console.log(`Initialized real-time channels for game: ${gameId}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize game channels:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Channel initialization failed',
        code: 'CHANNEL_INIT_ERROR'
      };
    }
  }

  /**
   * Enable presence tracking for a game
   */
  private static async enablePresenceTracking(gameId: string): Promise<void> {
    try {
      if (!this.realtimeService) {
        console.warn('Real-time service not available for presence tracking');
        return;
      }

      // Set up presence change handlers
      this.realtimeService.onPresenceChange((presence) => {
        console.log('Presence change in game:', gameId, presence);
        // Could trigger database updates here if needed
      });

      console.log(`Enabled presence tracking for game: ${gameId}`);
    } catch (error) {
      console.error('Failed to enable presence tracking:', error);
      // Don't throw, presence tracking is optional
    }
  }

  /**
   * Get the current real-time service instance
   */
  static getRealtimeService(): RealtimeGameService | null {
    return this.realtimeService;
  }

  /**
   * Check if real-time capabilities are available
   */
  static isRealtimeAvailable(): boolean {
    return this.realtimeService !== null;
  }
}
