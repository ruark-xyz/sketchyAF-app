// Player State Manager
// Utilities for managing player state, validation, and transitions

import { 
  PlayerStatus, 
  GamePhase, 
  GameState,
  canPlayerPerformAction 
} from '../types/gameContext';
import { GameParticipant, Submission, Vote } from '../types/game';

// Player State Information
export interface PlayerStateInfo {
  userId: string;
  status: PlayerStatus;
  isReady: boolean;
  selectedBoosterPack: string | null;
  hasSubmitted: boolean;
  hasVoted: boolean;
  joinedAt?: string;
  lastActiveAt: number;
  isCurrentUser: boolean;
}

// Player State Manager Class
export class PlayerStateManager {
  private currentUserId: string;
  private gameState: GameState;

  constructor(currentUserId: string, gameState: GameState) {
    this.currentUserId = currentUserId;
    this.gameState = gameState;
  }

  /**
   * Update game state
   */
  updateGameState(newState: GameState): void {
    this.gameState = newState;
  }

  /**
   * Get current player's state information
   */
  getCurrentPlayerState(): PlayerStateInfo {
    const participant = this.gameState.participants.find(p => p.user_id === this.currentUserId);
    const hasSubmitted = this.gameState.submissions.some(s => s.user_id === this.currentUserId);
    const hasVoted = this.gameState.votes.some(v => v.voter_id === this.currentUserId);

    return {
      userId: this.currentUserId,
      status: this.gameState.playerStatus,
      isReady: this.gameState.isReady,
      selectedBoosterPack: this.gameState.selectedBoosterPack,
      hasSubmitted,
      hasVoted,
      joinedAt: participant?.joined_at,
      lastActiveAt: Date.now(),
      isCurrentUser: true
    };
  }

  /**
   * Get all players' state information
   */
  getAllPlayersState(): PlayerStateInfo[] {
    return this.gameState.participants.map(participant => {
      const hasSubmitted = this.gameState.submissions.some(s => s.user_id === participant.user_id);
      const hasVoted = this.gameState.votes.some(v => v.voter_id === participant.user_id);
      
      return {
        userId: participant.user_id,
        status: this.determinePlayerStatus(participant, hasSubmitted, hasVoted),
        isReady: participant.is_ready,
        selectedBoosterPack: participant.selected_booster_pack || null,
        hasSubmitted,
        hasVoted,
        joinedAt: participant.joined_at,
        lastActiveAt: Date.now(), // Would need real tracking in production
        isCurrentUser: participant.user_id === this.currentUserId
      };
    });
  }

  /**
   * Determine player status based on game state
   */
  private determinePlayerStatus(
    participant: GameParticipant, 
    hasSubmitted: boolean, 
    hasVoted: boolean
  ): PlayerStatus {
    if (participant.left_at) {
      return 'disconnected';
    }

    switch (this.gameState.gamePhase) {
      case GamePhase.WAITING:
        return participant.is_ready ? 'ready' : 'in_lobby';
      case GamePhase.BRIEFING:
      case GamePhase.DRAWING:
      case GamePhase.VOTING:
      case GamePhase.RESULTS:
        return 'in_game';
      case GamePhase.COMPLETED:
        return 'idle';
      default:
        return 'idle';
    }
  }

  /**
   * Check if current player can perform an action
   */
  canCurrentPlayerPerformAction(action: 'join' | 'ready' | 'submit' | 'vote'): boolean {
    return canPlayerPerformAction(action, this.gameState.gamePhase, this.gameState.playerStatus);
  }

  /**
   * Get player readiness summary
   */
  getReadinessSummary(): {
    totalPlayers: number;
    readyPlayers: number;
    readyPercentage: number;
    allReady: boolean;
    readyPlayerIds: string[];
    notReadyPlayerIds: string[];
  } {
    const totalPlayers = this.gameState.participants.length;
    const readyPlayers = this.gameState.participants.filter(p => p.is_ready).length;
    const readyPlayerIds = this.gameState.participants
      .filter(p => p.is_ready)
      .map(p => p.user_id);
    const notReadyPlayerIds = this.gameState.participants
      .filter(p => !p.is_ready)
      .map(p => p.user_id);

    return {
      totalPlayers,
      readyPlayers,
      readyPercentage: totalPlayers > 0 ? (readyPlayers / totalPlayers) * 100 : 0,
      allReady: totalPlayers > 0 && readyPlayers === totalPlayers,
      readyPlayerIds,
      notReadyPlayerIds
    };
  }

  /**
   * Get submission summary
   */
  getSubmissionSummary(): {
    totalPlayers: number;
    submittedPlayers: number;
    submissionPercentage: number;
    allSubmitted: boolean;
    submittedPlayerIds: string[];
    notSubmittedPlayerIds: string[];
  } {
    const totalPlayers = this.gameState.participants.length;
    const submittedPlayers = this.gameState.submissions.length;
    const submittedPlayerIds = this.gameState.submissions.map(s => s.user_id);
    const notSubmittedPlayerIds = this.gameState.participants
      .filter(p => !submittedPlayerIds.includes(p.user_id))
      .map(p => p.user_id);

    return {
      totalPlayers,
      submittedPlayers,
      submissionPercentage: totalPlayers > 0 ? (submittedPlayers / totalPlayers) * 100 : 0,
      allSubmitted: totalPlayers > 0 && submittedPlayers === totalPlayers,
      submittedPlayerIds,
      notSubmittedPlayerIds
    };
  }

  /**
   * Get voting summary
   */
  getVotingSummary(): {
    totalPlayers: number;
    votedPlayers: number;
    votingPercentage: number;
    allVoted: boolean;
    votedPlayerIds: string[];
    notVotedPlayerIds: string[];
  } {
    const totalPlayers = this.gameState.participants.length;
    const votedPlayerIds = [...new Set(this.gameState.votes.map(v => v.voter_id))];
    const votedPlayers = votedPlayerIds.length;
    const notVotedPlayerIds = this.gameState.participants
      .filter(p => !votedPlayerIds.includes(p.user_id))
      .map(p => p.user_id);

    return {
      totalPlayers,
      votedPlayers,
      votingPercentage: totalPlayers > 0 ? (votedPlayers / totalPlayers) * 100 : 0,
      allVoted: totalPlayers > 0 && votedPlayers === totalPlayers,
      votedPlayerIds,
      notVotedPlayerIds
    };
  }

  /**
   * Get booster pack selection summary
   */
  getBoosterPackSummary(): {
    totalPlayers: number;
    playersWithPacks: number;
    selectionPercentage: number;
    allSelected: boolean;
    packSelections: Record<string, string[]>; // pack -> player IDs
    playersWithoutPacks: string[];
  } {
    const totalPlayers = this.gameState.participants.length;
    const playersWithPacks = this.gameState.participants.filter(p => p.selected_booster_pack).length;
    const packSelections: Record<string, string[]> = {};
    const playersWithoutPacks: string[] = [];

    this.gameState.participants.forEach(participant => {
      if (participant.selected_booster_pack) {
        if (!packSelections[participant.selected_booster_pack]) {
          packSelections[participant.selected_booster_pack] = [];
        }
        packSelections[participant.selected_booster_pack].push(participant.user_id);
      } else {
        playersWithoutPacks.push(participant.user_id);
      }
    });

    return {
      totalPlayers,
      playersWithPacks,
      selectionPercentage: totalPlayers > 0 ? (playersWithPacks / totalPlayers) * 100 : 0,
      allSelected: totalPlayers > 0 && playersWithPacks === totalPlayers,
      packSelections,
      playersWithoutPacks
    };
  }

  /**
   * Validate player state transition
   */
  validatePlayerStateTransition(fromStatus: PlayerStatus, toStatus: PlayerStatus): boolean {
    const validTransitions: Record<PlayerStatus, PlayerStatus[]> = {
      idle: ['joining'],
      joining: ['in_lobby', 'idle'],
      in_lobby: ['ready', 'idle'],
      ready: ['in_lobby', 'in_game'],
      in_game: ['spectating', 'disconnected', 'idle'],
      spectating: ['in_game', 'idle'],
      disconnected: ['in_lobby', 'idle']
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }

  /**
   * Get player activity status
   */
  getPlayerActivity(): {
    activePlayers: number;
    inactivePlayers: number;
    disconnectedPlayers: number;
    activityRate: number;
  } {
    const totalPlayers = this.gameState.participants.length;
    const disconnectedPlayers = this.gameState.participants.filter(p => p.left_at).length;
    const activePlayers = totalPlayers - disconnectedPlayers;
    const inactivePlayers = disconnectedPlayers;

    return {
      activePlayers,
      inactivePlayers,
      disconnectedPlayers,
      activityRate: totalPlayers > 0 ? (activePlayers / totalPlayers) * 100 : 0
    };
  }

  /**
   * Check if game can start
   */
  canGameStart(): {
    canStart: boolean;
    reason?: string;
    requirements: {
      minPlayers: boolean;
      allReady: boolean;
      allHavePacks: boolean;
    };
  } {
    const readinessSummary = this.getReadinessSummary();
    const packSummary = this.getBoosterPackSummary();
    const minPlayers = this.gameState.participants.length >= 2;

    const requirements = {
      minPlayers,
      allReady: readinessSummary.allReady,
      allHavePacks: packSummary.allSelected
    };

    let canStart = true;
    let reason: string | undefined;

    if (!requirements.minPlayers) {
      canStart = false;
      reason = 'Need at least 2 players to start';
    } else if (!requirements.allReady) {
      canStart = false;
      reason = 'All players must be ready';
    } else if (!requirements.allHavePacks) {
      canStart = false;
      reason = 'All players must select a booster pack';
    }

    return {
      canStart,
      reason,
      requirements
    };
  }
}

// Utility functions
export const createPlayerStateManager = (currentUserId: string, gameState: GameState): PlayerStateManager => {
  return new PlayerStateManager(currentUserId, gameState);
};

export const getPlayerDisplayStatus = (playerState: PlayerStateInfo, gamePhase: GamePhase): string => {
  if (playerState.status === 'disconnected') {
    return 'Disconnected';
  }

  switch (gamePhase) {
    case GamePhase.WAITING:
      return playerState.isReady ? 'Ready' : 'Not Ready';
    case GamePhase.BRIEFING:
      return 'Listening to Briefing';
    case GamePhase.DRAWING:
      return playerState.hasSubmitted ? 'Drawing Complete' : 'Drawing...';
    case GamePhase.VOTING:
      return playerState.hasVoted ? 'Vote Cast' : 'Voting...';
    case GamePhase.RESULTS:
      return 'Viewing Results';
    case GamePhase.COMPLETED:
      return 'Game Complete';
    default:
      return 'Unknown';
  }
};
