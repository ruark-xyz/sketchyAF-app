// Unit Tests for UnifiedGameService
// Tests the unified game service that combines GameService and RealtimeGameService

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedGameService } from '../UnifiedGameService';
import { User } from '../../types/auth';

// Mock dependencies
vi.mock('../GameService', () => ({
  GameService: {
    createGame: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'game-123', prompt: 'Test prompt', status: 'waiting' }
    }),
    joinGame: vi.fn().mockResolvedValue({ success: true }),
    leaveGame: vi.fn().mockResolvedValue({ success: true }),
    getGame: vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'game-123',
        status: 'waiting',
        participants: []
      }
    }),
    transitionGameStatus: vi.fn().mockResolvedValue({ success: true }),
    getAvailableGames: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getUserGames: vi.fn().mockResolvedValue({ success: true, data: [] })
  }
}));

vi.mock('../RealtimeGameService', () => ({
  RealtimeGameService: {
    getInstance: vi.fn().mockReturnValue({
      initialize: vi.fn().mockResolvedValue({ success: true }),
      joinGame: vi.fn().mockResolvedValue({ success: true }),
      leaveGame: vi.fn().mockResolvedValue({ success: true }),
      broadcastPhaseChange: vi.fn().mockResolvedValue({ success: true }),
      broadcastPlayerReady: vi.fn().mockResolvedValue({ success: true }),
      broadcastTimerSync: vi.fn().mockResolvedValue({ success: true }),
      broadcastDrawingSubmitted: vi.fn().mockResolvedValue({ success: true }),
      disconnect: vi.fn().mockResolvedValue(undefined)
    })
  }
}));

vi.mock('../SubmissionService', () => ({
  SubmissionService: {
    submitDrawing: vi.fn().mockResolvedValue({ 
      success: true, 
      data: { id: 'submission-123' } 
    })
  }
}));

describe('UnifiedGameService', () => {
  let service: UnifiedGameService;
  let mockUser: User;

  beforeEach(() => {
    service = UnifiedGameService.getInstance();
    mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: '2023-01-01T00:00:00Z'
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = UnifiedGameService.getInstance();
      const instance2 = UnifiedGameService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid user', async () => {
      const result = await service.initialize(mockUser);
      
      expect(result.success).toBe(true);
      expect(service.getCurrentUser()).toEqual(mockUser);
      expect(service.isAuthenticated()).toBe(true);
    });

    it('should handle initialization errors', async () => {
      // Create a new service instance to test error handling
      const errorService = new (UnifiedGameService as any)();
      
      // Mock the realtimeService to throw an error
      const mockRealtimeService = {
        initialize: vi.fn().mockResolvedValue({ success: false, error: 'Init failed' })
      };
      (errorService as any).realtimeService = mockRealtimeService;

      const result = await errorService.initialize(mockUser);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Game Management', () => {
    beforeEach(async () => {
      await service.initialize(mockUser);
    });

    it('should create game with real-time setup', async () => {
      const gameRequest = {
        prompt: 'Test prompt',
        max_players: 4,
        round_duration: 60,
        voting_duration: 30
      };

      const result = await service.createGame(gameRequest);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('game-123');
    });

    it('should join game with real-time setup', async () => {
      const joinRequest = {
        game_id: 'game-123',
        selected_booster_pack: 'pack-1'
      };

      const result = await service.joinGame(joinRequest);

      expect(result.success).toBe(true);
    });

    it('should leave game with real-time cleanup', async () => {
      const result = await service.leaveGame('game-123');

      expect(result.success).toBe(true);
    });

    it('should get game by ID', async () => {
      const result = await service.getGameById('game-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should transition game status', async () => {
      const result = await service.transitionGameStatus('game-123', 'drawing', 'waiting');

      expect(result.success).toBe(true);
    });
  });

  describe('Drawing Submission', () => {
    beforeEach(async () => {
      await service.initialize(mockUser);
    });

    it('should submit drawing with real-time notification', async () => {
      const submissionRequest = {
        game_id: 'game-123',
        drawing_data: { elements: [], appState: {} },
        element_count: 5,
        drawing_time_seconds: 120
      };

      const result = await service.submitDrawing(submissionRequest);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('submission-123');
    });

    it('should handle submission errors gracefully', async () => {
      // Mock SubmissionService to fail
      const { SubmissionService } = await import('../SubmissionService');
      vi.mocked(SubmissionService.submitDrawing).mockResolvedValueOnce({ 
        success: false, 
        error: 'Submission failed',
        code: 'SUBMISSION_ERROR'
      });

      const submissionRequest = {
        game_id: 'game-123',
        drawing_data: { elements: [], appState: {} }
      };

      const result = await service.submitDrawing(submissionRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Submission failed');
    });
  });

  describe('Real-time Broadcasting', () => {
    beforeEach(async () => {
      await service.initialize(mockUser);
    });

    it('should broadcast player ready status', async () => {
      const result = await service.broadcastPlayerReady(true, 'pack-1');

      expect(result.success).toBe(true);
    });

    it('should broadcast timer sync', async () => {
      const result = await service.broadcastTimerSync(120, 'drawing', 180);

      expect(result.success).toBe(true);
    });
  });

  describe('Service Access', () => {
    it('should provide access to real-time service', () => {
      const realtimeService = service.getRealtimeService();
      
      expect(realtimeService).toBeDefined();
    });

    it('should track authentication state', async () => {
      // Reset the singleton state by disconnecting first
      await service.disconnect();

      expect(service.isAuthenticated()).toBe(false);

      await service.initialize(mockUser);

      expect(service.isAuthenticated()).toBe(true);
      expect(service.getCurrentUser()).toEqual(mockUser);
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await service.initialize(mockUser);
    });

    it('should disconnect and clean up resources', async () => {
      await service.disconnect();
      
      expect(service.isAuthenticated()).toBe(false);
      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Test without initialization
      const result = await service.createGame({
        prompt: 'Test',
        max_players: 4,
        round_duration: 60,
        voting_duration: 30
      });

      // Should still work as it uses GameService directly
      expect(result.success).toBe(true);
    });
  });
});
