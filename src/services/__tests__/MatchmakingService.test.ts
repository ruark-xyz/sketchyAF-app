import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchmakingService } from '../MatchmakingService';
import { supabase } from '../../utils/supabase';

// Mock Supabase
vi.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    }
  }
}));

// Mock UnifiedGameService
vi.mock('../UnifiedGameService', () => ({
  UnifiedGameService: {
    initialize: vi.fn().mockResolvedValue({ success: true }),
    createGameWithRealtime: vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'test-game-id',
        created_by: 'user1'
      }
    }),
    joinGameWithRealtime: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('MatchmakingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('joinQueue', () => {
    it('should successfully join queue when authenticated', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user1' } }
      });

      const result = await MatchmakingService.joinQueue();
      
      expect(result.success).toBe(true);
    });

    it('should fail when user is not authenticated', async () => {
      // Mock unauthenticated user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null }
      });

      const result = await MatchmakingService.joinQueue();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
      expect(result.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('checkQueueStatus', () => {
    it('should return queue status for authenticated user', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user1' } }
      });

      // First join the queue
      await MatchmakingService.joinQueue();
      
      // Then check status
      const result = await MatchmakingService.checkQueueStatus();
      
      expect(result.success).toBe(true);
      expect(result.data?.in_queue).toBe(true);
      expect(result.data?.position).toBe(1);
    });

    it('should return not in queue for user not in queue', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user2' } }
      });

      const result = await MatchmakingService.checkQueueStatus();
      
      expect(result.success).toBe(true);
      expect(result.data?.in_queue).toBe(false);
    });
  });

  describe('checkMatchStatus', () => {
    it('should return no match when no match found', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user1' } }
      });

      const result = await MatchmakingService.checkMatchStatus();
      
      expect(result.success).toBe(true);
      expect(result.data?.match_found).toBe(false);
    });
  });

  describe('leaveQueue', () => {
    it('should successfully leave queue', async () => {
      // Mock authenticated user
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user1' } }
      });

      // First join the queue
      await MatchmakingService.joinQueue();
      
      // Then leave
      const result = await MatchmakingService.leaveQueue();
      
      expect(result.success).toBe(true);
      
      // Verify user is no longer in queue
      const statusResult = await MatchmakingService.checkQueueStatus();
      expect(statusResult.data?.in_queue).toBe(false);
    });
  });

  describe('triggerQueueProcessing', () => {
    it('should process queue successfully', async () => {
      const result = await MatchmakingService.triggerQueueProcessing();

      expect(result.success).toBe(true);
    });
  });

  describe('4-player matchmaking', () => {
    it('should create a match when 4 players join the queue', async () => {
      // Mock 4 different users joining the queue
      const users = ['user1', 'user2', 'user3', 'user4'];

      for (const userId of users) {
        // Mock authenticated user
        (supabase.auth.getUser as any).mockResolvedValue({
          data: { user: { id: userId } }
        });

        // Join queue
        const joinResult = await MatchmakingService.joinQueue();
        expect(joinResult.success).toBe(true);
      }

      // Check that all users have match notifications
      for (const userId of users) {
        (supabase.auth.getUser as any).mockResolvedValue({
          data: { user: { id: userId } }
        });

        const matchResult = await MatchmakingService.checkMatchStatus();
        expect(matchResult.success).toBe(true);
        expect(matchResult.data?.match_found).toBe(true);
        expect(matchResult.data?.game_id).toBe('test-game-id');
      }
    });
  });
});
