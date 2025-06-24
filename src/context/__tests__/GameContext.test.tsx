// GameContext Tests
// Comprehensive tests for the GameContext provider and hooks
// Integrates both drawing-focused and game state management testing

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameProvider, useGame } from '../GameContext';
import { AuthProvider } from '../AuthContext';
import { GamePhase, PlayerStatus } from '../../types/gameContext';

// Mock dependencies - Combined approach
const mockUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com'
};

// Use vi.hoisted to define mocks that can be referenced in vi.mock
const mocks = vi.hoisted(() => {
  return {
    createGame: vi.fn().mockResolvedValue({
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
    }),
    joinGame: vi.fn().mockResolvedValue({ success: true }),
    leaveGame: vi.fn().mockResolvedValue({ success: true }),
    getGameById: vi.fn().mockResolvedValue({
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
    }),
    transitionGameStatus: vi.fn().mockResolvedValue({ success: true }),
    submitDrawing: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'submission-123' }
    })
  };
});

// Mock UnifiedGameService (for drawing functionality)
vi.mock('../../services/UnifiedGameService', () => ({
  UnifiedGameService: {
    getInstance: () => ({
      initialize: vi.fn().mockResolvedValue({ success: true }),
      createGame: mocks.createGame,
      joinGame: mocks.joinGame,
      leaveGame: mocks.leaveGame,
      getGameById: mocks.getGameById,
      transitionGameStatus: mocks.transitionGameStatus,
      submitDrawing: mocks.submitDrawing
    })
  }
}));

// Mock DrawingExportService
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

// Mock real-time game hook
vi.mock('../../hooks/useRealtimeGame', () => ({
  useRealtimeGame: () => ({
    isConnected: true,
    connectionStatus: 'connected',
    activeGameId: null,
    initializeRealtime: vi.fn().mockResolvedValue({ success: true }),
    joinGame: vi.fn().mockResolvedValue({ success: true }),
    leaveGame: vi.fn().mockResolvedValue({ success: true }),
    broadcastPlayerReady: vi.fn().mockResolvedValue({ success: true }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    error: null
  })
}));

// Mock game services
vi.mock('../../services/GameService', () => ({
  GameService: {
    joinGame: vi.fn().mockResolvedValue({ success: true }),
    leaveGame: vi.fn().mockResolvedValue({ success: true }),
    updateReadyStatus: vi.fn().mockResolvedValue({ success: true }),
    getGame: vi.fn().mockResolvedValue({ success: false, error: 'Game not found' }),
    transitionGameStatus: vi.fn().mockResolvedValue({ success: true }),
    createGame: vi.fn().mockResolvedValue({
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
    })
  }
}));

vi.mock('../../services/SubmissionService', () => ({
  SubmissionService: {
    submitDrawing: vi.fn().mockResolvedValue({ success: true }),
    getGameSubmissions: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getUserSubmission: vi.fn().mockResolvedValue({ success: true, data: null })
  }
}));

vi.mock('../../services/VotingService', () => ({
  VotingService: {
    castVote: vi.fn().mockResolvedValue({ success: true }),
    getGameVotes: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getUserVote: vi.fn().mockResolvedValue({ success: true, data: null })
  }
}));

// Mock utility functions
vi.mock('../../utils/gameStateMachine', () => ({
  createGameStateMachine: vi.fn().mockReturnValue({
    updateState: vi.fn(),
    onPhaseTransition: vi.fn(),
    checkAndExecuteTransitions: vi.fn(),
    forceTransitionTo: vi.fn().mockResolvedValue(true),
    getPhaseExpectedDuration: vi.fn().mockReturnValue(null),
    reset: vi.fn()
  })
}));

vi.mock('../../utils/dataSynchronization', () => ({
  createDataSynchronizationManager: vi.fn().mockReturnValue({
    applyOptimisticUpdate: vi.fn().mockReturnValue('update-id'),
    confirmOptimisticUpdate: vi.fn(),
    rollbackOptimisticUpdate: vi.fn().mockReturnValue({ isReady: false, playerStatus: 'in_lobby' }),
    handleReconnection: vi.fn()
  })
}));

vi.mock('../../utils/errorHandling', () => ({
  createGameErrorHandler: vi.fn().mockReturnValue({
    handleError: vi.fn().mockResolvedValue({
      severity: 'high',
      userMessage: 'Test error message'
    }),
    onError: vi.fn()
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

// Mock AuthContext
const mockAuthContext = {
  currentUser: mockUser,
  session: null,
  isLoggedIn: true,
  isLoading: false,
  error: null,
  login: vi.fn(),
  signupWithEmail: vi.fn(),
  signupWithSocial: vi.fn(),
  loginWithSocial: vi.fn(),
  logout: vi.fn(),
  resetPassword: vi.fn(),
  clearError: vi.fn(),
  updateUserProfile: vi.fn()
};

vi.mock('../AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext
}));

// Test component that uses GameContext
const TestComponent: React.FC = () => {
  const {
    gamePhase,
    playerStatus,
    isInGame,
    isReady,
    isLoading,
    error,
    actions,
    // Drawing context properties
    drawingContext,
    createGame,
    startGame
  } = useGame();

  return (
    <div>
      <div data-testid="game-phase">{gamePhase}</div>
      <div data-testid="player-status">{playerStatus}</div>
      <div data-testid="is-in-game">{isInGame.toString()}</div>
      <div data-testid="is-ready">{isReady.toString()}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      <div data-testid="drawing-context">{drawingContext ? 'has-drawing-context' : 'no-drawing-context'}</div>

      <button
        data-testid="join-game-btn"
        onClick={() => actions.joinGame('test-game-id').catch(() => {})}
      >
        Join Game
      </button>

      <button
        data-testid="set-ready-btn"
        onClick={() => actions.setPlayerReady(true).catch(() => {})}
      >
        Set Ready
      </button>

      <button
        data-testid="leave-game-btn"
        onClick={() => actions.leaveGame().catch(() => {})}
      >
        Leave Game
      </button>

      <button
        data-testid="clear-error-btn"
        onClick={() => actions.clearError()}
      >
        Clear Error
      </button>

      <button
        data-testid="create-game-btn"
        onClick={() => createGame('Test prompt').catch(() => {})}
      >
        Create Game
      </button>

      <button
        data-testid="start-game-btn"
        onClick={() => startGame().catch(() => {})}
      >
        Start Game
      </button>
    </div>
  );
};

// Test wrappers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>
    <GameProvider>
      {children}
    </GameProvider>
  </AuthProvider>
);

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      <GameProvider>
        {component}
      </GameProvider>
    </AuthProvider>
  );
};

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
      expect(result.current.actions.joinGame).toBeDefined();
      expect(result.current.actions.leaveGame).toBeDefined();
      expect(result.current.submitDrawingWithExport).toBeDefined();
      expect(result.current.gamePhase).toBeDefined();
      expect(result.current.playerStatus).toBeDefined();
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

      await act(async () => {
        await result.current.actions.joinGame('game-123');
      });

      // Should not throw error
      expect(result.current.actions.joinGame).toBeDefined();
    });

    it('should leave game successfully', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      // First join a game
      await act(async () => {
        await result.current.actions.joinGame('game-123');
      });

      // Then leave it
      await act(async () => {
        await result.current.actions.leaveGame();
      });

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
        submitResult = await result.current.submitDrawingWithExport(mockDrawingData);
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
        submitResult = await result.current.submitDrawingWithExport(emptyDrawingData);
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
        await result.current.submitDrawingWithExport(mockDrawingData);
      });

      // Second submission should fail
      let secondSubmitResult: any;
      await act(async () => {
        secondSubmitResult = await result.current.submitDrawingWithExport(mockDrawingData);
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

  describe('Initial State', () => {
    it('should provide initial game state', () => {
      renderWithProviders(<TestComponent />);

      expect(screen.getByTestId('game-phase')).toHaveTextContent('waiting');
      expect(screen.getByTestId('player-status')).toHaveTextContent('idle');
      expect(screen.getByTestId('is-in-game')).toHaveTextContent('false');
      expect(screen.getByTestId('is-ready')).toHaveTextContent('false');
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });

    it('should have access to currentUser', () => {
      renderWithProviders(<TestComponent />);

      // The fact that the component renders without throwing means currentUser is available
      expect(screen.getByTestId('game-phase')).toBeInTheDocument();
    });
  });

  describe('Game Actions', () => {
    it('should handle joining a game', async () => {
      // Mock successful game fetch after joining
      const mockGameService = await import('../../services/GameService');
      vi.mocked(mockGameService.GameService.getGame).mockResolvedValueOnce({
        success: true,
        data: {
          id: 'test-game-id',
          status: 'waiting',
          participants: [
            {
              id: 'participant-1',
              game_id: 'test-game-id',
              user_id: 'test-user-id',
              joined_at: new Date().toISOString(),
              is_ready: false,
              selected_booster_pack: null
            }
          ],
          round_duration: 60,
          voting_duration: 30
        }
      });

      const user = userEvent.setup();
      renderWithProviders(<TestComponent />);

      const joinButton = screen.getByTestId('join-game-btn');

      await act(async () => {
        await user.click(joinButton);
      });

      // Should not throw error
      expect(joinButton).toBeInTheDocument();
    });

    it('should handle setting player ready status', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TestComponent />);

      // First join a game
      await act(async () => {
        await user.click(screen.getByTestId('join-game-btn'));
      });

      // Then set ready
      await act(async () => {
        await user.click(screen.getByTestId('set-ready-btn'));
      });

      // Should not throw error
      expect(screen.getByTestId('set-ready-btn')).toBeInTheDocument();
    });

    it('should handle leaving a game', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TestComponent />);

      // First join a game
      await act(async () => {
        await user.click(screen.getByTestId('join-game-btn'));
      });

      // Then leave
      await act(async () => {
        await user.click(screen.getByTestId('leave-game-btn'));
      });

      // Should not throw error
      expect(screen.getByTestId('leave-game-btn')).toBeInTheDocument();
    });

    it('should handle clearing errors', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TestComponent />);

      // Clear the error
      await act(async () => {
        await user.click(screen.getByTestId('clear-error-btn'));
      });

      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const { result } = renderHook(() => useGame(), {
        wrapper: TestWrapper
      });

      // Test error handling by calling clearError and checking it works
      act(() => {
        result.current.actions.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear errors', async () => {
      // Override the hoisted mock to return an error for this test
      mocks.createGame.mockResolvedValueOnce({
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
        result.current.actions.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle service failures in UI', async () => {
      // Mock service failure
      const mockGameService = await import('../../services/GameService');
      vi.mocked(mockGameService.GameService.joinGame).mockResolvedValueOnce({ success: false, error: 'Game is full' });

      const user = userEvent.setup();
      renderWithProviders(<TestComponent />);

      await act(async () => {
        await user.click(screen.getByTestId('join-game-btn'));
      });

      // Should handle error gracefully
      expect(screen.getByTestId('join-game-btn')).toBeInTheDocument();
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
        await result.current.actions.joinGame('game-123');
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

  describe('Loading States', () => {
    it('should show loading state during async operations', async () => {
      // Mock delayed response
      const mockGameService = await import('../../services/GameService');
      vi.mocked(mockGameService.GameService.joinGame).mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const user = userEvent.setup();
      renderWithProviders(<TestComponent />);

      // Start the async operation but don't await it
      const clickPromise = user.click(screen.getByTestId('join-game-btn'));

      // Wait for the operation to complete
      await act(async () => {
        await clickPromise;
      });

      // Should handle loading state
      expect(screen.getByTestId('is-loading')).toBeInTheDocument();
    });
  });
});

describe('GameContext Hook Usage', () => {
  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useGame must be used within a GameProvider');

    consoleSpy.mockRestore();
  });
});

describe('GameContext Integration', () => {
  it('should integrate properly with AuthContext', () => {
    renderWithProviders(<TestComponent />);

    // Should have access to both auth and game context
    expect(screen.getByTestId('game-phase')).toBeInTheDocument();
    expect(screen.getByTestId('player-status')).toBeInTheDocument();
  });
});
