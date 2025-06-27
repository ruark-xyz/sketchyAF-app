#!/usr/bin/env node

// Test script to analyze redirect behavior and timing issues
// This script simulates the conditions that cause redirect loops

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRedirectBehavior() {
  console.log('🔄 Testing redirect behavior and timing issues...\n');

  try {
    // 1. Create a test game that will transition phases
    console.log('1. Creating test game for redirect analysis...');
    const testUserId = '2155bfaa-ebf1-43da-9387-95c9e423a5f2';
    
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        prompt: 'Test game for redirect behavior analysis',
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

    // 2. Add participants
    console.log('\n2. Adding participants...');
    const { error: participantError } = await supabase
      .from('game_participants')
      .insert([
        { game_id: game.id, user_id: testUserId, is_ready: false },
        { game_id: game.id, user_id: '16b8282c-1f52-4c7b-99a3-0a4a28bb582c', is_ready: false }
      ]);

    if (participantError) {
      console.log('❌ Error adding participants:', participantError.message);
      return false;
    }

    console.log('✅ Participants added');

    // 3. Transition to briefing (this should set timer fields)
    console.log('\n3. Transitioning to briefing...');
    const { error: transitionError } = await supabase
      .rpc('transition_game_status', {
        game_uuid: game.id,
        new_status: 'briefing'
      });

    if (transitionError) {
      console.log('❌ Error transitioning to briefing:', transitionError.message);
      return false;
    }

    console.log('✅ Game transitioned to briefing');

    // 4. Check timer state
    console.log('\n4. Checking timer state...');
    const { data: timerState, error: timerError } = await supabase
      .rpc('get_game_timer_state', { game_uuid: game.id });

    if (timerError) {
      console.log('❌ Error getting timer state:', timerError.message);
      return false;
    }

    if (timerState && timerState.length > 0) {
      const timer = timerState[0];
      console.log('📊 Timer state:');
      console.log(`   Phase: ${timer.phase}`);
      console.log(`   Time Remaining: ${timer.time_remaining}s`);
      console.log(`   Phase Duration: ${timer.phase_duration}s`);
      console.log(`   Expires At: ${timer.phase_expires_at}`);
      console.log(`   Server Time: ${timer.server_time}`);
    }

    // 5. Simulate rapid state checks (like what happens during redirects)
    console.log('\n5. Simulating rapid state checks...');
    for (let i = 0; i < 5; i++) {
      const { data: gameState, error: stateError } = await supabase
        .from('games')
        .select('id, status, current_phase_duration, phase_expires_at')
        .eq('id', game.id)
        .single();

      if (stateError) {
        console.log(`❌ Error getting game state (check ${i + 1}):`, stateError.message);
        continue;
      }

      console.log(`   Check ${i + 1}: status=${gameState.status}, duration=${gameState.current_phase_duration}, expires=${gameState.phase_expires_at ? 'set' : 'null'}`);
      
      // Small delay to simulate real-world timing
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 6. Test GamePhaseRoute logic simulation
    console.log('\n6. Simulating GamePhaseRoute access logic...');
    
    const gamePhaseString = 'briefing'; // Simulating gamePhase from context
    const currentGameStatus = game.status; // This would be 'briefing' after transition
    const requiredPhase = 'briefing';
    
    const condition1 = gamePhaseString === requiredPhase.toLowerCase();
    const condition2 = currentGameStatus === requiredPhase.toLowerCase();
    const condition3 = requiredPhase === 'briefing' && game.id && 
      (currentGameStatus === 'briefing' || currentGameStatus === 'waiting');
    
    const hasAccess = condition1 || condition2 || condition3;
    
    console.log('📋 Access check simulation:');
    console.log(`   gamePhase: ${gamePhaseString}`);
    console.log(`   currentGameStatus: ${currentGameStatus}`);
    console.log(`   requiredPhase: ${requiredPhase}`);
    console.log(`   condition1 (gamePhase === required): ${condition1}`);
    console.log(`   condition2 (gameStatus === required): ${condition2}`);
    console.log(`   condition3 (briefing special case): ${condition3}`);
    console.log(`   hasAccess: ${hasAccess}`);

    // 7. Test race condition scenario
    console.log('\n7. Testing race condition scenario...');
    console.log('   Simulating: Server transitions game while client is checking access...');
    
    // Simulate server transition happening during client access check
    setTimeout(async () => {
      console.log('   [Server] Transitioning game to drawing...');
      await supabase.rpc('transition_game_status', {
        game_uuid: game.id,
        new_status: 'drawing'
      });
      console.log('   [Server] Game transitioned to drawing');
    }, 2000);

    // Simulate client checking access multiple times during transition
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: currentState } = await supabase
        .from('games')
        .select('status')
        .eq('id', game.id)
        .single();
      
      console.log(`   [Client Check ${i + 1}] Game status: ${currentState?.status}`);
      
      // Simulate access check for different phases
      if (currentState?.status === 'drawing') {
        console.log(`   [Client] Would redirect to /uiux/draw for drawing phase`);
        break;
      } else if (currentState?.status === 'briefing') {
        console.log(`   [Client] Staying on /uiux/pre-round for briefing phase`);
      }
    }

    console.log('\n8. Final game state:');
    const { data: finalState } = await supabase
      .from('games')
      .select('id, status, current_phase_duration, phase_expires_at')
      .eq('id', game.id)
      .single();
    
    console.log(`   Final status: ${finalState?.status}`);
    console.log(`   Final duration: ${finalState?.current_phase_duration}`);
    console.log(`   Final expires_at: ${finalState?.phase_expires_at}`);

    return true;

  } catch (error) {
    console.log('💥 Unexpected error:', error.message);
    return false;
  }
}

// Run the test
testRedirectBehavior().then(success => {
  if (success) {
    console.log('\n🎉 Redirect behavior test completed!');
    console.log('\n📝 Analysis Summary:');
    console.log('   - Check for timing issues between server transitions and client access checks');
    console.log('   - Look for race conditions in GamePhaseRoute logic');
    console.log('   - Verify that multiple rapid state checks don\'t cause conflicts');
    console.log('   - Ensure proper synchronization between game status and gamePhase context');
    process.exit(0);
  } else {
    console.log('\n❌ Redirect behavior test failed!');
    process.exit(1);
  }
});
