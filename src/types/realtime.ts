// Real-time Communication Types
// TypeScript definitions for PubNub real-time events and messaging

import { GameStatus } from './game';

// Connection Status Types
export type ConnectionStatus = 
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

// Game Event Types (MVP Scope)
export type GameEventType =
  | 'player_joined'
  | 'player_left'
  | 'player_ready'
  | 'game_started'
  | 'phase_changed'
  | 'timer_sync'
  | 'server_timer_sync'  // NEW: Server-authoritative timer sync
  | 'timer_expired'      // NEW: Server-side timer expiration
  | 'drawing_submitted'
  | 'vote_cast'
  | 'game_completed'
  | 'connection_status';

// Base Game Event Interface
export interface GameEvent {
  type: GameEventType;
  gameId: string;
  userId: string;
  timestamp: number;
  data?: any;
  version: string;
}

// Specific Event Interfaces
export interface PlayerJoinedEvent extends GameEvent {
  type: 'player_joined';
  data: {
    username: string;
    avatar_url?: string;
    joinedAt: string;
    selectedBoosterPack?: string; // asset_directory_name
  };
}

export interface PlayerLeftEvent extends GameEvent {
  type: 'player_left';
  data: {
    username: string;
    leftAt: string;
    reason?: 'disconnect' | 'quit' | 'kicked';
  };
}

export interface PlayerReadyEvent extends GameEvent {
  type: 'player_ready';
  data: {
    username: string;
    isReady: boolean;
    selectedBoosterPack?: string;
  };
}

export interface GameStartedEvent extends GameEvent {
  type: 'game_started';
  data: {
    startedAt: string;
    prompt: string;
    roundDuration: number;
    participants: Array<{
      userId: string;
      username: string;
      selectedBoosterPack?: string;
    }>;
  };
}

export interface GamePhaseChangedEvent extends GameEvent {
  type: 'phase_changed';
  data: {
    newPhase: GameStatus;
    previousPhase: GameStatus;
    phaseStartedAt: string;
    phaseDuration?: number;
    phaseData?: any;
  };
}

export interface TimerSyncEvent extends GameEvent {
  type: 'timer_sync';
  data: {
    timeRemaining: number;
    phase: GameStatus;
    serverTime: number;
    totalDuration: number;
  };
}

// NEW: Server-authoritative timer sync event
export interface ServerTimerSyncEvent extends GameEvent {
  type: 'server_timer_sync';
  data: {
    phaseStartedAt: string;     // ISO timestamp from database
    phaseDuration: number;      // seconds
    serverTime: string;         // current server time ISO timestamp
    timeRemaining: number;      // calculated server-side
    phase: GameStatus;
    phaseExpiresAt: string;     // ISO timestamp when phase expires
  };
}

// NEW: Timer expiration event
export interface TimerExpiredEvent extends GameEvent {
  type: 'timer_expired';
  data: {
    expiredPhase: GameStatus;
    nextPhase: GameStatus;
    expiredAt: string;          // ISO timestamp
    transitionTriggeredBy: 'server_timer';
    executionId?: string;       // For tracking/debugging
  };
}

export interface DrawingSubmittedEvent extends GameEvent {
  type: 'drawing_submitted';
  data: {
    username: string;
    submissionId: string;
    submittedAt: string;
    elementCount?: number;
    drawingTimeSeconds?: number;
  };
}

export interface VoteCastEvent extends GameEvent {
  type: 'vote_cast';
  data: {
    voterUsername: string;
    submissionId: string;
    votedAt: string;
    totalVotes?: number;
  };
}

export interface GameCompletedEvent extends GameEvent {
  type: 'game_completed';
  data: {
    completedAt: string;
    winner: {
      userId: string;
      username: string;
      submissionId: string;
    };
    results: Array<{
      userId: string;
      username: string;
      placement: number;
      voteCount: number;
    }>;
  };
}

export interface ConnectionStatusEvent extends GameEvent {
  type: 'connection_status';
  data: {
    status: ConnectionStatus;
    userId: string;
    username: string;
    timestamp: number;
  };
}

// Presence Event Types
export interface PresenceEvent {
  action: 'join' | 'leave' | 'state-change' | 'timeout';
  uuid: string;
  occupancy: number;
  timestamp: number;
  state?: any;
}

// Channel Configuration
export interface GameChannels {
  game: `game-${string}`; // game-{gameId} - Main game events and coordination
  presence: `presence-${string}`; // presence-{gameId} - Player presence tracking
}

// PubNub Configuration Interface
export interface PubNubConfig {
  publishKey: string;
  subscribeKey: string;
  userId: string; // Unique identifier for the user (linked to Supabase auth.uid())
  ssl: boolean; // Always true for production
  heartbeatInterval: number; // Seconds between heartbeat messages (default: 60)
  presenceTimeout: number; // Seconds before user marked as offline (default: 120)
  restore: boolean; // Restore subscription on reconnect
  autoNetworkDetection: boolean; // Automatically handle network changes
}

// Service Response Types for Real-time Operations
export interface RealtimeServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Real-time Game Service Interface
export interface RealtimeGameService {
  // Connection Management
  initialize(userId: string): Promise<void>;
  disconnect(): Promise<void>;

  // Game Channel Management
  joinGameChannel(gameId: string): Promise<void>;
  leaveGameChannel(gameId: string): Promise<void>;

  // Event Publishing
  publishGameEvent(event: GameEvent): Promise<void>;
  broadcastToGame(gameId: string, event: GameEvent): Promise<void>;

  // Event Subscription
  subscribeToGameEvents(gameId: string, callback: (event: GameEvent) => void): void;
  unsubscribeFromGame(gameId: string): void;

  // Presence Management
  getGamePresence(gameId: string): Promise<string[]>;
  onPresenceChange(gameId: string, callback: (presence: PresenceEvent) => void): void;

  // Connection Status
  getConnectionStatus(): ConnectionStatus;
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): void;
}

// Event Handler Types
export type GameEventHandler = (event: GameEvent) => void;
export type PresenceEventHandler = (presence: PresenceEvent) => void;
export type ConnectionStatusHandler = (status: ConnectionStatus) => void;

// Constants
export const REALTIME_CONSTANTS = {
  EVENT_VERSION: '1.0.0',
  DEFAULT_HEARTBEAT_INTERVAL: 60,
  DEFAULT_PRESENCE_TIMEOUT: 120,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_BACKOFF_BASE: 1000, // 1 second
  MESSAGE_TIMEOUT: 5000, // 5 seconds
} as const;

// Error Codes for Real-time Operations
export type RealtimeErrorCode = 
  | 'PUBNUB_INIT_FAILED'
  | 'CHANNEL_JOIN_FAILED'
  | 'PUBLISH_FAILED'
  | 'SUBSCRIPTION_FAILED'
  | 'CONNECTION_FAILED'
  | 'PRESENCE_FAILED'
  | 'INVALID_EVENT'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_FAILED'
  | 'UNKNOWN_ERROR';
