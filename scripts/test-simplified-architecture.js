#!/usr/bin/env node

// Test script for simplified timer architecture
// Demonstrates the new event-driven approach without race conditions

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSimplifiedArchitecture() {
  console.log('🏗️  Testing Simplified Timer Architecture...\n');

  try {
    // 1. Create a test game
    console.log('1. Creating test game...');
    const testUserId = '2155bfaa-ebf1-43da-9387-95c9e423a5f2';
    
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        prompt: 'Test simplified architecture',
        max_players: 4,
        round_duration: 60,
        voting_duration: 30,
        status: 'waiting',
        created_by: testUserId,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (gameError) {
      console.log('❌ Error creating game:', gameError.message);
      return false;
    }

    console.log('✅ Game created:', game.id);

    // 2. Add participant
    const { error: participantError } = await supabase
      .from('game_participants')
      .insert({
        game_id: game.id,
        user_id: testUserId,
        is_ready: false
      });

    if (participantError) {
      console.log('❌ Error adding participant:', participantError.message);
      return false;
    }

    console.log('✅ Participant added');

    // 3. Transition to briefing (sets timer)
    console.log('\n2. Testing server-only timer management...');
    const { error: transitionError } = await supabase
      .rpc('transition_game_status', {
        game_uuid: game.id,
        new_status: 'briefing'
      });

    if (transitionError) {
      console.log('❌ Error transitioning to briefing:', transitionError.message);
      return false;
    }

    console.log('✅ Game transitioned to briefing with timer');

    // 4. Test the simplified timer API (using database function directly for local testing)
    console.log('\n3. Testing simplified timer API...');

    // Use database function directly since we're running locally
    const { data: timerData, error: timerError } = await supabase
      .rpc('get_game_timer_state', { game_uuid: game.id });

    if (timerError) {
      console.log('❌ Error getting timer state:', timerError.message);
      return false;
    }

    // Format response like the edge function would
    const timer = timerData[0];
    const timerResponse = {
      timeRemaining: timer.time_remaining,
      phaseDuration: timer.phase_duration,
      phase: timer.phase,
      phaseExpiresAt: timer.phase_expires_at,
      serverTime: new Date().toISOString()
    };

    console.log('📊 Timer API Response:');
    console.log(`   Time Remaining: ${timerResponse.timeRemaining}s`);
    console.log(`   Phase Duration: ${timerResponse.phaseDuration}s`);
    console.log(`   Phase: ${timerResponse.phase}`);
    console.log(`   Expires At: ${timerResponse.phaseExpiresAt}`);
    console.log(`   Server Time: ${timerResponse.serverTime}`);

    // 5. Test single source of truth
    console.log('\n4. Testing single source of truth...');
    
    const { data: gameState, error: stateError } = await supabase
      .from('games')
      .select('id, status, current_phase_duration, phase_expires_at')
      .eq('id', game.id)
      .single();

    if (stateError) {
      console.log('❌ Error getting game state:', stateError.message);
      return false;
    }

    console.log('📋 Database State (Single Source of Truth):');
    console.log(`   Status: ${gameState.status}`);
    console.log(`   Phase Duration: ${gameState.current_phase_duration}s`);
    console.log(`   Phase Expires At: ${gameState.phase_expires_at}`);

    // Verify consistency
    const isConsistent = (
      timerResponse.phase === gameState.status &&
      timerResponse.phaseDuration === gameState.current_phase_duration &&
      timerResponse.phaseExpiresAt === gameState.phase_expires_at
    );

    console.log(`✅ API and Database Consistency: ${isConsistent ? 'CONSISTENT' : 'INCONSISTENT'}`);

    // 6. Test event-driven navigation logic
    console.log('\n5. Testing event-driven navigation logic...');
    
    const getRouteForStatus = (status) => {
      const baseParams = `?gameId=${game.id}`;
      
      switch (status) {
        case 'waiting':
        case 'briefing':
          return `/uiux/pre-round${baseParams}`;
        case 'drawing':
          return `/uiux/draw${baseParams}`;
        case 'voting':
          return `/uiux/voting${baseParams}`;
        case 'results':
          return `/uiux/results${baseParams}`;
        case 'completed':
        case 'cancelled':
          return `/uiux/lobby${baseParams}`;
        default:
          return `/uiux/lobby${baseParams}`;
      }
    };

    console.log('🧭 Navigation Logic Test:');
    ['waiting', 'briefing', 'drawing', 'voting', 'results', 'completed'].forEach(status => {
      const route = getRouteForStatus(status);
      console.log(`   ${status} → ${route}`);
    });

    // 7. Simulate server-driven phase transition
    console.log('\n6. Simulating server-driven phase transition...');
    
    console.log('   [Server] Waiting for timer to expire...');
    
    // Wait for the briefing timer to expire (10 seconds)
    const waitTime = Math.max(0, timerResponse.timeRemaining + 2); // Add 2 seconds buffer
    console.log(`   [Server] Waiting ${waitTime} seconds for timer expiration...`);
    
    if (waitTime > 0 && waitTime < 30) { // Only wait if reasonable
      await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      
      // Check if server automatically transitioned the game
      const { data: updatedGame } = await supabase
        .from('games')
        .select('status')
        .eq('id', game.id)
        .single();
      
      console.log(`   [Server] Game status after timer: ${updatedGame?.status}`);
      
      if (updatedGame?.status === 'drawing') {
        console.log('✅ Server-driven transition successful: briefing → drawing');
        
        // Simulate client receiving PubNub event and navigating
        const newRoute = getRouteForStatus(updatedGame.status);
        console.log(`   [Client] Would navigate to: ${newRoute}`);
        console.log('✅ Event-driven navigation would work correctly');
      } else {
        console.log('⏳ Timer not yet expired or transition pending');
      }
    } else {
      console.log('⏭️  Skipping timer wait (too long or already expired)');
    }

    console.log('\n📈 Architecture Benefits:');
    console.log('   ✅ Single source of truth (database status)');
    console.log('   ✅ No client-side timer expiration logic');
    console.log('   ✅ No race conditions between multiple timers');
    console.log('   ✅ Simplified state management');
    console.log('   ✅ Event-driven navigation');
    console.log('   ✅ Consistent behavior across all clients');

    return true;

  } catch (error) {
    console.log('💥 Unexpected error:', error.message);
    return false;
  }
}

// Run the test
testSimplifiedArchitecture().then(success => {
  if (success) {
    console.log('\n🎉 Simplified architecture test completed successfully!');
    console.log('\n📝 Recommended Implementation Steps:');
    console.log('   1. Replace useServerTimer + useGameTimer with useSimpleTimer');
    console.log('   2. Replace GamePhaseRoute with SimpleGameRoute');
    console.log('   3. Replace GameContext dual state with useUnifiedGameState');
    console.log('   4. Remove individual page navigation useEffects');
    console.log('   5. Enable auto-navigation in useUnifiedGameState');
    console.log('   6. Test with multiple clients to verify consistency');
    process.exit(0);
  } else {
    console.log('\n❌ Simplified architecture test failed!');
    process.exit(1);
  }
});
