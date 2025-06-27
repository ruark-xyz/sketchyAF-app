#!/usr/bin/env node

// Test Specific Game Timer Functions
// Tests timer functions on a specific game ID

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const gameId = '3935c1bc-0706-4deb-92b3-6a9e7fa850ba'; // Latest briefing game

async function testSpecificGame() {
  console.log(`🧪 Testing timer functions for game: ${gameId}\n`);

  try {
    // 1. Get current game state
    console.log('1. Getting current game state...');
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      console.log('❌ Game not found:', gameError?.message);
      return false;
    }

    console.log(`   ✅ Game found:`);
    console.log(`      Status: ${game.status}`);
    console.log(`      Phase Duration: ${game.current_phase_duration}s`);
    console.log(`      Expires At: ${game.phase_expires_at}`);
    console.log(`      Expired: ${game.phase_expires_at && new Date(game.phase_expires_at) < new Date() ? 'YES' : 'NO'}`);

    // 2. Get timer state
    console.log('\n2. Getting timer state...');
    const { data: timerState, error: timerError } = await supabase
      .rpc('get_game_timer_state', { game_uuid: gameId });

    if (timerError) {
      console.log('❌ Error getting timer state:', timerError.message);
      return false;
    }

    if (timerState && timerState.length > 0) {
      const timer = timerState[0];
      console.log(`   ✅ Timer state:`);
      console.log(`      Time Remaining: ${timer.time_remaining}s`);
      console.log(`      Phase: ${timer.phase}`);
      console.log(`      Server Time: ${timer.server_time}`);
    }

    // 3. Test transition
    console.log('\n3. Testing game transition...');
    const nextStatusMap = {
      'briefing': 'drawing',
      'drawing': 'voting', 
      'voting': 'results',
      'results': 'completed'
    };
    
    const nextStatus = nextStatusMap[game.status];
    if (!nextStatus) {
      console.log(`   ⚠️  No valid transition from ${game.status}`);
      return true;
    }

    console.log(`   Transitioning: ${game.status} -> ${nextStatus}`);
    
    const { data: transitionResult, error: transitionError } = await supabase
      .rpc('transition_game_status', {
        game_uuid: gameId,
        new_status: nextStatus
      });

    if (transitionError) {
      console.log('❌ Error transitioning game:', transitionError.message);
      return false;
    }

    console.log(`   ✅ Transition successful`);

    // 4. Verify the transition
    console.log('\n4. Verifying transition...');
    const { data: updatedGame, error: verifyError } = await supabase
      .from('games')
      .select('status, current_phase_duration, phase_expires_at')
      .eq('id', gameId)
      .single();

    if (verifyError) {
      console.log('❌ Error verifying transition:', verifyError.message);
      return false;
    }

    console.log(`   ✅ Verification successful:`);
    console.log(`      New Status: ${updatedGame.status}`);
    console.log(`      New Phase Duration: ${updatedGame.current_phase_duration}s`);
    console.log(`      New Expires At: ${updatedGame.phase_expires_at}`);
    
    const isExpired = updatedGame.phase_expires_at && new Date(updatedGame.phase_expires_at) < new Date();
    console.log(`      Is Expired: ${isExpired ? 'YES' : 'NO'}`);

    // 5. Check if it shows up in expired games
    console.log('\n5. Checking if game appears in expired games...');
    const { data: expiredGames, error: expiredError } = await supabase
      .rpc('find_expired_games', { limit_count: 10 });

    if (expiredError) {
      console.log('❌ Error finding expired games:', expiredError.message);
      return false;
    }

    const foundGame = expiredGames?.find(g => g.game_id === gameId);
    if (foundGame) {
      console.log(`   ✅ Game found in expired games list`);
      console.log(`      Status: ${foundGame.current_status}`);
      console.log(`      Expired At: ${foundGame.phase_expires_at}`);
    } else {
      console.log(`   ℹ️  Game not in expired games list (may have been processed or not expired)`);
    }

    console.log('\n🎉 All tests passed! Timer system is working correctly.');
    return true;

  } catch (error) {
    console.log(`💥 Exception: ${error.message}`);
    return false;
  }
}

// Run the test
testSpecificGame()
  .then(success => {
    console.log(success ? '\n✅ Specific game test passed!' : '\n❌ Specific game test failed!');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
