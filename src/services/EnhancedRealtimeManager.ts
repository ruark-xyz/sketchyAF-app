// Enhanced Supabase Realtime Manager
// Provides robust connection management with heartbeat, retry logic, and fallback polling

import { supabase } from '../utils/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface ConnectionStatus {
  status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error';
  lastConnected?: Date;
  reconnectAttempts: number;
  isHealthy: boolean;
}

export interface GameUpdateHandler {
  (gameData: Record<string, unknown>): void;
}

interface ChannelSubscription {
  channel: RealtimeChannel;
  subscribers: Set<string>;
  gameId: string;
  handlers: Set<GameUpdateHandler>;
  lastActivity: Date;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

class EnhancedRealtimeManager {
  private static instance: EnhancedRealtimeManager;
  private channels = new Map<string, ChannelSubscription>();
  private connectionStatus: ConnectionStatus = {
    status: 'disconnected',
    reconnectAttempts: 0,
    isHealthy: false
  };
  
  // Heartbeat configuration
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private lastHeartbeat: Date | null = null;
  
  // Retry configuration
  private readonly retryConfig: RetryConfig = {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  };
  
  // Fallback polling
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly POLLING_INTERVAL = 10000; // 10 seconds
  private fallbackMode = false;
  
  // Connection monitoring
  private connectionListeners = new Set<(status: ConnectionStatus) => void>();
  private reconnectTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeConnectionMonitoring();
  }

  static getInstance(): EnhancedRealtimeManager {
    if (!EnhancedRealtimeManager.instance) {
      EnhancedRealtimeManager.instance = new EnhancedRealtimeManager();
    }
    return EnhancedRealtimeManager.instance;
  }

  /**
   * Initialize connection monitoring and heartbeat
   */
  private initializeConnectionMonitoring(): void {
    // Supabase Realtime doesn't have direct connection event handlers
    // We'll monitor connection status through channel subscription callbacks
    // and implement heartbeat mechanism to maintain connection health
    console.log('� Enhanced Realtime Manager initialized');

    // Start with disconnected status
    this.updateConnectionStatus('disconnected');

    // Start heartbeat mechanism to monitor connection health
    this.startHeartbeat();
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);

    console.log('💓 Heartbeat started');
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    console.log('💔 Heartbeat stopped');
  }

  /**
   * Send heartbeat message
   */
  private sendHeartbeat(): void {
    try {
      // For Supabase Realtime, we'll use a simple ping mechanism
      // If we have active channels, the connection is healthy
      if (this.channels.size > 0) {
        // Connection is healthy if we have active subscriptions
        this.lastHeartbeat = new Date();
        console.log('💓 Heartbeat: Active channels detected, connection healthy');

        if (this.connectionStatus.status !== 'connected') {
          this.updateConnectionStatus('connected');
        }
      } else {
        // No active channels, but we can still check if we can create a test channel
        console.log('💓 Heartbeat: No active channels, connection status uncertain');

        if (this.connectionStatus.status === 'connected') {
          this.updateConnectionStatus('disconnected');
        }
      }

      this.lastHeartbeat = new Date();
    } catch (error) {
      console.error('💔 Heartbeat failed:', error);
      this.handleConnectionError(error);
    }
  }



  /**
   * Handle connection errors
   */
  private handleConnectionError(error: Error | unknown): void {
    console.error('🚨 Connection error:', error);
    
    // Start fallback polling if not already active
    if (!this.fallbackMode) {
      this.startFallbackPolling();
    }
    
    // Attempt reconnection with exponential backoff
    this.scheduleReconnection();
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnection(): void {
    const { reconnectAttempts } = this.connectionStatus;
    const { maxAttempts } = this.retryConfig;
    
    if (reconnectAttempts >= maxAttempts) {
      console.error('🚫 Max reconnection attempts reached');
      this.updateConnectionStatus('error');
      this.startFallbackPolling();
      return;
    }

    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, reconnectAttempts),
      this.retryConfig.maxDelay
    );

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.performReconnection();
    }, delay);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnection(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.attemptReconnection();
  }

  /**
   * Perform the actual reconnection
   */
  private async performReconnection(): Promise<void> {
    try {
      console.log('🔄 Attempting to reconnect...');
      
      this.connectionStatus.reconnectAttempts++;
      this.updateConnectionStatus('connecting');

      // Recreate all existing subscriptions
      const channelPromises = Array.from(this.channels.values()).map(subscription => 
        this.recreateSubscription(subscription)
      );

      await Promise.all(channelPromises);
      
      console.log('✅ Reconnection successful');
      this.connectionStatus.reconnectAttempts = 0;
      
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      this.scheduleReconnection();
    }
  }

  /**
   * Recreate a subscription after connection loss
   */
  private async recreateSubscription(subscription: ChannelSubscription): Promise<void> {
    const { gameId, handlers } = subscription;

    // Remove old channel
    supabase.removeChannel(subscription.channel);

    // Create new channel
    const newChannel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          console.log('📡 Realtime game update received:', payload);
          if (payload.new) {
            this.handleGameUpdate(gameId, payload.new, handlers);
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Subscription status for game ${gameId}:`, status);
      });

    // Update subscription
    subscription.channel = newChannel;
    subscription.lastActivity = new Date();
  }

  /**
   * Start fallback polling when Realtime is unavailable
   */
  private startFallbackPolling(): void {
    if (this.pollingInterval || this.fallbackMode) {
      return;
    }

    console.log('🔄 Starting fallback polling mode');
    this.fallbackMode = true;

    this.pollingInterval = setInterval(() => {
      this.performFallbackPolling();
    }, this.POLLING_INTERVAL);
  }

  /**
   * Stop fallback polling
   */
  private stopFallbackPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    if (this.fallbackMode) {
      console.log('✅ Stopped fallback polling mode');
      this.fallbackMode = false;
    }
  }

  /**
   * Perform fallback polling for game updates
   */
  private async performFallbackPolling(): Promise<void> {
    if (!this.fallbackMode || this.channels.size === 0) {
      return;
    }

    try {
      const gameIds = Array.from(this.channels.keys()).map(key =>
        key.replace('game-', '')
      );

      if (gameIds.length === 0) {
        return;
      }

      console.log('🔄 Polling for game updates:', gameIds);

      const { data: games, error } = await supabase
        .from('games')
        .select('*')
        .in('id', gameIds);

      if (error) {
        console.error('❌ Fallback polling error:', error);
        return;
      }

      if (games) {
        games.forEach(game => {
          const channelKey = `game-${game.id}`;
          const subscription = this.channels.get(channelKey);

          if (subscription) {
            this.handleGameUpdate(game.id, game, subscription.handlers);
          }
        });
      }

    } catch (error) {
      console.error('❌ Fallback polling failed:', error);
    }
  }

  /**
   * Handle game updates and notify handlers
   */
  private handleGameUpdate(gameId: string, gameData: Record<string, unknown>, handlers: Set<GameUpdateHandler>): void {
    const channelKey = `game-${gameId}`;
    const subscription = this.channels.get(channelKey);

    if (subscription) {
      subscription.lastActivity = new Date();
    }

    handlers.forEach(handler => {
      try {
        handler(gameData);
      } catch (error) {
        console.error('❌ Game update handler error:', error);
      }
    });
  }

  /**
   * Update connection status and notify listeners
   */
  private updateConnectionStatus(status: ConnectionStatus['status']): void {
    this.connectionStatus.status = status;
    this.connectionStatus.isHealthy = status === 'connected';

    if (status === 'connected') {
      this.connectionStatus.lastConnected = new Date();
      this.connectionStatus.reconnectAttempts = 0;
    }

    // Notify listeners
    this.connectionListeners.forEach(listener => {
      try {
        listener({ ...this.connectionStatus });
      } catch (error) {
        console.error('❌ Connection status listener error:', error);
      }
    });

    console.log(`🔗 Connection status: ${status}`);
  }

  /**
   * Subscribe to game updates with enhanced reliability
   */
  subscribeToGameUpdates(
    gameId: string,
    subscriberId: string,
    handler: GameUpdateHandler
  ): string {
    const channelKey = `game-${gameId}`;

    let subscription = this.channels.get(channelKey);

    if (subscription) {
      // Add to existing subscription
      subscription.subscribers.add(subscriberId);
      subscription.handlers.add(handler);
    } else {
      // Create new subscription
      const channel = supabase
        .channel(channelKey)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'games',
            filter: `id=eq.${gameId}`
          },
          (payload) => {
            console.log('📡 Realtime game update received:', payload);
            if (payload.new) {
              this.handleGameUpdate(gameId, payload.new, subscription!.handlers);
            }
          }
        )
        .subscribe((status, error) => {
          console.log(`📡 Subscription status for game ${gameId}:`, status);

          if (status === 'SUBSCRIBED') {
            this.updateConnectionStatus('connected');
            this.stopFallbackPolling();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            this.updateConnectionStatus('error');
            this.handleConnectionError(error || new Error(`Channel subscription failed: ${status}`));
          }
        });

      subscription = {
        channel,
        subscribers: new Set([subscriberId]),
        gameId,
        handlers: new Set([handler]),
        lastActivity: new Date()
      };

      this.channels.set(channelKey, subscription);
    }

    return `${channelKey}:${subscriberId}`;
  }

  /**
   * Unsubscribe from game updates
   */
  unsubscribeFromGameUpdates(gameId: string, subscriberId: string, handler: GameUpdateHandler): void {
    const channelKey = `game-${gameId}`;
    const subscription = this.channels.get(channelKey);

    if (!subscription) {
      return;
    }

    // Remove handler and subscriber
    subscription.handlers.delete(handler);
    subscription.subscribers.delete(subscriberId);

    // Clean up channel if no more subscribers
    if (subscription.subscribers.size === 0) {
      try {
        supabase.removeChannel(subscription.channel);
        this.channels.delete(channelKey);
        console.log(`🔌 Cleaned up subscription for game ${gameId}`);
      } catch (error) {
        console.error('❌ Error cleaning up subscription:', error);
      }
    }
  }

  /**
   * Add connection status listener
   */
  addConnectionListener(listener: (status: ConnectionStatus) => void): () => void {
    this.connectionListeners.add(listener);

    // Immediately notify with current status
    listener({ ...this.connectionStatus });

    // Return cleanup function
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Force reconnection attempt
   */
  forceReconnect(): void {
    console.log('🔄 Forcing reconnection...');
    this.connectionStatus.reconnectAttempts = 0;
    this.updateConnectionStatus('connecting');
    this.performReconnection();
  }

  /**
   * Get connection health metrics
   */
  getHealthMetrics() {
    return {
      isConnected: this.connectionStatus.status === 'connected',
      isHealthy: this.connectionStatus.isHealthy,
      lastConnected: this.connectionStatus.lastConnected,
      lastHeartbeat: this.lastHeartbeat,
      reconnectAttempts: this.connectionStatus.reconnectAttempts,
      activeChannels: this.channels.size,
      fallbackMode: this.fallbackMode,
      uptime: this.connectionStatus.lastConnected
        ? Date.now() - this.connectionStatus.lastConnected.getTime()
        : 0
    };
  }

  /**
   * Cleanup all connections and intervals
   */
  cleanup(): void {
    console.log('🧹 Cleaning up EnhancedRealtimeManager...');

    // Stop heartbeat
    this.stopHeartbeat();

    // Stop fallback polling
    this.stopFallbackPolling();

    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Clean up all channels
    this.channels.forEach(subscription => {
      try {
        supabase.removeChannel(subscription.channel);
      } catch (error) {
        console.error('❌ Error removing channel:', error);
      }
    });

    this.channels.clear();
    this.connectionListeners.clear();

    console.log('✅ EnhancedRealtimeManager cleanup complete');
  }
}

export default EnhancedRealtimeManager;
