// GameContext Tests
// Comprehensive tests for the GameContext provider and hooks

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameProvider, useGame } from '../GameContext';
import { AuthProvider } from '../AuthContext';
import { GamePhase, PlayerStatus } from '../../types/gameContext';

import { vi } from 'vitest';

// Mock dependencies
vi.mock('../../hooks/useRealtimeGame', () => ({
  useRealtimeGame: () => ({
    isConnected: false,
    connectionStatus: 'disconnected',
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

vi.mock('../../services/GameService', () => ({
  GameService: {
    joinGame: vi.fn().mockResolvedValue({ success: true }),
    leaveGame: vi.fn().mockResolvedValue({ success: true }),
    updateReadyStatus: vi.fn().mockResolvedValue({ success: true }),
    getGame: vi.fn().mockResolvedValue({ success: false, error: 'Game not found' }),
    transitionGameStatus: vi.fn().mockResolvedValue({ success: true })
  }
}));

// Import the mocked service
import { GameService } from '../../services/GameService';
const mockGameService = vi.mocked(GameService);

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

// Mock AuthContext
const mockAuthContext = {
  currentUser: { id: 'test-user-id', email: 'test@example.com', username: 'testuser' },
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
    actions
  } = useGame();

  return (
    <div>
      <div data-testid="game-phase">{gamePhase}</div>
      <div data-testid="player-status">{playerStatus}</div>
      <div data-testid="is-in-game">{isInGame.toString()}</div>
      <div data-testid="is-ready">{isReady.toString()}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="error">{error || 'no-error'}</div>
      
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
    </div>
  );
};

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
      mockGameService.getGame.mockResolvedValueOnce({
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

      // Should show loading state during join
      await waitFor(() => {
        expect(screen.getByTestId('player-status')).toHaveTextContent('in_lobby');
      });

      // Verify that the service was called
      expect(mockGameService.joinGame).toHaveBeenCalledWith({
        game_id: 'test-game-id',
        selected_booster_pack: undefined
      });
    });

    it('should handle setting player ready status', async () => {
      // Mock successful game fetch after joining
      mockGameService.getGame.mockResolvedValue({
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

      // First join a game
      await act(async () => {
        await user.click(screen.getByTestId('join-game-btn'));
      });

      // Then set ready
      await act(async () => {
        await user.click(screen.getByTestId('set-ready-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-ready')).toHaveTextContent('true');
        expect(screen.getByTestId('player-status')).toHaveTextContent('ready');
      });
    });

    it('should handle leaving a game', async () => {
      // Mock successful game fetch after joining
      mockGameService.getGame.mockResolvedValueOnce({
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

      // First join a game
      await act(async () => {
        await user.click(screen.getByTestId('join-game-btn'));
      });

      // Then leave
      await act(async () => {
        await user.click(screen.getByTestId('leave-game-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('player-status')).toHaveTextContent('idle');
        expect(screen.getByTestId('is-in-game')).toHaveTextContent('false');
      });
    });

    it('should handle clearing errors', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TestComponent />);
      
      // Simulate an error by trying to set ready without being in a game
      await act(async () => {
        await user.click(screen.getByTestId('set-ready-btn'));
      });
      
      // Clear the error
      await act(async () => {
        await user.click(screen.getByTestId('clear-error-btn'));
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('no-error');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Mock service failure
      mockGameService.joinGame.mockResolvedValueOnce({ success: false, error: 'Game is full' });

      const user = userEvent.setup();
      renderWithProviders(<TestComponent />);

      await act(async () => {
        await user.click(screen.getByTestId('join-game-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during async operations', async () => {
      // Mock delayed response
      mockGameService.joinGame.mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const user = userEvent.setup();
      renderWithProviders(<TestComponent />);

      // Start the async operation but don't await it
      const clickPromise = user.click(screen.getByTestId('join-game-btn'));

      // Should show loading immediately
      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
      });

      // Wait for the operation to complete
      await act(async () => {
        await clickPromise;
      });

      // Should stop loading after operation completes
      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      });
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
