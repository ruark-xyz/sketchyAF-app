// Unified Game Service - Combines GameService and RealtimeGameService functionality
// Provides both instance-based and static methods for backward compatibility
// Integrates database and real-time game operations

import { GameService } from './GameService';
import { RealtimeGameService } from './RealtimeGameService';
import { SubmissionService } from './SubmissionService';
import {
  Game,
  GameStatus,
  GameWithParticipants,
  CreateGameRequest,
  JoinGameRequest,
  Submission,
  ServiceResponse,
  validateGameStatusTransition
} from '../types/game';
import { User } from '../types/auth';

export class UnifiedGameService {
  private static instance: UnifiedGameService | null = null;
  private static staticRealtimeService: RealtimeGameService | null = null;
  private realtimeService: RealtimeGameService;
  private currentUser: User | null = null;

  private constructor() {
    this.realtimeService = RealtimeGameService.getInstance();
  }

  /**
   * Get singleton instance (for instance-based usage)
   */
  static getInstance(): UnifiedGameService {
    if (!UnifiedGameService.instance) {
      UnifiedGameService.instance = new UnifiedGameService();
    }
    return UnifiedGameService.instance;
  }

  /**
   * Initialize the service with authenticated user (instance method)
   */
  async initialize(user: User): Promise<ServiceResponse<void>> {
    try {
      // Clear any previous user state to prevent cross-user contamination
      if (this.currentUser && this.currentUser.id !== user.id) {
        console.log('Switching users in UnifiedGameService, clearing previous state');
        this.currentUser = null;
      }

      this.currentUser = user;

      // Initialize real-time service
      const result = await this.realtimeService.initialize(user);

      return result;
    } catch (error) {
      console.error('Failed to initialize UnifiedGameService:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INITIALIZATION_FAILED'
      };
    }
  }

  /**
   * Initialize the unified service with real-time capabilities (static method)
   */
  static async initialize(userId: string): Promise<ServiceResponse<void>> {
    try {
      this.staticRealtimeService = RealtimeGameService.getInstance();
      await this.staticRealtimeService.initialize({ id: userId } as any); // Simplified user object
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
   * Create a new game with automatic real-time setup (instance method)
   */
  async createGame(request: CreateGameRequest): Promise<ServiceResponse<Game>> {
    try {
      // Create game in database
      const result = await GameService.createGame(request);

      if (result.success && result.data) {
        // Automatically join real-time channel for created game
        const joinResult = await this.realtimeService.joinGame(result.data.id);

        if (!joinResult.success) {
          console.warn('Failed to join real-time channel for created game:', joinResult.error);
          // Don't fail the game creation if real-time fails
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to create game:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'GAME_CREATION_FAILED'
      };
    }
  }

  /**
   * Create a game with integrated database and real-time setup (static method)
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
        if (this.staticRealtimeService) {
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
   * Join a game with integrated database and real-time operations (static method)
   */
  static async joinGameWithRealtime(gameId: string): Promise<ServiceResponse<void>> {
    try {
      // 1. Join game in database
      const joinResult = await GameService.joinGame({ game_id: gameId });
      if (!joinResult.success) {
        return joinResult;
      }

      // 2. Join real-time channels
      if (this.staticRealtimeService) {
        const realtimeJoinResult = await this.staticRealtimeService.joinGame(gameId);
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
   * Join a game with automatic real-time setup (instance method)
   */
  async joinGame(request: JoinGameRequest): Promise<ServiceResponse<void>> {
    try {
      // Join game in database
      const result = await GameService.joinGame(request);

      if (result.success) {
        // Join real-time channel
        const joinResult = await this.realtimeService.joinGame(request.game_id);

        if (!joinResult.success) {
          console.warn('Failed to join real-time channel:', joinResult.error);
          // Don't fail the game join if real-time fails
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to join game:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'GAME_JOIN_FAILED'
      };
    }
  }

  /**
   * Transition game status with integrated database and real-time updates (static method)
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
      if (this.staticRealtimeService && previousStatus) {
        try {
          await this.staticRealtimeService.broadcastPhaseChange(newStatus, previousStatus);
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
   * Leave current game with real-time cleanup (instance method)
   */
  async leaveGame(gameId: string): Promise<ServiceResponse<void>> {
    try {
      // Leave game in database
      const result = await GameService.leaveGame(gameId);

      // Leave real-time channel regardless of database result
      const leaveResult = await this.realtimeService.leaveGame();

      if (!leaveResult.success) {
        console.warn('Failed to leave real-time channel:', leaveResult.error);
      }

      return result;
    } catch (error) {
      console.error('Failed to leave game:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'GAME_LEAVE_FAILED'
      };
    }
  }

  /**
   * Leave a game with cleanup of both database and real-time connections (static method)
   */
  static async leaveGameWithRealtime(gameId: string): Promise<ServiceResponse<void>> {
    try {
      // 1. Leave real-time channels first
      if (this.staticRealtimeService) {
        try {
          await this.staticRealtimeService.leaveGame();
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

  /**
   * Get game by ID (instance method)
   */
  async getGameById(gameId: string): Promise<ServiceResponse<GameWithParticipants>> {
    return await GameService.getGame(gameId);
  }

  /**
   * Transition game status with real-time broadcasting (instance method)
   */
  async transitionGameStatus(gameId: string, newStatus: GameStatus, previousStatus?: GameStatus): Promise<ServiceResponse<void>> {
    try {
      // Transition status in database (this automatically broadcasts via database triggers)
      const result = await GameService.transitionGameStatus(gameId, newStatus, previousStatus);

      return result;
    } catch (error) {
      console.error('Failed to transition game status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'STATUS_TRANSITION_FAILED'
      };
    }
  }

  /**
   * Submit drawing with real-time notification (instance method)
   */
  async submitDrawing(request: {
    game_id: string;
    drawing_data: any;
    drawing_url?: string;
    drawing_thumbnail_url?: string;
    canvas_width?: number;
    canvas_height?: number;
    element_count?: number;
    drawing_time_seconds?: number;
  }): Promise<ServiceResponse<Submission>> {
    try {
      // Submit drawing to database
      const result = await SubmissionService.submitDrawing(request);

      if (result.success && result.data) {
        // Broadcast drawing submission event
        const broadcastResult = await this.realtimeService.broadcastDrawingSubmitted(
          result.data.id,
          request.element_count || 0,
          request.drawing_time_seconds || 0
        );

        if (!broadcastResult.success) {
          console.warn('Failed to broadcast drawing submission:', broadcastResult.error);
          // Don't fail the submission if broadcast fails
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to submit drawing:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'DRAWING_SUBMISSION_FAILED'
      };
    }
  }

  // Private helper methods

  /**
   * Initialize real-time channels for a game (static method)
   */
  private static async initializeGameChannels(gameId: string): Promise<ServiceResponse<void>> {
    try {
      if (!this.staticRealtimeService) {
        return { success: false, error: 'Real-time service not initialized', code: 'SERVICE_NOT_INITIALIZED' };
      }

      // Join the game channel
      const joinResult = await this.staticRealtimeService.joinGame(gameId);
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
   * Enable presence tracking for a game (static method)
   */
  private static async enablePresenceTracking(gameId: string): Promise<void> {
    try {
      if (!this.staticRealtimeService) {
        console.warn('Real-time service not available for presence tracking');
        return;
      }

      // Note: Presence tracking setup would go here
      // Currently not implemented in RealtimeGameService

      console.log(`Enabled presence tracking for game: ${gameId}`);
    } catch (error) {
      console.error('Failed to enable presence tracking:', error);
      // Don't throw, presence tracking is optional
    }
  }

  /**
   * Get the current real-time service instance (static method)
   */
  static getRealtimeService(): RealtimeGameService | null {
    return this.staticRealtimeService;
  }

  /**
   * Check if user is authenticated (instance method)
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Get current user (instance method)
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Disconnect from real-time services (instance method)
   */
  async disconnect(): Promise<void> {
    try {
      await this.realtimeService.disconnect();
      this.currentUser = null;
    } catch (error) {
      console.error('Failed to disconnect UnifiedGameService:', error);
    }
  }

  /**
   * Check if real-time capabilities are available (static method)
   */
  static isRealtimeAvailable(): boolean {
    return this.staticRealtimeService !== null;
  }
}

// Export singleton instance for easy access
export const unifiedGameService = UnifiedGameService.getInstance();
