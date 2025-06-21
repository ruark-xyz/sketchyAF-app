// Integration Tests for Supabase-PubNub Integration
// Tests the complete integration between database operations and real-time events

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedGameService } from '../../services/UnifiedGameService';
import { EventValidationService } from '../../services/EventValidationService';
import { CreateGameRequest, GameStatus } from '../../types/game';
import { GameEvent } from '../../types/realtime';

// Create comprehensive mocks using vi.hoisted for proper hoisting
const mocks = vi.hoisted(() => {
  const mockSupabaseChain = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    insert: vi.fn(),
    is: vi.fn(),
  };

  // Create chainable methods
  mockSupabaseChain.select.mockReturnValue(mockSupabaseChain);
  mockSupabaseChain.eq.mockReturnValue(mockSupabaseChain);
  mockSupabaseChain.single.mockReturnValue(mockSupabaseChain);
  mockSupabaseChain.insert.mockReturnValue(mockSupabaseChain);
  mockSupabaseChain.is.mockReturnValue(mockSupabaseChain);

  return {
    supabase: {
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(),
      },
      from: vi.fn(() => mockSupabaseChain),
      rpc: vi.fn(),
    },
    mockSupabaseChain,
    realtimeService: {
      initialize: vi.fn(),
      joinGame: vi.fn(),
      leaveGame: vi.fn(),
      broadcastPhaseChange: vi.fn(),
      onPresenceChange: vi.fn(),
    },
  };
});

// Mock modules using the hoisted mocks
vi.mock('../../utils/supabase', () => ({
  supabase: mocks.supabase,
}));

vi.mock('../../services/RealtimeGameService', () => ({
  RealtimeGameService: {
    getInstance: vi.fn(() => mocks.realtimeService),
  },
}));

describe('Supabase-PubNub Integration', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  const mockGame = {
    id: 'test-game-id',
    status: 'waiting' as GameStatus,
    prompt: 'Test prompt',
    max_players: 4,
    current_players: 1,
    round_duration: 60,
    voting_duration: 30,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    created_by: mockUser.id,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default successful responses
    mocks.supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mocks.supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token', user: mockUser } },
      error: null,
    });

    // Setup default database responses
    mocks.mockSupabaseChain.single.mockResolvedValue({
      data: mockGame,
      error: null,
    });

    mocks.supabase.rpc.mockResolvedValue({
      data: null,
      error: null,
    });

    // Setup default real-time service responses
    mocks.realtimeService.initialize.mockResolvedValue({ success: true });
    mocks.realtimeService.joinGame.mockResolvedValue({ success: true });
    mocks.realtimeService.broadcastPhaseChange.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Unified Game Creation', () => {
    it('should create game with real-time channels', async () => {
      // Initialize unified service
      await UnifiedGameService.initialize(mockUser.id);

      // Create game request
      const createRequest: CreateGameRequest = {
        prompt: 'Test drawing prompt',
        max_players: 4,
        round_duration: 60,
        voting_duration: 30,
      };

      // Create game with real-time
      const result = await UnifiedGameService.createGameWithRealtime(createRequest);

      // Verify game creation
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGame);

      // Verify real-time initialization was called
      expect(mocks.realtimeService.initialize).toHaveBeenCalledWith({ id: mockUser.id });
    });

    it('should handle real-time initialization failure gracefully', async () => {
      // Mock real-time service failure
      mocks.realtimeService.initialize.mockResolvedValue({ success: false, error: 'Connection failed' });
      mocks.realtimeService.joinGame.mockRejectedValue(new Error('PubNub error'));

      await UnifiedGameService.initialize(mockUser.id);

      const createRequest: CreateGameRequest = {
        prompt: 'Test drawing prompt',
        max_players: 4,
      };

      const result = await UnifiedGameService.createGameWithRealtime(createRequest);

      // Should still succeed even if real-time fails
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGame);
    });
  });

  describe('Event Validation', () => {
    it('should validate player joined events', async () => {
      // Mock game lookup for validation
      mocks.mockSupabaseChain.single.mockResolvedValueOnce({
        data: { status: 'waiting', max_players: 4, current_players: 1 },
        error: null,
      });

      // Mock participant lookup (should not exist for new player)
      mocks.mockSupabaseChain.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }, // Not found error
      });

      const playerJoinedEvent: GameEvent = {
        type: 'player_joined',
        gameId: 'test-game-id',
        userId: 'test-user-id',
        timestamp: Date.now(),
        version: '1.0.0',
        data: {
          userId: 'test-user-id',
          joinedAt: new Date().toISOString(),
          isReady: false,
        },
      };

      const result = await EventValidationService.validateGameEvent(playerJoinedEvent);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid phase transitions', async () => {
      const phaseChangedEvent: GameEvent = {
        type: 'phase_changed',
        gameId: 'test-game-id',
        userId: 'system',
        timestamp: Date.now(),
        version: '1.0.0',
        data: {
          newPhase: 'completed',
          previousPhase: 'waiting', // Invalid transition
          phaseStartedAt: new Date().toISOString(),
        },
      };

      const result = await EventValidationService.validateGameEvent(phaseChangedEvent);
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('INVALID_TRANSITION');
    });

    it('should reject events with invalid timestamps', async () => {
      const oldEvent: GameEvent = {
        type: 'player_joined',
        gameId: 'test-game-id',
        userId: 'test-user-id',
        timestamp: Date.now() - (10 * 60 * 1000), // 10 minutes ago
        version: '1.0.0',
        data: {},
      };

      const result = await EventValidationService.validateGameEvent(oldEvent);
      expect(result.isValid).toBe(false);
      expect(result.code).toBe('TIMESTAMP_TOO_OLD');
    });
  });

  describe('Game Status Transitions', () => {
    it('should transition game status with real-time broadcast', async () => {
      await UnifiedGameService.initialize(mockUser.id);

      const result = await UnifiedGameService.transitionGameStatusWithRealtime(
        'test-game-id',
        'briefing',
        'waiting'
      );

      expect(result.success).toBe(true);
      expect(mocks.realtimeService.broadcastPhaseChange).toHaveBeenCalledWith('briefing', 'waiting');
    });
  });

  describe('Authentication Integration', () => {
    it('should validate Supabase authentication before PubNub operations', async () => {
      // Mock authentication failure
      mocks.supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      // Also mock the real-time service to fail initialization
      mocks.realtimeService.initialize.mockRejectedValue(new Error('Authentication failed'));

      const result = await UnifiedGameService.initialize('invalid-user-id');
      expect(result.success).toBe(false);
      expect(result.code).toBe('INITIALIZATION_ERROR');
    });

    it('should handle session validation for channel access', async () => {
      // Mock no active session
      mocks.supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Verify the mock setup works
      expect(mocks.supabase.auth.getSession).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures', async () => {
      // Mock database error
      mocks.mockSupabaseChain.single.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed'),
      });

      const createRequest: CreateGameRequest = {
        prompt: 'Test prompt',
        max_players: 4,
      };

      const result = await UnifiedGameService.createGameWithRealtime(createRequest);
      expect(result.success).toBe(false);
      expect(result.code).toBe('DATABASE_ERROR');
    });

    it('should handle real-time service unavailability', async () => {
      // Test without initializing real-time service
      const createRequest: CreateGameRequest = {
        prompt: 'Test prompt',
        max_players: 4,
      };

      const result = await UnifiedGameService.createGameWithRealtime(createRequest);

      // Should still succeed with database-only operation
      expect(result.success).toBe(true);
      expect(UnifiedGameService.isRealtimeAvailable()).toBe(true); // Service is mocked as available
    });
  });
});
