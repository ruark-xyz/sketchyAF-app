// Data Synchronization Tests
// Tests for optimistic updates, conflict resolution, and state reconciliation

import { vi } from 'vitest';
import {
  DataSynchronizationManager,
  createDataSynchronizationManager,
  generateOptimisticId
} from '../dataSynchronization';
import { INITIAL_GAME_STATE } from '../../types/gameContext';
import { GameParticipant, Submission, Vote } from '../../types/game';

describe('DataSynchronizationManager', () => {
  let syncManager: DataSynchronizationManager;

  beforeEach(() => {
    syncManager = createDataSynchronizationManager();
  });

  describe('Optimistic Updates', () => {
    it('should apply optimistic update', () => {
      const updateId = syncManager.applyOptimisticUpdate(
        'player_ready',
        { isReady: true },
        { isReady: false }
      );

      expect(updateId).toBeDefined();
      expect(typeof updateId).toBe('string');

      const pendingUpdates = syncManager.getPendingUpdates();
      expect(pendingUpdates).toHaveLength(1);
      expect(pendingUpdates[0].type).toBe('player_ready');
      expect(pendingUpdates[0].serverConfirmed).toBe(false);
    });

    it('should confirm optimistic update', () => {
      const updateId = syncManager.applyOptimisticUpdate(
        'player_ready',
        { isReady: true }
      );

      const confirmed = syncManager.confirmOptimisticUpdate(updateId);
      expect(confirmed).toBe(true);

      const pendingUpdates = syncManager.getPendingUpdates();
      expect(pendingUpdates[0].serverConfirmed).toBe(true);
    });

    it('should rollback optimistic update', () => {
      const rollbackData = { isReady: false };
      const updateId = syncManager.applyOptimisticUpdate(
        'player_ready',
        { isReady: true },
        rollbackData
      );

      const rolledBack = syncManager.rollbackOptimisticUpdate(updateId);
      expect(rolledBack).toEqual(rollbackData);

      const pendingUpdates = syncManager.getPendingUpdates();
      expect(pendingUpdates).toHaveLength(0);
    });

    it('should clear confirmed updates', () => {
      const updateId1 = syncManager.applyOptimisticUpdate('player_ready', { isReady: true });
      const updateId2 = syncManager.applyOptimisticUpdate('booster_pack_selected', { selectedBoosterPack: 'pack-1' });

      syncManager.confirmOptimisticUpdate(updateId1);

      expect(syncManager.getPendingUpdates()).toHaveLength(2);

      syncManager.clearConfirmedUpdates();

      const remaining = syncManager.getPendingUpdates();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(updateId2);
    });
  });

  describe('State Reconciliation', () => {
    const localState = {
      ...INITIAL_GAME_STATE,
      isReady: true,
      participants: [
        {
          id: 'local-participant',
          game_id: 'test-game',
          user_id: 'user-1',
          joined_at: new Date().toISOString(),
          is_ready: true
        }
      ] as GameParticipant[]
    };

    const serverState = {
      isReady: false,
      participants: [
        {
          id: 'server-participant',
          game_id: 'test-game',
          user_id: 'user-2',
          joined_at: new Date().toISOString(),
          is_ready: false
        }
      ] as GameParticipant[]
    };

    it('should reconcile with server wins strategy', () => {
      const reconciled = syncManager.reconcileState(localState, serverState, 'server_wins');
      
      expect(reconciled.isReady).toBe(false); // Server value
      expect(reconciled.participants).toEqual(serverState.participants);
      expect(reconciled.isLoading).toBe(localState.isLoading); // Preserved local UI state
    });

    it('should reconcile with client wins strategy', () => {
      const reconciled = syncManager.reconcileState(localState, serverState, 'client_wins');

      // Should use server value since there's no pending update for isReady field
      expect(reconciled.isReady).toBe(false); // Server value (no pending update)
      // Participants should also use server value since no pending update
      expect(reconciled.participants).toEqual(serverState.participants);
    });

    it('should reconcile with merge strategy', () => {
      const reconciled = syncManager.reconcileState(localState, serverState, 'merge');
      
      // Should merge participants arrays
      expect(reconciled.participants).toHaveLength(2);
      expect(reconciled.participants.map(p => p.id)).toContain('local-participant');
      expect(reconciled.participants.map(p => p.id)).toContain('server-participant');
    });

    it('should handle merge strategy for submissions', () => {
      const localStateWithSubmissions = {
        ...localState,
        submissions: [
          {
            id: 'local-submission',
            game_id: 'test-game',
            user_id: 'user-1',
            drawing_data: {},
            submitted_at: new Date().toISOString(),
            vote_count: 0,
            is_winner: false
          }
        ] as Submission[]
      };

      const serverStateWithSubmissions = {
        submissions: [
          {
            id: 'server-submission',
            game_id: 'test-game',
            user_id: 'user-2',
            drawing_data: {},
            submitted_at: new Date().toISOString(),
            vote_count: 1,
            is_winner: true
          }
        ] as Submission[]
      };

      const reconciled = syncManager.reconcileState(
        localStateWithSubmissions, 
        serverStateWithSubmissions, 
        'merge'
      );

      expect(reconciled.submissions).toHaveLength(2);
      expect(reconciled.submissions.map(s => s.id)).toContain('local-submission');
      expect(reconciled.submissions.map(s => s.id)).toContain('server-submission');
    });

    it('should handle merge strategy for votes', () => {
      const localStateWithVotes = {
        ...localState,
        votes: [
          {
            id: 'local-vote',
            game_id: 'test-game',
            voter_id: 'user-1',
            submission_id: 'submission-1',
            voted_at: new Date().toISOString()
          }
        ] as Vote[]
      };

      const serverStateWithVotes = {
        votes: [
          {
            id: 'server-vote',
            game_id: 'test-game',
            voter_id: 'user-2',
            submission_id: 'submission-2',
            voted_at: new Date().toISOString()
          }
        ] as Vote[]
      };

      const reconciled = syncManager.reconcileState(
        localStateWithVotes, 
        serverStateWithVotes, 
        'merge'
      );

      expect(reconciled.votes).toHaveLength(2);
      expect(reconciled.votes.map(v => v.id)).toContain('local-vote');
      expect(reconciled.votes.map(v => v.id)).toContain('server-vote');
    });
  });

  describe('Reconnection Handling', () => {
    it('should handle reconnection', async () => {
      const refreshCallback = vi.fn().mockResolvedValue(undefined);

      // Add some pending updates
      syncManager.applyOptimisticUpdate('player_ready', { isReady: true });
      syncManager.applyOptimisticUpdate('booster_pack_selected', { selectedBoosterPack: 'pack-1' });

      await syncManager.handleReconnection(refreshCallback);

      expect(refreshCallback).toHaveBeenCalled();

      const syncStatus = syncManager.getSyncStatus();
      expect(syncStatus.lastSyncTimestamp).toBeGreaterThan(0);
    });

    it('should handle reconnection errors gracefully', async () => {
      const refreshCallback = vi.fn().mockRejectedValue(new Error('Refresh failed'));

      await expect(syncManager.handleReconnection(refreshCallback)).resolves.not.toThrow();

      const syncStatus = syncManager.getSyncStatus();
      expect(syncStatus.syncInProgress).toBe(false);
    });
  });

  describe('Sync Status', () => {
    it('should provide sync status', () => {
      const status = syncManager.getSyncStatus();
      
      expect(status).toHaveProperty('pendingUpdates');
      expect(status).toHaveProperty('lastSyncTimestamp');
      expect(status).toHaveProperty('syncInProgress');
      expect(status).toHaveProperty('isOutOfSync');
      
      expect(status.pendingUpdates).toBe(0);
      expect(status.syncInProgress).toBe(false);
    });

    it('should detect out of sync state', () => {
      // Add pending update
      syncManager.applyOptimisticUpdate('player_ready', { isReady: true });
      
      const status = syncManager.getSyncStatus();
      expect(status.isOutOfSync).toBe(true);
      expect(status.pendingUpdates).toBe(1);
    });
  });

  describe('Reset', () => {
    it('should reset synchronization state', () => {
      // Add some state
      syncManager.applyOptimisticUpdate('player_ready', { isReady: true });
      
      expect(syncManager.getPendingUpdates()).toHaveLength(1);
      
      syncManager.reset();
      
      expect(syncManager.getPendingUpdates()).toHaveLength(0);
      
      const status = syncManager.getSyncStatus();
      expect(status.pendingUpdates).toBe(0);
      expect(status.lastSyncTimestamp).toBe(0);
    });
  });

  describe('Pending Update Field Tracking', () => {
    it('should track fields with pending updates', () => {
      // Apply update for isReady field
      syncManager.applyOptimisticUpdate('player_ready', { isReady: true });
      
      // Test reconciliation with client wins strategy
      const localState = { ...INITIAL_GAME_STATE, isReady: true };
      const serverState = { isReady: false };
      
      const reconciled = syncManager.reconcileState(localState, serverState, 'client_wins');
      
      // Should keep local value since there's a pending update
      expect(reconciled.isReady).toBe(true);
    });
  });
});

describe('Utility Functions', () => {
  it('should create data synchronization manager', () => {
    const manager = createDataSynchronizationManager();
    expect(manager).toBeInstanceOf(DataSynchronizationManager);
  });

  it('should generate optimistic IDs', () => {
    const id1 = generateOptimisticId();
    const id2 = generateOptimisticId('test');
    
    expect(id1).toMatch(/^opt_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^test_\d+_[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });
});
