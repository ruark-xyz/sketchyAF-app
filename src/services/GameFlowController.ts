/**
 * Centralized Game Flow Controller
 * 
 * This service provides a single, reliable way to manage game phase transitions.
 * It replaces the multiple competing transition systems with one authoritative controller.
 */

import { GameStatus } from '../types/game';
import { GameService } from './GameService';
import { supabase } from '../utils/supabase';

export interface GameFlowOptions {
  gameId: string;
  skipValidation?: boolean;
  triggeredBy?: 'timer' | 'manual' | 'condition' | 'system' | 'timer_expired';
}

export interface TransitionResult {
  success: boolean;
  error?: string;
  previousStatus?: GameStatus;
  newStatus?: GameStatus;
  timestamp?: number;
}

/**
 * Centralized controller for all game phase transitions
 */
export class GameFlowController {
  private static activeTransitions = new Set<string>();
  private static transitionHistory = new Map<string, TransitionResult[]>();

  /**
   * Transition game to the next logical phase
   */
  static async transitionToNextPhase(options: GameFlowOptions): Promise<TransitionResult> {
    const { gameId, triggeredBy = 'manual' } = options;

    // Prevent concurrent transitions for the same game
    if (this.activeTransitions.has(gameId)) {
      return {
        success: false,
        error: 'Transition already in progress for this game'
      };
    }

    this.activeTransitions.add(gameId);

    try {
      // Get current game status
      const currentGame = await this.getCurrentGameStatus(gameId);
      if (!currentGame.success || !currentGame.data) {
        return {
          success: false,
          error: currentGame.error || 'Game not found'
        };
      }

      const currentStatus = currentGame.data.status;
      const nextStatus = this.getNextPhase(currentStatus);

      if (!nextStatus) {
        return {
          success: false,
          error: `No valid next phase from ${currentStatus}`
        };
      }

      // Validate transition conditions
      const validation = await this.validateTransitionConditions(gameId, currentStatus, nextStatus);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Execute the transition
      const result = await this.executeTransition(gameId, currentStatus, nextStatus, triggeredBy);
      
      // Record transition history
      this.recordTransition(gameId, result);

      return result;

    } finally {
      this.activeTransitions.delete(gameId);
    }
  }

  /**
   * Transition to a specific phase (with validation)
   */
  static async transitionToPhase(
    gameId: string, 
    targetStatus: GameStatus, 
    options: Partial<GameFlowOptions> = {}
  ): Promise<TransitionResult> {
    const { triggeredBy = 'manual', skipValidation = false } = options;

    if (this.activeTransitions.has(gameId)) {
      return {
        success: false,
        error: 'Transition already in progress for this game'
      };
    }

    this.activeTransitions.add(gameId);

    try {
      // Get current status
      const currentGame = await this.getCurrentGameStatus(gameId);
      if (!currentGame.success || !currentGame.data) {
        return {
          success: false,
          error: currentGame.error || 'Game not found'
        };
      }

      const currentStatus = currentGame.data.status;

      // Skip if already in target status
      if (currentStatus === targetStatus) {
        return {
          success: true,
          previousStatus: currentStatus,
          newStatus: targetStatus,
          timestamp: Date.now()
        };
      }

      // Validate transition if not skipped
      if (!skipValidation) {
        const validation = await this.validateTransitionConditions(gameId, currentStatus, targetStatus);
        if (!validation.success) {
          return {
            success: false,
            error: validation.error
          };
        }
      }

      // Execute transition
      const result = await this.executeTransition(gameId, currentStatus, targetStatus, triggeredBy);
      this.recordTransition(gameId, result);

      return result;

    } finally {
      this.activeTransitions.delete(gameId);
    }
  }

  /**
   * Get the next logical phase for a given status
   */
  private static getNextPhase(currentStatus: GameStatus): GameStatus | null {
    const phaseFlow: Record<GameStatus, GameStatus | null> = {
      'waiting': 'briefing',
      'briefing': 'drawing',
      'drawing': 'voting',
      'voting': 'completed',
      'completed': null,
      'cancelled': null
    };

    return phaseFlow[currentStatus] || null;
  }

  /**
   * Get current game status from database
   */
  private static async getCurrentGameStatus(gameId: string): Promise<{
    success: boolean;
    data?: { status: GameStatus; participants_count: number };
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          status,
          participants:game_participants!inner(count)
        `)
        .eq('id', gameId)
        .is('game_participants.left_at', null)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          status: data.status as GameStatus,
          participants_count: data.participants?.length || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate transition conditions
   */
  private static async validateTransitionConditions(
    gameId: string,
    fromStatus: GameStatus,
    toStatus: GameStatus
  ): Promise<{ success: boolean; error?: string }> {
    // Basic transition validation
    const validTransitions: Record<GameStatus, GameStatus[]> = {
      'waiting': ['briefing', 'cancelled'],
      'briefing': ['drawing', 'cancelled'],
      'drawing': ['voting', 'cancelled'],
      'voting': ['results', 'cancelled'],
      'results': ['completed'],
      'completed': [],
      'cancelled': []
    };

    if (!validTransitions[fromStatus]?.includes(toStatus)) {
      return {
        success: false,
        error: `Invalid transition from ${fromStatus} to ${toStatus}`
      };
    }

    // Phase-specific validations
    if (toStatus === 'voting') {
      // Check if there are submissions to vote on
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id')
        .eq('game_id', gameId);

      if (!submissions || submissions.length === 0) {
        return {
          success: false,
          error: 'Cannot start voting with no submissions'
        };
      }
    }

    return { success: true };
  }

  /**
   * Execute the actual transition
   */
  private static async executeTransition(
    gameId: string,
    fromStatus: GameStatus,
    toStatus: GameStatus,
    triggeredBy: string
  ): Promise<TransitionResult> {
    try {
      // Use GameService for the actual database transition
      const result = await GameService.transitionGameStatus(gameId, toStatus, fromStatus);

      if (result.success) {
        return {
          success: true,
          previousStatus: fromStatus,
          newStatus: toStatus,
          timestamp: Date.now()
        };
      } else {
        return {
          success: false,
          error: result.error,
          previousStatus: fromStatus
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        previousStatus: fromStatus
      };
    }
  }

  /**
   * Record transition in history
   */
  private static recordTransition(gameId: string, result: TransitionResult): void {
    if (!this.transitionHistory.has(gameId)) {
      this.transitionHistory.set(gameId, []);
    }
    this.transitionHistory.get(gameId)!.push(result);
  }

  /**
   * Get transition history for a game
   */
  static getTransitionHistory(gameId: string): TransitionResult[] {
    return this.transitionHistory.get(gameId) || [];
  }

  /**
   * Check if a transition is currently in progress
   */
  static isTransitionInProgress(gameId: string): boolean {
    return this.activeTransitions.has(gameId);
  }

  /**
   * Handle timer expiration (called by server-side timer monitoring)
   */
  static async handleTimerExpiration(gameId: string): Promise<TransitionResult> {
    return await this.transitionToNextPhase({
      gameId,
      triggeredBy: 'timer_expired',
      skipValidation: false // Still validate conditions
    });
  }

  /**
   * Transition with conflict resolution for concurrent transitions
   */
  static async transitionWithConflictResolution(
    gameId: string,
    triggeredBy: 'timer_expired' | 'manual' | 'condition'
  ): Promise<TransitionResult> {
    // Check if transition already in progress
    if (this.activeTransitions.has(gameId)) {
      if (triggeredBy === 'timer_expired') {
        // Timer expiration has lower priority than manual transitions
        return {
          success: false,
          error: 'Manual transition in progress - timer expiration skipped',
          timestamp: Date.now()
        };
      }

      // Manual transitions wait briefly for ongoing transitions
      if (triggeredBy === 'manual') {
        let attempts = 0;
        const maxAttempts = 3;

        while (this.activeTransitions.has(gameId) && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
          attempts++;
        }

        if (this.activeTransitions.has(gameId)) {
          return {
            success: false,
            error: 'Another transition is still in progress',
            timestamp: Date.now()
          };
        }
      }
    }

    return await this.transitionToNextPhase({ gameId, triggeredBy });
  }

  /**
   * Validate that timer-triggered transitions are appropriate
   */
  static async validateTimerTransition(gameId: string, currentStatus: GameStatus): Promise<boolean> {
    try {
      // Get current game state
      const gameState = await this.getCurrentGameStatus(gameId);
      if (!gameState.success || !gameState.data) {
        return false;
      }

      // Verify status hasn't changed (race condition check)
      if (gameState.data.status !== currentStatus) {
        return false;
      }

      // Additional validation for specific phases
      if (currentStatus === 'drawing') {
        // Check if we have participants
        if (gameState.data.participants_count === 0) {
          return false;
        }
      }

      if (currentStatus === 'voting') {
        // Check if we have submissions
        const { data: submissions } = await supabase
          .from('submissions')
          .select('id')
          .eq('game_id', gameId);

        if (!submissions || submissions.length === 0) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear transition history (for cleanup)
   */
  static clearHistory(gameId?: string): void {
    if (gameId) {
      this.transitionHistory.delete(gameId);
    } else {
      this.transitionHistory.clear();
    }
  }
}
