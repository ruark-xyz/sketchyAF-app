// Real-time Game Service - High-level interface for real-time game functionality
// Integrates PubNub service with existing game services and provides game-specific real-time features

import { PubNubGameService } from './PubNubService';
import { GameService } from './GameService';
import { supabase } from '../utils/supabase';
import {
  GameEvent,
  GameEventType,
  PresenceEvent,
  ConnectionStatus,
  PlayerJoinedEvent,
  PlayerLeftEvent,
  PlayerReadyEvent,
  GameStartedEvent,
  GamePhaseChangedEvent,
  TimerSyncEvent,
  ServerTimerSyncEvent,
  TimerExpiredEvent,
  DrawingSubmittedEvent,
  VoteCastEvent,
  GameCompletedEvent,
  ConnectionStatusEvent,
  GameEventHandler,
  PresenceEventHandler,
  ConnectionStatusHandler,
  REALTIME_CONSTANTS
} from '../types/realtime';
import { GameStatus, ServiceResponse } from '../types/game';
import { User } from '../types/auth';

export class RealtimeGameService {
  private static instance: RealtimeGameService | null = null;
  private pubNubService: PubNubGameService;
  private currentUser: User | null = null;
  private activeGameId: string | null = null;
  private gameEventHandlers: Map<GameEventType, Set<GameEventHandler>> = new Map();
  private presenceHandlers: Set<PresenceEventHandler> = new Set();
  private connectionStatusHandlers: Set<ConnectionStatusHandler> = new Set();

  private constructor() {
    this.pubNubService = new PubNubGameService();
    this.setupEventHandlers();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RealtimeGameService {
    if (!RealtimeGameService.instance) {
      RealtimeGameService.instance = new RealtimeGameService();
    }
    return RealtimeGameService.instance;
  }

  /**
   * Initialize real-time service with authenticated user
   */
  async initialize(user: User): Promise<ServiceResponse<void>> {
    try {
      // Clear any previous user state to prevent cross-user contamination
      if (this.currentUser && this.currentUser.id !== user.id) {
        console.log('Switching users in RealtimeGameService, clearing previous state');
        await this.cleanup();
      }

      this.currentUser = user;
      await this.pubNubService.initialize(user.id);

      // Set up connection status monitoring
      this.pubNubService.onConnectionStatusChange((status) => {
        this.handleConnectionStatusChange(status);
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to initialize real-time service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INITIALIZATION_FAILED'
      };
    }
  }

  /**
   * Join a game for real-time communication
   */
  async joinGame(gameId: string): Promise<ServiceResponse<void>> {
    try {
      if (!this.currentUser) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Leave current game if any
      if (this.activeGameId && this.activeGameId !== gameId) {
        await this.leaveGame();
      }

      // Join the game channel
      await this.pubNubService.joinGameChannel(gameId);
      this.activeGameId = gameId;

      // Set up event subscription
      this.pubNubService.subscribeToGameEvents(gameId, (event) => {
        this.handleGameEvent(event);
      });

      // Set up presence monitoring
      this.pubNubService.onPresenceChange(gameId, (presence) => {
        this.handlePresenceEvent(presence);
      });

      // Broadcast player joined event
      await this.broadcastPlayerJoined(gameId);

      return { success: true };
    } catch (error) {
      console.error('Failed to join game:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'JOIN_GAME_FAILED'
      };
    }
  }

  /**
   * Leave current game
   */
  async leaveGame(): Promise<ServiceResponse<void>> {
    try {
      if (!this.activeGameId || !this.currentUser) {
        return { success: true }; // Nothing to leave
      }

      // Broadcast player left event
      await this.broadcastPlayerLeft(this.activeGameId);

      // Leave the channel
      await this.pubNubService.leaveGameChannel(this.activeGameId);
      this.pubNubService.unsubscribeFromGame(this.activeGameId);

      this.activeGameId = null;

      return { success: true };
    } catch (error) {
      console.error('Failed to leave game:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'LEAVE_GAME_FAILED'
      };
    }
  }

  /**
   * Broadcast player ready status
   */
  async broadcastPlayerReady(isReady: boolean, selectedBoosterPack?: string): Promise<ServiceResponse<void>> {
    if (!this.activeGameId || !this.currentUser) {
      return { success: false, error: 'No active game or user not authenticated', code: 'NO_ACTIVE_GAME' };
    }

    try {
      const event: PlayerReadyEvent = {
        type: 'player_ready',
        gameId: this.activeGameId,
        userId: this.currentUser.id,
        timestamp: Date.now(),
        version: REALTIME_CONSTANTS.EVENT_VERSION,
        data: {
          username: this.currentUser.username,
          isReady,
          selectedBoosterPack
        }
      };

      await this.pubNubService.publishGameEvent(event);
      return { success: true };
    } catch (error) {
      console.error('Failed to broadcast player ready:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BROADCAST_FAILED'
      };
    }
  }

  /**
   * Broadcast game phase change
   */
  async broadcastPhaseChange(newPhase: GameStatus, previousPhase: GameStatus, phaseDuration?: number): Promise<ServiceResponse<void>> {
    if (!this.activeGameId || !this.currentUser) {
      return { success: false, error: 'No active game or user not authenticated', code: 'NO_ACTIVE_GAME' };
    }

    try {
      const event: GamePhaseChangedEvent = {
        type: 'phase_changed',
        gameId: this.activeGameId,
        userId: this.currentUser.id,
        timestamp: Date.now(),
        version: REALTIME_CONSTANTS.EVENT_VERSION,
        data: {
          newPhase,
          previousPhase,
          phaseStartedAt: new Date().toISOString(),
          phaseDuration
        }
      };

      await this.pubNubService.publishGameEvent(event);
      return { success: true };
    } catch (error) {
      console.error('Failed to broadcast phase change:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BROADCAST_FAILED'
      };
    }
  }

  /**
   * Broadcast timer synchronization
   */
  async broadcastTimerSync(timeRemaining: number, phase: GameStatus, totalDuration: number): Promise<ServiceResponse<void>> {
    if (!this.activeGameId || !this.currentUser) {
      return { success: false, error: 'No active game or user not authenticated', code: 'NO_ACTIVE_GAME' };
    }

    try {
      const event: TimerSyncEvent = {
        type: 'timer_sync',
        gameId: this.activeGameId,
        userId: this.currentUser.id,
        timestamp: Date.now(),
        version: REALTIME_CONSTANTS.EVENT_VERSION,
        data: {
          timeRemaining,
          phase,
          serverTime: Date.now(),
          totalDuration
        }
      };

      await this.pubNubService.publishGameEvent(event);
      return { success: true };
    } catch (error) {
      console.error('Failed to broadcast timer sync:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BROADCAST_FAILED'
      };
    }
  }

  /**
   * Broadcast server-authoritative timer sync
   */
  async broadcastServerTimerSync(gameId: string): Promise<ServiceResponse<void>> {
    try {
      // Get timer data from server
      const { data } = await supabase.functions.invoke('get-game-timer', {
        body: { gameId }
      });

      if (!data) {
        return { success: false, error: 'Failed to get timer data from server', code: 'SERVER_ERROR' };
      }

      const event: ServerTimerSyncEvent = {
        type: 'server_timer_sync',
        gameId,
        userId: 'server',
        timestamp: Date.now(),
        version: REALTIME_CONSTANTS.EVENT_VERSION,
        data: {
          phaseStartedAt: data.phaseStartedAt || new Date().toISOString(),
          phaseDuration: data.phaseDuration || 0,
          serverTime: data.serverTime,
          timeRemaining: data.timeRemaining || 0,
          phase: data.phase,
          phaseExpiresAt: data.phaseExpiresAt || new Date().toISOString()
        }
      };

      await this.pubNubService.publishGameEvent(event);
      return { success: true };
    } catch (error) {
      console.error('Failed to broadcast server timer sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BROADCAST_FAILED'
      };
    }
  }

  /**
   * Broadcast timer expiration event
   */
  async broadcastTimerExpired(
    gameId: string,
    expiredPhase: GameStatus,
    nextPhase: GameStatus,
    executionId?: string
  ): Promise<ServiceResponse<void>> {
    try {
      const event: TimerExpiredEvent = {
        type: 'timer_expired',
        gameId,
        userId: 'server',
        timestamp: Date.now(),
        version: REALTIME_CONSTANTS.EVENT_VERSION,
        data: {
          expiredPhase,
          nextPhase,
          expiredAt: new Date().toISOString(),
          transitionTriggeredBy: 'server_timer',
          executionId
        }
      };

      await this.pubNubService.publishGameEvent(event);
      return { success: true };
    } catch (error) {
      console.error('Failed to broadcast timer expired:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BROADCAST_FAILED'
      };
    }
  }

  /**
   * Broadcast drawing submission
   */
  async broadcastDrawingSubmitted(submissionId: string, elementCount?: number, drawingTimeSeconds?: number): Promise<ServiceResponse<void>> {
    if (!this.activeGameId || !this.currentUser) {
      return { success: false, error: 'No active game or user not authenticated', code: 'NO_ACTIVE_GAME' };
    }

    try {
      const event: DrawingSubmittedEvent = {
        type: 'drawing_submitted',
        gameId: this.activeGameId,
        userId: this.currentUser.id,
        timestamp: Date.now(),
        version: REALTIME_CONSTANTS.EVENT_VERSION,
        data: {
          username: this.currentUser.username,
          submissionId,
          submittedAt: new Date().toISOString(),
          elementCount,
          drawingTimeSeconds
        }
      };

      await this.pubNubService.publishGameEvent(event);
      return { success: true };
    } catch (error) {
      console.error('Failed to broadcast drawing submitted:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BROADCAST_FAILED'
      };
    }
  }

  /**
   * Broadcast vote cast
   */
  async broadcastVoteCast(submissionId: string, totalVotes?: number): Promise<ServiceResponse<void>> {
    if (!this.activeGameId || !this.currentUser) {
      return { success: false, error: 'No active game or user not authenticated', code: 'NO_ACTIVE_GAME' };
    }

    try {
      const event: VoteCastEvent = {
        type: 'vote_cast',
        gameId: this.activeGameId,
        userId: this.currentUser.id,
        timestamp: Date.now(),
        version: REALTIME_CONSTANTS.EVENT_VERSION,
        data: {
          voterUsername: this.currentUser.username,
          submissionId,
          votedAt: new Date().toISOString(),
          totalVotes
        }
      };

      await this.pubNubService.publishGameEvent(event);
      return { success: true };
    } catch (error) {
      console.error('Failed to broadcast vote cast:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BROADCAST_FAILED'
      };
    }
  }

  /**
   * Get current game presence
   */
  async getGamePresence(): Promise<ServiceResponse<string[]>> {
    if (!this.activeGameId) {
      return { success: false, error: 'No active game', code: 'NO_ACTIVE_GAME' };
    }

    try {
      const presence = await this.pubNubService.getGamePresence(this.activeGameId);
      return { success: true, data: presence };
    } catch (error) {
      console.error('Failed to get game presence:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PRESENCE_FAILED'
      };
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.pubNubService.getConnectionStatus();
  }

  /**
   * Add event handler for specific game event type
   */
  addEventListener(eventType: GameEventType, handler: GameEventHandler): void {
    if (!this.gameEventHandlers.has(eventType)) {
      this.gameEventHandlers.set(eventType, new Set());
    }
    this.gameEventHandlers.get(eventType)!.add(handler);
  }

  /**
   * Remove event handler
   */
  removeEventListener(eventType: GameEventType, handler: GameEventHandler): void {
    const handlers = this.gameEventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Add presence event handler
   */
  addPresenceListener(handler: PresenceEventHandler): void {
    this.presenceHandlers.add(handler);
  }

  /**
   * Remove presence event handler
   */
  removePresenceListener(handler: PresenceEventHandler): void {
    this.presenceHandlers.delete(handler);
  }

  /**
   * Add connection status handler
   */
  addConnectionStatusListener(handler: ConnectionStatusHandler): void {
    this.connectionStatusHandlers.add(handler);
  }

  /**
   * Remove connection status handler
   */
  removeConnectionStatusListener(handler: ConnectionStatusHandler): void {
    this.connectionStatusHandlers.delete(handler);
  }

  /**
   * Disconnect from real-time service
   */
  async disconnect(): Promise<void> {
    try {
      await this.leaveGame();
      await this.pubNubService.disconnect();
      this.currentUser = null;
      this.gameEventHandlers.clear();
      this.presenceHandlers.clear();
      this.connectionStatusHandlers.clear();
    } catch (error) {
      console.error('Error disconnecting from real-time service:', error);
    }
  }

  // Private helper methods

  private setupEventHandlers(): void {
    // Set up internal event handling
  }

  private async broadcastPlayerJoined(gameId: string): Promise<void> {
    if (!this.currentUser) return;

    const event: PlayerJoinedEvent = {
      type: 'player_joined',
      gameId,
      userId: this.currentUser.id,
      timestamp: Date.now(),
      version: REALTIME_CONSTANTS.EVENT_VERSION,
      data: {
        username: this.currentUser.username,
        avatar_url: this.currentUser.avatar_url,
        joinedAt: new Date().toISOString()
      }
    };

    await this.pubNubService.publishGameEvent(event);
  }

  private async broadcastPlayerLeft(gameId: string): Promise<void> {
    if (!this.currentUser) return;

    const event: PlayerLeftEvent = {
      type: 'player_left',
      gameId,
      userId: this.currentUser.id,
      timestamp: Date.now(),
      version: REALTIME_CONSTANTS.EVENT_VERSION,
      data: {
        username: this.currentUser.username,
        leftAt: new Date().toISOString(),
        reason: 'quit'
      }
    };

    await this.pubNubService.publishGameEvent(event);
  }

  private handleGameEvent(event: GameEvent): void {
    const handlers = this.gameEventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('Error in game event handler:', error);
        }
      });
    }
  }

  private handlePresenceEvent(presence: PresenceEvent): void {
    this.presenceHandlers.forEach(handler => {
      try {
        handler(presence);
      } catch (error) {
        console.error('Error in presence event handler:', error);
      }
    });
  }

  private handleConnectionStatusChange(status: ConnectionStatus): void {
    this.connectionStatusHandlers.forEach(handler => {
      try {
        handler(status);
      } catch (error) {
        console.error('Error in connection status handler:', error);
      }
    });
  }

  /**
   * Clean up user-specific state (to prevent cross-user contamination)
   */
  private async cleanup(): Promise<void> {
    try {
      // Leave current game if any
      if (this.activeGameId) {
        await this.leaveGame(this.activeGameId);
      }

      // Clear user-specific state
      this.currentUser = null;
      this.activeGameId = null;

      // Clear event handlers (they may contain user-specific callbacks)
      this.gameEventHandlers.clear();
      this.presenceHandlers.clear();
      this.connectionStatusHandlers.clear();

      // Cleanup PubNub service
      await this.pubNubService.cleanup?.();

      console.log('RealtimeGameService: Cleaned up user-specific state');
    } catch (error) {
      console.error('Error during RealtimeGameService cleanup:', error);
    }
  }
}
