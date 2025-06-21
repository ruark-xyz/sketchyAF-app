// Game State Management Integration Tests
// End-to-end tests for the complete game state management system

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameProvider, useGame } from '../context/GameContext';
import { AuthProvider } from '../context/AuthContext';
import { GamePhase } from '../types/gameContext';

import { vi } from 'vitest';

// Mock all external dependencies
vi.mock('../hooks/useRealtimeGame', () => ({
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

vi.mock('../services/GameService', () => ({
  GameService: {
    joinGame: vi.fn().mockResolvedValue({ success: true }),
    leaveGame: vi.fn().mockResolvedValue({ success: true }),
    updateReadyStatus: vi.fn().mockResolvedValue({ success: true }),
    getGame: vi.fn().mockResolvedValue({ success: false, error: 'Game not found' }),
    transitionGameStatus: vi.fn().mockResolvedValue({ success: true })
  }
}));

// Import the mocked service
import { GameService } from '../services/GameService';
const mockGameService = vi.mocked(GameService);

vi.mock('../services/SubmissionService', () => ({
  SubmissionService: {
    submitDrawing: vi.fn().mockResolvedValue({ success: true }),
    getGameSubmissions: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getUserSubmission: vi.fn().mockResolvedValue({ success: true, data: null })
  }
}));

vi.mock('../services/VotingService', () => ({
  VotingService: {
    castVote: vi.fn().mockResolvedValue({ success: true }),
    getGameVotes: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getUserVote: vi.fn().mockResolvedValue({ success: true, data: null })
  }
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

vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext
}));

// Integration test component
const GameIntegrationTest: React.FC = () => {
  const {
    gamePhase,
    playerStatus,
    isInGame,
    isReady,
    isLoading,
    error,
    currentGame,
    participants,
    connectionStatus,
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
      <div data-testid="connection-status">{connectionStatus}</div>
      <div data-testid="current-game">{currentGame?.id || 'no-game'}</div>
      <div data-testid="participant-count">{participants.length}</div>
      
      <button
        data-testid="join-game-btn"
        onClick={() => actions.joinGame('test-game-id').catch(() => {})}
        disabled={isLoading}
      >
        Join Game
      </button>

      <button
        data-testid="set-ready-btn"
        onClick={() => actions.setPlayerReady(true).catch(() => {})}
        disabled={isLoading || !isInGame}
      >
        Set Ready
      </button>

      <button
        data-testid="select-pack-btn"
        onClick={() => actions.selectBoosterPack('test-pack').catch(() => {})}
        disabled={isLoading}
      >
        Select Pack
      </button>

      <button
        data-testid="leave-game-btn"
        onClick={() => actions.leaveGame().catch(() => {})}
        disabled={isLoading || !isInGame}
      >
        Leave Game
      </button>

      <button
        data-testid="refresh-btn"
        onClick={() => actions.refreshGameState().catch(() => {})}
        disabled={isLoading}
      >
        Refresh
      </button>
    </div>
  );
};

const renderIntegrationTest = () => {
  return render(
    <AuthProvider>
      <GameProvider>
        <GameIntegrationTest />
      </GameProvider>
    </AuthProvider>
  );
};

describe('Game State Management Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State and Setup', () => {
    it('should initialize with correct default state', () => {
      renderIntegrationTest();
      
      expect(screen.getByTestId('game-phase')).toHaveTextContent('waiting');
      expect(screen.getByTestId('player-status')).toHaveTextContent('idle');
      expect(screen.getByTestId('is-in-game')).toHaveTextContent('false');
      expect(screen.getByTestId('is-ready')).toHaveTextContent('false');
      expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
      expect(screen.getByTestId('current-game')).toHaveTextContent('no-game');
      expect(screen.getByTestId('participant-count')).toHaveTextContent('0');
    });

    it('should have all action buttons available', () => {
      renderIntegrationTest();
      
      expect(screen.getByTestId('join-game-btn')).toBeInTheDocument();
      expect(screen.getByTestId('set-ready-btn')).toBeInTheDocument();
      expect(screen.getByTestId('select-pack-btn')).toBeInTheDocument();
      expect(screen.getByTestId('leave-game-btn')).toBeInTheDocument();
      expect(screen.getByTestId('refresh-btn')).toBeInTheDocument();
    });
  });

  describe('Game Flow Integration', () => {
    it('should handle complete game joining flow', async () => {
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
      renderIntegrationTest();

      // Initial state - not in game
      expect(screen.getByTestId('is-in-game')).toHaveTextContent('false');
      expect(screen.getByTestId('set-ready-btn')).toBeDisabled();

      // Join game
      await act(async () => {
        await user.click(screen.getByTestId('join-game-btn'));
      });

      // Should be in game now
      await waitFor(() => {
        expect(screen.getByTestId('player-status')).toHaveTextContent('in_lobby');
        expect(screen.getByTestId('current-game')).toHaveTextContent('test-game-id');
        expect(screen.getByTestId('participant-count')).toHaveTextContent('1');
      });

      // Ready button should be enabled now
      expect(screen.getByTestId('set-ready-btn')).not.toBeDisabled();

      // Set ready
      await act(async () => {
        await user.click(screen.getByTestId('set-ready-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-ready')).toHaveTextContent('true');
        expect(screen.getByTestId('player-status')).toHaveTextContent('ready');
      });

      // Verify service calls
      expect(mockGameService.joinGame).toHaveBeenCalledWith({
        game_id: 'test-game-id',
        selected_booster_pack: undefined
      });
      expect(mockGameService.updateReadyStatus).toHaveBeenCalledWith('test-game-id', true);
    });

    it('should handle booster pack selection', async () => {
      const user = userEvent.setup();
      renderIntegrationTest();
      
      // Select booster pack
      await act(async () => {
        await user.click(screen.getByTestId('select-pack-btn'));
      });
      
      // Pack selection should work even when not in game
      // (local state update)
      await waitFor(() => {
        // This would be reflected in the game state
        expect(screen.getByTestId('error')).toHaveTextContent('no-error');
      });
    });

    it('should handle leaving game', async () => {
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
      renderIntegrationTest();

      // First join a game
      await act(async () => {
        await user.click(screen.getByTestId('join-game-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-in-game')).toHaveTextContent('true');
      });

      // Then leave
      await act(async () => {
        await user.click(screen.getByTestId('leave-game-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('player-status')).toHaveTextContent('idle');
        expect(screen.getByTestId('is-in-game')).toHaveTextContent('false');
        expect(screen.getByTestId('current-game')).toHaveTextContent('no-game');
      });

      expect(mockGameService.leaveGame).toHaveBeenCalledWith('test-game-id');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle service errors gracefully', async () => {
      // Mock a service failure
      mockGameService.joinGame.mockResolvedValueOnce({
        success: false,
        error: 'Game is full'
      });

      const user = userEvent.setup();
      renderIntegrationTest();

      await act(async () => {
        await user.click(screen.getByTestId('join-game-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
      });
    });

    it('should handle network errors with retry logic', async () => {
      // Mock network error
      mockGameService.joinGame
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: true });

      const user = userEvent.setup();
      renderIntegrationTest();

      await act(async () => {
        await user.click(screen.getByTestId('join-game-btn'));
      });

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
      });
    });
  });

  describe('Loading States Integration', () => {
    it('should show loading states during operations', async () => {
      // Mock delayed response
      mockGameService.joinGame.mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const user = userEvent.setup();
      renderIntegrationTest();

      // Start the async operation but don't await it
      const clickPromise = user.click(screen.getByTestId('join-game-btn'));

      // Should show loading immediately and buttons should be disabled
      await waitFor(() => {
        expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
        expect(screen.getByTestId('join-game-btn')).toBeDisabled();
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

  describe('State Synchronization Integration', () => {
    it('should refresh game state', async () => {
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
      renderIntegrationTest();

      // Join game first
      await act(async () => {
        await user.click(screen.getByTestId('join-game-btn'));
      });

      // Refresh state
      await act(async () => {
        await user.click(screen.getByTestId('refresh-btn'));
      });

      await waitFor(() => {
        expect(mockGameService.getGame).toHaveBeenCalledWith('test-game-id');
      });
    });
  });
});
