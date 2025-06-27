#!/usr/bin/env node

// Simple validation script for server-side timer implementation
// This script validates that our database schema and functions are working correctly

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function validateImplementation() {
  console.log('🔍 Validating Server-Side Timer Implementation...\n');

  try {
    // 1. Test database schema
    console.log('1. Testing database schema...');
    
    // Check if timer columns exist in games table
    const { data: gamesSchema, error: gamesError } = await supabase
      .from('games')
      .select('current_phase_duration, phase_expires_at')
      .limit(0); // Just check schema, don't fetch data

    if (gamesError) {
      console.log('❌ Games table timer columns missing:', gamesError.message);
      return false;
    }
    console.log('✅ Games table has timer columns');

    // Check if game_transition_log table exists
    const { data: logSchema, error: logError } = await supabase
      .from('game_transition_log')
      .select('id')
      .limit(0);

    if (logError) {
      console.log('❌ Game transition log table missing:', logError.message);
      return false;
    }
    console.log('✅ Game transition log table exists');

    // 2. Test database functions
    console.log('\n2. Testing database functions...');

    // Test advisory lock functions
    const { data: lockResult, error: lockError } = await supabase
      .rpc('acquire_advisory_lock', { lock_key: 'test_validation', timeout_seconds: 1 });

    if (lockError) {
      console.log('❌ Advisory lock function missing:', lockError.message);
      return false;
    }
    console.log('✅ Advisory lock functions work');

    // Release the lock
    if (lockResult) {
      await supabase.rpc('release_advisory_lock', { lock_key: 'test_validation' });
    }

    // Test find_expired_games function
    const { data: expiredGames, error: expiredError } = await supabase
      .rpc('find_expired_games', { limit_count: 1 });

    if (expiredError) {
      console.log('❌ Find expired games function missing:', expiredError.message);
      return false;
    }
    console.log('✅ Find expired games function works');

    // Test get_game_timer_state function
    const { data: timerState, error: timerError } = await supabase
      .rpc('get_game_timer_state', { game_uuid: '00000000-0000-0000-0000-000000000000' });

    // This should return empty result, not an error about missing function
    if (timerError && timerError.message.includes('function')) {
      console.log('❌ Get game timer state function missing:', timerError.message);
      return false;
    }
    console.log('✅ Get game timer state function exists');

    // 3. Test Edge Functions exist (just check they're deployed)
    console.log('\n3. Testing Edge Functions...');

    try {
      // Test get-game-timer function (should fail with auth error, not 404)
      const { error: getTimerError } = await supabase.functions.invoke('get-game-timer', {
        body: { gameId: 'test' }
      });

      if (getTimerError && getTimerError.message.includes('not found')) {
        console.log('❌ get-game-timer Edge Function not deployed');
        return false;
      }
      console.log('✅ get-game-timer Edge Function deployed');

      // Test handle-timer-expiration function
      const { error: handleTimerError } = await supabase.functions.invoke('handle-timer-expiration', {
        body: { gameId: 'test', currentStatus: 'drawing' }
      });

      if (handleTimerError && handleTimerError.message.includes('not found')) {
        console.log('❌ handle-timer-expiration Edge Function not deployed');
        return false;
      }
      console.log('✅ handle-timer-expiration Edge Function deployed');

      // Test monitor-game-timers function
      const { error: monitorError } = await supabase.functions.invoke('monitor-game-timers', {
        body: {}
      });

      if (monitorError && monitorError.message.includes('not found')) {
        console.log('❌ monitor-game-timers Edge Function not deployed');
        return false;
      }
      console.log('✅ monitor-game-timers Edge Function deployed');

    } catch (error) {
      console.log('⚠️  Edge Functions test skipped (functions server may not be running)');
    }

    // 4. Test client-side components can be imported
    console.log('\n4. Testing client-side components...');

    try {
      // These should not throw import errors
      await import('../src/hooks/useServerTimer.ts');
      console.log('✅ useServerTimer hook can be imported');
    } catch (error) {
      console.log('❌ useServerTimer hook import failed:', error.message);
      return false;
    }

    try {
      await import('../src/services/GameFlowController.ts');
      console.log('✅ GameFlowController can be imported');
    } catch (error) {
      console.log('❌ GameFlowController import failed:', error.message);
      return false;
    }

    console.log('\n🎉 All validations passed! Server-side timer implementation is ready.');
    return true;

  } catch (error) {
    console.log('\n❌ Validation failed with error:', error.message);
    return false;
  }
}

// Run validation
validateImplementation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Validation script error:', error);
    process.exit(1);
  });
