// Game State Machine Tests
// Tests for game phase transitions and state machine logic

import { GameStateMachine, createGameStateMachine } from '../gameStateMachine';
import { GamePhase, INITIAL_GAME_STATE } from '../../types/gameContext';
import { Game, GameParticipant } from '../../types/game';

import { vi } from 'vitest';

// Mock GameService
vi.mock('../../services/GameService', () => ({
  GameService: {
    transitionGameStatus: vi.fn().mockResolvedValue({ success: true })
  }
}));

describe('GameStateMachine', () => {
  let stateMachine: GameStateMachine;
  let mockGame: Game;
  let mockParticipants: GameParticipant[];

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockGame = {
      id: 'test-game-id',
      status: 'waiting',
      prompt: 'Test prompt',
      max_players: 4,
      current_players: 2,
      round_duration: 60,
      voting_duration: 30,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };

    mockParticipants = [
      {
        id: 'participant-1',
        game_id: 'test-game-id',
        user_id: 'user-1',
        joined_at: new Date().toISOString(),
        is_ready: true,
        selected_booster_pack: 'pack-1'
      },
      {
        id: 'participant-2',
        game_id: 'test-game-id',
        user_id: 'user-2',
        joined_at: new Date().toISOString(),
        is_ready: true,
        selected_booster_pack: 'pack-2'
      }
    ];

    const initialState = {
      ...INITIAL_GAME_STATE,
      currentGame: mockGame,
      participants: mockParticipants
    };

    stateMachine = createGameStateMachine(initialState);
  });

  describe('State Machine Creation', () => {
    it('should create state machine with initial state', () => {
      const state = stateMachine.getCurrentState();
      expect(state.gamePhase).toBe(GamePhase.WAITING);
      expect(state.currentGame).toEqual(mockGame);
    });
  });

  describe('Phase Transitions', () => {
    it('should validate valid transitions', () => {
      expect(stateMachine.canTransitionTo(GamePhase.BRIEFING)).toBe(true);
      expect(stateMachine.canTransitionTo(GamePhase.DRAWING)).toBe(false);
      expect(stateMachine.canTransitionTo(GamePhase.COMPLETED)).toBe(false);
    });

    it('should get available transitions', () => {
      const transitions = stateMachine.getAvailableTransitions();
      expect(transitions).toContain(GamePhase.BRIEFING);
      expect(transitions).not.toContain(GamePhase.DRAWING);
    });

    it('should check transition conditions', () => {
      // All players ready, minimum players met
      expect(stateMachine.checkTransitionConditions(GamePhase.BRIEFING)).toBe(true);
      
      // Update state to have unready player
      stateMachine.updateState({
        participants: [
          ...mockParticipants.slice(0, 1),
          { ...mockParticipants[1], is_ready: false }
        ]
      });
      
      expect(stateMachine.checkTransitionConditions(GamePhase.BRIEFING)).toBe(false);
    });

    it('should execute successful transition', async () => {
      const result = await stateMachine.transitionTo(GamePhase.BRIEFING);
      expect(result).toBe(true);
      
      const state = stateMachine.getCurrentState();
      expect(state.gamePhase).toBe(GamePhase.BRIEFING);
    });

    it('should reject invalid transition', async () => {
      const result = await stateMachine.transitionTo(GamePhase.VOTING);
      expect(result).toBe(false);
      
      const state = stateMachine.getCurrentState();
      expect(state.gamePhase).toBe(GamePhase.WAITING);
    });

    it('should record transition history', async () => {
      await stateMachine.transitionTo(GamePhase.BRIEFING);
      
      const history = stateMachine.getTransitionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].from).toBe(GamePhase.WAITING);
      expect(history[0].to).toBe(GamePhase.BRIEFING);
      expect(history[0].triggeredBy).toBe('manual');
    });
  });

  describe('Auto Transitions', () => {
    it('should auto-transition when conditions are met', async () => {
      const result = await stateMachine.checkAndExecuteTransitions();
      expect(result).toBe(true);
      
      const state = stateMachine.getCurrentState();
      expect(state.gamePhase).toBe(GamePhase.BRIEFING);
    });

    it('should not auto-transition when conditions are not met', async () => {
      // Make players not ready
      stateMachine.updateState({
        participants: mockParticipants.map(p => ({ ...p, is_ready: false }))
      });
      
      const result = await stateMachine.checkAndExecuteTransitions();
      expect(result).toBe(false);
      
      const state = stateMachine.getCurrentState();
      expect(state.gamePhase).toBe(GamePhase.WAITING);
    });
  });

  describe('Timer Management', () => {
    beforeEach(async () => {
      // Transition to briefing phase
      await stateMachine.transitionTo(GamePhase.BRIEFING);
    });

    it('should identify timed phases', () => {
      expect(stateMachine.isTimedPhase()).toBe(true);
      
      stateMachine.updateState({ gamePhase: GamePhase.WAITING });
      expect(stateMachine.isTimedPhase()).toBe(false);
    });

    it('should get expected phase duration', () => {
      const duration = stateMachine.getPhaseExpectedDuration();
      expect(duration).toBe(10); // Briefing duration
      
      stateMachine.updateState({ gamePhase: GamePhase.DRAWING });
      const drawingDuration = stateMachine.getPhaseExpectedDuration();
      expect(drawingDuration).toBe(60); // Round duration
    });

    it('should handle timer-based transitions', async () => {
      // Set timer to 0 to trigger transition
      stateMachine.updateState({ currentTimer: 0 });
      
      const result = await stateMachine.checkAndExecuteTransitions();
      expect(result).toBe(true);
      
      const state = stateMachine.getCurrentState();
      expect(state.gamePhase).toBe(GamePhase.DRAWING);
    });
  });

  describe('Force Transitions', () => {
    it('should allow force transition to valid phase', async () => {
      const result = await stateMachine.forceTransitionTo(GamePhase.BRIEFING);
      expect(result).toBe(true);
      
      const state = stateMachine.getCurrentState();
      expect(state.gamePhase).toBe(GamePhase.BRIEFING);
    });

    it('should reject force transition to invalid phase', async () => {
      const result = await stateMachine.forceTransitionTo(GamePhase.COMPLETED);
      expect(result).toBe(false);
      
      const state = stateMachine.getCurrentState();
      expect(state.gamePhase).toBe(GamePhase.WAITING);
    });
  });

  describe('Callbacks', () => {
    it('should execute phase transition callbacks', async () => {
      const callback = vi.fn();
      stateMachine.onPhaseTransition(GamePhase.BRIEFING, callback);

      await stateMachine.transitionTo(GamePhase.BRIEFING);

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        gamePhase: GamePhase.BRIEFING
      }));
    });

    it('should handle callback errors gracefully', async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      stateMachine.onPhaseTransition(GamePhase.BRIEFING, errorCallback);

      // Should not throw error
      await expect(stateMachine.transitionTo(GamePhase.BRIEFING)).resolves.toBe(true);
    });
  });

  describe('State Reset', () => {
    it('should reset state machine', () => {
      stateMachine.updateState({ gamePhase: GamePhase.BRIEFING });
      
      const newState = { ...INITIAL_GAME_STATE };
      stateMachine.reset(newState);
      
      const state = stateMachine.getCurrentState();
      expect(state.gamePhase).toBe(GamePhase.WAITING);
      expect(stateMachine.getTransitionHistory()).toHaveLength(0);
    });
  });

  describe('Complex Game Flow', () => {
    it('should handle complete game flow', async () => {
      // Start in waiting phase
      expect(stateMachine.getCurrentState().gamePhase).toBe(GamePhase.WAITING);
      
      // Transition to briefing
      await stateMachine.transitionTo(GamePhase.BRIEFING);
      expect(stateMachine.getCurrentState().gamePhase).toBe(GamePhase.BRIEFING);
      
      // Transition to drawing
      stateMachine.updateState({ currentTimer: 0 });
      await stateMachine.checkAndExecuteTransitions();
      expect(stateMachine.getCurrentState().gamePhase).toBe(GamePhase.DRAWING);
      
      // Transition to voting (all submissions received)
      stateMachine.updateState({
        submissions: [
          { id: 'sub-1', user_id: 'user-1', game_id: 'test-game-id' },
          { id: 'sub-2', user_id: 'user-2', game_id: 'test-game-id' }
        ] as any
      });
      await stateMachine.checkAndExecuteTransitions();
      expect(stateMachine.getCurrentState().gamePhase).toBe(GamePhase.VOTING);
      
      // Transition to results (all votes cast)
      stateMachine.updateState({
        votes: [
          { id: 'vote-1', voter_id: 'user-1', submission_id: 'sub-2' },
          { id: 'vote-2', voter_id: 'user-2', submission_id: 'sub-1' }
        ] as any
      });
      await stateMachine.checkAndExecuteTransitions();
      expect(stateMachine.getCurrentState().gamePhase).toBe(GamePhase.RESULTS);
      
      // Transition to completed
      stateMachine.updateState({ currentTimer: 0 });
      await stateMachine.checkAndExecuteTransitions();
      expect(stateMachine.getCurrentState().gamePhase).toBe(GamePhase.COMPLETED);
      
      // Verify transition history
      const history = stateMachine.getTransitionHistory();
      expect(history).toHaveLength(5);
      expect(history.map(h => h.to)).toEqual([
        GamePhase.BRIEFING,
        GamePhase.DRAWING,
        GamePhase.VOTING,
        GamePhase.RESULTS,
        GamePhase.COMPLETED
      ]);
    });
  });
});

describe('Utility Functions', () => {
  it('should create game state machine', () => {
    const machine = createGameStateMachine(INITIAL_GAME_STATE);
    expect(machine).toBeInstanceOf(GameStateMachine);
  });
});
