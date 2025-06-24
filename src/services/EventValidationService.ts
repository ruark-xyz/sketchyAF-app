// Event Validation Service - Server-side validation of real-time events
// Validates real-time events against database state to ensure consistency

import { supabase } from '../utils/supabase';
import { 
  GameEvent, 
  GameEventType,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  GamePhaseChangedEvent,
  DrawingSubmittedEvent,
  VoteCastEvent
} from '../types/realtime';
import { GameStatus, ServiceResponse, isValidGameStatus, validateGameStatusTransition } from '../types/game';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  code?: string;
  details?: any;
}

export class EventValidationService {
  /**
   * Validate a game event against current database state
   */
  static async validateGameEvent(event: GameEvent): Promise<ValidationResult> {
    try {
      // Basic event structure validation
      const structureValidation = this.validateEventStructure(event);
      if (!structureValidation.isValid) {
        return structureValidation;
      }

      // Event-specific validation
      switch (event.type) {
        case 'player_joined':
          return await this.validatePlayerJoinedEvent(event as PlayerJoinedEvent);
        
        case 'player_left':
          return await this.validatePlayerLeftEvent(event as PlayerLeftEvent);
        
        case 'phase_changed':
          return await this.validatePhaseChangedEvent(event as GamePhaseChangedEvent);
        
        case 'drawing_submitted':
          return await this.validateDrawingSubmittedEvent(event as DrawingSubmittedEvent);
        
        case 'vote_cast':
          return await this.validateVoteCastEvent(event as VoteCastEvent);
        
        case 'player_ready':
        case 'game_started':
        case 'timer_sync':
        case 'game_completed':
        case 'connection_status':
          // These events have basic validation for now
          return await this.validateBasicGameEvent(event);
        
        default:
          return {
            isValid: false,
            error: `Unknown event type: ${event.type}`,
            code: 'UNKNOWN_EVENT_TYPE'
          };
      }
    } catch (error) {
      console.error('Event validation error:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
        code: 'VALIDATION_ERROR'
      };
    }
  }

  /**
   * Validate basic event structure
   */
  private static validateEventStructure(event: GameEvent): ValidationResult {
    if (!event.type || typeof event.type !== 'string') {
      return { isValid: false, error: 'Event type is required', code: 'MISSING_TYPE' };
    }

    if (!event.gameId || typeof event.gameId !== 'string') {
      return { isValid: false, error: 'Game ID is required', code: 'MISSING_GAME_ID' };
    }

    if (!event.userId || typeof event.userId !== 'string') {
      return { isValid: false, error: 'User ID is required', code: 'MISSING_USER_ID' };
    }

    if (!event.timestamp || typeof event.timestamp !== 'number') {
      return { isValid: false, error: 'Timestamp is required', code: 'MISSING_TIMESTAMP' };
    }

    // Check timestamp is not too old or in the future
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    const maxFuture = 1 * 60 * 1000; // 1 minute

    if (event.timestamp < now - maxAge) {
      return { isValid: false, error: 'Event timestamp too old', code: 'TIMESTAMP_TOO_OLD' };
    }

    if (event.timestamp > now + maxFuture) {
      return { isValid: false, error: 'Event timestamp in future', code: 'TIMESTAMP_FUTURE' };
    }

    return { isValid: true };
  }

  /**
   * Validate player joined event
   */
  private static async validatePlayerJoinedEvent(event: PlayerJoinedEvent): Promise<ValidationResult> {
    try {
      // Check if game exists and is in waiting status
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('status, max_players, current_players')
        .eq('id', event.gameId)
        .single();

      if (gameError || !game) {
        return { isValid: false, error: 'Game not found', code: 'GAME_NOT_FOUND' };
      }

      if (game.status !== 'waiting') {
        return { isValid: false, error: 'Game not accepting players', code: 'GAME_NOT_WAITING' };
      }

      if (game.current_players >= game.max_players) {
        return { isValid: false, error: 'Game is full', code: 'GAME_FULL' };
      }

      // Check if user is already a participant
      const { data: participant } = await supabase
        .from('game_participants')
        .select('id')
        .eq('game_id', event.gameId)
        .eq('user_id', event.userId)
        .is('left_at', null)
        .single();

      if (participant) {
        return { isValid: false, error: 'User already in game', code: 'ALREADY_JOINED' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Player join validation failed', code: 'VALIDATION_ERROR' };
    }
  }

  /**
   * Validate player left event
   */
  private static async validatePlayerLeftEvent(event: PlayerLeftEvent): Promise<ValidationResult> {
    try {
      // Check if user is actually a participant in the game
      const { data: participant, error } = await supabase
        .from('game_participants')
        .select('id, left_at')
        .eq('game_id', event.gameId)
        .eq('user_id', event.userId)
        .single();

      if (error || !participant) {
        return { isValid: false, error: 'User not in game', code: 'NOT_PARTICIPANT' };
      }

      if (participant.left_at) {
        return { isValid: false, error: 'User already left game', code: 'ALREADY_LEFT' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Player left validation failed', code: 'VALIDATION_ERROR' };
    }
  }

  /**
   * Validate phase changed event
   */
  private static async validatePhaseChangedEvent(event: GamePhaseChangedEvent): Promise<ValidationResult> {
    try {
      const { newPhase, previousPhase } = event.data;

      // Validate phase values
      if (!isValidGameStatus(newPhase)) {
        return { isValid: false, error: `Invalid new phase: ${newPhase}`, code: 'INVALID_PHASE' };
      }

      if (!isValidGameStatus(previousPhase)) {
        return { isValid: false, error: `Invalid previous phase: ${previousPhase}`, code: 'INVALID_PHASE' };
      }

      // Validate transition
      const transitionValidation = validateGameStatusTransition(previousPhase, newPhase);
      if (!transitionValidation.success) {
        return { 
          isValid: false, 
          error: transitionValidation.error, 
          code: transitionValidation.code 
        };
      }

      // Check current game state
      const { data: game, error } = await supabase
        .from('games')
        .select('status')
        .eq('id', event.gameId)
        .single();

      if (error || !game) {
        return { isValid: false, error: 'Game not found', code: 'GAME_NOT_FOUND' };
      }

      if (game.status !== previousPhase) {
        return { 
          isValid: false, 
          error: `Game status mismatch. Expected: ${previousPhase}, Actual: ${game.status}`, 
          code: 'STATUS_MISMATCH' 
        };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Phase change validation failed', code: 'VALIDATION_ERROR' };
    }
  }

  /**
   * Validate drawing submitted event
   */
  private static async validateDrawingSubmittedEvent(event: DrawingSubmittedEvent): Promise<ValidationResult> {
    try {
      // Check if game is in drawing phase
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('status')
        .eq('id', event.gameId)
        .single();

      if (gameError || !game) {
        return { isValid: false, error: 'Game not found', code: 'GAME_NOT_FOUND' };
      }

      if (game.status !== 'drawing') {
        return { isValid: false, error: 'Game not in drawing phase', code: 'INVALID_PHASE' };
      }

      // Check if user is a participant
      const { data: participant, error: participantError } = await supabase
        .from('game_participants')
        .select('id')
        .eq('game_id', event.gameId)
        .eq('user_id', event.userId)
        .is('left_at', null)
        .single();

      if (participantError || !participant) {
        return { isValid: false, error: 'User not in game', code: 'NOT_PARTICIPANT' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Drawing submission validation failed', code: 'VALIDATION_ERROR' };
    }
  }

  /**
   * Validate vote cast event
   */
  private static async validateVoteCastEvent(event: VoteCastEvent): Promise<ValidationResult> {
    try {
      // Check if game is in voting phase
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('status')
        .eq('id', event.gameId)
        .single();

      if (gameError || !game) {
        return { isValid: false, error: 'Game not found', code: 'GAME_NOT_FOUND' };
      }

      if (game.status !== 'voting') {
        return { isValid: false, error: 'Game not in voting phase', code: 'INVALID_PHASE' };
      }

      // Check if user is a participant
      const { data: participant, error: participantError } = await supabase
        .from('game_participants')
        .select('id')
        .eq('game_id', event.gameId)
        .eq('user_id', event.userId)
        .is('left_at', null)
        .single();

      if (participantError || !participant) {
        return { isValid: false, error: 'User not in game', code: 'NOT_PARTICIPANT' };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Vote cast validation failed', code: 'VALIDATION_ERROR' };
    }
  }

  /**
   * Basic validation for other event types
   */
  private static async validateBasicGameEvent(event: GameEvent): Promise<ValidationResult> {
    try {
      // Check if game exists
      const { data: game, error } = await supabase
        .from('games')
        .select('id')
        .eq('id', event.gameId)
        .single();

      if (error || !game) {
        return { isValid: false, error: 'Game not found', code: 'GAME_NOT_FOUND' };
      }

      // For non-system events, check if user is a participant
      if (event.userId !== 'system') {
        const { data: participant, error: participantError } = await supabase
          .from('game_participants')
          .select('id')
          .eq('game_id', event.gameId)
          .eq('user_id', event.userId)
          .is('left_at', null)
          .single();

        if (participantError || !participant) {
          return { isValid: false, error: 'User not in game', code: 'NOT_PARTICIPANT' };
        }
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Basic event validation failed', code: 'VALIDATION_ERROR' };
    }
  }
}
