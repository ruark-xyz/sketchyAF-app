// Game State Machine
// Handles game phase transitions, validation, and lifecycle management

import { 
  GamePhase, 
  GameState, 
  PhaseTransition, 
  PHASE_TRANSITIONS,
  isValidPhaseTransition,
  GamePhaseTransition
} from '../types/gameContext';
import { GameService } from '../services/GameService';
import { GameStatus } from '../types/game';

// State Machine Class
export class GameStateMachine {
  private currentState: GameState;
  private transitionHistory: GamePhaseTransition[] = [];
  private transitionCallbacks: Map<GamePhase, ((state: GameState) => Promise<void>)[]> = new Map();

  constructor(initialState: GameState) {
    this.currentState = { ...initialState };
  }

  /**
   * Get current game state
   */
  getCurrentState(): GameState {
    return { ...this.currentState };
  }

  /**
   * Update current state
   */
  updateState(newState: Partial<GameState>): void {
    this.currentState = { ...this.currentState, ...newState };
  }

  /**
   * Check if a phase transition is valid
   */
  canTransitionTo(targetPhase: GamePhase): boolean {
    return isValidPhaseTransition(this.currentState.gamePhase, targetPhase);
  }

  /**
   * Get available transitions from current phase
   */
  getAvailableTransitions(): GamePhase[] {
    return PHASE_TRANSITIONS
      .filter(transition => transition.from === this.currentState.gamePhase)
      .map(transition => transition.to);
  }

  /**
   * Check if transition conditions are met
   */
  checkTransitionConditions(targetPhase: GamePhase): boolean {
    const transition = PHASE_TRANSITIONS.find(
      t => t.from === this.currentState.gamePhase && t.to === targetPhase
    );

    if (!transition) {
      return false;
    }

    return transition.condition(this.currentState);
  }

  /**
   * Execute phase transition
   */
  async transitionTo(
    targetPhase: GamePhase, 
    triggeredBy: 'timer' | 'condition' | 'manual' = 'manual'
  ): Promise<boolean> {
    // Validate transition
    if (!this.canTransitionTo(targetPhase)) {
      console.warn(`Invalid transition from ${this.currentState.gamePhase} to ${targetPhase}`);
      return false;
    }

    // Check conditions
    if (!this.checkTransitionConditions(targetPhase)) {
      console.warn(`Transition conditions not met for ${this.currentState.gamePhase} -> ${targetPhase}`);
      return false;
    }

    const previousPhase = this.currentState.gamePhase;

    try {
      // Find transition configuration
      const transition = PHASE_TRANSITIONS.find(
        t => t.from === previousPhase && t.to === targetPhase
      );

      // Execute transition action if defined
      if (transition?.action) {
        await transition.action(this.currentState);
      }

      // Update database if we have a current game
      if (this.currentState.currentGame) {
        const result = await GameService.transitionGameStatus(
          this.currentState.currentGame.id,
          targetPhase as GameStatus,
          previousPhase as GameStatus
        );

        if (!result.success) {
          console.error('Failed to update game status in database:', result.error);
          return false;
        }
      }

      // Update local state
      this.currentState.gamePhase = targetPhase;

      // Record transition
      const transitionRecord: GamePhaseTransition = {
        from: previousPhase,
        to: targetPhase,
        timestamp: Date.now(),
        triggeredBy
      };
      this.transitionHistory.push(transitionRecord);

      // Execute callbacks
      await this.executeTransitionCallbacks(targetPhase);

      console.log(`Game phase transitioned: ${previousPhase} -> ${targetPhase} (${triggeredBy})`);
      return true;

    } catch (error) {
      console.error('Error during phase transition:', error);
      return false;
    }
  }

  /**
   * Auto-check and execute transitions based on current state
   */
  async checkAndExecuteTransitions(): Promise<boolean> {
    const availableTransitions = this.getAvailableTransitions();
    
    for (const targetPhase of availableTransitions) {
      if (this.checkTransitionConditions(targetPhase)) {
        return await this.transitionTo(targetPhase, 'condition');
      }
    }

    return false;
  }

  /**
   * Register callback for phase transitions
   */
  onPhaseTransition(phase: GamePhase, callback: (state: GameState) => Promise<void>): void {
    if (!this.transitionCallbacks.has(phase)) {
      this.transitionCallbacks.set(phase, []);
    }
    this.transitionCallbacks.get(phase)!.push(callback);
  }

  /**
   * Execute callbacks for a specific phase
   */
  private async executeTransitionCallbacks(phase: GamePhase): Promise<void> {
    const callbacks = this.transitionCallbacks.get(phase) || [];
    
    for (const callback of callbacks) {
      try {
        await callback(this.currentState);
      } catch (error) {
        console.error(`Error executing transition callback for phase ${phase}:`, error);
      }
    }
  }

  /**
   * Get transition history
   */
  getTransitionHistory(): GamePhaseTransition[] {
    return [...this.transitionHistory];
  }

  /**
   * Reset state machine
   */
  reset(newState: GameState): void {
    this.currentState = { ...newState };
    this.transitionHistory = [];
    this.transitionCallbacks.clear();
  }

  /**
   * Get time remaining for current phase (if applicable)
   */
  getPhaseTimeRemaining(): number | null {
    if (!this.currentState.currentGame || !this.currentState.currentTimer) {
      return null;
    }

    return this.currentState.currentTimer;
  }

  /**
   * Check if game is in a timed phase
   */
  isTimedPhase(): boolean {
    return [GamePhase.BRIEFING, GamePhase.DRAWING, GamePhase.VOTING, GamePhase.RESULTS]
      .includes(this.currentState.gamePhase);
  }

  /**
   * Get expected duration for current phase
   */
  getPhaseExpectedDuration(): number | null {
    if (!this.currentState.currentGame) {
      return null;
    }

    const game = this.currentState.currentGame;
    
    switch (this.currentState.gamePhase) {
      case GamePhase.BRIEFING:
        return 20; // 20 seconds briefing
      case GamePhase.DRAWING:
        return game.round_duration;
      case GamePhase.VOTING:
        return game.voting_duration;
      case GamePhase.RESULTS:
        return 15; // 15 seconds to show results
      default:
        return null;
    }
  }

  /**
   * Force transition (bypass conditions - use with caution)
   */
  async forceTransitionTo(targetPhase: GamePhase): Promise<boolean> {
    if (!this.canTransitionTo(targetPhase)) {
      console.warn(`Cannot force invalid transition from ${this.currentState.gamePhase} to ${targetPhase}`);
      return false;
    }

    const previousPhase = this.currentState.gamePhase;

    try {
      // Update database if we have a current game
      if (this.currentState.currentGame) {
        const result = await GameService.transitionGameStatus(
          this.currentState.currentGame.id,
          targetPhase as GameStatus,
          previousPhase as GameStatus
        );

        if (!result.success) {
          console.error('Failed to update game status in database:', result.error);
          return false;
        }
      }

      // Update local state
      this.currentState.gamePhase = targetPhase;

      // Record transition
      const transitionRecord: GamePhaseTransition = {
        from: previousPhase,
        to: targetPhase,
        timestamp: Date.now(),
        triggeredBy: 'manual'
      };
      this.transitionHistory.push(transitionRecord);

      // Execute callbacks
      await this.executeTransitionCallbacks(targetPhase);

      console.log(`Game phase force transitioned: ${previousPhase} -> ${targetPhase}`);
      return true;

    } catch (error) {
      console.error('Error during forced phase transition:', error);
      return false;
    }
  }
}

// Utility functions for state machine
export const createGameStateMachine = (initialState: GameState): GameStateMachine => {
  return new GameStateMachine(initialState);
};

export const getNextPhase = (currentPhase: GamePhase): GamePhase | null => {
  const transition = PHASE_TRANSITIONS.find(t => t.from === currentPhase);
  return transition?.to || null;
};

export const getPreviousPhase = (currentPhase: GamePhase): GamePhase | null => {
  const transition = PHASE_TRANSITIONS.find(t => t.to === currentPhase);
  return transition?.from || null;
};

export const isTerminalPhase = (phase: GamePhase): boolean => {
  return phase === GamePhase.COMPLETED;
};

export const isActiveGamePhase = (phase: GamePhase): boolean => {
  return [GamePhase.DRAWING, GamePhase.VOTING].includes(phase);
};
