// Unit Tests for PubNub Service
// Tests PubNub service initialization, configuration, event publishing, and subscription mechanisms

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PubNubGameService } from '../PubNubService';
import { GameEvent, REALTIME_CONSTANTS } from '../../types/realtime';

// Mock PubNub using vi.hoisted to properly handle the mock
const mocks = vi.hoisted(() => {
  const mockChannel = {
    subscription: vi.fn(() => ({
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      onMessage: vi.fn(),
      onPresence: vi.fn()
    }))
  };

  const mockPubNubInstance = {
    publish: vi.fn().mockResolvedValue({ timetoken: '12345' }),
    channel: vi.fn().mockReturnValue(mockChannel),
    hereNow: vi.fn().mockResolvedValue({
      channels: {
        'game-game-123': {
          occupants: [{ uuid: 'user-1' }, { uuid: 'user-2' }, { uuid: 'user-3' }]
        }
      }
    }),
    addListener: vi.fn(),
    unsubscribeAll: vi.fn(),
    stop: vi.fn()
  };

  const MockPubNubConstructor = vi.fn(() => mockPubNubInstance);

  return {
    MockPubNubConstructor,
    mockPubNubInstance,
    mockChannel
  };
});

vi.mock('pubnub', () => ({
  default: mocks.MockPubNubConstructor
}));

// Mock Supabase with proper auth methods
vi.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-123', email: 'test@example.com' } },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token', user: { id: 'test-user-123' } } },
        error: null,
      }),
    },
  },
}));

// Mock global fetch for Edge Function calls
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: vi.fn().mockResolvedValue({
    token: 'mock-pubnub-token',
    ttl: 3600,
    authorized_uuid: 'test-user-123',
    channels: ['game-test-channel']
  })
});

// Environment variables are already mocked in setup.ts

describe('PubNubGameService', () => {
  let service: PubNubGameService;

  beforeEach(() => {
    service = new PubNubGameService();
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize PubNub with correct configuration', async () => {
      const userId = 'test-user-123';

      await service.initialize(userId);

      expect(mocks.MockPubNubConstructor).toHaveBeenCalledWith({
        publishKey: expect.any(String),
        subscribeKey: expect.any(String),
        userId,
        ssl: true,
        heartbeatInterval: REALTIME_CONSTANTS.DEFAULT_HEARTBEAT_INTERVAL,
        presenceTimeout: REALTIME_CONSTANTS.DEFAULT_PRESENCE_TIMEOUT,
        restore: true,
        autoNetworkDetection: true
      });
    });

    it('should throw error when API keys are missing', async () => {
      // Create a fresh service instance to test environment validation
      const newService = new PubNubGameService();

      // Use Vitest's proper environment stubbing
      vi.stubEnv('VITE_PUBNUB_PUBLISH_KEY', '');
      vi.stubEnv('VITE_PUBNUB_SUBSCRIBE_KEY', '');

      await expect(newService.initialize('test-user')).rejects.toThrow(
        'PubNub API keys not configured'
      );

      // Restore environment variables
      vi.unstubAllEnvs();
    });

    it('should set up connection listeners on initialization', async () => {
      await service.initialize('test-user-123');

      expect(mocks.mockPubNubInstance.addListener).toHaveBeenCalled();
    });

    it('should handle reinitialization for same user', async () => {
      const userId = 'test-user-123';

      await service.initialize(userId);
      await service.initialize(userId); // Should not reinitialize

      expect(mocks.MockPubNubConstructor).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Publishing', () => {
    beforeEach(async () => {
      await service.initialize('test-user-123');
      mocks.mockPubNubInstance.publish.mockResolvedValue({ timetoken: '12345' });
    });

    it('should publish game event with correct parameters', async () => {
      const gameEvent: GameEvent = {
        type: 'player_joined',
        gameId: 'game-123',
        userId: 'user-456',
        timestamp: Date.now(),
        version: '1.0.0',
        data: { username: 'TestUser' }
      };

      await service.publishGameEvent(gameEvent);

      expect(mocks.mockPubNubInstance.publish).toHaveBeenCalledWith({
        channel: 'game-game-123',
        message: expect.objectContaining({
          type: 'player_joined',
          gameId: 'game-123',
          userId: 'user-456',
          version: '1.0.0'
        }),
        storeInHistory: false,
        sendByPost: false,
        meta: {
          eventType: 'player_joined',
          timestamp: expect.any(Number)
        }
      });
    });

    it('should add version and timestamp if not present', async () => {
      const gameEvent: Partial<GameEvent> = {
        type: 'player_joined',
        gameId: 'game-123',
        userId: 'user-456'
      };

      await service.publishGameEvent(gameEvent as GameEvent);

      expect(mocks.mockPubNubInstance.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            version: REALTIME_CONSTANTS.EVENT_VERSION,
            timestamp: expect.any(Number)
          })
        })
      );
    });

    it('should handle publish failures through circuit breaker', async () => {
      mocks.mockPubNubInstance.publish.mockRejectedValueOnce(new Error('Network error'));

      const gameEvent: GameEvent = {
        type: 'player_joined',
        gameId: 'game-123',
        userId: 'user-456',
        timestamp: Date.now(),
        version: '1.0.0'
      };

      await expect(service.publishGameEvent(gameEvent)).rejects.toThrow();
      expect(mocks.mockPubNubInstance.publish).toHaveBeenCalledTimes(1);
    });

    it('should open circuit breaker after multiple failures', async () => {
      mocks.mockPubNubInstance.publish.mockRejectedValue(new Error('Network error'));

      const gameEvent: GameEvent = {
        type: 'player_joined',
        gameId: 'game-123',
        userId: 'user-456',
        timestamp: Date.now(),
        version: '1.0.0'
      };

      // Trigger multiple failures to open circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await service.publishGameEvent(gameEvent);
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit breaker should now be open and reject immediately
      await expect(service.publishGameEvent(gameEvent)).rejects.toThrow();
    });
  });

  describe('Channel Management', () => {
    beforeEach(async () => {
      await service.initialize('test-user-123');
    });

    it('should join game channel successfully', async () => {
      const gameId = 'game-123';

      await service.joinGameChannel(gameId);

      expect(mocks.mockPubNubInstance.channel).toHaveBeenCalledWith('game-game-123');
    });

    it('should set up message and presence handlers when joining channel', async () => {
      const gameId = 'game-123';
      const mockSubscription = {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        onMessage: vi.fn(),
        onPresence: vi.fn()
      };

      mocks.mockChannel.subscription.mockReturnValue(mockSubscription);

      await service.joinGameChannel(gameId);

      expect(mockSubscription.subscribe).toHaveBeenCalled();
      expect(mockSubscription.onMessage).toBeDefined();
      expect(mockSubscription.onPresence).toBeDefined();
    });

    it('should not rejoin already subscribed channel', async () => {
      const gameId = 'game-123';

      await service.joinGameChannel(gameId);
      await service.joinGameChannel(gameId); // Second call

      expect(mocks.mockPubNubInstance.channel).toHaveBeenCalledTimes(1);
    });

    it('should leave game channel and clean up subscriptions', async () => {
      const gameId = 'game-123';
      const mockSubscription = {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        onMessage: vi.fn(),
        onPresence: vi.fn()
      };

      mocks.mockChannel.subscription.mockReturnValue(mockSubscription);

      await service.joinGameChannel(gameId);
      await service.leaveGameChannel(gameId);

      expect(mockSubscription.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Presence Management', () => {
    beforeEach(async () => {
      await service.initialize('test-user-123');
    });

    it('should get game presence successfully', async () => {
      const gameId = 'game-123';
      const mockPresenceResponse = {
        channels: {
          'game-game-123': {
            occupants: [
              { uuid: 'user-1' },
              { uuid: 'user-2' },
              { uuid: 'user-3' }
            ]
          }
        }
      };

      mocks.mockPubNubInstance.hereNow.mockResolvedValue(mockPresenceResponse);

      const presence = await service.getGamePresence(gameId);

      expect(mocks.mockPubNubInstance.hereNow).toHaveBeenCalledWith({
        channels: ['game-game-123'],
        includeUUIDs: true
      });
      expect(presence).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('should return empty array when presence call fails', async () => {
      const gameId = 'game-123';
      mocks.mockPubNubInstance.hereNow.mockRejectedValue(new Error('Network error'));

      const presence = await service.getGamePresence(gameId);

      expect(presence).toEqual([]);
    });

    it('should handle empty presence response', async () => {
      const gameId = 'game-123';
      const mockPresenceResponse = {
        channels: {}
      };

      mocks.mockPubNubInstance.hereNow.mockResolvedValue(mockPresenceResponse);

      const presence = await service.getGamePresence(gameId);

      expect(presence).toEqual([]);
    });
  });

  describe('Connection Status Management', () => {
    beforeEach(async () => {
      await service.initialize('test-user-123');
    });

    it('should return current connection status', () => {
      const status = service.getConnectionStatus();
      expect(['connected', 'connecting', 'reconnecting', 'disconnected', 'error']).toContain(status);
    });

    it('should handle connection status changes', async () => {
      const statusHandler = vi.fn();

      // Add the status handler before simulating the status change
      service.onConnectionStatusChange(statusHandler);

      // Get the listener that was added during initialization
      const addListenerCalls = mocks.mockPubNubInstance.addListener.mock.calls;
      expect(addListenerCalls.length).toBeGreaterThan(0);

      const listener = addListenerCalls[0][0];
      expect(listener).toBeDefined();
      expect(typeof listener.status).toBe('function');

      // Simulate a status change - this should trigger the status handler
      listener.status({ category: 'PNNetworkDownCategory' });

      // The status handler should be called when connection status changes
      expect(statusHandler).toHaveBeenCalledWith('disconnected');
    });
  });

  describe('Cleanup and Disconnection', () => {
    beforeEach(async () => {
      await service.initialize('test-user-123');
    });

    it('should disconnect and clean up resources', async () => {
      await service.joinGameChannel('game-123');
      await service.disconnect();

      expect(mocks.mockPubNubInstance.unsubscribeAll).toHaveBeenCalled();
      expect(mocks.mockPubNubInstance.stop).toHaveBeenCalled();
    });

    it('should handle disconnect when not initialized', async () => {
      const newService = new PubNubGameService();

      await expect(newService.disconnect()).resolves.not.toThrow();
    });
  });
});
