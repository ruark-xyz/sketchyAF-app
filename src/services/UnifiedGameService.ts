// Unified Game Service - Combines GameService and RealtimeGameService functionality
// Provides a single interface for all game operations including real-time features

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
  ServiceResponse 
} from '../types/game';
import { User } from '../types/auth';

export class UnifiedGameService {
  private static instance: UnifiedGameService | null = null;
  private realtimeService: RealtimeGameService;
  private currentUser: User | null = null;

  private constructor() {
    this.realtimeService = RealtimeGameService.getInstance();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): UnifiedGameService {
    if (!UnifiedGameService.instance) {
      UnifiedGameService.instance = new UnifiedGameService();
    }
    return UnifiedGameService.instance;
  }

  /**
   * Initialize the service with authenticated user
   */
  async initialize(user: User): Promise<ServiceResponse<void>> {
    try {
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
   * Create a new game with automatic real-time setup
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
   * Join a game with automatic real-time setup
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
   * Leave current game with real-time cleanup
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
   * Get game by ID
   */
  async getGameById(gameId: string): Promise<ServiceResponse<GameWithParticipants>> {
    return await GameService.getGame(gameId);
  }

  /**
   * Transition game status with real-time broadcasting
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
   * Submit drawing with real-time notification
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

  /**
   * Get available games for joining
   */
  async getAvailableGames(limit = 20): Promise<ServiceResponse<any>> {
    return await GameService.getAvailableGames(limit);
  }

  /**
   * Get user's games
   */
  async getUserGames(limit = 20): Promise<ServiceResponse<any>> {
    return await GameService.getUserGames(limit);
  }

  /**
   * Broadcast player ready status
   */
  async broadcastPlayerReady(isReady: boolean, selectedBoosterPack?: string): Promise<ServiceResponse<void>> {
    return await this.realtimeService.broadcastPlayerReady(isReady, selectedBoosterPack);
  }

  /**
   * Broadcast timer sync
   */
  async broadcastTimerSync(timeRemaining: number, phase: GameStatus, totalDuration: number): Promise<ServiceResponse<void>> {
    return await this.realtimeService.broadcastTimerSync(timeRemaining, phase, totalDuration);
  }

  /**
   * Get real-time service for direct access to event handling
   */
  getRealtimeService(): RealtimeGameService {
    return this.realtimeService;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Disconnect from real-time services
   */
  async disconnect(): Promise<void> {
    try {
      await this.realtimeService.disconnect();
      this.currentUser = null;
    } catch (error) {
      console.error('Failed to disconnect UnifiedGameService:', error);
    }
  }
}

// Export singleton instance for easy access
export const unifiedGameService = UnifiedGameService.getInstance();
