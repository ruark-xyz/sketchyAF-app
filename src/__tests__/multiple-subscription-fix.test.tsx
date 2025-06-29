import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUnifiedGameState } from '../hooks/useUnifiedGameState';
import { supabase } from '../utils/supabase';
import SupabaseRealtimeManager from '../services/SupabaseRealtimeManager';

// Mock dependencies
vi.mock('../utils/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn()
  }
}));

vi.mock('../hooks/useRealtimeGame', () => ({
  useRealtimeGame: () => ({
    isConnected: false,
    connectionStatus: 'disconnected',
    activeGameId: null,
    initializeRealtime: vi.fn(),
    joinGame: vi.fn(),
    leaveGame: vi.fn(),
    broadcastPlayerReady: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    error: null
  })
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'test-user-id', email: 'test@example.com' },
    isLoading: false
  })
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams()]
}));

describe('Multiple Subscription Fix Integration Test', () => {
  let mockChannel: any;
  let manager: SupabaseRealtimeManager;

  const mockGame = {
    id: 'test-game-id',
    status: 'briefing',
    phase_expires_at: new Date(Date.now() + 20000).toISOString(),
    current_phase_duration: 20,
    prompt: 'Test prompt',
    max_players: 4,
    round_duration: 60,
    voting_duration: 30,
  };

  beforeEach(() => {
    // Clear all mocks first
    vi.clearAllMocks();

    // Reset singleton instance
    (SupabaseRealtimeManager as any).instance = null;
    manager = SupabaseRealtimeManager.getInstance();

    // Create fresh mock channel for each test
    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    };

    // Reset and configure supabase mocks
    (supabase.channel as any).mockClear().mockReturnValue(mockChannel);
    (supabase.removeChannel as any).mockClear();

    // Mock database queries
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: mockGame,
      error: null,
    });

    (supabase.from as any).mockClear().mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      single: mockSingle,
    });
  });

  afterEach(() => {
    manager.cleanup();
    vi.clearAllMocks();
  });

  it('should handle multiple useUnifiedGameState hooks for same game without duplicate subscriptions', async () => {
    const gameId = 'test-game-id';

    // Render multiple hooks with the same gameId (simulating multiple components)
    const { result: result1 } = renderHook(() =>
      useUnifiedGameState({ gameId, autoNavigate: true })
    );

    const { result: result2 } = renderHook(() =>
      useUnifiedGameState({ gameId, autoNavigate: true })
    );

    const { result: result3 } = renderHook(() =>
      useUnifiedGameState({ gameId, autoNavigate: true })
    );

    // Wait for all hooks to initialize
    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
      expect(result2.current.isLoading).toBe(false);
      expect(result3.current.isLoading).toBe(false);
    });

    // The key test: Check that our singleton manager only has one channel
    const info = manager.getSubscriptionInfo();
    expect(info.channels).toBe(1);
    expect(info.totalSubscribers).toBe(3); // Three subscribers to one channel
    expect(info.gameHandlers).toBe(1); // One game being handled

    // Verify that all hooks have the same game data
    expect(result1.current.game).toEqual(mockGame);
    expect(result2.current.game).toEqual(mockGame);
    expect(result3.current.game).toEqual(mockGame);
  });

  it('should clean up properly when hooks unmount', async () => {
    const gameId = 'test-game-id';

    // Render multiple hooks
    const { result: result1, unmount: unmount1 } = renderHook(() =>
      useUnifiedGameState({ gameId, autoNavigate: true })
    );

    const { result: result2, unmount: unmount2 } = renderHook(() =>
      useUnifiedGameState({ gameId, autoNavigate: true })
    );

    // Wait for initialization
    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
      expect(result2.current.isLoading).toBe(false);
    });

    // Verify initial state
    let info = manager.getSubscriptionInfo();
    expect(info.channels).toBe(1);
    expect(info.totalSubscribers).toBe(2);

    // Unmount first hook
    unmount1();

    // Channel should still exist (one subscriber remaining)
    info = manager.getSubscriptionInfo();
    expect(info.channels).toBe(1);
    expect(info.totalSubscribers).toBe(1);

    // Unmount second hook
    unmount2();

    // Now channel should be cleaned up
    info = manager.getSubscriptionInfo();
    expect(info.channels).toBe(0);
    expect(info.totalSubscribers).toBe(0);
  });

  it('should handle different games independently', async () => {
    const gameId1 = 'test-game-1';
    const gameId2 = 'test-game-2';

    // Render hooks for different games
    const { result: result1 } = renderHook(() =>
      useUnifiedGameState({ gameId: gameId1, autoNavigate: true })
    );

    const { result: result2 } = renderHook(() =>
      useUnifiedGameState({ gameId: gameId2, autoNavigate: true })
    );

    // Wait for initialization
    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
      expect(result2.current.isLoading).toBe(false);
    });

    // Check subscription info - should have separate channels for different games
    const info = manager.getSubscriptionInfo();
    expect(info.channels).toBe(2);
    expect(info.totalSubscribers).toBe(2);
    expect(info.gameHandlers).toBe(2);
  });

  it('should not create duplicate subscriptions during rapid navigation', async () => {
    const gameId = 'test-game-id';

    // Simulate rapid mounting/unmounting (like during navigation)
    const { unmount: unmount1 } = renderHook(() =>
      useUnifiedGameState({ gameId, autoNavigate: true })
    );

    const { unmount: unmount2 } = renderHook(() =>
      useUnifiedGameState({ gameId, autoNavigate: true })
    );

    const { result: result3 } = renderHook(() =>
      useUnifiedGameState({ gameId, autoNavigate: true })
    );

    // Quickly unmount first two
    unmount1();
    unmount2();

    // Wait for the remaining hook to initialize
    await waitFor(() => {
      expect(result3.current.isLoading).toBe(false);
    });

    // Final state should be clean - only one active subscription
    const info = manager.getSubscriptionInfo();
    expect(info.channels).toBe(1);
    expect(info.totalSubscribers).toBe(1);
  });
});
