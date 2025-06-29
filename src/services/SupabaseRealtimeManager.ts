// Singleton Supabase Realtime Manager
// Prevents duplicate channel subscriptions and manages cleanup properly

import { supabase } from '../utils/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ChannelSubscription {
  channel: RealtimeChannel;
  subscribers: Set<string>; // Track which components are using this channel
  gameId: string;
}

interface GameUpdateHandler {
  (gameData: any): void;
}

class SupabaseRealtimeManager {
  private static instance: SupabaseRealtimeManager | null = null;
  private channels: Map<string, ChannelSubscription> = new Map();
  private gameUpdateHandlers: Map<string, Set<GameUpdateHandler>> = new Map();

  private constructor() {}

  static getInstance(): SupabaseRealtimeManager {
    if (!SupabaseRealtimeManager.instance) {
      SupabaseRealtimeManager.instance = new SupabaseRealtimeManager();
    }
    return SupabaseRealtimeManager.instance;
  }

  /**
   * Subscribe to game status updates for a specific game
   * Returns a unique subscription ID that should be used for cleanup
   */
  subscribeToGameUpdates(
    gameId: string, 
    subscriberId: string, 
    handler: GameUpdateHandler
  ): string {
    const channelName = `game-status-${gameId}`;
    
    // Add handler to the set
    if (!this.gameUpdateHandlers.has(gameId)) {
      this.gameUpdateHandlers.set(gameId, new Set());
    }
    this.gameUpdateHandlers.get(gameId)!.add(handler);

    // Check if channel already exists
    let subscription = this.channels.get(channelName);
    
    if (subscription) {
      // Add this subscriber to existing channel
      subscription.subscribers.add(subscriberId);
    } else {
      // Create new channel
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'games',
            filter: `id=eq.${gameId}`
          },
          (payload) => {
            this.handleGameUpdate(gameId, payload);
          }
        )
        .subscribe();

      subscription = {
        channel,
        subscribers: new Set([subscriberId]),
        gameId
      };

      this.channels.set(channelName, subscription);
    }

    return `${channelName}:${subscriberId}`;
  }

  /**
   * Unsubscribe from game updates
   */
  unsubscribeFromGameUpdates(gameId: string, subscriberId: string, handler: GameUpdateHandler): void {
    const channelName = `game-status-${gameId}`;
    const subscription = this.channels.get(channelName);

    if (!subscription) {
      return;
    }

    // Remove handler
    const handlers = this.gameUpdateHandlers.get(gameId);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.gameUpdateHandlers.delete(gameId);
      }
    }

    // Remove subscriber
    subscription.subscribers.delete(subscriberId);

    // If no more subscribers, clean up the channel
    if (subscription.subscribers.size === 0) {
      try {
        supabase.removeChannel(subscription.channel);
        this.channels.delete(channelName);
      } catch (error) {
        // Silently handle cleanup errors
      }
    }
  }

  /**
   * Handle game update and notify all handlers for this game
   */
  private handleGameUpdate(gameId: string, payload: any): void {
    const handlers = this.gameUpdateHandlers.get(gameId);
    if (!handlers || handlers.size === 0) {
      return;
    }

    if (payload.new && payload.old) {
      const newGame = payload.new;
      const oldGame = payload.old;

      // Only notify if status actually changed
      if (newGame.status !== oldGame.status) {
        handlers.forEach(handler => {
          try {
            handler(newGame);
          } catch (error) {
            // Silently handle handler errors
          }
        });
      }
    }
  }

  /**
   * Get current subscription info (for debugging)
   */
  getSubscriptionInfo(): { channels: number; totalSubscribers: number; gameHandlers: number } {
    let totalSubscribers = 0;
    this.channels.forEach(sub => {
      totalSubscribers += sub.subscribers.size;
    });

    return {
      channels: this.channels.size,
      totalSubscribers,
      gameHandlers: this.gameUpdateHandlers.size
    };
  }

  /**
   * Force cleanup all channels (for testing/debugging)
   */
  cleanup(): void {
    this.channels.forEach((subscription) => {
      try {
        supabase.removeChannel(subscription.channel);
      } catch (error) {
        // Silently handle cleanup errors
      }
    });

    this.channels.clear();
    this.gameUpdateHandlers.clear();
  }
}

export default SupabaseRealtimeManager;
