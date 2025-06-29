// Server Timer Synchronization Tests
// Tests for the server-side timer system implementation

import { describe, it, expect } from 'vitest';
import { supabase } from '../utils/supabase';

describe('Server Timer Synchronization', () => {
  // Simple tests that don't require authentication

  describe('Database Schema Validation', () => {
    it('should have timer-related columns in games table', async () => {
      // Test that our migration added the required columns
      const { data, error } = await supabase
        .from('games')
        .select('current_phase_duration, phase_expires_at')
        .limit(1);

      // Should not error even if no data (means columns exist)
      expect(error).toBeNull();
    });

    it('should have game_transition_log table', async () => {
      // Test that our migration created the transition log table
      const { data, error } = await supabase
        .from('game_transition_log')
        .select('id')
        .limit(1);

      // Should not error even if no data (means table exists)
      expect(error).toBeNull();
    });
  });

  describe('Database Functions', () => {
    it('should have required database functions', async () => {
      // Test that our database functions exist by calling them with invalid data
      // They should return errors but not "function does not exist" errors

      const { error: timerError } = await supabase
        .rpc('get_game_timer_state', { game_uuid: '00000000-0000-0000-0000-000000000000' });

      // Should not be a "function does not exist" error
      expect(timerError?.message).not.toContain('function');

      const { error: expiredError } = await supabase
        .rpc('find_expired_games', { limit_count: 1 });

      // Should not error for this function
      expect(expiredError).toBeNull();
    });

    it('should have advisory lock functions', async () => {
      // Test advisory lock functions exist
      const { data: lockResult, error: lockError } = await supabase
        .rpc('acquire_advisory_lock', { lock_key: 'test_lock', timeout_seconds: 1 });

      expect(lockError).toBeNull();
      expect(typeof lockResult).toBe('boolean');

      if (lockResult) {
        const { data: unlockResult, error: unlockError } = await supabase
          .rpc('release_advisory_lock', { lock_key: 'test_lock' });

        expect(unlockError).toBeNull();
        expect(typeof unlockResult).toBe('boolean');
      }
    });
  });

  describe('Component Integration', () => {
    it('should import GameFlowController without errors', async () => {
      // Test that our controller can be imported
      const { GameFlowController } = await import('../services/GameFlowController');
      expect(GameFlowController).toBeDefined();
      expect(typeof GameFlowController.handleTimerExpiration).toBe('function');
      expect(typeof GameFlowController.transitionWithConflictResolution).toBe('function');
    });
  });
});
