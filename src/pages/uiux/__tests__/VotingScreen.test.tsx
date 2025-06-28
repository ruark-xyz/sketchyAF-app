import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import VotingScreen from '../VotingScreen';

// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSearchParams: vi.fn(() => [new URLSearchParams('gameId=test-game-123'), vi.fn()]),
    useNavigate: vi.fn(() => vi.fn())
  };
});

// Mock the hooks and services
vi.mock('../../../hooks/useUnifiedGameState', () => ({
  useUnifiedGameState: vi.fn(() => ({
    game: {
      id: 'test-game-123',
      prompt: 'Draw a funny cat',
      status: 'voting',
      game_participants: [
        { user_id: 'user1', users: { username: 'Player1', avatar_url: null }, is_ready: false },
        { user_id: 'user2', users: { username: 'Player2', avatar_url: null }, is_ready: true }
      ]
    },
    isLoading: false,
    error: null
  }))
}));

vi.mock('../../../context/GameContext', () => ({
  useGame: vi.fn(() => ({
    submissions: [
      {
        id: 'submission1',
        user_id: 'user1',
        drawing_url: 'https://example.com/drawing1.png',
        vote_count: 2
      },
      {
        id: 'submission2', 
        user_id: 'user2',
        drawing_url: 'https://example.com/drawing2.png',
        vote_count: 1
      }
    ],
    hasVoted: false,
    votes: [],
    actions: {
      castVote: vi.fn().mockResolvedValue(undefined),
      refreshGameState: vi.fn()
    },
    error: null,
    isLoading: false
  }))
}));

vi.mock('../../../hooks/useSimpleTimer', () => ({
  useSimpleTimer: vi.fn(() => ({
    timeRemaining: 30,
    formattedTime: '0:30',
    isLoading: false,
    error: null
  }))
}));

vi.mock('../../../hooks/useRealtimeGame', () => ({
  useRealtimeGame: vi.fn(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    isConnected: true
  }))
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    currentUser: { id: 'current-user-123' }
  }))
}));

const renderVotingScreen = () => {
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <VotingScreen />
      </MemoryRouter>
    </HelmetProvider>
  );
};

describe('VotingScreen Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render voting screen with game data', async () => {
    renderVotingScreen();

    await waitFor(() => {
      expect(screen.getByText('Vote: "Draw a funny cat"')).toBeInTheDocument();
      expect(screen.getByText('0:30')).toBeInTheDocument();
      expect(screen.getByText('1/2')).toBeInTheDocument(); // voted players count
    });
  });

  it('should display submissions for voting', async () => {
    renderVotingScreen();

    await waitFor(() => {
      // Should show submissions from other players (excluding current user)
      expect(screen.getByText('Player1')).toBeInTheDocument();
      expect(screen.getByText('Player2')).toBeInTheDocument();
    });
  });

  it('should show voting instructions', async () => {
    renderVotingScreen();

    await waitFor(() => {
      expect(screen.getByText('How to Vote')).toBeInTheDocument();
      expect(screen.getByText(/Tap a drawing card to select it/)).toBeInTheDocument();
    });
  });

  it('should handle submission selection', async () => {
    renderVotingScreen();

    await waitFor(() => {
      const submissionCards = screen.getAllByRole('button');
      const firstSubmission = submissionCards.find(card => 
        card.textContent?.includes('Player1')
      );
      
      if (firstSubmission) {
        fireEvent.click(firstSubmission);
        // Should show vote button after selection
        expect(screen.getByText(/Vote for this drawing!/)).toBeInTheDocument();
      }
    });
  });

  it('should show error states properly', async () => {
    const { useGame } = await import('../../../context/GameContext');
    vi.mocked(useGame).mockReturnValue({
      submissions: [],
      hasVoted: false,
      votes: [],
      actions: {
        castVote: vi.fn().mockResolvedValue(undefined),
        refreshGameState: vi.fn()
      },
      error: 'Failed to load submissions',
      isLoading: false
    });

    renderVotingScreen();

    await waitFor(() => {
      expect(screen.getByText('Failed to load submissions')).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    const { useGame } = await import('../../../context/GameContext');
    vi.mocked(useGame).mockReturnValue({
      submissions: [],
      hasVoted: false,
      votes: [],
      actions: {
        castVote: vi.fn().mockResolvedValue(undefined),
        refreshGameState: vi.fn()
      },
      error: null,
      isLoading: true
    });

    renderVotingScreen();

    await waitFor(() => {
      expect(screen.getByText('Loading submissions...')).toBeInTheDocument();
    });
  });
});
