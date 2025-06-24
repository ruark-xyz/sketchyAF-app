// Game Context Hooks Tests
// Tests for custom game context hooks

import React from 'react';
import { renderHook } from '@testing-library/react';
import {
  useGamePhase,
  useGameTimer,
  usePlayerActions,
  useGameActions,
  useGameState,
  useGameConnection,
  useGameValidation,
  useGameProgress
} from '../useGameContext';
import { GameProvider, useGame } from '../../context/GameContext';
import { AuthProvider } from '../../context/AuthContext';
import { GamePhase, PlayerStatus } from '../../types/gameContext';

import { vi } from 'vitest';

// Mock dependencies
vi.mock('../useRealtimeGame', () => ({
  useRealtimeGame: () => ({
    isConnected: true,
    connectionStatus: 'connected',
    activeGameId: 'test-game-id',
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
    getGame: vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: 'test-game-id',
        status: 'waiting',
        participants: [],
        round_duration: 60,
        voting_duration: 30
      }
    })
  }
}));

vi.mock('../../services/SubmissionService', () => ({
  SubmissionService: {
    getGameSubmissions: vi.fn().mockResolvedValue({ success: true, data: [] }),
    getUserSubmission: vi.fn().mockResolvedValue({ success: true, data: null })
  }
}));

vi.mock('../../services/VotingService', () => ({
  VotingService: {
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

vi.mock('../../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthContext
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <GameProvider>
      {children}
    </GameProvider>
  </AuthProvider>
);

describe('useGame Hook', () => {
  it('should provide game context', () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    
    expect(result.current).toHaveProperty('gamePhase');
    expect(result.current).toHaveProperty('playerStatus');
    expect(result.current).toHaveProperty('actions');
    expect(result.current.gamePhase).toBe(GamePhase.WAITING);
    expect(result.current.playerStatus).toBe('idle');
  });

  it('should provide all required actions', () => {
    const { result } = renderHook(() => useGame(), { wrapper });
    
    expect(result.current.actions).toHaveProperty('joinGame');
    expect(result.current.actions).toHaveProperty('leaveGame');
    expect(result.current.actions).toHaveProperty('setPlayerReady');
    expect(result.current.actions).toHaveProperty('selectBoosterPack');
    expect(result.current.actions).toHaveProperty('submitDrawing');
    expect(result.current.actions).toHaveProperty('castVote');
    expect(result.current.actions).toHaveProperty('refreshGameState');
    expect(result.current.actions).toHaveProperty('clearError');
    expect(result.current.actions).toHaveProperty('resetGameState');
  });
});

describe('useGamePhase Hook', () => {
  it('should return current phase and loading state', () => {
    const { result } = renderHook(() => useGamePhase(), { wrapper });
    
    const [gamePhase, isLoading] = result.current;
    expect(gamePhase).toBe(GamePhase.WAITING);
    expect(isLoading).toBe(false);
  });
});

describe('useGameTimer Hook', () => {
  it('should return timer information', () => {
    const { result } = renderHook(() => useGameTimer(), { wrapper });
    
    expect(result.current).toHaveProperty('timeRemaining');
    expect(result.current).toHaveProperty('totalDuration');
    expect(result.current).toHaveProperty('phase');
    expect(result.current).toHaveProperty('isActive');
    expect(result.current).toHaveProperty('progress');
    expect(result.current).toHaveProperty('formattedTime');
    
    expect(result.current.timeRemaining).toBe(null);
    expect(result.current.isActive).toBe(false);
    expect(result.current.formattedTime).toBe('--:--');
  });

  it('should format time correctly', () => {
    // This would require mocking the game context to have a timer
    // For now, we test the default state
    const { result } = renderHook(() => useGameTimer(), { wrapper });
    expect(result.current.formattedTime).toBe('--:--');
  });
});

describe('usePlayerActions Hook', () => {
  it('should return player actions and permissions', () => {
    const { result } = renderHook(() => usePlayerActions(), { wrapper });
    
    expect(result.current).toHaveProperty('setPlayerReady');
    expect(result.current).toHaveProperty('selectBoosterPack');
    expect(result.current).toHaveProperty('canSetReady');
    expect(result.current).toHaveProperty('canSelectBoosterPack');
    
    expect(typeof result.current.setPlayerReady).toBe('function');
    expect(typeof result.current.selectBoosterPack).toBe('function');
    expect(result.current.canSetReady).toBe(false); // Not in lobby
    expect(result.current.canSelectBoosterPack).toBe(true); // In waiting phase
  });
});

describe('useGameActions Hook', () => {
  it('should return game actions and permissions', () => {
    const { result } = renderHook(() => useGameActions(), { wrapper });
    
    expect(result.current).toHaveProperty('submitDrawing');
    expect(result.current).toHaveProperty('castVote');
    expect(result.current).toHaveProperty('canSubmitDrawing');
    expect(result.current).toHaveProperty('canCastVote');
    
    expect(typeof result.current.submitDrawing).toBe('function');
    expect(typeof result.current.castVote).toBe('function');
    expect(result.current.canSubmitDrawing).toBe(false); // Not in drawing phase
    expect(result.current.canCastVote).toBe(false); // Not in voting phase
  });
});

describe('useGameState Hook', () => {
  it('should return comprehensive game state information', () => {
    const { result } = renderHook(() => useGameState(), { wrapper });
    
    expect(result.current).toHaveProperty('isInGame');
    expect(result.current).toHaveProperty('gamePhase');
    expect(result.current).toHaveProperty('playerStatus');
    expect(result.current).toHaveProperty('phaseDisplayName');
    expect(result.current).toHaveProperty('statusDisplayName');
    expect(result.current).toHaveProperty('participantCount');
    expect(result.current).toHaveProperty('submissionCount');
    expect(result.current).toHaveProperty('voteCount');
    
    expect(result.current.isInGame).toBe(false);
    expect(result.current.gamePhase).toBe(GamePhase.WAITING);
    expect(result.current.playerStatus).toBe('idle');
    expect(result.current.phaseDisplayName).toBe('Waiting for Players');
    expect(result.current.statusDisplayName).toBe('Not in Game');
    expect(result.current.participantCount).toBe(0);
    expect(result.current.submissionCount).toBe(0);
    expect(result.current.voteCount).toBe(0);
  });
});

describe('useGameConnection Hook', () => {
  it('should return connection state', () => {
    const { result } = renderHook(() => useGameConnection(), { wrapper });
    
    expect(result.current).toHaveProperty('isConnected');
    expect(result.current).toHaveProperty('connectionStatus');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('clearError');
    
    expect(result.current.isConnected).toBe(true);
    expect(result.current.connectionStatus).toBe('connected');
    expect(result.current.error).toBe(null);
    expect(typeof result.current.clearError).toBe('function');
  });
});

describe('useGameValidation Hook', () => {
  it('should return validation states for all actions', () => {
    const { result } = renderHook(() => useGameValidation(), { wrapper });
    
    expect(result.current).toHaveProperty('canJoinGame');
    expect(result.current).toHaveProperty('canSetReady');
    expect(result.current).toHaveProperty('canSubmitDrawing');
    expect(result.current).toHaveProperty('canCastVote');
    expect(result.current).toHaveProperty('canSelectBoosterPack');
    
    // Phase checks
    expect(result.current).toHaveProperty('isWaitingPhase');
    expect(result.current).toHaveProperty('isBriefingPhase');
    expect(result.current).toHaveProperty('isDrawingPhase');
    expect(result.current).toHaveProperty('isVotingPhase');
    expect(result.current).toHaveProperty('isResultsPhase');
    expect(result.current).toHaveProperty('isCompletedPhase');
    
    expect(result.current.canJoinGame).toBe(true); // In waiting phase
    expect(result.current.isWaitingPhase).toBe(true);
    expect(result.current.isDrawingPhase).toBe(false);
  });
});

describe('useGameProgress Hook', () => {
  it('should return progress information', () => {
    const { result } = renderHook(() => useGameProgress(), { wrapper });
    
    expect(result.current).toHaveProperty('overallProgress');
    expect(result.current).toHaveProperty('phaseProgress');
    expect(result.current).toHaveProperty('participationRate');
    expect(result.current).toHaveProperty('isGameComplete');
    
    expect(result.current.overallProgress).toBe(0); // Waiting phase
    expect(result.current.phaseProgress).toBe(0); // No timer
    expect(result.current.participationRate).toBe(0); // No participants
    expect(result.current.isGameComplete).toBe(false);
  });
});

describe('Hook Error Handling', () => {
  it('should throw error when hooks are used outside provider', () => {
    // Suppress console.error for these tests
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useGame());
    }).toThrow('useGame must be used within a GameProvider');

    expect(() => {
      renderHook(() => useGamePhase());
    }).toThrow('useGame must be used within a GameProvider');

    expect(() => {
      renderHook(() => useGameTimer());
    }).toThrow('useGame must be used within a GameProvider');

    consoleSpy.mockRestore();
  });
});
