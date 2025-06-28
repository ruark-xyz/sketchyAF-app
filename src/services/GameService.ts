// Game Service - Core game management operations
// Handles CRUD operations for games, participants, and game state management

import { supabase } from '../utils/supabase';
import {
  Game,
  GameParticipant,
  GameWithParticipants,
  CreateGameRequest,
  JoinGameRequest,
  GameStatus,
  ServiceResponse,
  PaginatedResponse,
  GAME_CONSTANTS,
  GAME_STATUS_FLOW
} from '../types/game';
import { RealtimeGameService } from './RealtimeGameService';

export class GameService {
  /**
   * Create a new game session
   */
  static async createGame(request: CreateGameRequest): Promise<ServiceResponse<Game>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        return { success: false, error: `Authentication error: ${authError.message}`, code: 'UNAUTHENTICATED' };
      }

      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Validate request
      const validation = this.validateCreateGameRequest(request);
      if (!validation.success) {
        return validation;
      }

      const gameData = {
        prompt: request.prompt.trim(),
        max_players: request.max_players || GAME_CONSTANTS.DEFAULT_PLAYERS,
        round_duration: request.round_duration || GAME_CONSTANTS.DEFAULT_ROUND_DURATION,
        voting_duration: request.voting_duration || GAME_CONSTANTS.DEFAULT_VOTING_DURATION,
        created_by: user.id,
        status: 'waiting' as const, // Start games in waiting status, then transition to briefing
        expires_at: new Date(Date.now() + GAME_CONSTANTS.GAME_EXPIRY_MINUTES * 60 * 1000).toISOString(),
      };

      const { data, error } = await supabase
        .from('games')
        .insert(gameData)
        .select()
        .single();

      if (error) {
        return { success: false, error: 'Failed to create game', code: 'DATABASE_ERROR' };
      }

      // Automatically join the creator to the game
      const joinResult = await this.joinGame({ game_id: data.id });
      if (!joinResult.success) {
        // Game was created but creator couldn't join - this is a problem
      }

      // Transition to briefing status to properly set timer fields
      const transitionResult = await this.transitionGameStatus(data.id, 'briefing', 'waiting');
      if (!transitionResult.success) {
        // Don't fail the entire operation, but log the issue
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Join an existing game
   */
  static async joinGame(request: JoinGameRequest): Promise<ServiceResponse<GameParticipant>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Check if game exists and is joinable
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('id, status, current_players, max_players')
        .eq('id', request.game_id)
        .single();

      if (gameError || !game) {
        return { success: false, error: 'Game not found', code: 'GAME_NOT_FOUND' };
      }

      // Allow joining games in 'waiting' or 'briefing' status (briefing is for matchmaking games)
      if (game.status !== 'waiting' && game.status !== 'briefing') {
        return { success: false, error: 'Game is no longer accepting players', code: 'INVALID_STATUS' };
      }

      if (game.current_players >= game.max_players) {
        return { success: false, error: 'Game is full', code: 'GAME_FULL' };
      }

      // Check if user is already in the game
      const { data: existingParticipants, error: participantError } = await supabase
        .from('game_participants')
        .select('id, left_at')
        .eq('game_id', request.game_id)
        .eq('user_id', user.id);

      // Handle query errors (but not "no results" which is expected)
      if (participantError) {
        return { success: false, error: 'Failed to check game participation', code: 'DATABASE_ERROR' };
      }

      // Check if user is already actively in the game
      const activeParticipant = existingParticipants?.find(p => !p.left_at);
      if (activeParticipant) {
        return { success: false, error: 'Already joined this game', code: 'ALREADY_JOINED' };
      }

      // Validate booster pack if provided
      if (request.selected_booster_pack) {
        const packValidation = await this.validateBoosterPackAccess(user.id, request.selected_booster_pack);
        if (!packValidation.success) {
          return packValidation;
        }
      }

      const participantData = {
        game_id: request.game_id,
        user_id: user.id,
        selected_booster_pack: request.selected_booster_pack,
        left_at: null, // Clear left_at in case of rejoin
      };

      // Use upsert to handle rejoin scenario
      const { data, error } = await supabase
        .from('game_participants')
        .upsert(participantData, { 
          onConflict: 'game_id,user_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: 'Failed to join game', code: 'DATABASE_ERROR' };
      }

      // Broadcast player joined event via real-time service (optional - don't fail if it doesn't work)
      try {
        const realtimeService = RealtimeGameService.getInstance();
        // Note: Real-time service will handle the player_joined event when they actually join the channel
        // This is just for database consistency
      } catch (realtimeError) {
        // Don't fail the join operation if real-time broadcast fails
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Leave a game
   */
  static async leaveGame(gameId: string): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Update participant record to mark as left
      const { error } = await supabase
        .from('game_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('game_id', gameId)
        .eq('user_id', user.id)
        .is('left_at', null);

      if (error) {
        return { success: false, error: 'Failed to leave game', code: 'DATABASE_ERROR' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Update player ready status
   */
  static async updateReadyStatus(gameId: string, isReady: boolean): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      const { error } = await supabase
        .from('game_participants')
        .update({ is_ready: isReady })
        .eq('game_id', gameId)
        .eq('user_id', user.id)
        .is('left_at', null);

      if (error) {
        return { success: false, error: 'Failed to update ready status', code: 'DATABASE_ERROR' };
      }

      // Broadcast player ready status change via real-time service
      try {
        const realtimeService = RealtimeGameService.getInstance();
        await realtimeService.broadcastPlayerReady(isReady);
      } catch (realtimeError) {
        // Don't fail the operation if real-time broadcast fails
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Update player's selected booster pack
   */
  static async updateSelectedBoosterPack(gameId: string, boosterPackId: string | null): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Validate booster pack if provided
      if (boosterPackId) {
        const packValidation = await this.validateBoosterPackAccess(user.id, boosterPackId);
        if (!packValidation.success) {
          return packValidation;
        }
      }

      const { error } = await supabase
        .from('game_participants')
        .update({ selected_booster_pack: boosterPackId })
        .eq('game_id', gameId)
        .eq('user_id', user.id)
        .is('left_at', null);

      if (error) {
        return { success: false, error: 'Failed to update booster pack selection', code: 'DATABASE_ERROR' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating booster pack selection:', error);
      return { success: false, error: 'Failed to update booster pack selection', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Transition game status
   */
  static async transitionGameStatus(gameId: string, newStatus: GameStatus, previousStatus?: GameStatus): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Get current status if not provided
      let currentStatus = previousStatus;
      if (!currentStatus) {
        const { data: game } = await supabase
          .from('games')
          .select('status')
          .eq('id', gameId)
          .single();
        currentStatus = game?.status as GameStatus;
      }

      // Call the database function for validated status transition
      const { error } = await supabase.rpc('transition_game_status', {
        game_uuid: gameId,
        new_status: newStatus
      });

      if (error) {
        return { success: false, error: error.message, code: 'TRANSITION_ERROR' };
      }

      // Broadcast phase change via real-time service
      try {
        const realtimeService = RealtimeGameService.getInstance();
        if (currentStatus) {
          await realtimeService.broadcastPhaseChange(newStatus, currentStatus);
        }
      } catch (realtimeError) {
        // Don't fail the operation if real-time broadcast fails
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Get game details with participants
   */
  static async getGame(gameId: string): Promise<ServiceResponse<GameWithParticipants>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Get game details
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError || !game) {
        return { success: false, error: 'Game not found', code: 'GAME_NOT_FOUND' };
      }

      // Get participants with user details
      const { data: participants, error: participantsError } = await supabase
        .from('game_participants')
        .select(`
          *,
          users!inner(username, avatar_url)
        `)
        .eq('game_id', gameId)
        .is('left_at', null)
        .order('joined_at');

      if (participantsError) {
        return { success: false, error: 'Failed to fetch game participants', code: 'DATABASE_ERROR' };
      }

      // Transform participants data
      const transformedParticipants = participants.map(p => ({
        ...p,
        username: p.users.username,
        avatar_url: p.users.avatar_url,
      }));

      const gameWithParticipants: GameWithParticipants = {
        ...game,
        participants: transformedParticipants,
      };

      return { success: true, data: gameWithParticipants };
    } catch (error) {
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Get available games for joining
   */
  static async getAvailableGames(limit = 20): Promise<ServiceResponse<PaginatedResponse<Game>>> {
    try {
      const { data, error, count } = await supabase
        .from('games')
        .select('*', { count: 'exact' })
        .eq('status', 'waiting')
        .lt('current_players', supabase.raw('max_players'))
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { success: false, error: 'Failed to fetch available games', code: 'DATABASE_ERROR' };
      }

      return {
        success: true,
        data: {
          data: data || [],
          total: count || 0,
          page: 1,
          limit,
          hasMore: (count || 0) > limit,
        },
      };
    } catch (error) {
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Get user's active games
   */
  static async getUserGames(): Promise<ServiceResponse<Game[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      const { data, error } = await supabase
        .from('games')
        .select('*')
        .in('id', 
          supabase
            .from('game_participants')
            .select('game_id')
            .eq('user_id', user.id)
            .is('left_at', null)
        )
        .in('status', ['waiting', 'briefing', 'drawing', 'voting', 'results'])
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: 'Failed to fetch user games', code: 'DATABASE_ERROR' };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Cleanup expired games
   */
  static async cleanupExpiredGames(): Promise<ServiceResponse<number>> {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_games');

      if (error) {
        return { success: false, error: 'Failed to cleanup expired games', code: 'DATABASE_ERROR' };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  // Private helper methods

  private static validateCreateGameRequest(request: CreateGameRequest): ServiceResponse<void> {
    if (!request.prompt || request.prompt.trim().length === 0) {
      return { success: false, error: 'Prompt is required', code: 'VALIDATION_ERROR' };
    }

    if (request.prompt.trim().length > 500) {
      return { success: false, error: 'Prompt is too long (max 500 characters)', code: 'VALIDATION_ERROR' };
    }

    if (request.max_players && (request.max_players < GAME_CONSTANTS.MIN_PLAYERS || request.max_players > GAME_CONSTANTS.MAX_PLAYERS)) {
      return { 
        success: false, 
        error: `Max players must be between ${GAME_CONSTANTS.MIN_PLAYERS} and ${GAME_CONSTANTS.MAX_PLAYERS}`, 
        code: 'VALIDATION_ERROR' 
      };
    }

    if (request.round_duration && (request.round_duration < GAME_CONSTANTS.MIN_ROUND_DURATION || request.round_duration > GAME_CONSTANTS.MAX_ROUND_DURATION)) {
      return { 
        success: false, 
        error: `Round duration must be between ${GAME_CONSTANTS.MIN_ROUND_DURATION} and ${GAME_CONSTANTS.MAX_ROUND_DURATION} seconds`, 
        code: 'VALIDATION_ERROR' 
      };
    }

    if (request.voting_duration && (request.voting_duration < GAME_CONSTANTS.MIN_VOTING_DURATION || request.voting_duration > GAME_CONSTANTS.MAX_VOTING_DURATION)) {
      return { 
        success: false, 
        error: `Voting duration must be between ${GAME_CONSTANTS.MIN_VOTING_DURATION} and ${GAME_CONSTANTS.MAX_VOTING_DURATION} seconds`, 
        code: 'VALIDATION_ERROR' 
      };
    }

    return { success: true };
  }

  private static async validateBoosterPackAccess(userId: string, packId: string): Promise<ServiceResponse<void>> {
    const { data, error } = await supabase
      .from('user_booster_packs')
      .select('booster_pack_id')
      .eq('user_id', userId)
      .eq('booster_pack_id', packId)
      .single();

    if (error || !data) {
      return { success: false, error: 'Booster pack not owned', code: 'PACK_NOT_OWNED' };
    }

    return { success: true };
  }
}