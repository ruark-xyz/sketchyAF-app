// Data Synchronization Utilities
// Handles optimistic updates, conflict resolution, and state reconciliation

import { GameState, GameContextAction } from '../types/gameContext';
import { Game, GameParticipant, Submission, Vote } from '../types/game';

// Optimistic Update Types
export type OptimisticUpdateType = 
  | 'player_ready'
  | 'booster_pack_selected'
  | 'drawing_submitted'
  | 'vote_cast'
  | 'game_joined'
  | 'game_left';

export interface OptimisticUpdate {
  id: string;
  type: OptimisticUpdateType;
  timestamp: number;
  localState: Partial<GameState>;
  serverConfirmed: boolean;
  rollbackData?: any;
}

// Conflict Resolution Strategy
export type ConflictResolutionStrategy = 
  | 'server_wins'      // Server state takes precedence
  | 'client_wins'      // Client state takes precedence
  | 'merge'            // Attempt to merge states
  | 'last_write_wins'; // Most recent timestamp wins

// Data Synchronization Manager
export class DataSynchronizationManager {
  private pendingUpdates: Map<string, OptimisticUpdate> = new Map();
  private lastSyncTimestamp: number = 0;
  private syncInProgress: boolean = false;

  /**
   * Apply optimistic update
   */
  applyOptimisticUpdate(
    updateType: OptimisticUpdateType,
    localChanges: Partial<GameState>,
    rollbackData?: any
  ): string {
    const updateId = `${updateType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const update: OptimisticUpdate = {
      id: updateId,
      type: updateType,
      timestamp: Date.now(),
      localState: localChanges,
      serverConfirmed: false,
      rollbackData
    };

    this.pendingUpdates.set(updateId, update);
    console.log(`Applied optimistic update: ${updateType}`, update);
    
    return updateId;
  }

  /**
   * Confirm optimistic update (when server responds)
   */
  confirmOptimisticUpdate(updateId: string): boolean {
    const update = this.pendingUpdates.get(updateId);
    if (update) {
      update.serverConfirmed = true;
      console.log(`Confirmed optimistic update: ${updateId}`);
      return true;
    }
    return false;
  }

  /**
   * Rollback optimistic update
   */
  rollbackOptimisticUpdate(updateId: string): any {
    const update = this.pendingUpdates.get(updateId);
    if (update) {
      this.pendingUpdates.delete(updateId);
      console.log(`Rolled back optimistic update: ${updateId}`, update.rollbackData);
      return update.rollbackData;
    }
    return null;
  }

  /**
   * Get pending updates
   */
  getPendingUpdates(): OptimisticUpdate[] {
    return Array.from(this.pendingUpdates.values());
  }

  /**
   * Clear confirmed updates
   */
  clearConfirmedUpdates(): void {
    const confirmedUpdates = Array.from(this.pendingUpdates.entries())
      .filter(([_, update]) => update.serverConfirmed);
    
    confirmedUpdates.forEach(([id, _]) => {
      this.pendingUpdates.delete(id);
    });
  }

  /**
   * Reconcile local state with server state
   */
  reconcileState(
    localState: GameState,
    serverState: Partial<GameState>,
    strategy: ConflictResolutionStrategy = 'server_wins'
  ): GameState {
    console.log('Reconciling state with strategy:', strategy);
    
    switch (strategy) {
      case 'server_wins':
        return this.serverWinsReconciliation(localState, serverState);
      
      case 'client_wins':
        return this.clientWinsReconciliation(localState, serverState);
      
      case 'merge':
        return this.mergeReconciliation(localState, serverState);
      
      case 'last_write_wins':
        return this.lastWriteWinsReconciliation(localState, serverState);
      
      default:
        return this.serverWinsReconciliation(localState, serverState);
    }
  }

  /**
   * Server wins reconciliation
   */
  private serverWinsReconciliation(localState: GameState, serverState: Partial<GameState>): GameState {
    return {
      ...localState,
      ...serverState,
      // Preserve local UI state
      isLoading: localState.isLoading,
      error: localState.error
    };
  }

  /**
   * Client wins reconciliation
   */
  private clientWinsReconciliation(localState: GameState, serverState: Partial<GameState>): GameState {
    // Only update fields that don't have pending optimistic updates
    const reconciledState = { ...localState };
    
    Object.keys(serverState).forEach(key => {
      const hasPendingUpdate = this.hasPendingUpdateForField(key);
      if (!hasPendingUpdate) {
        (reconciledState as any)[key] = (serverState as any)[key];
      }
    });

    return reconciledState;
  }

  /**
   * Merge reconciliation
   */
  private mergeReconciliation(localState: GameState, serverState: Partial<GameState>): GameState {
    const reconciledState = { ...localState };

    // Merge arrays by combining and deduplicating
    if (serverState.participants) {
      reconciledState.participants = this.mergeParticipants(
        localState.participants,
        serverState.participants
      );
    }

    if (serverState.submissions) {
      reconciledState.submissions = this.mergeSubmissions(
        localState.submissions,
        serverState.submissions
      );
    }

    if (serverState.votes) {
      reconciledState.votes = this.mergeVotes(
        localState.votes,
        serverState.votes
      );
    }

    // For other fields, use server state unless there's a pending update
    Object.keys(serverState).forEach(key => {
      if (!['participants', 'submissions', 'votes'].includes(key)) {
        const hasPendingUpdate = this.hasPendingUpdateForField(key);
        if (!hasPendingUpdate) {
          (reconciledState as any)[key] = (serverState as any)[key];
        }
      }
    });

    return reconciledState;
  }

  /**
   * Last write wins reconciliation
   */
  private lastWriteWinsReconciliation(localState: GameState, serverState: Partial<GameState>): GameState {
    // This would require timestamps on all state changes
    // For now, fall back to server wins
    return this.serverWinsReconciliation(localState, serverState);
  }

  /**
   * Check if field has pending optimistic update
   */
  private hasPendingUpdateForField(fieldName: string): boolean {
    return Array.from(this.pendingUpdates.values()).some(update => {
      return Object.keys(update.localState).includes(fieldName) && !update.serverConfirmed;
    });
  }

  /**
   * Merge participants arrays
   */
  private mergeParticipants(local: GameParticipant[], server: GameParticipant[]): GameParticipant[] {
    const merged = new Map<string, GameParticipant>();
    
    // Add server participants first
    server.forEach(participant => {
      merged.set(participant.id, participant);
    });
    
    // Add local participants that aren't in server (optimistic adds)
    local.forEach(participant => {
      if (!merged.has(participant.id)) {
        merged.set(participant.id, participant);
      }
    });
    
    return Array.from(merged.values());
  }

  /**
   * Merge submissions arrays
   */
  private mergeSubmissions(local: Submission[], server: Submission[]): Submission[] {
    const merged = new Map<string, Submission>();
    
    // Add server submissions first
    server.forEach(submission => {
      merged.set(submission.id, submission);
    });
    
    // Add local submissions that aren't in server (optimistic adds)
    local.forEach(submission => {
      if (!merged.has(submission.id)) {
        merged.set(submission.id, submission);
      }
    });
    
    return Array.from(merged.values());
  }

  /**
   * Merge votes arrays
   */
  private mergeVotes(local: Vote[], server: Vote[]): Vote[] {
    const merged = new Map<string, Vote>();
    
    // Add server votes first
    server.forEach(vote => {
      merged.set(vote.id, vote);
    });
    
    // Add local votes that aren't in server (optimistic adds)
    local.forEach(vote => {
      if (!merged.has(vote.id)) {
        merged.set(vote.id, vote);
      }
    });
    
    return Array.from(merged.values());
  }

  /**
   * Handle network reconnection
   */
  async handleReconnection(refreshStateCallback: () => Promise<void>): Promise<void> {
    if (this.syncInProgress) return;
    
    this.syncInProgress = true;
    console.log('Handling reconnection, syncing state...');
    
    try {
      // Refresh state from server
      await refreshStateCallback();
      
      // Clear old confirmed updates
      this.clearConfirmedUpdates();
      
      // Check if any pending updates need to be retried
      const pendingUpdates = this.getPendingUpdates();
      if (pendingUpdates.length > 0) {
        console.log(`Found ${pendingUpdates.length} pending updates after reconnection`);
        // In a real implementation, you might want to retry these updates
      }
      
      this.lastSyncTimestamp = Date.now();
    } catch (error) {
      console.error('Error during reconnection sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    pendingUpdates: number;
    lastSyncTimestamp: number;
    syncInProgress: boolean;
    isOutOfSync: boolean;
  } {
    const pendingCount = this.pendingUpdates.size;
    const isOutOfSync = pendingCount > 0 || (Date.now() - this.lastSyncTimestamp) > 30000; // 30 seconds
    
    return {
      pendingUpdates: pendingCount,
      lastSyncTimestamp: this.lastSyncTimestamp,
      syncInProgress: this.syncInProgress,
      isOutOfSync
    };
  }

  /**
   * Reset synchronization state
   */
  reset(): void {
    this.pendingUpdates.clear();
    this.lastSyncTimestamp = 0;
    this.syncInProgress = false;
  }
}

// Utility functions
export const createDataSynchronizationManager = (): DataSynchronizationManager => {
  return new DataSynchronizationManager();
};

export const generateOptimisticId = (prefix: string = 'opt'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
