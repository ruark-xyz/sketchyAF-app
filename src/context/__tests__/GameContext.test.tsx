// Unit Tests for GameContext
// Tests game context provider and useGame hook

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { GameProvider, useGame } from '../GameContext';
import { AuthProvider } from '../AuthContext';

// Mock dependencies
const mockUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com'
};

vi.mock('../AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    currentUser: mockUser,
    isLoggedIn: true
  })
}));

// Create mock functions that can be overridden in tests
const mockCreateGame = vi.fn().mockResolvedValue({
  success: true,
  data: {
    id: 'game-123',
    prompt: 'Test prompt',
    status: 'waiting',
    created_by: 'user-123',
    round_duration: 180,
    voting_duration: 30,
    max_players: 4
  }
});

const mockJoinGame = vi.fn().mockResolvedValue({ success: true });
const mockLeaveGame = vi.fn().mockResolvedValue({ success: true });
const mockGetGameById = vi.fn().mockResolvedValue({
  success: true,
  data: {
    game: {
      id: 'game-123',
      status: 'waiting',
      created_by: 'user-123',
      prompt: 'Test prompt',
      round_duration: 180
    },
    participants: []
  }
});
const mockTransitionGameStatus = vi.fn().mockResolvedValue({ success: true });
const mockSubmitDrawing = vi.fn().mockResolvedValue({
  success: true,
  data: { id: 'submission-123' }
});

vi.mock('../../services/UnifiedGameService', () => ({
  UnifiedGameService: {
    getInstance: () => ({
      initialize: vi.fn().mockResolvedValue({ success: true }),
      createGame: mockCreateGame,
      joinGame: mockJoinGame,
      leaveGame: mockLeaveGame,
      getGameById: mockGetGameById,
      transitionGameStatus: mockTransitionGameStatus,
      submitDrawing: mockSubmitDrawing
    })
  }
}));

vi.mock('../../services/DrawingExportService', () => ({
  DrawingExportService: {
    getInstance: () => ({
      exportToImage: vi.fn().mockResolvedValue({
        success: true,
        data: new Blob(['mock-image'], { type: 'image/png' })
      }),
      uploadToStorage: vi.fn().mockResolvedValue({
        success: true,
        data: { url: 'https://example.com/image.png' }
      }),
      extractMetadata: vi.fn().mockReturnValue({
        elementCount: 1,
        complexity: 'low',
        drawingTime: 60,
        canvasWidth: 800,
        canvasHeight: 600,
        fileSize: 1024,
        format: 'png',
        assetsUsed: []
      })
    })
  }
}));

vi.mock('../../hooks/useRealtimeGame', () => ({
  useRealtimeGame: () => ({
    initializeRealtime: vi.fn().mockResolvedValue({ success: true }),
    joinGame: vi.fn().mockResolvedValue({ success: true }),
    leaveGame: vi.fn().mockResolvedValue({ success: true }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    isConnected: true
  })
}));

vi.mock('../../services/BoosterPackAnalyticsService', () => ({
  boosterPackAnalyticsService: {
    trackBoosterPackUsage: vi.fn().mockResolvedValue({ success: true })
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <GameProvider>
      {children}
    </GameProvider>
  </AuthProvider>
);

describe('GameContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  describe('useGame Hook', () => {
    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useGame());
      }).toThrow('useGame must be used within a GameProvider');
    });

    it('should provide game context when used within provider', () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      expect(result.current).toBeDefined();
      expect(result.current.createGame).toBeDefined();
      expect(result.current.joinGame).toBeDefined();
      expect(result.current.leaveGame).toBeDefined();
      expect(result.current.submitDrawing).toBeDefined();
    });
  });

  describe('Game Management', () => {
    it('should create game successfully', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createGame('Test prompt', {
          maxPlayers: 4,
          roundDuration: 60
        });
      });

      expect(createResult?.success).toBe(true);
      expect(result.current.currentGame).toBeDefined();
      expect(result.current.currentGame?.id).toBe('game-123');
    });

    it('should join game successfully', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      let joinResult: any;
      await act(async () => {
        joinResult = await result.current.joinGame('game-123', 'booster-pack-1');
      });

      expect(joinResult?.success).toBe(true);
    });

    it('should leave game successfully', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      // First join a game
      await act(async () => {
        await result.current.joinGame('game-123');
      });

      // Then leave it
      let leaveResult: any;
      await act(async () => {
        leaveResult = await result.current.leaveGame();
      });

      expect(leaveResult?.success).toBe(true);
      expect(result.current.currentGame).toBeNull();
    });

    it('should transition game status', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      // First create a game
      await act(async () => {
        await result.current.createGame('Test prompt');
      });

      // Then transition status
      let transitionResult: any;
      await act(async () => {
        transitionResult = await result.current.transitionGameStatus('drawing');
      });

      expect(transitionResult?.success).toBe(true);
    });
  });

  describe('Drawing Session', () => {
    it('should initialize drawing session', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      // First create a game to set up the context
      await act(async () => {
        await result.current.createGame('Test prompt');
      });

      // Transition to drawing phase which should initialize the drawing session
      await act(async () => {
        await result.current.transitionGameStatus('drawing');
      });

      expect(result.current.drawingContext).toBeDefined();
      expect(result.current.drawingContext?.gameId).toBe('game-123');
      expect(result.current.drawingContext?.isDrawingPhase).toBe(true);
    });

    it('should submit drawing successfully', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      // Initialize drawing session first
      await act(async () => {
        await result.current.createGame('Test prompt');
      });

      // Manually initialize drawing session to ensure it's set up
      await act(async () => {
        await result.current.initializeDrawingSession('game-123');
      });

      expect(result.current.drawingContext).toBeDefined();

      const mockDrawingData = {
        elements: [{ id: 'element-1', type: 'rectangle' }],
        appState: { width: 800, height: 600 }
      };

      let submitResult: any;
      await act(async () => {
        submitResult = await result.current.submitDrawing(mockDrawingData);
      });

      expect(submitResult?.success).toBe(true);
      expect(result.current.drawingContext?.hasSubmitted).toBe(true);
    });

    it('should handle empty drawing submission', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      await act(async () => {
        await result.current.createGame('Test prompt');
      });

      // Manually initialize drawing session
      await act(async () => {
        await result.current.initializeDrawingSession('game-123');
      });

      const emptyDrawingData = {
        elements: [],
        appState: {}
      };

      let submitResult: any;
      await act(async () => {
        submitResult = await result.current.submitDrawing(emptyDrawingData);
      });

      expect(submitResult?.success).toBe(false);
      expect(submitResult?.error).toContain('Drawing is empty');
    });

    it('should prevent double submission', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      await act(async () => {
        await result.current.createGame('Test prompt');
      });

      // Manually initialize drawing session
      await act(async () => {
        await result.current.initializeDrawingSession('game-123');
      });

      const mockDrawingData = {
        elements: [{ id: 'element-1', type: 'rectangle' }],
        appState: { width: 800, height: 600 }
      };

      // First submission
      await act(async () => {
        await result.current.submitDrawing(mockDrawingData);
      });

      // Second submission should fail
      let secondSubmitResult: any;
      await act(async () => {
        secondSubmitResult = await result.current.submitDrawing(mockDrawingData);
      });

      expect(secondSubmitResult?.success).toBe(false);
      expect(secondSubmitResult?.error).toContain('Drawing already submitted');
    });
  });

  describe('Drawing Progress', () => {
    it('should save drawing progress', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      await act(async () => {
        await result.current.createGame('Test prompt');
      });

      const mockDrawingData = {
        elements: [{ id: 'element-1', type: 'rectangle' }],
        appState: {}
      };

      await act(async () => {
        await result.current.saveDrawingProgress(mockDrawingData);
      });

      // Should save to localStorage (mocked)
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should load drawing progress', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      await act(async () => {
        await result.current.createGame('Test prompt');
      });

      // Mock localStorage.getItem with proper validation data
      const mockData = JSON.stringify({
        elements: [{ id: 'element-1', type: 'rectangle' }],
        gameId: 'game-123', // Must match the game ID from mock
        userId: 'user-123', // Must match the user ID from mock
        timestamp: Date.now()
      });
      vi.spyOn(localStorage, 'getItem').mockReturnValue(mockData);

      let loadedData: any;
      await act(async () => {
        loadedData = await result.current.loadDrawingProgress();
      });

      expect(loadedData).toBeDefined();
      expect(loadedData?.elements).toHaveLength(1);
      expect(loadedData?.gameId).toBe('game-123');
      expect(loadedData?.userId).toBe('user-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Override the mock to return an error for this test
      mockCreateGame.mockResolvedValueOnce({
        success: false,
        error: 'Service error',
        code: 'SERVICE_ERROR'
      });

      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      let createResult: any;
      await act(async () => {
        createResult = await result.current.createGame('Test prompt');
      });

      expect(createResult?.success).toBe(false);
      expect(result.current.error).toBe('Service error');
    });

    it('should clear errors', async () => {
      // Override the mock to return an error for this test
      mockCreateGame.mockResolvedValueOnce({
        success: false,
        error: 'Test error',
        code: 'TEST_ERROR'
      });

      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      // Create an error state
      await act(async () => {
        await result.current.createGame('Test prompt');
      });

      expect(result.current.error).toBe('Test error');

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Game State', () => {
    it('should track game host status', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      await act(async () => {
        await result.current.createGame('Test prompt');
      });

      expect(result.current.isGameHost).toBe(true);
    });

    it('should track participant status', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      await act(async () => {
        await result.current.joinGame('game-123');
      });

      // Would be true if user is in participants list
      expect(result.current.isParticipant).toBeDefined();
    });

    it('should track loading state', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      expect(result.current.isLoading).toBe(false);

      // Loading state should be true during operations
      const createPromise = act(async () => {
        await result.current.createGame('Test prompt');
      });

      await createPromise;
      expect(result.current.isLoading).toBe(false);
    });
  });
});
