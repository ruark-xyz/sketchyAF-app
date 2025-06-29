import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUnifiedGameState } from '../hooks/useUnifiedGameState';
import { supabase } from '../utils/supabase';

// Mock the dependencies
vi.mock('../utils/supabase', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams('gameId=test-game-id')],
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { id: 'test-user-id' },
  }),
}));

vi.mock('./useRealtimeGame', () => ({
  useRealtimeGame: () => ({
    isConnected: true,
    connectionStatus: 'connected',
    activeGameId: null,
    initializeRealtime: vi.fn(),
    joinGame: vi.fn(),
    leaveGame: vi.fn(),
    broadcastPlayerReady: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    error: null,
  }),
}));

describe('useUnifiedGameState with Supabase Realtime', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };

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
    vi.clearAllMocks();

    // Reset the mock channel methods
    mockChannel.on.mockReturnValue(mockChannel);
    mockChannel.subscribe.mockReturnValue(mockChannel);

    // Mock supabase.from().select().eq().single()
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSingle = vi.fn().mockResolvedValue({
      data: mockGame,
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      single: mockSingle,
    });

    // Mock supabase.channel()
    (supabase.channel as any).mockReturnValue(mockChannel);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should set up Supabase Realtime subscription for game status changes', async () => {
    const { result } = renderHook(() => 
      useUnifiedGameState({ gameId: 'test-game-id', autoNavigate: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify that a channel was created
    expect(supabase.channel).toHaveBeenCalledWith('game-status-test-game-id');

    // Verify that the channel was configured to listen for postgres_changes
    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: 'id=eq.test-game-id',
      },
      expect.any(Function)
    );

    // Verify that the channel was subscribed
    expect(mockChannel.subscribe).toHaveBeenCalledWith(expect.any(Function));
  });

  it('should load initial game data', async () => {
    const { result } = renderHook(() => 
      useUnifiedGameState({ gameId: 'test-game-id', autoNavigate: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.game).toEqual(mockGame);
    expect(result.current.hasGame).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should handle realtime game status updates', async () => {
    const { result } = renderHook(() => 
      useUnifiedGameState({ gameId: 'test-game-id', autoNavigate: true })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Get the realtime callback function
    const realtimeCallback = mockChannel.on.mock.calls[0][2];

    // Simulate a realtime update
    const updatedGame = {
      ...mockGame,
      status: 'drawing',
    };

    const realtimePayload = {
      new: updatedGame,
      old: mockGame,
    };

    // Call the realtime callback
    realtimeCallback(realtimePayload);

    // The state should be updated (this would trigger navigation in a real scenario)
    await waitFor(() => {
      expect(result.current.game?.status).toBe('drawing');
    });
  });

  it('should clean up realtime subscription on unmount', () => {
    const { unmount } = renderHook(() => 
      useUnifiedGameState({ gameId: 'test-game-id', autoNavigate: true })
    );

    unmount();

    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('should not set up subscription when gameId is not provided', () => {
    renderHook(() => 
      useUnifiedGameState({ autoNavigate: true })
    );

    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('should not set up subscription when autoNavigate is false', () => {
    renderHook(() => 
      useUnifiedGameState({ gameId: 'test-game-id', autoNavigate: false })
    );

    expect(supabase.channel).not.toHaveBeenCalled();
  });
});
