// Booster Pack Analytics Service - Tracks usage and analytics for booster pack assets
// Provides usage tracking, analytics, and reporting for asset usage in drawings

import { supabase } from '../utils/supabase';
import { ServiceResponse } from '../types/game';

// Asset Usage Event
export interface AssetUsageEvent {
  userId: string;
  gameId: string;
  assetId: string;
  assetName: string;
  assetCollection: string;
  boosterPackId?: string;
  usageType: 'placed' | 'removed' | 'modified';
  timestamp: string;
  metadata?: {
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    rotation?: number;
  };
}

// Usage Analytics
export interface UsageAnalytics {
  totalUsage: number;
  uniqueUsers: number;
  popularAssets: Array<{
    assetId: string;
    assetName: string;
    usageCount: number;
  }>;
  popularCollections: Array<{
    collection: string;
    usageCount: number;
  }>;
  usageByTimeframe: Array<{
    date: string;
    count: number;
  }>;
}

export class BoosterPackAnalyticsService {
  private static instance: BoosterPackAnalyticsService | null = null;
  private usageQueue: AssetUsageEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start periodic flush of usage events
    this.startPeriodicFlush();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BoosterPackAnalyticsService {
    if (!BoosterPackAnalyticsService.instance) {
      BoosterPackAnalyticsService.instance = new BoosterPackAnalyticsService();
    }
    return BoosterPackAnalyticsService.instance;
  }

  /**
   * Track asset usage in a drawing
   */
  async trackAssetUsage(
    userId: string,
    gameId: string,
    assetId: string,
    assetName: string,
    assetCollection: string,
    usageType: 'placed' | 'removed' | 'modified',
    metadata?: AssetUsageEvent['metadata'],
    boosterPackId?: string
  ): Promise<ServiceResponse<void>> {
    // Temporarily disabled - analytics service not needed for MVP
    console.log('Asset usage tracking disabled:', { userId, gameId, assetId, assetName });
    return { success: true };

    /*
    try {
      const event: AssetUsageEvent = {
        userId,
        gameId,
        assetId,
        assetName,
        assetCollection,
        boosterPackId,
        usageType,
        timestamp: new Date().toISOString(),
        metadata
      };

      // Add to queue for batch processing
      this.usageQueue.push(event);

      // If queue is getting large, flush immediately
      if (this.usageQueue.length >= 10) {
        await this.flushUsageQueue();
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to track asset usage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'TRACKING_FAILED'
      };
    }
    */
  }

  /**
   * Track booster pack usage in a game
   */
  async trackBoosterPackUsage(
    userId: string,
    gameId: string,
    boosterPackId: string,
    assetsUsed: string[]
  ): Promise<ServiceResponse<void>> {
    // Temporarily disabled - analytics service not needed for MVP
    console.log('Booster pack usage tracking disabled:', { userId, gameId, boosterPackId, assetsUsed });
    return { success: true };

    /*
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Record booster pack usage
      const { error } = await supabase
        .from('booster_pack_usage')
        .insert({
          user_id: userId,
          game_id: gameId,
          booster_pack_id: boosterPackId,
          assets_used: assetsUsed,
          used_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to track booster pack usage:', error);
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to track booster pack usage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'TRACKING_FAILED'
      };
    }
    */
  }

  /**
   * Get usage analytics for a user
   */
  async getUserUsageAnalytics(userId: string, timeframe = '30d'): Promise<ServiceResponse<UsageAnalytics>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated', code: 'UNAUTHENTICATED' };
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = parseInt(timeframe.replace('d', ''));
      startDate.setDate(endDate.getDate() - days);

      // Get usage data
      const { data: usageData, error } = await supabase
        .from('asset_usage_events')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (error) {
        console.error('Failed to get usage analytics:', error);
        return { 
          success: false, 
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      // Process analytics
      const analytics = this.processUsageAnalytics(usageData || []);

      return { success: true, data: analytics };
    } catch (error) {
      console.error('Failed to get usage analytics:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ANALYTICS_FAILED'
      };
    }
  }

  /**
   * Get popular assets across all users
   */
  async getPopularAssets(limit = 10): Promise<ServiceResponse<Array<{ assetId: string; assetName: string; usageCount: number }>>> {
    try {
      const { data, error } = await supabase
        .from('asset_usage_events')
        .select('asset_id, asset_name')
        .eq('usage_type', 'placed');

      if (error) {
        console.error('Failed to get popular assets:', error);
        return { 
          success: false, 
          error: error.message,
          code: 'DATABASE_ERROR'
        };
      }

      // Count usage by asset
      const assetCounts = new Map<string, { assetId: string; assetName: string; count: number }>();
      
      for (const event of data || []) {
        const key = event.asset_id;
        if (assetCounts.has(key)) {
          assetCounts.get(key)!.count++;
        } else {
          assetCounts.set(key, {
            assetId: event.asset_id,
            assetName: event.asset_name,
            count: 1
          });
        }
      }

      // Sort by usage count and limit
      const popularAssets = Array.from(assetCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map(item => ({
          assetId: item.assetId,
          assetName: item.assetName,
          usageCount: item.count
        }));

      return { success: true, data: popularAssets };
    } catch (error) {
      console.error('Failed to get popular assets:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ANALYTICS_FAILED'
      };
    }
  }

  /**
   * Process raw usage data into analytics
   */
  private processUsageAnalytics(usageData: any[]): UsageAnalytics {
    const totalUsage = usageData.filter(event => event.usage_type === 'placed').length;
    const uniqueUsers = new Set(usageData.map(event => event.user_id)).size;

    // Popular assets
    const assetCounts = new Map<string, { assetId: string; assetName: string; count: number }>();
    const collectionCounts = new Map<string, number>();
    const dailyCounts = new Map<string, number>();

    for (const event of usageData) {
      if (event.usage_type === 'placed') {
        // Count assets
        const assetKey = event.asset_id;
        if (assetCounts.has(assetKey)) {
          assetCounts.get(assetKey)!.count++;
        } else {
          assetCounts.set(assetKey, {
            assetId: event.asset_id,
            assetName: event.asset_name,
            count: 1
          });
        }

        // Count collections
        const collection = event.asset_collection;
        collectionCounts.set(collection, (collectionCounts.get(collection) || 0) + 1);

        // Count by date
        const date = new Date(event.timestamp).toISOString().split('T')[0];
        dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
      }
    }

    const popularAssets = Array.from(assetCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(item => ({
        assetId: item.assetId,
        assetName: item.assetName,
        usageCount: item.count
      }));

    const popularCollections = Array.from(collectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([collection, count]) => ({
        collection,
        usageCount: count
      }));

    const usageByTimeframe = Array.from(dailyCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({
        date,
        count
      }));

    return {
      totalUsage,
      uniqueUsers,
      popularAssets,
      popularCollections,
      usageByTimeframe
    };
  }

  /**
   * Start periodic flush of usage events
   */
  private startPeriodicFlush(): void {
    // Temporarily disabled - analytics service not needed for MVP
    console.log('Analytics service disabled - periodic flush not started');
    /*
    this.flushInterval = setInterval(() => {
      if (this.usageQueue.length > 0) {
        this.flushUsageQueue();
      }
    }, 30000); // Flush every 30 seconds
    */
  }

  /**
   * Flush usage queue to database
   */
  private async flushUsageQueue(): Promise<void> {
    if (this.usageQueue.length === 0) return;

    try {
      const events = [...this.usageQueue];
      this.usageQueue = [];

      const { error } = await supabase
        .from('asset_usage_events')
        .insert(events.map(event => ({
          user_id: event.userId,
          game_id: event.gameId,
          asset_id: event.assetId,
          asset_name: event.assetName,
          asset_collection: event.assetCollection,
          booster_pack_id: event.boosterPackId,
          usage_type: event.usageType,
          timestamp: event.timestamp,
          metadata: event.metadata
        })));

      if (error) {
        console.error('Failed to flush usage queue:', error);
        // Re-add events to queue for retry
        this.usageQueue.unshift(...events);
      }
    } catch (error) {
      console.error('Failed to flush usage queue:', error);
    }
  }

  /**
   * Cleanup service
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush any remaining events
    if (this.usageQueue.length > 0) {
      this.flushUsageQueue();
    }
  }
}

// Export singleton instance
export const boosterPackAnalyticsService = BoosterPackAnalyticsService.getInstance();
