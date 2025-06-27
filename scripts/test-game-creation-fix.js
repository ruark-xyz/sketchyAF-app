#!/usr/bin/env node

// Test script to verify the game creation fix
// This script tests that newly created games properly set timer fields

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testGameCreationFix() {
  console.log('🧪 Testing game creation timer fix...\n');

  try {
    // 1. Use an existing test user ID (service role bypasses auth)
    console.log('1. Using existing test user ID...');
    const testUserId = '2155bfaa-ebf1-43da-9387-95c9e423a5f2'; // duane_test2
    console.log('✅ Test user ID:', testUserId);

    // 2. Create a game using the GameService approach (simulated)
    console.log('\n2. Creating game with timer fix...');
    
    // First create the game in waiting status
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        prompt: 'Test game creation with timer fix',
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

    console.log('✅ Game created in waiting status:', game.id);

    // 3. Add the creator as a participant
    console.log('\n3. Adding creator as participant...');
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

    console.log('✅ Creator added as participant');

    // 4. Transition to briefing status (this should set timer fields)
    console.log('\n4. Transitioning to briefing status...');
    const { data: transitionResult, error: transitionError } = await supabase
      .rpc('transition_game_status', {
        game_uuid: game.id,
        new_status: 'briefing'
      });

    if (transitionError) {
      console.log('❌ Error transitioning to briefing:', transitionError.message);
      return false;
    }

    console.log('✅ Game transitioned to briefing status');

    // 5. Verify timer fields are set
    console.log('\n5. Verifying timer fields...');
    const { data: updatedGame, error: fetchError } = await supabase
      .from('games')
      .select('id, status, current_phase_duration, phase_expires_at')
      .eq('id', game.id)
      .single();

    if (fetchError) {
      console.log('❌ Error fetching updated game:', fetchError.message);
      return false;
    }

    console.log('📊 Game state after transition:');
    console.log(`   Status: ${updatedGame.status}`);
    console.log(`   Phase Duration: ${updatedGame.current_phase_duration} seconds`);
    console.log(`   Phase Expires At: ${updatedGame.phase_expires_at}`);
    console.log(`   Current Time: ${new Date().toISOString()}`);

    // 6. Verify timer fields are properly set
    if (updatedGame.status === 'briefing' && 
        updatedGame.current_phase_duration === 10 && 
        updatedGame.phase_expires_at) {
      console.log('✅ Timer fields are properly set!');
      
      // 7. Test timer monitoring will pick this up
      const expiresAt = new Date(updatedGame.phase_expires_at);
      const now = new Date();
      const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      
      console.log(`⏰ Timer will expire in ${timeRemaining} seconds`);
      
      if (timeRemaining > 0) {
        console.log('✅ Game is ready for timer monitoring!');
        return true;
      } else {
        console.log('⚠️  Timer has already expired, but that\'s okay for testing');
        return true;
      }
    } else {
      console.log('❌ Timer fields are not properly set:');
      console.log(`   Expected: status=briefing, duration=10, expires_at=not null`);
      console.log(`   Actual: status=${updatedGame.status}, duration=${updatedGame.current_phase_duration}, expires_at=${updatedGame.phase_expires_at}`);
      return false;
    }

  } catch (error) {
    console.log('💥 Unexpected error:', error.message);
    return false;
  }
}

// Run the test
testGameCreationFix().then(success => {
  if (success) {
    console.log('\n🎉 Game creation timer fix test PASSED!');
    process.exit(0);
  } else {
    console.log('\n❌ Game creation timer fix test FAILED!');
    process.exit(1);
  }
});
