import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SupabaseRealtimeManager from '../services/SupabaseRealtimeManager';
import { supabase } from '../utils/supabase';

// Mock Supabase
vi.mock('../utils/supabase', () => ({
  supabase: {
    channel: vi.fn(),
    removeChannel: vi.fn()
  }
}));

describe('SupabaseRealtimeManager', () => {
  let manager: SupabaseRealtimeManager;
  let mockChannel: any;

  beforeEach(() => {
    // Reset singleton instance
    (SupabaseRealtimeManager as any).instance = null;
    manager = SupabaseRealtimeManager.getInstance();

    // Create mock channel
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    };

    (supabase.channel as any).mockReturnValue(mockChannel);
    (supabase.removeChannel as any).mockClear();
  });

  afterEach(() => {
    // Suppress console output during cleanup
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    manager.cleanup();
    consoleSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('should be a singleton', () => {
    const manager1 = SupabaseRealtimeManager.getInstance();
    const manager2 = SupabaseRealtimeManager.getInstance();
    expect(manager1).toBe(manager2);
  });

  it('should create a new channel for first subscription', () => {
    const gameId = 'test-game-1';
    const subscriberId = 'subscriber-1';
    const handler = vi.fn();

    manager.subscribeToGameUpdates(gameId, subscriberId, handler);

    expect(supabase.channel).toHaveBeenCalledWith(`game-status-${gameId}`);
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      },
      expect.any(Function)
    );
    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should reuse existing channel for same game', () => {
    const gameId = 'test-game-1';
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    manager.subscribeToGameUpdates(gameId, 'subscriber-1', handler1);
    manager.subscribeToGameUpdates(gameId, 'subscriber-2', handler2);

    // Should only create one channel
    expect(supabase.channel).toHaveBeenCalledTimes(1);
    expect(mockChannel.subscribe).toHaveBeenCalledTimes(1);
  });

  it('should clean up channel when all subscribers unsubscribe', () => {
    const gameId = 'test-game-1';
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    manager.subscribeToGameUpdates(gameId, 'subscriber-1', handler1);
    manager.subscribeToGameUpdates(gameId, 'subscriber-2', handler2);

    // Unsubscribe first subscriber
    manager.unsubscribeFromGameUpdates(gameId, 'subscriber-1', handler1);
    expect(supabase.removeChannel).not.toHaveBeenCalled();

    // Unsubscribe second subscriber - should clean up channel
    manager.unsubscribeFromGameUpdates(gameId, 'subscriber-2', handler2);
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('should handle multiple games independently', () => {
    const gameId1 = 'test-game-1';
    const gameId2 = 'test-game-2';
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    manager.subscribeToGameUpdates(gameId1, 'subscriber-1', handler1);
    manager.subscribeToGameUpdates(gameId2, 'subscriber-2', handler2);

    expect(supabase.channel).toHaveBeenCalledTimes(2);
    expect(supabase.channel).toHaveBeenCalledWith(`game-status-${gameId1}`);
    expect(supabase.channel).toHaveBeenCalledWith(`game-status-${gameId2}`);
  });

  it('should provide subscription info', () => {
    const gameId1 = 'test-game-1';
    const gameId2 = 'test-game-2';
    const handler = vi.fn();

    manager.subscribeToGameUpdates(gameId1, 'subscriber-1', handler);
    manager.subscribeToGameUpdates(gameId1, 'subscriber-2', handler);
    manager.subscribeToGameUpdates(gameId2, 'subscriber-3', handler);

    const info = manager.getSubscriptionInfo();
    expect(info.channels).toBe(2);
    expect(info.totalSubscribers).toBe(3);
    expect(info.gameHandlers).toBe(2);
  });

  it('should handle unsubscribe from non-existent channel gracefully', () => {
    const handler = vi.fn();
    
    // Should not throw
    expect(() => {
      manager.unsubscribeFromGameUpdates('non-existent-game', 'subscriber-1', handler);
    }).not.toThrow();
  });

  it('should cleanup all channels', () => {
    const handler = vi.fn();
    
    manager.subscribeToGameUpdates('game-1', 'subscriber-1', handler);
    manager.subscribeToGameUpdates('game-2', 'subscriber-2', handler);

    manager.cleanup();

    expect(supabase.removeChannel).toHaveBeenCalledTimes(2);
    
    const info = manager.getSubscriptionInfo();
    expect(info.channels).toBe(0);
    expect(info.totalSubscribers).toBe(0);
    expect(info.gameHandlers).toBe(0);
  });
});
