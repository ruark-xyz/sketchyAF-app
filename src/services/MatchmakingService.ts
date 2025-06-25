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
        console.warn('RLS function failed, falling back to direct query:', queueCheckError);
        // Fall back to direct query if function fails - but this should not happen with our new policies
        console.log('Attempting direct query as fallback...');
        try {
          const { data: fallbackEntry, error: fallbackError } = await supabase
            .from('matchmaking_queue')
            .select('user_id')
            .eq('user_id', user.id)
            .single();

          if (fallbackError && fallbackError.code !== 'PGRST116') {
            console.error('Fallback query also failed:', fallbackError);
          }
          existingEntry = fallbackEntry;
        } catch (fallbackErr) {
          console.error('Fallback query exception:', fallbackErr);
        }
      } else if (queueStatus && typeof queueStatus === 'object' && 'in_queue' in queueStatus && (queueStatus as { in_queue: boolean }).in_queue) {
        existingEntry = { user_id: user.id };
        console.log(`User ${user.id} found in queue via RLS function`);
      }

      if (existingEntry) {
        console.log(`Player ${user.id} already in queue, not adding again`);

        // Check if player already has a match by looking at recent game participations
        const { data: recentGames } = await supabase
          .from('game_participants')
          .select('game_id, games!inner(status)')
          .eq('user_id', user.id)
          .in('games.status', ['waiting', 'briefing', 'drawing', 'voting'])
          .is('left_at', null)
          .limit(1);

        if (recentGames && recentGames.length > 0) {
          console.log(`Player ${user.id} already has a match, skipping queue processing`);
          return { success: true };
        }

        // Still process queue in case we have enough players now
        await this.processQueue();
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
        console.error('Error adding player to queue:', {
          error: insertError,
          userId: user.id,
          preferences,
          errorCode: insertError.code,
          errorMessage: insertError.message
        });

        // Handle specific error cases
        if (insertError.code === '23505') {
          // Duplicate key violation - user already in queue
          console.log(`User ${user.id} already in queue (duplicate key), processing queue anyway`);
          await this.processQueue();
          return { success: true };
        }

        return { success: false, error: 'Failed to join queue', code: 'DATABASE_ERROR' };
      }

      console.log(`Player ${user.id} added to queue`);

      // Try to match players immediately
      await this.processQueue();

      // Get current queue count for logging
      const { count } = await supabase
        .from('matchmaking_queue')
        .select('*', { count: 'exact', head: true });

      console.log(`Player ${user.id} joined queue. Total players in queue: ${count || 0}`);

      return { success: true };
    } catch (error) {
      console.error('Unexpected error joining queue:', error);
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
        console.error('Error removing player from queue:', deleteError);
        return { success: false, error: 'Failed to leave queue', code: 'DATABASE_ERROR' };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error leaving queue:', error);
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
        console.error('Error checking match status:', error);
        return { success: false, error: 'Failed to check match status', code: 'DATABASE_ERROR' };
      }

      console.log(`Checking match status for user ${user.id}:`, {
        waitingGamesCount: waitingGames?.length || 0,
        userId: user.id,
        waitingGames: waitingGames?.map(g => ({ id: g.id, created_at: g.created_at, created_by: g.created_by }))
      });

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
          console.log(`Match found for user ${user.id}: game ${game.id} (already participant)`);
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
        console.log(`Checking game ${game.id} for user ${user.id}:`, {
          gameAge: Math.round(gameAge / 1000) + 's',
          gameCreatedAt: game.created_at,
          isRecentGame: gameAge < 2 * 60 * 1000
        });

        if (gameAge < 2 * 60 * 1000) { // Game created in last 2 minutes
          const { data: queueEntries, error: queueError } = await supabase
            .from('matchmaking_queue')
            .select('joined_at')
            .eq('user_id', user.id)
            .limit(1);

          const queueEntry = queueEntries && queueEntries.length > 0 ? queueEntries[0] : null;

          console.log(`Queue check for user ${user.id}:`, {
            hasQueueEntry: !!queueEntry,
            queueError: queueError?.message,
            queueEntry
          });

          if (queueEntry) {
            const queueAge = Date.now() - new Date(queueEntry.joined_at).getTime();
            console.log(`Queue age for user ${user.id}: ${Math.round(queueAge / 1000)}s`);

            if (queueAge < 5 * 60 * 1000) { // User was in queue in last 5 minutes
              console.log(`Match found for user ${user.id}: game ${game.id} (recent queue + recent game)`);
              return {
                success: true,
                data: {
                  match_found: true,
                  game_id: game.id,
                  timestamp: new Date(game.created_at).getTime()
                }
              };
            } else {
              console.log(`User ${user.id} queue entry too old: ${Math.round(queueAge / 1000)}s`);
            }
          } else {
            console.log(`User ${user.id} not found in queue (might have been removed after match)`);

            // Check if user was recently removed from queue due to a match
            // If there's a recent game and user is not in queue, they might have been matched
            console.log(`User ${user.id} not in queue but recent game exists - assuming they were matched`);
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

      console.log(`No match found for user ${user.id}`);
      return { success: true, data: { match_found: false } };
    } catch (error) {
      console.error('Unexpected error checking match status:', error);
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
      console.error('Unexpected error clearing match notification:', error);
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
        console.warn('RLS function failed in checkQueueStatus, falling back to direct query:', queueError);
        // Fall back to direct query if function fails
        try {
          const { data: userEntry, error: fallbackError } = await supabase
            .from('matchmaking_queue')
            .select('joined_at')
            .eq('user_id', user.id)
            .single();

          if (fallbackError && fallbackError.code !== 'PGRST116') {
            console.error('Fallback query failed in checkQueueStatus:', fallbackError);
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
          console.error('Fallback query exception in checkQueueStatus:', fallbackErr);
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
      console.error('Unexpected error checking queue status:', error);
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
        console.warn('RLS function failed in getQueueState, falling back to direct query:', queueError);
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
      console.error('Error getting queue state:', error);
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
      console.error('Error triggering queue processing:', error);
      return { success: false, error: 'Failed to process queue', code: 'PROCESSING_ERROR' };
    }
  }

  /**
   * Process the queue and match players
   */
  private static async processQueue(): Promise<void> {
    // Prevent concurrent processing
    if (isProcessingQueue) {
      console.log('Queue processing already in progress, skipping...');
      return;
    }

    isProcessingQueue = true;

    try {
      // Get all players in queue using RLS-safe function
      const { data: queueData, error: queueError } = await supabase
        .rpc('get_matchmaking_queue_status');

      let queueEntries = queueData;

      if (queueError) {
        console.warn('RLS function failed, falling back to direct query:', queueError);
        // Fall back to direct query if function fails
        try {
          const { data: fallbackEntries, error: fallbackError } = await supabase
            .from('matchmaking_queue')
            .select('*')
            .order('joined_at', { ascending: true });

          if (fallbackError) {
            console.error('Fallback query failed:', fallbackError);
            return;
          }
          queueEntries = fallbackEntries;
        } catch (fallbackErr) {
          console.error('Fallback query exception:', fallbackErr);
          return;
        }
      }

      if (!queueEntries || queueEntries.length === 0) {
        console.log('No queue entries found');
        return;
      }

      console.log(`Processing queue with ${queueEntries.length} players (need ${GAME_CONSTANTS.DEFAULT_PLAYERS} for match)`);

      if (queueEntries.length < GAME_CONSTANTS.DEFAULT_PLAYERS) {
        // Not enough players to start a game
        console.log(`Not enough players for match (${queueEntries.length}/${GAME_CONSTANTS.DEFAULT_PLAYERS})`);
        return;
      }

      // Simple matching algorithm - take first 4 players by join time
      const playersToMatch = queueEntries.slice(0, GAME_CONSTANTS.DEFAULT_PLAYERS);

      if (playersToMatch.length >= GAME_CONSTANTS.DEFAULT_PLAYERS) {
        // Remove matched players from queue BEFORE creating game to prevent race conditions
        const playerIds = playersToMatch.map((p: MatchmakingQueue) => p.user_id);
        console.log('Removing matched players from queue before game creation:', playerIds);

        const { error: deleteError, count } = await supabase
          .from('matchmaking_queue')
          .delete({ count: 'exact' })
          .in('user_id', playerIds);

        if (deleteError) {
          console.error('Error removing matched players from queue:', deleteError);
          // If we can't remove players from queue, don't create the game to avoid duplicates
          return;
        } else {
          console.log(`Successfully removed ${count} players from queue`);
        }

        // Now create the game with matched players
        const result = await this.createGameForMatchedPlayers(playersToMatch);

        if (result.success && result.data) {
          console.log(`Match created successfully for ${playersToMatch.length} players: ${result.data.game_id}`);
          console.log(`All players have been added to game_participants and will be notified via polling`);

          // Send real-time match notifications to all players (optional enhancement)
          await this.sendMatchNotifications(playersToMatch, result.data.game_id);
        } else {
          console.error('Failed to create game after removing players from queue:', result.error);
          // TODO: Consider re-adding players to queue if game creation fails
          // For now, they will need to rejoin manually
        }
      }
    } catch (error) {
      console.error('Error processing matchmaking queue:', error);
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
      console.log('Creating game for matched players:', players.map(p => p.user_id));

      // Get a random prompt
      const prompt = await this.getRandomPrompt();
      console.log('Using prompt:', prompt);

      // Create a basic game using GameService (simpler approach)
      console.log('Creating basic game...');
      const createResult = await GameService.createGame({
        prompt,
        max_players: players.length,
        round_duration: 60 // 1 minute for testing
      });

      console.log('Game creation result:', createResult);

      if (!createResult.success || !createResult.data) {
        console.error('Failed to create game:', createResult.error);
        return { success: false, error: 'Failed to create game', code: 'GAME_CREATION_ERROR' };
      }

      const gameId = createResult.data.id;
      const creatorId = createResult.data.created_by;

      console.log(`Game ${gameId} created by ${creatorId}. Adding all matched players to game_participants...`);

      // Add ALL matched players to the game_participants table
      // Note: We add all players including the creator to ensure everyone is in the game
      // even if the creator's auto-join failed in GameService.createGame
      const playersToAdd = players;

      if (playersToAdd.length > 0) {
        console.log(`Adding all ${playersToAdd.length} matched players to game:`, playersToAdd.map(p => p.user_id));

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
          console.error('Error adding matched players to game:', insertError);
          // This is a critical error - the game was created but players can't be added
          // We should probably clean up the game or mark it as failed
          return { success: false, error: 'Failed to add players to game', code: 'PARTICIPANT_INSERTION_FAILED' };
        }

        console.log(`Successfully added/updated ${count} players to game ${gameId}`);
      } else {
        console.log('All matched players are already in the game (creator only)');
      }

      // Update game's current_players count to reflect all participants
      const { error: updateError } = await supabase
        .from('games')
        .update({ current_players: players.length })
        .eq('id', gameId);

      if (updateError) {
        console.warn('Failed to update game player count:', updateError);
        // Don't fail the entire operation for this
      }

      console.log(`Game ${gameId} successfully created with all ${players.length} matched players added`);

      return {
        success: true,
        data: {
          game_id: gameId,
          participants: players.map(p => p.user_id),
          estimated_start_time: new Date(Date.now() + 5000).toISOString() // 5 seconds from now
        }
      };
    } catch (error) {
      console.error('Error creating game for matched players:', error);
      return { success: false, error: 'Failed to create game for matched players', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Send real-time match notifications to all matched players
   */
  private static async sendMatchNotifications(players: MatchmakingQueue[], gameId: string): Promise<void> {
    try {
      console.log(`Attempting to send real-time match notifications to ${players.length} players for game ${gameId}`);

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
            console.warn(`Failed to send match notification to player ${player.user_id}:`, error);
          } else {
            console.log(`Match notification sent to player ${player.user_id} via PubNub`);
          }
        } catch (error) {
          console.warn(`Failed to send match notification to player ${player.user_id}:`, error);
          // Don't fail the entire process if one notification fails
        }
      });

      // Wait for all notifications to be sent (or fail)
      await Promise.allSettled(notificationPromises);

      console.log(`Match notifications sent to ${players.length} players for game ${gameId}`);
    } catch (error) {
      console.warn('Error in match notification process:', error);
      // Don't fail the matchmaking process if notifications fail
      // Players will still be notified via database polling
    }
  }

  /**
   * Get a random drawing prompt
   */
  private static async getRandomPrompt(): Promise<string> {
    // In a real implementation, this would fetch from a database of prompts
    const prompts = [
      "A raccoon having an existential crisis",
      "Your boss as a potato",
      "A cat wearing a business suit",
      "Aliens visiting a fast-food restaurant",
      "A dinosaur riding a skateboard",
      "A penguin on vacation in Hawaii",
      "The internet if it were a person",
      "A superhero whose power is minor inconvenience",
      "A ghost trying to use a smartphone",
      "Two robots falling in love"
    ];
    
    return prompts[Math.floor(Math.random() * prompts.length)];
  }
}