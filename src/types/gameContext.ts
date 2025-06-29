// Game Context Types
// TypeScript definitions for the GameContext state management system

import {
  Game,
  GameParticipant,
  Submission,
  Vote,
  GameResults,
  GameStatus
} from './game';

// Extended participant type with user details
export interface GameParticipantWithUser extends GameParticipant {
  username: string;
  avatar_url?: string;
}
import { ConnectionStatus } from './realtime';

// Game Phase Enum (extending GameStatus for context-specific phases)
export enum GamePhase {
  WAITING = 'waiting',
  BRIEFING = 'briefing', 
  DRAWING = 'drawing',
  VOTING = 'voting',
  RESULTS = 'results',
  COMPLETED = 'completed'
}

// Player Status in Game Context
export type PlayerStatus = 
  | 'idle'           // Not in any game
  | 'joining'        // In process of joining a game
  | 'in_lobby'       // In game lobby, waiting for others
  | 'ready'          // Ready to start game
  | 'in_game'        // Actively participating in game
  | 'spectating'     // Watching game as spectator
  | 'disconnected';  // Temporarily disconnected

// Game State Interface
export interface GameState {
  // Current Game
  currentGame: Game | null;
  gamePhase: GamePhase;
  isInGame: boolean;
  
  // Player State
  playerStatus: PlayerStatus;
  isReady: boolean;
  selectedBoosterPack: string | null; // asset_directory_name
  hasSubmitted: boolean;
  hasVoted: boolean;
  
  // Game Data
  participants: GameParticipantWithUser[];
  submissions: Submission[];
  votes: Vote[];
  results: GameResults | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  
  // Timer State
  currentTimer: number | null;
  timerDuration: number | null;
  timerPhase: GamePhase | null;
}

// Game Actions Interface
export interface GameActions {
  // Game Management
  joinGame: (gameId: string) => Promise<void>;
  leaveGame: () => Promise<void>;
  setPlayerReady: (ready: boolean) => Promise<void>;
  selectBoosterPack: (packId: string | null) => Promise<void>;
  
  // Game Flow
  submitDrawing: (drawingData: any, drawingUrl: string) => Promise<void>;
  castVote: (submissionId: string) => Promise<void>;
  
  // State Management
  refreshGameState: (gameId?: string) => Promise<void>;
  clearError: () => void;
  resetGameState: () => void;
}

// GameContext Type
export interface GameContextType extends GameState {
  actions: GameActions;
}

// Phase Transition Rules
export interface PhaseTransition {
  from: GamePhase;
  to: GamePhase;
  condition: (state: GameState) => boolean;
  action?: (state: GameState) => Promise<void>;
}

// State Machine Configuration
export const PHASE_TRANSITIONS: PhaseTransition[] = [
  {
    from: GamePhase.WAITING,
    to: GamePhase.BRIEFING,
    condition: (state) => state.participants.every(p => p.is_ready) && state.participants.length >= 2
  },
  {
    from: GamePhase.BRIEFING,
    to: GamePhase.DRAWING,
    condition: (state) => (state.currentTimer || 0) <= 0
  },
  {
    from: GamePhase.DRAWING,
    to: GamePhase.VOTING,
    condition: (state) => (state.currentTimer || 0) <= 0 || state.submissions.length === state.participants.length
  },
  {
    from: GamePhase.VOTING,
    to: GamePhase.COMPLETED,
    condition: (state) => state.votes.length === state.participants.length || (state.currentTimer || 0) <= 0
  }
];

// Game Context Events for internal state management
export type GameContextEvent = 
  | 'GAME_JOINED'
  | 'GAME_LEFT'
  | 'PLAYER_READY_CHANGED'
  | 'BOOSTER_PACK_SELECTED'
  | 'DRAWING_SUBMITTED'
  | 'VOTE_CAST'
  | 'PHASE_CHANGED'
  | 'TIMER_UPDATED'
  | 'ERROR_OCCURRED'
  | 'STATE_REFRESHED';

// Initial State
export const INITIAL_GAME_STATE: GameState = {
  // Current Game
  currentGame: null,
  gamePhase: GamePhase.WAITING,
  isInGame: false,
  
  // Player State
  playerStatus: 'idle',
  isReady: false,
  selectedBoosterPack: null,
  hasSubmitted: false,
  hasVoted: false,
  
  // Game Data
  participants: [],
  submissions: [],
  votes: [],
  results: null,
  
  // UI State
  isLoading: false,
  error: null,
  connectionStatus: 'disconnected',
  
  // Timer State
  currentTimer: null,
  timerDuration: null,
  timerPhase: null,
};

// Action Types for Reducer Pattern
export type GameContextAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'SET_CURRENT_GAME'; payload: Game | null }
  | { type: 'SET_GAME_PHASE'; payload: GamePhase }
  | { type: 'SET_PLAYER_STATUS'; payload: PlayerStatus }
  | { type: 'SET_PLAYER_READY'; payload: boolean }
  | { type: 'SET_SELECTED_BOOSTER_PACK'; payload: string | null }
  | { type: 'SET_HAS_SUBMITTED'; payload: boolean }
  | { type: 'SET_HAS_VOTED'; payload: boolean }
  | { type: 'SET_PARTICIPANTS'; payload: GameParticipantWithUser[] }
  | { type: 'SET_SUBMISSIONS'; payload: Submission[] }
  | { type: 'SET_VOTES'; payload: Vote[] }
  | { type: 'SET_RESULTS'; payload: GameResults | null }
  | { type: 'SET_TIMER'; payload: { timer: number | null; duration: number | null; phase: GamePhase | null } }
  | { type: 'RESET_STATE' };

// Utility Types
export type GamePhaseTransition = {
  from: GamePhase;
  to: GamePhase;
  timestamp: number;
  triggeredBy?: 'timer' | 'condition' | 'manual';
};

export type GameStateSnapshot = {
  gameId: string;
  phase: GamePhase;
  participants: number;
  submissions: number;
  votes: number;
  timestamp: number;
};

// Validation Functions
export const isValidPhaseTransition = (from: GamePhase, to: GamePhase): boolean => {
  const validTransitions: Record<GamePhase, GamePhase[]> = {
    [GamePhase.WAITING]: [GamePhase.BRIEFING],
    [GamePhase.BRIEFING]: [GamePhase.DRAWING],
    [GamePhase.DRAWING]: [GamePhase.VOTING],
    [GamePhase.VOTING]: [GamePhase.RESULTS],
    [GamePhase.RESULTS]: [GamePhase.COMPLETED],
    [GamePhase.COMPLETED]: []
  };

  return validTransitions[from]?.includes(to) || false;
};

export const canPlayerPerformAction = (
  action: 'join' | 'ready' | 'submit' | 'vote',
  gamePhase: GamePhase,
  playerStatus: PlayerStatus
): boolean => {
  switch (action) {
    case 'join':
      return gamePhase === GamePhase.WAITING;
    case 'ready':
      return gamePhase === GamePhase.WAITING && playerStatus === 'in_lobby';
    case 'submit':
      return gamePhase === GamePhase.DRAWING && playerStatus === 'in_game';
    case 'vote':
      return gamePhase === GamePhase.VOTING && playerStatus === 'in_game';
    default:
      return false;
  }
};

export const getPhaseDisplayName = (phase: GamePhase): string => {
  const displayNames: Record<GamePhase, string> = {
    [GamePhase.WAITING]: 'Waiting for Players',
    [GamePhase.BRIEFING]: 'Pre-Round Briefing',
    [GamePhase.DRAWING]: 'Drawing Phase',
    [GamePhase.VOTING]: 'Voting Phase',
    [GamePhase.RESULTS]: 'Results',
    [GamePhase.COMPLETED]: 'Game Complete'
  };

  return displayNames[phase] || phase;
};

export const getPlayerStatusDisplayName = (status: PlayerStatus): string => {
  const displayNames: Record<PlayerStatus, string> = {
    idle: 'Not in Game',
    joining: 'Joining Game...',
    in_lobby: 'In Lobby',
    ready: 'Ready',
    in_game: 'In Game',
    spectating: 'Spectating',
    disconnected: 'Disconnected'
  };

  return displayNames[status] || status;
};
