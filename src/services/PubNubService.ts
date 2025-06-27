// PubNub Real-time Communication Service
// Handles PubNub initialization, channel management, and real-time messaging

import PubNub from 'pubnub';
import {
  GameEvent,
  PresenceEvent,
  ConnectionStatus,
  PubNubConfig,
  RealtimeGameService,
  RealtimeServiceResponse,
  GameEventHandler,
  PresenceEventHandler,
  ConnectionStatusHandler,
  REALTIME_CONSTANTS,
  RealtimeErrorCode
} from '../types/realtime';
import { RealtimeErrorHandler, RealtimeError, withGracefulDegradation, CircuitBreaker } from '../utils/realtimeErrorHandler';

export class PubNubGameService implements RealtimeGameService {
  private pubnub: PubNub | null = null;
  private subscriptions: Map<string, any> = new Map();
  private eventHandlers: Map<string, GameEventHandler> = new Map();
  private presenceHandlers: Map<string, PresenceEventHandler> = new Map();
  private connectionStatusHandlers: Set<ConnectionStatusHandler> = new Set();
  private currentConnectionStatus: ConnectionStatus = 'disconnected';
  private userId: string | null = null;
  private isInitialized = false;
  private isInitializing = false; // Add flag to prevent concurrent initialization
  private errorHandler: RealtimeErrorHandler;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    this.errorHandler = RealtimeErrorHandler.getInstance();
    this.circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1 minute timeout
  }

  /**
   * Initialize PubNub client with user authentication
   */
  async initialize(userId: string): Promise<void> {
    try {
      // Check if already initialized for this user
      if (this.isInitialized && this.userId === userId) {
        return;
      }

      // If initialized for a different user, clean up first
      if (this.isInitialized && this.userId !== userId) {
        await this.disconnect();
      }

      // Check if initialization is already in progress
      if (this.isInitializing) {
        while (this.isInitializing) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (this.isInitialized && this.userId === userId) {
          return;
        }
      }

      this.isInitializing = true;

      // Get PubNub configuration from environment
      const publishKey = import.meta.env.VITE_PUBNUB_PUBLISH_KEY;
      const subscribeKey = import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY;

      if (!publishKey || !subscribeKey) {
        throw new Error('PubNub API keys not configured. Please check environment variables.');
      }

      // Clean up existing connection if any
      if (this.pubnub) {
        await this.disconnect();
      }

      // Validate user authentication with Supabase
      await this.validateSupabaseAuth(userId);

      const config: PubNubConfig = {
        publishKey,
        subscribeKey,
        userId,
        ssl: true,
        heartbeatInterval: REALTIME_CONSTANTS.DEFAULT_HEARTBEAT_INTERVAL,
        presenceTimeout: REALTIME_CONSTANTS.DEFAULT_PRESENCE_TIMEOUT,
        restore: true,
        autoNetworkDetection: true
      };

      // Handle potential ESM/CommonJS compatibility issues
      const PubNubConstructor = (PubNub as any).default || PubNub;

      this.pubnub = new PubNubConstructor({
        publishKey: config.publishKey,
        subscribeKey: config.subscribeKey,
        userId: config.userId,
        ssl: config.ssl,
        heartbeatInterval: config.heartbeatInterval,
        presenceTimeout: config.presenceTimeout,
        restore: config.restore,
        autoNetworkDetection: config.autoNetworkDetection
      });

      // Set up connection status listeners
      this.setupConnectionListeners();

      this.userId = userId;
      this.isInitialized = true;
      this.updateConnectionStatus('connected');

    } catch (error) {
      this.updateConnectionStatus('error');
      throw new Error(`PubNub initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isInitializing = false; // Always reset the flag
    }
  }

  /**
   * Disconnect from PubNub and clean up resources
   */
  async disconnect(): Promise<void> {
    try {
      if (this.pubnub) {
        // Unsubscribe from all channels
        const channels = Array.from(this.subscriptions.keys());
        if (channels.length > 0) {
          this.pubnub.unsubscribeAll();
        }

        // Clear all handlers and subscriptions
        this.subscriptions.clear();
        this.eventHandlers.clear();
        this.presenceHandlers.clear();

        // Stop PubNub
        this.pubnub.stop();
        this.pubnub = null;
      }

      this.isInitialized = false;
      this.isInitializing = false; // Reset initialization flag
      this.userId = null;
      this.updateConnectionStatus('disconnected');

    } catch (error) {
    }
  }

  /**
   * Join a game channel for real-time communication
   */
  async joinGameChannel(gameId: string): Promise<void> {
    if (!this.pubnub || !this.isInitialized) {
      throw new Error('PubNub not initialized. Call initialize() first.');
    }

    try {
      const channelName = `game-${gameId}`;

      // Check if already subscribed
      if (this.subscriptions.has(gameId)) {
        return;
      }

      // Get authentication token for this channel
      await this.authenticateChannelAccess(this.userId!, channelName);

      const channel = this.pubnub.channel(channelName);
      const subscription = channel.subscription();

      // Set up message handler
      subscription.onMessage = (messageEvent) => {
        const event = messageEvent.message as GameEvent;
        this.handleGameMessage(gameId, event);
      };

      // Set up presence handler
      subscription.onPresence = (presenceEvent) => {
        this.handlePresenceEvent(gameId, presenceEvent);
      };

      // Subscribe to the channel
      subscription.subscribe();
      this.subscriptions.set(gameId, subscription);

    } catch (error) {
      throw new Error(`Failed to join game channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Leave a game channel
   */
  async leaveGameChannel(gameId: string): Promise<void> {
    try {
      const subscription = this.subscriptions.get(gameId);
      if (subscription) {
        subscription.unsubscribe();
        this.subscriptions.delete(gameId);
        this.eventHandlers.delete(gameId);
        this.presenceHandlers.delete(gameId);
      }
    } catch (error) {
    }
  }

  /**
   * Publish a game event to the channel
   */
  async publishGameEvent(event: GameEvent): Promise<void> {
    if (!this.pubnub || !this.isInitialized) {
      throw new Error('PubNub not initialized. Call initialize() first.');
    }

    // Use retry logic for critical events
    await this.publishWithRetry(event, REALTIME_CONSTANTS.MAX_RETRY_ATTEMPTS);
  }

  /**
   * Publish event with retry logic and exponential backoff
   */
  private async publishWithRetry(event: GameEvent, maxRetries: number): Promise<void> {
    const operation = async () => {
      // Add version and timestamp if not present
      const eventWithMetadata = {
        ...event,
        version: event.version || REALTIME_CONSTANTS.EVENT_VERSION,
        timestamp: event.timestamp || Date.now()
      };

      const result = await this.pubnub!.publish({
        channel: `game-${event.gameId}`,
        message: eventWithMetadata,
        storeInHistory: false, // Game events are ephemeral
        sendByPost: false, // Use GET for better performance
        meta: {
          eventType: event.type,
          timestamp: eventWithMetadata.timestamp
        }
      });

      return result;
    };

    // Use circuit breaker with direct operation execution
    return this.circuitBreaker.execute(operation);
  }

  /**
   * Broadcast event to a specific game (alias for publishGameEvent)
   */
  async broadcastToGame(gameId: string, event: GameEvent): Promise<void> {
    const eventWithGameId = { ...event, gameId };
    await this.publishGameEvent(eventWithGameId);
  }

  /**
   * Subscribe to user-specific notifications (like match notifications)
   */
  async subscribeToUserChannel(userId: string, callback: (event: any) => void): Promise<void> {
    if (!this.pubnub || !this.isInitialized) {
      throw new Error('PubNub not initialized. Call initialize() first.');
    }

    try {
      const channelName = `user-${userId}`;

      // Check if already subscribed
      if (this.subscriptions.has(`user-${userId}`)) {
        return;
      }

      const channel = this.pubnub.channel(channelName);
      const subscription = channel.subscription();

      // Set up message handler
      subscription.onMessage = (messageEvent) => {
        callback(messageEvent);
      };

      // Subscribe to the channel
      subscription.subscribe();
      this.subscriptions.set(`user-${userId}`, subscription);

    } catch (error) {
      throw new Error(`Failed to subscribe to user channel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unsubscribe from user-specific notifications
   */
  async unsubscribeFromUserChannel(userId: string): Promise<void> {
    try {
      const subscription = this.subscriptions.get(`user-${userId}`);
      if (subscription) {
        subscription.unsubscribe();
        this.subscriptions.delete(`user-${userId}`);
      }
    } catch (error) {
    }
  }

  /**
   * Publish a match notification to a user's personal channel
   */
  async publishMatchNotification(userId: string, gameId: string, matchData: any): Promise<void> {
    if (!this.pubnub || !this.isInitialized) {
      throw new Error('PubNub not initialized. Call initialize() first.');
    }

    try {
      const notification = {
        type: 'MATCH_FOUND',
        userId,
        gameId,
        timestamp: Date.now(),
        data: matchData
      };

      const result = await this.pubnub.publish({
        channel: `user-${userId}`,
        message: notification,
        storeInHistory: false, // Notifications are ephemeral
        sendByPost: false
      });

    } catch (error) {
      // Don't throw - this is a nice-to-have feature, not critical
    }
  }

  /**
   * Subscribe to game events with a callback handler
   */
  subscribeToGameEvents(gameId: string, callback: GameEventHandler): void {
    this.eventHandlers.set(gameId, callback);
  }

  /**
   * Unsubscribe from game events
   */
  unsubscribeFromGame(gameId: string): void {
    this.eventHandlers.delete(gameId);
    this.presenceHandlers.delete(gameId);
  }

  /**
   * Get current presence information for a game
   */
  async getGamePresence(gameId: string): Promise<string[]> {
    if (!this.pubnub || !this.isInitialized) {
      throw new Error('PubNub not initialized. Call initialize() first.');
    }

    try {
      const response = await this.pubnub.hereNow({
        channels: [`game-${gameId}`],
        includeUUIDs: true
      });

      const channelData = response.channels[`game-${gameId}`];
      return channelData?.occupants?.map(occupant => occupant.uuid) || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Set up presence change listener for a game
   */
  onPresenceChange(gameId: string, callback: PresenceEventHandler): void {
    this.presenceHandlers.set(gameId, callback);
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.currentConnectionStatus;
  }

  /**
   * Set up connection status change listener
   */
  onConnectionStatusChange(callback: ConnectionStatusHandler): void {
    this.connectionStatusHandlers.add(callback);
  }

  /**
   * Remove connection status change listener
   */
  removeConnectionStatusListener(callback: ConnectionStatusHandler): void {
    this.connectionStatusHandlers.delete(callback);
  }

  // Private helper methods

  private setupConnectionListeners(): void {
    if (!this.pubnub) return;

    this.pubnub.addListener({
      status: (statusEvent) => {
        const { category } = statusEvent;

        switch (category) {
          case 'PNConnectedCategory':
            this.updateConnectionStatus('connected');
            break;
          case 'PNReconnectedCategory':
            this.updateConnectionStatus('connected');
            break;
          case 'PNNetworkDownCategory':
            this.updateConnectionStatus('disconnected');
            break;
          case 'PNNetworkUpCategory':
            this.updateConnectionStatus('connecting');
            break;
          case 'PNReconnectingCategory':
            this.updateConnectionStatus('reconnecting');
            break;
          default:
        }
      }
    });
  }

  private handleGameMessage(gameId: string, event: GameEvent): void {
    if (!event) {
      return;
    }

    const handler = this.eventHandlers.get(gameId);
    if (handler) {
      try {
        handler(event);
      } catch (error) {
      }
    }
  }

  private handlePresenceEvent(gameId: string, presenceEvent: any): void {
    const handler = this.presenceHandlers.get(gameId);
    if (handler) {
      try {
        const presence: PresenceEvent = {
          action: presenceEvent.action,
          uuid: presenceEvent.uuid,
          occupancy: presenceEvent.occupancy,
          timestamp: presenceEvent.timestamp,
          state: presenceEvent.state
        };
        handler(presence);
      } catch (error) {
      }
    }
  }

  private updateConnectionStatus(status: ConnectionStatus): void {
    if (this.currentConnectionStatus !== status) {
      this.currentConnectionStatus = status;
      this.connectionStatusHandlers.forEach(handler => {
        try {
          handler(status);
        } catch (error) {
        }
      });
    }
  }

  /**
   * Validate user authentication with Supabase
   */
  private async validateSupabaseAuth(userId: string): Promise<void> {
    try {
      // Import supabase client dynamically to avoid circular dependencies
      const { supabase } = await import('../utils/supabase');

      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user || user.id !== userId) {
        throw new Error('User not authenticated with Supabase');
      }

    } catch (error) {
      throw new Error(`Authentication validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Authenticate channel access via Supabase Edge Function
   */
  private async authenticateChannelAccess(userId: string, channel: string): Promise<void> {
    try {
      // Import supabase client dynamically
      const { supabase } = await import('../utils/supabase');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/pubnub-auth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          channel: channel,
          permissions: { read: true, write: true }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Channel authentication failed');
      }

      const authData = await response.json();
    } catch (error) {
      throw new Error(`Channel authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up user-specific state (called by RealtimeGameService)
   */
  async cleanup(): Promise<void> {
    try {
      // Clear user-specific handlers and subscriptions
      this.eventHandlers.clear();
      this.presenceHandlers.clear();
      this.subscriptions.clear();

    } catch (error) {
    }
  }
}
