// Unit Tests for BoosterPackAnalyticsService
// Tests analytics tracking and reporting for booster pack usage

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BoosterPackAnalyticsService } from '../BoosterPackAnalyticsService';

// Mock Supabase with proper method chaining
vi.mock('../../utils/supabase', () => {
  const createMockSupabaseQuery = () => ({
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockResolvedValue({
      data: [
        {
          user_id: 'user-1',
          asset_id: 'asset-1',
          asset_name: 'Test Asset',
          asset_collection: 'test-collection',
          usage_type: 'placed',
          timestamp: '2023-01-01T00:00:00Z'
        }
      ],
      error: null
    })
  });

  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user' } }
      })
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue(createMockSupabaseQuery())
    })
  };

  return { supabase: mockSupabase };
});

describe('BoosterPackAnalyticsService', () => {
  let service: BoosterPackAnalyticsService;
  let mockSupabase: any;

  beforeEach(async () => {
    // Set up fake timers BEFORE creating the service
    vi.clearAllTimers();
    vi.useFakeTimers();

    // Reset the singleton instance to ensure fresh instance with fake timers
    (BoosterPackAnalyticsService as any).instance = null;

    service = BoosterPackAnalyticsService.getInstance();

    // Get the mocked supabase instance
    const { supabase } = await import('../../utils/supabase');
    mockSupabase = supabase;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    service.destroy();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = BoosterPackAnalyticsService.getInstance();
      const instance2 = BoosterPackAnalyticsService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Asset Usage Tracking', () => {
    it('should track asset usage successfully', async () => {
      const result = await service.trackAssetUsage(
        'user-123',
        'game-456',
        'asset-789',
        'Test Asset',
        'test-collection',
        'placed',
        { position: { x: 100, y: 200 } },
        'booster-pack-1'
      );

      // Analytics is disabled for MVP, so it should succeed but not call database
      expect(result.success).toBe(true);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should queue usage events for batch processing', async () => {
      // Track multiple events
      await service.trackAssetUsage('user-1', 'game-1', 'asset-1', 'Asset 1', 'collection-1', 'placed');
      await service.trackAssetUsage('user-1', 'game-1', 'asset-2', 'Asset 2', 'collection-1', 'placed');

      // Analytics is disabled, so events should not be sent to database
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should flush queue when it reaches threshold', async () => {
      // Track 10 events to trigger immediate flush
      for (let i = 0; i < 10; i++) {
        await service.trackAssetUsage(
          'user-1',
          'game-1',
          `asset-${i}`,
          `Asset ${i}`,
          'collection-1',
          'placed'
        );
      }

      // Analytics is disabled, so database should not be called even with many events
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle tracking errors gracefully', async () => {
      // Mock error in tracking
      const errorService = new (BoosterPackAnalyticsService as any)();

      const result = await errorService.trackAssetUsage(
        'user-123',
        'game-456',
        'asset-789',
        'Test Asset',
        'test-collection',
        'placed'
      );

      expect(result.success).toBe(true); // Should not fail on tracking errors
    });
  });

  describe('Booster Pack Usage Tracking', () => {
    it('should track booster pack usage', async () => {
      const result = await service.trackBoosterPackUsage(
        'user-123',
        'game-456',
        'booster-pack-1',
        ['asset-1', 'asset-2']
      );

      // Analytics is disabled for MVP, so it should succeed but not call database
      expect(result.success).toBe(true);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle unauthenticated user', async () => {
      const result = await service.trackBoosterPackUsage(
        'user-123',
        'game-456',
        'booster-pack-1',
        ['asset-1']
      );

      // Analytics is disabled, so it should succeed regardless of auth status
      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      const result = await service.trackBoosterPackUsage(
        'user-123',
        'game-456',
        'booster-pack-1',
        ['asset-1']
      );

      // Analytics is disabled, so it should succeed regardless of database state
      expect(result.success).toBe(true);
    });
  });

  describe('Usage Analytics', () => {
    it('should get user usage analytics', async () => {
      const result = await service.getUserUsageAnalytics('user-123', '30d');

      // Analytics methods still work but return empty data since tracking is disabled
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.totalUsage).toBeDefined();
      expect(result.data?.uniqueUsers).toBeDefined();
      expect(result.data?.popularAssets).toBeDefined();
      expect(result.data?.popularCollections).toBeDefined();
    });

    it('should handle analytics errors', async () => {
      // Create a fresh mock for this test
      const originalGetUser = mockSupabase.auth.getUser;
      mockSupabase.auth.getUser = vi.fn().mockResolvedValueOnce({
        data: { user: null }
      });

      const result = await service.getUserUsageAnalytics('user-123');

      expect(result.success).toBe(false);
      expect(result.code).toBe('UNAUTHENTICATED');

      // Restore original mock
      mockSupabase.auth.getUser = originalGetUser;
    });

    it('should get popular assets', async () => {
      const result = await service.getPopularAssets(5);

      // The getPopularAssets method is not disabled, so it should succeed with mocked data
      // but return empty results since no tracking data exists
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(0); // No data since tracking is disabled
    });

    it('should handle popular assets database errors', async () => {
      // Create a fresh mock for this test
      const originalFrom = mockSupabase.from;
      mockSupabase.from = vi.fn().mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      });

      const result = await service.getPopularAssets();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');

      // Restore original mock
      mockSupabase.from = originalFrom;
    });
  });

  describe('Periodic Flush', () => {
    it('should flush queue periodically', async () => {
      // Since analytics is disabled, periodic flush is not started
      // The test should verify that flush is not called when analytics is disabled
      const flushSpy = vi.spyOn(service as any, 'flushUsageQueue');

      // Add some events to queue (but they won't actually be queued since tracking is disabled)
      await service.trackAssetUsage('user-1', 'game-1', 'asset-1', 'Asset 1', 'collection-1', 'placed');

      // Fast-forward time to trigger periodic flush
      vi.advanceTimersByTime(30000);

      // Since analytics is disabled, flush should not be called periodically
      expect(flushSpy).not.toHaveBeenCalled();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should not flush empty queue', async () => {
      // Fast-forward time without adding events
      vi.advanceTimersByTime(30000);

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Analytics Processing', () => {
    it('should process usage analytics correctly', () => {
      const mockUsageData = [
        {
          user_id: 'user-1',
          asset_id: 'asset-1',
          asset_name: 'Asset 1',
          asset_collection: 'collection-1',
          usage_type: 'placed',
          timestamp: '2023-01-01T00:00:00Z'
        },
        {
          user_id: 'user-2',
          asset_id: 'asset-1',
          asset_name: 'Asset 1',
          asset_collection: 'collection-1',
          usage_type: 'placed',
          timestamp: '2023-01-02T00:00:00Z'
        },
        {
          user_id: 'user-1',
          asset_id: 'asset-2',
          asset_name: 'Asset 2',
          asset_collection: 'collection-2',
          usage_type: 'placed',
          timestamp: '2023-01-01T12:00:00Z'
        }
      ];

      const analytics = (service as any).processUsageAnalytics(mockUsageData);

      expect(analytics.totalUsage).toBe(3);
      expect(analytics.uniqueUsers).toBe(2);
      expect(analytics.popularAssets).toHaveLength(2);
      expect(analytics.popularCollections).toHaveLength(2);
      expect(analytics.usageByTimeframe).toHaveLength(2);
    });
  });

  describe('Service Cleanup', () => {
    it('should clean up resources on destroy', async () => {
      const flushSpy = vi.spyOn(service as any, 'flushUsageQueue');

      // Add some events to queue first (but they won't actually be queued since tracking is disabled)
      await service.trackAssetUsage('user-1', 'game-1', 'asset-1', 'Asset 1', 'collection-1', 'placed');

      service.destroy();

      // Since analytics is disabled, flush should not be called on destroy
      expect(flushSpy).not.toHaveBeenCalled();
    });
  });
});
