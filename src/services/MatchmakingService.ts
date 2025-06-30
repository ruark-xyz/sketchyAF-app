// Matchmaking Service - Player matchmaking and game creation
// Handles player queue management and game matching

import { supabase } from '../utils/supabase';
import {
  MatchmakingQueue,
  MatchmakingResult,
  ServiceResponse,
  GAME_CONSTANTS
} from '../types/game';
import { GameService } from './GameService';
import { getRandomPrompt } from '../data/gamePrompts';

// Note: Match notifications are now stored in the database via game_participants table
// instead of in-memory storage to ensure persistence across browser sessions

// Processing lock to prevent duplicate game creation
let isProcessingQueue = false;

export class MatchmakingService {
  /**
   * Join the matchmaking queue
   */
  static async joinQueue(preferences?: {
    max_players?: number;
    round_duration?: number;
    categories?: string[];
  }): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Validate preferences
      if (preferences?.max_players && (
        preferences.max_players < GAME_CONSTANTS.MIN_PLAYERS ||
        preferences.max_players > GAME_CONSTANTS.MAX_PLAYERS
      )) {
        return {
          success: false,
          error: `Max players must be between ${GAME_CONSTANTS.MIN_PLAYERS} and ${GAME_CONSTANTS.MAX_PLAYERS}`,
          code: 'VALIDATION_ERROR'
        };
      }

      if (preferences?.round_duration && (
        preferences.round_duration < GAME_CONSTANTS.MIN_ROUND_DURATION ||
        preferences.round_duration > GAME_CONSTANTS.MAX_ROUND_DURATION
      )) {
        return {
          success: false,
          error: `Round duration must be between ${GAME_CONSTANTS.MIN_ROUND_DURATION} and ${GAME_CONSTANTS.MAX_ROUND_DURATION} seconds`,
          code: 'VALIDATION_ERROR'
        };
      }

      // Check if player is already in queue using RLS-safe function
      const { data: queueStatus, error: queueCheckError } = await supabase
        .rpc('check_user_in_queue', { target_user_id: user.id })
        .single();

      let existingEntry = null;
      if (queueCheckError) {
        // Fall back to direct query if function fails - but this should not happen with our new policies
        try {
          const { data: fallbackEntry, error: fallbackError } = await supabase
            .from('matchmaking_queue')
            .select('user_id')
            .eq('user_id', user.id)
            .single();

          if (fallbackError && fallbackError.code !== 'PGRST116') {
          }
          existingEntry = fallbackEntry;
        } catch (fallbackErr) {
        }
      } else if (queueStatus && typeof queueStatus === 'object' && 'in_queue' in queueStatus && (queueStatus as { in_queue: boolean }).in_queue) {
        existingEntry = { user_id: user.id };
      }

      if (existingEntry) {

        // Check if player already has a match by looking at recent game participations
        const { data: recentGames } = await supabase
          .from('game_participants')
          .select('game_id, games!inner(status)')
          .eq('user_id', user.id)
          .in('games.status', ['waiting', 'briefing', 'drawing', 'voting'])
          .is('left_at', null)
          .limit(1);

        if (recentGames && recentGames.length > 0) {
          return { success: true };
        }

        // Still process queue in case we have enough players now
        await this.processQueue();
        return { success: true };
      }

      // Check if player was recently removed from queue (to prevent race conditions)
      // Look for recent game participations that might indicate a match was just created
      const { data: veryRecentGames } = await supabase
        .from('game_participants')
        .select('game_id, joined_at, games!inner(status, created_at)')
        .eq('user_id', user.id)
        .in('games.status', ['waiting', 'briefing', 'drawing'])
        .gte('games.created_at', new Date(Date.now() - 30 * 1000).toISOString()) // Last 30 seconds
        .is('left_at', null)
        .limit(1);

      if (veryRecentGames && veryRecentGames.length > 0) {
        return { success: true };
      }

      // Add player to queue
      const { error: insertError } = await supabase
        .from('matchmaking_queue')
        .insert({
          user_id: user.id,
          joined_at: new Date().toISOString(),
          preferences: preferences || {}
        });

      if (insertError) {
        // Handle specific error cases
        if (insertError.code === '23505') {
          // Duplicate key violation - user already in queue
          await this.processQueue();
          return { success: true };
        }

        return { success: false, error: 'Failed to join queue', code: 'DATABASE_ERROR' };
      }


      // Try to match players immediately
      await this.processQueue();

      // Get current queue count for logging
      const { count } = await supabase
        .from('matchmaking_queue')
        .select('*', { count: 'exact', head: true });


      return { success: true };
    } catch (error) {
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Leave the matchmaking queue
   */
  static async leaveQueue(): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Remove player from queue
      const { error: deleteError } = await supabase
        .from('matchmaking_queue')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        return { success: false, error: 'Failed to leave queue', code: 'DATABASE_ERROR' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Check for match notifications for a user
   */
  static async checkMatchStatus(): Promise<ServiceResponse<{
    match_found: boolean;
    game_id?: string;
    timestamp?: number;
  }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Check if user has any active games where they are a participant
      // Include briefing, drawing, voting phases as these indicate an active match
      const { data: waitingGames, error } = await supabase
        .from('games')
        .select('id, created_at, created_by, status')
        .in('status', ['waiting', 'briefing', 'drawing', 'voting'])
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        return { success: false, error: 'Failed to check match status', code: 'DATABASE_ERROR' };
      }

      // Check if user is a participant in any of these games OR if they were recently in queue
      for (const game of waitingGames || []) {
        // Check if user is already a participant
        const { data: participation, error: participationError } = await supabase
          .from('game_participants')
          .select('game_id, joined_at')
          .eq('game_id', game.id)
          .eq('user_id', user.id)
          .is('left_at', null)
          .limit(1);

        // Handle the case where no participation is found (not an error)
        const userParticipation = participation && participation.length > 0 ? participation[0] : null;

        if (userParticipation) {
          return {
            success: true,
            data: {
              match_found: true,
              game_id: game.id,
              timestamp: new Date(userParticipation.joined_at).getTime()
            }
          };
        }

        // Check if this is a recent game and user was recently in queue
        // This handles the case where matchmaking created a game but user hasn't joined yet
        const gameAge = Date.now() - new Date(game.created_at).getTime();

        if (gameAge < 2 * 60 * 1000) { // Game created in last 2 minutes
          const { data: queueEntries, error: queueError } = await supabase
            .from('matchmaking_queue')
            .select('joined_at')
            .eq('user_id', user.id)
            .limit(1);

          const queueEntry = queueEntries && queueEntries.length > 0 ? queueEntries[0] : null;

          if (queueEntry) {
            const queueAge = Date.now() - new Date(queueEntry.joined_at).getTime();

            if (queueAge < 5 * 60 * 1000) { // User was in queue in last 5 minutes
              return {
                success: true,
                data: {
                  match_found: true,
                  game_id: game.id,
                  timestamp: new Date(game.created_at).getTime()
                }
              };
            } else {
            }
          } else {

            // Check if user was recently removed from queue due to a match
            // If there's a recent game and user is not in queue, they might have been matched
            return {
              success: true,
              data: {
                match_found: true,
                game_id: game.id,
                timestamp: new Date(game.created_at).getTime()
              }
            };
          }
        }
      }

      return { success: true, data: { match_found: false } };
    } catch (error) {
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Clear match notification for a user
   */
  static async clearMatchNotification(): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Match notifications are now handled via database, no need to clear anything
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Check if user is in queue
   */
  static async checkQueueStatus(): Promise<ServiceResponse<{
    in_queue: boolean;
    position?: number;
    joined_at?: string;
    estimated_wait_time?: number;
  }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Use RLS-safe function to check queue status
      const { data: queueStatus, error: queueError } = await supabase
        .rpc('check_user_in_queue', { target_user_id: user.id })
        .single();

      if (queueError) {
        // Fall back to direct query if function fails
        try {
          const { data: userEntry, error: fallbackError } = await supabase
            .from('matchmaking_queue')
            .select('joined_at')
            .eq('user_id', user.id)
            .single();

          if (fallbackError && fallbackError.code !== 'PGRST116') {
            return { success: true, data: { in_queue: false } };
          }

          if (!userEntry) {
            return { success: true, data: { in_queue: false } };
          }

          // Simple position calculation for fallback
          const { data: allEntries } = await supabase
            .from('matchmaking_queue')
            .select('joined_at')
            .order('joined_at', { ascending: true });

          const position = (allEntries?.findIndex(entry => entry.joined_at === userEntry.joined_at) || 0) + 1;
          const estimatedWaitTime = Math.max(5, position * 10);

          return {
            success: true,
            data: {
              in_queue: true,
              position,
              joined_at: userEntry.joined_at,
              estimated_wait_time: estimatedWaitTime
            }
          };
        } catch (fallbackErr) {
          return { success: true, data: { in_queue: false } };
        }
      }

      // Use RLS function result
      if (!queueStatus || typeof queueStatus !== 'object' || !('in_queue' in queueStatus) || !(queueStatus as { in_queue: boolean }).in_queue) {
        return { success: true, data: { in_queue: false } };
      }

      const typedStatus = queueStatus as { in_queue: boolean; queue_position?: number; joined_at?: string };
      const position = typedStatus.queue_position || 1;
      const estimatedWaitTime = Math.max(5, position * 10); // seconds

      return {
        success: true,
        data: {
          in_queue: true,
          position,
          joined_at: typedStatus.joined_at,
          estimated_wait_time: estimatedWaitTime
        }
      };
    } catch (error) {
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Get current queue state for debugging
   */
  static async getQueueState(): Promise<{ players: string[], count: number }> {
    try {
      // Use RLS-safe function
      const { data: queueData, error: queueError } = await supabase
        .rpc('get_matchmaking_queue_status');

      if (queueError) {
        // Fall back to direct query
        const { data: queueEntries } = await supabase
          .from('matchmaking_queue')
          .select('user_id')
          .order('joined_at', { ascending: true });

        const players = queueEntries?.map(entry => entry.user_id) || [];
        return {
          players,
          count: players.length
        };
      }

      const players = queueData?.map((entry: { user_id: string }) => entry.user_id) || [];
      return {
        players,
        count: players.length
      };
    } catch (error) {
      return { players: [], count: 0 };
    }
  }

  /**
   * Manually trigger queue processing (useful for testing)
   */
  static async triggerQueueProcessing(): Promise<ServiceResponse<void>> {
    try {
      await this.processQueue();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to process queue', code: 'PROCESSING_ERROR' };
    }
  }

  /**
   * Process the queue and match players
   */
  private static async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (isProcessingQueue) {
      return;
    }

    isProcessingQueue = true;

    try {
      // Get all players in queue using RLS-safe function
      const { data: queueData, error: queueError } = await supabase
        .rpc('get_matchmaking_queue_status');

      let queueEntries = queueData;

      if (queueError) {
        // Fall back to direct query if function fails
        try {
          const { data: fallbackEntries, error: fallbackError } = await supabase
            .from('matchmaking_queue')
            .select('*')
            .order('joined_at', { ascending: true });

          if (fallbackError) {
            return;
          }
          queueEntries = fallbackEntries;
        } catch (fallbackErr) {
          return;
        }
      }

      if (!queueEntries || queueEntries.length === 0) {
        return;
      }


      if (queueEntries.length < GAME_CONSTANTS.DEFAULT_PLAYERS) {
        // Not enough players to start a game
        return;
      }

      // Simple matching algorithm - take first 4 players by join time
      const playersToMatch = queueEntries.slice(0, GAME_CONSTANTS.DEFAULT_PLAYERS);

      if (playersToMatch.length >= GAME_CONSTANTS.DEFAULT_PLAYERS) {
        // Remove matched players from queue BEFORE creating game to prevent race conditions
        const playerIds = playersToMatch.map((p: MatchmakingQueue) => p.user_id);

        const { error: deleteError, count } = await supabase
          .from('matchmaking_queue')
          .delete({ count: 'exact' })
          .in('user_id', playerIds);

        if (deleteError) {
          // If we can't remove players from queue, don't create the game to avoid duplicates
          return;
        } else {
        }

        // Now create the game with matched players
        const result = await this.createGameForMatchedPlayers(playersToMatch);

        if (result.success && result.data) {

          // Send real-time match notifications to all players (optional enhancement)
          await this.sendMatchNotifications(playersToMatch, result.data.game_id);
        } else {
          // TODO: Consider re-adding players to queue if game creation fails
          // For now, they will need to rejoin manually
        }
      }
    } catch (error) {
    } finally {
      isProcessingQueue = false;
    }
  }

  /**
   * Create a game for matched players
   */
  private static async createGameForMatchedPlayers(
    players: MatchmakingQueue[]
  ): Promise<ServiceResponse<MatchmakingResult>> {
    try {

      // Get a random prompt
      const prompt = await this.getRandomPrompt();

      // Create a basic game using GameService (simpler approach)
      const createResult = await GameService.createGame({
        prompt,
        max_players: players.length,
        round_duration: 60 // 1 minute for testing
      });


      if (!createResult.success || !createResult.data) {
        return { success: false, error: 'Failed to create game', code: 'GAME_CREATION_ERROR' };
      }

      const gameId = createResult.data.id;
      const creatorId = createResult.data.created_by;


      // Add ALL matched players to the game_participants table
      // Note: We add all players including the creator to ensure everyone is in the game
      // even if the creator's auto-join failed in GameService.createGame
      const playersToAdd = players;

      if (playersToAdd.length > 0) {

        const participantInserts = playersToAdd.map(player => ({
          game_id: gameId,
          user_id: player.user_id,
          joined_at: new Date().toISOString(),
          is_ready: false,
          selected_booster_pack: null,
          left_at: null
        }));

        const { error: insertError, count } = await supabase
          .from('game_participants')
          .upsert(participantInserts, {
            onConflict: 'game_id,user_id',
            count: 'exact'
          });

        if (insertError) {
          // This is a critical error - the game was created but players can't be added
          // We should probably clean up the game or mark it as failed
          return { success: false, error: 'Failed to add players to game', code: 'PARTICIPANT_INSERTION_FAILED' };
        }

      } else {
      }

      // Update game's current_players count to reflect all participants
      const { error: updateError } = await supabase
        .from('games')
        .update({ current_players: players.length })
        .eq('id', gameId);

      if (updateError) {
        // Don't fail the entire operation for this
      }


      return {
        success: true,
        data: {
          game_id: gameId,
          participants: players.map(p => p.user_id),
          estimated_start_time: new Date(Date.now() + 5000).toISOString() // 5 seconds from now
        }
      };
    } catch (error) {
      return { success: false, error: 'Failed to create game for matched players', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Send real-time match notifications to all matched players
   */
  private static async sendMatchNotifications(players: MatchmakingQueue[], gameId: string): Promise<void> {
    try {

      // Import supabase for edge function calls
      const { supabase } = await import('../utils/supabase');

      // Send match notification to each player via Supabase Edge Function
      const notificationPromises = players.map(async (player) => {
        try {
          const matchEvent = {
            type: 'MATCH_FOUND',
            gameId,
            userId: player.user_id,
            timestamp: Date.now(),
            version: '1.0.0',
            data: {
              gameId,
              estimatedStartTime: new Date(Date.now() + 5000).toISOString(), // 5 seconds from now
              totalPlayers: players.length,
              matchFound: true
            }
          };

          // Call Supabase Edge Function to broadcast via PubNub
          const { error } = await supabase.functions.invoke('broadcast-pubnub-event', {
            body: matchEvent
          });

          if (error) {
          } else {
          }
        } catch (error) {
          // Don't fail the entire process if one notification fails
        }
      });

      // Wait for all notifications to be sent (or fail)
      await Promise.allSettled(notificationPromises);

    } catch (error) {
      // Don't fail the matchmaking process if notifications fail
      // Players will still be notified via database polling
    }
  }

  /**
   * Get a random drawing prompt
   */
  private static async getRandomPrompt(): Promise<string> {
    // Use the new prompt system from gamePrompts.ts
    return getRandomPrompt();
  }
}