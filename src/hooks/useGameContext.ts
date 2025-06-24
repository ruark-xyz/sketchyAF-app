// Custom Game Context Hooks
// Convenient hooks for accessing game state and actions

import { useMemo } from 'react';
import { useGame } from '../context/GameContext';
import {
  GamePhase,
  PlayerStatus,
  canPlayerPerformAction,
  getPhaseDisplayName,
  getPlayerStatusDisplayName
} from '../types/gameContext';
import { GameActions } from '../types/gameContext';
import { PlayerStateManager, createPlayerStateManager, getPlayerDisplayStatus } from '../utils/playerStateManager';
import { useAuth } from '../context/AuthContext';

/**
 * Game Phase Hook - Access to current phase and loading state
 */
export function useGamePhase(): [GamePhase, boolean] {
  const { gamePhase, isLoading } = useGame();
  return [gamePhase, isLoading];
}

/**
 * Game Timer Hook - Access to timer information
 */
export function useGameTimer(): {
  timeRemaining: number | null;
  totalDuration: number | null;
  phase: GamePhase | null;
  isActive: boolean;
  progress: number; // 0-100 percentage
  formattedTime: string;
} {
  const { currentTimer, timerDuration, timerPhase } = useGame();
  
  const isActive = currentTimer !== null && currentTimer > 0;
  const progress = useMemo(() => {
    if (!currentTimer || !timerDuration || timerDuration === 0) return 0;
    return Math.max(0, Math.min(100, ((timerDuration - currentTimer) / timerDuration) * 100));
  }, [currentTimer, timerDuration]);

  const formattedTime = useMemo(() => {
    if (!currentTimer) return '--:--';
    const minutes = Math.floor(currentTimer / 60);
    const seconds = currentTimer % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [currentTimer]);

  return {
    timeRemaining: currentTimer,
    totalDuration: timerDuration,
    phase: timerPhase,
    isActive,
    progress,
    formattedTime
  };
}

/**
 * Player Actions Hook - Access to player-specific actions
 */
export function usePlayerActions(): Pick<GameActions, 'setPlayerReady' | 'selectBoosterPack'> & {
  canSetReady: boolean;
  canSelectBoosterPack: boolean;
} {
  const { actions, gamePhase, playerStatus } = useGame();
  
  const canSetReady = canPlayerPerformAction('ready', gamePhase, playerStatus);
  const canSelectBoosterPack = gamePhase === GamePhase.WAITING;

  return {
    setPlayerReady: actions.setPlayerReady,
    selectBoosterPack: actions.selectBoosterPack,
    canSetReady,
    canSelectBoosterPack
  };
}

/**
 * Game Actions Hook - Access to game flow actions
 */
export function useGameActions(): Pick<GameActions, 'submitDrawing' | 'castVote'> & {
  canSubmitDrawing: boolean;
  canCastVote: boolean;
} {
  const { actions, gamePhase, playerStatus, hasSubmitted, hasVoted } = useGame();
  
  const canSubmitDrawing = canPlayerPerformAction('submit', gamePhase, playerStatus) && !hasSubmitted;
  const canCastVote = canPlayerPerformAction('vote', gamePhase, playerStatus) && !hasVoted;

  return {
    submitDrawing: actions.submitDrawing,
    castVote: actions.castVote,
    canSubmitDrawing,
    canCastVote
  };
}

/**
 * Game State Hook - Access to current game state information
 */
export function useGameState(): {
  isInGame: boolean;
  gamePhase: GamePhase;
  playerStatus: PlayerStatus;
  phaseDisplayName: string;
  statusDisplayName: string;
  isReady: boolean;
  hasSubmitted: boolean;
  hasVoted: boolean;
  selectedBoosterPack: string | null;
  participantCount: number;
  submissionCount: number;
  voteCount: number;
} {
  const { 
    isInGame, 
    gamePhase, 
    playerStatus, 
    isReady, 
    hasSubmitted, 
    hasVoted, 
    selectedBoosterPack,
    participants,
    submissions,
    votes
  } = useGame();

  const phaseDisplayName = getPhaseDisplayName(gamePhase);
  const statusDisplayName = getPlayerStatusDisplayName(playerStatus);

  return {
    isInGame,
    gamePhase,
    playerStatus,
    phaseDisplayName,
    statusDisplayName,
    isReady,
    hasSubmitted,
    hasVoted,
    selectedBoosterPack,
    participantCount: participants.length,
    submissionCount: submissions.length,
    voteCount: votes.length
  };
}

/**
 * Game Connection Hook - Access to connection state
 */
export function useGameConnection(): {
  isConnected: boolean;
  connectionStatus: string;
  error: string | null;
  clearError: () => void;
} {
  const { connectionStatus, error, actions } = useGame();
  
  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    error,
    clearError: actions.clearError
  };
}

/**
 * Game Data Hook - Access to game data collections
 */
export function useGameData(): {
  currentGame: any;
  participants: any[];
  submissions: any[];
  votes: any[];
  results: any;
  refreshGameState: () => Promise<void>;
} {
  const { currentGame, participants, submissions, votes, results, actions } = useGame();
  
  return {
    currentGame,
    participants,
    submissions,
    votes,
    results,
    refreshGameState: actions.refreshGameState
  };
}

/**
 * Game Management Hook - Access to game management actions
 */
export function useGameManagement(): {
  joinGame: (gameId: string) => Promise<void>;
  leaveGame: () => Promise<void>;
  resetGameState: () => void;
  isLoading: boolean;
} {
  const { actions, isLoading } = useGame();
  
  return {
    joinGame: actions.joinGame,
    leaveGame: actions.leaveGame,
    resetGameState: actions.resetGameState,
    isLoading
  };
}

/**
 * Game Phase Validation Hook - Check what actions are available
 */
export function useGameValidation(): {
  canJoinGame: boolean;
  canSetReady: boolean;
  canSubmitDrawing: boolean;
  canCastVote: boolean;
  canSelectBoosterPack: boolean;
  isWaitingPhase: boolean;
  isBriefingPhase: boolean;
  isDrawingPhase: boolean;
  isVotingPhase: boolean;
  isResultsPhase: boolean;
  isCompletedPhase: boolean;
} {
  const { gamePhase, playerStatus, hasSubmitted, hasVoted } = useGame();
  
  return {
    canJoinGame: canPlayerPerformAction('join', gamePhase, playerStatus),
    canSetReady: canPlayerPerformAction('ready', gamePhase, playerStatus),
    canSubmitDrawing: canPlayerPerformAction('submit', gamePhase, playerStatus) && !hasSubmitted,
    canCastVote: canPlayerPerformAction('vote', gamePhase, playerStatus) && !hasVoted,
    canSelectBoosterPack: gamePhase === GamePhase.WAITING,
    isWaitingPhase: gamePhase === GamePhase.WAITING,
    isBriefingPhase: gamePhase === GamePhase.BRIEFING,
    isDrawingPhase: gamePhase === GamePhase.DRAWING,
    isVotingPhase: gamePhase === GamePhase.VOTING,
    isResultsPhase: gamePhase === GamePhase.RESULTS,
    isCompletedPhase: gamePhase === GamePhase.COMPLETED
  };
}

/**
 * Game Progress Hook - Track game progress and completion
 */
export function useGameProgress(): {
  overallProgress: number; // 0-100 percentage of game completion
  phaseProgress: number; // 0-100 percentage of current phase completion
  participationRate: number; // percentage of players who have participated
  isGameComplete: boolean;
} {
  const { gamePhase, participants, submissions, votes, currentTimer, timerDuration } = useGame();
  
  const phaseProgress = useMemo(() => {
    if (currentTimer !== null && timerDuration !== null && timerDuration > 0) {
      return Math.max(0, Math.min(100, ((timerDuration - currentTimer) / timerDuration) * 100));
    }
    return 0;
  }, [currentTimer, timerDuration]);

  const overallProgress = useMemo(() => {
    const phaseWeights = {
      [GamePhase.WAITING]: 0,
      [GamePhase.BRIEFING]: 10,
      [GamePhase.DRAWING]: 40,
      [GamePhase.VOTING]: 80,
      [GamePhase.RESULTS]: 95,
      [GamePhase.COMPLETED]: 100
    };
    
    const baseProgress = phaseWeights[gamePhase] || 0;
    const phaseContribution = (phaseProgress / 100) * 10; // Each phase contributes up to 10% more
    
    return Math.min(100, baseProgress + phaseContribution);
  }, [gamePhase, phaseProgress]);

  const participationRate = useMemo(() => {
    if (participants.length === 0) return 0;
    
    switch (gamePhase) {
      case GamePhase.DRAWING:
        return (submissions.length / participants.length) * 100;
      case GamePhase.VOTING:
        return (votes.length / participants.length) * 100;
      default:
        return 0;
    }
  }, [gamePhase, participants.length, submissions.length, votes.length]);

  return {
    overallProgress,
    phaseProgress,
    participationRate,
    isGameComplete: gamePhase === GamePhase.COMPLETED
  };
}

/**
 * Player State Management Hook - Advanced player state tracking
 */
export function usePlayerStateManager(): {
  playerStateManager: PlayerStateManager | null;
  currentPlayerState: any;
  allPlayersState: any[];
  readinessSummary: any;
  submissionSummary: any;
  votingSummary: any;
  boosterPackSummary: any;
  canGameStart: any;
  playerActivity: any;
} {
  const { currentUser } = useAuth();
  const gameContext = useGame();

  const playerStateManager = useMemo(() => {
    if (!currentUser) return null;
    return createPlayerStateManager(currentUser.id, gameContext);
  }, [currentUser, gameContext]);

  const currentPlayerState = useMemo(() => {
    return playerStateManager?.getCurrentPlayerState() || null;
  }, [playerStateManager]);

  const allPlayersState = useMemo(() => {
    return playerStateManager?.getAllPlayersState() || [];
  }, [playerStateManager]);

  const readinessSummary = useMemo(() => {
    return playerStateManager?.getReadinessSummary() || null;
  }, [playerStateManager]);

  const submissionSummary = useMemo(() => {
    return playerStateManager?.getSubmissionSummary() || null;
  }, [playerStateManager]);

  const votingSummary = useMemo(() => {
    return playerStateManager?.getVotingSummary() || null;
  }, [playerStateManager]);

  const boosterPackSummary = useMemo(() => {
    return playerStateManager?.getBoosterPackSummary() || null;
  }, [playerStateManager]);

  const canGameStart = useMemo(() => {
    return playerStateManager?.canGameStart() || null;
  }, [playerStateManager]);

  const playerActivity = useMemo(() => {
    return playerStateManager?.getPlayerActivity() || null;
  }, [playerStateManager]);

  return {
    playerStateManager,
    currentPlayerState,
    allPlayersState,
    readinessSummary,
    submissionSummary,
    votingSummary,
    boosterPackSummary,
    canGameStart,
    playerActivity
  };
}
