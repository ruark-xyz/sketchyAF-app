import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useSimpleTimer } from '../useSimpleTimer';

// Mock the dependencies
vi.mock('../../utils/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}));

vi.mock('../useRealtimeGame', () => ({
  useRealtimeGame: () => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    isConnected: true
  })
}));

describe('useSimpleTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return expired state and redirect message when timer is 0', async () => {
    const { supabase } = await import('../../utils/supabase');
    
    // Mock the API response for expired timer
    (supabase.functions.invoke as any).mockResolvedValue({
      data: {
        timeRemaining: 0,
        phaseDuration: 60,
        phase: 'drawing'
      },
      error: null
    });

    const { result } = renderHook(() => 
      useSimpleTimer({ gameId: 'test-game-123' })
    );

    await waitFor(() => {
      expect(result.current.timeRemaining).toBe(0);
      expect(result.current.isExpired).toBe(true);
      expect(result.current.redirectMessage).toBe('You will be redirected shortly...');
      expect(result.current.formattedTime).toBe('00:00');
    });
  });

  it('should return non-expired state when timer has time remaining', async () => {
    const { supabase } = await import('../../utils/supabase');
    
    // Mock the API response for active timer
    (supabase.functions.invoke as any).mockResolvedValue({
      data: {
        timeRemaining: 30,
        phaseDuration: 60,
        phase: 'drawing'
      },
      error: null
    });

    const { result } = renderHook(() => 
      useSimpleTimer({ gameId: 'test-game-123' })
    );

    await waitFor(() => {
      expect(result.current.timeRemaining).toBe(30);
      expect(result.current.isExpired).toBe(false);
      expect(result.current.redirectMessage).toBe('You will be redirected shortly...');
      expect(result.current.formattedTime).toBe('00:30');
    });
  });

  it('should return expired state for negative time remaining', async () => {
    const { supabase } = await import('../../utils/supabase');
    
    // Mock the API response for negative timer (shouldn't happen but test edge case)
    (supabase.functions.invoke as any).mockResolvedValue({
      data: {
        timeRemaining: -5,
        phaseDuration: 60,
        phase: 'drawing'
      },
      error: null
    });

    const { result } = renderHook(() => 
      useSimpleTimer({ gameId: 'test-game-123' })
    );

    await waitFor(() => {
      expect(result.current.timeRemaining).toBe(-5);
      expect(result.current.isExpired).toBe(true);
      expect(result.current.redirectMessage).toBe('You will be redirected shortly...');
      expect(result.current.formattedTime).toBe('--:--'); // formatTime handles negative values
    });
  });
});
