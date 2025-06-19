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

// Queue storage (in-memory for now, would be replaced with a proper queue system in production)
const playerQueue: Record<string, MatchmakingQueue> = {};

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

      // Add player to queue
      playerQueue[user.id] = {
        user_id: user.id,
        joined_at: new Date().toISOString(),
        preferences: preferences || {}
      };

      // Try to match players immediately
      await this.processQueue();

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
      delete playerQueue[user.id];

      return { success: true };
    } catch (error) {
      console.error('Unexpected error leaving queue:', error);
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

      const inQueue = !!playerQueue[user.id];
      
      if (!inQueue) {
        return { success: true, data: { in_queue: false } };
      }

      // Calculate queue position based on join time
      const queueEntries = Object.values(playerQueue).sort(
        (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
      );
      
      const position = queueEntries.findIndex(entry => entry.user_id === user.id) + 1;
      
      // Estimate wait time (very simple calculation - would be more sophisticated in production)
      const estimatedWaitTime = Math.max(5, position * 10); // seconds
      
      return { 
        success: true, 
        data: { 
          in_queue: true,
          position,
          joined_at: playerQueue[user.id].joined_at,
          estimated_wait_time: estimatedWaitTime
        } 
      };
    } catch (error) {
      console.error('Unexpected error checking queue status:', error);
      return { success: false, error: 'Unexpected error occurred', code: 'UNKNOWN_ERROR' };
    }
  }

  /**
   * Process the queue and match players
   */
  private static async processQueue(): Promise<void> {
    try {
      // Get all players in queue
      const queueEntries = Object.values(playerQueue);
      
      if (queueEntries.length < GAME_CONSTANTS.MIN_PLAYERS) {
        // Not enough players to start a game
        return;
      }

      // Simple matching algorithm - group players by join time
      // In a real implementation, this would be more sophisticated with preference matching
      const playersToMatch = queueEntries
        .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime())
        .slice(0, GAME_CONSTANTS.DEFAULT_PLAYERS);
      
      if (playersToMatch.length >= GAME_CONSTANTS.MIN_PLAYERS) {
        // Create a new game
        const result = await this.createGameForMatchedPlayers(playersToMatch);
        
        if (result.success) {
          // Remove matched players from queue
          playersToMatch.forEach(player => {
            delete playerQueue[player.user_id];
          });
          
          // Notify players about the match (would use PubNub in production)
          console.log('Match created:', result.data);
        }
      }
    } catch (error) {
      console.error('Error processing matchmaking queue:', error);
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
      
      // Create the game
      const createResult = await GameService.createGame({
        prompt,
        max_players: players.length
      });
      
      if (!createResult.success || !createResult.data) {
        return { success: false, error: 'Failed to create game', code: 'GAME_CREATION_ERROR' };
      }
      
      const gameId = createResult.data.id;
      
      // Add all players to the game (creator is already added)
      const creatorId = createResult.data.created_by;
      const otherPlayers = players.filter(p => p.user_id !== creatorId);
      
      for (const player of otherPlayers) {
        await GameService.joinGame({
          game_id: gameId,
          // Could use player preferences for booster pack selection
        });
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
      console.error('Error creating game for matched players:', error);
      return { success: false, error: 'Failed to create game for matched players', code: 'UNKNOWN_ERROR' };
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