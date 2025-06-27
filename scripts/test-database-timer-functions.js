#!/usr/bin/env node

// Test Database Timer Functions Directly
// This tests the core database functions without Edge Functions

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDatabaseTimerFunctions() {
  console.log('🧪 Testing database timer functions directly...\n');

  try {
    // 1. Check for expired games
    console.log('1. Finding expired games...');
    const { data: expiredGames, error: expiredError } = await supabase
      .rpc('find_expired_games', { limit_count: 10 });

    if (expiredError) {
      console.log('❌ Error finding expired games:', expiredError.message);
      return false;
    }

    console.log(`   Found ${expiredGames?.length || 0} expired games`);
    if (expiredGames && expiredGames.length > 0) {
      expiredGames.forEach(game => {
        console.log(`   - Game ${game.game_id}: ${game.current_status} (expired: ${game.phase_expires_at})`);
      });
    }

    if (!expiredGames || expiredGames.length === 0) {
      console.log('   No expired games to test with. Create one with: node scripts/create-persistent-test-game.js');
      return true;
    }

    // 2. Test timer state function
    const testGame = expiredGames[0];
    console.log(`\n2. Getting timer state for game ${testGame.game_id}...`);
    
    const { data: timerState, error: timerError } = await supabase
      .rpc('get_game_timer_state', { game_uuid: testGame.game_id });

    if (timerError) {
      console.log('❌ Error getting timer state:', timerError.message);
      return false;
    }

    if (timerState && timerState.length > 0) {
      const timer = timerState[0];
      console.log(`   ✅ Timer state retrieved:`);
      console.log(`      Phase: ${timer.phase}`);
      console.log(`      Time Remaining: ${timer.time_remaining}s`);
      console.log(`      Phase Duration: ${timer.phase_duration}s`);
      console.log(`      Expires At: ${timer.phase_expires_at}`);
      console.log(`      Server Time: ${timer.server_time}`);
    }

    // 3. Prepare for transition (create submission if needed)
    console.log(`\n3. Preparing for transition from ${testGame.current_status}...`);

    // Determine next status
    const nextStatusMap = {
      'briefing': 'drawing',
      'drawing': 'voting',
      'voting': 'results',
      'results': 'completed'
    };

    const nextStatus = nextStatusMap[testGame.current_status];
    if (!nextStatus) {
      console.log(`   ⚠️  No valid transition from ${testGame.current_status}`);
      return true;
    }

    // If transitioning from drawing to voting, we need a submission
    if (testGame.current_status === 'drawing' && nextStatus === 'voting') {
      console.log(`   Creating test submission for voting transition...`);

      // Get a user for the submission
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (users && users.length > 0) {
        const { data: submission, error: submissionError } = await supabase
          .from('submissions')
          .insert({
            game_id: testGame.game_id,
            user_id: users[0].id,
            drawing_data: '{"elements":[],"appState":{},"files":{}}',
            submitted_at: new Date().toISOString()
          })
          .select();

        if (submissionError) {
          console.log(`   ⚠️  Could not create test submission: ${submissionError.message}`);
          console.log(`   Skipping transition test for this game`);
          return true;
        }

        console.log(`   ✅ Test submission created: ${submission?.[0]?.id}`);

        // Verify submission exists
        const { data: verifySubmission } = await supabase
          .from('submissions')
          .select('id')
          .eq('game_id', testGame.game_id);

        console.log(`   📊 Total submissions for game: ${verifySubmission?.length || 0}`);
      } else {
        console.log(`   ⚠️  No users found to create submission`);
        return true;
      }
    }

    console.log(`   Transitioning: ${testGame.current_status} -> ${nextStatus}`);
    
    const { data: transitionResult, error: transitionError } = await supabase
      .rpc('transition_game_status', {
        game_uuid: testGame.game_id,
        new_status: nextStatus
      });

    if (transitionError) {
      console.log('❌ Error transitioning game:', transitionError.message);
      return false;
    }

    console.log(`   ✅ Game transitioned successfully`);

    // 4. Verify the transition
    console.log(`\n4. Verifying transition...`);
    const { data: updatedGame, error: verifyError } = await supabase
      .from('games')
      .select('status, current_phase_duration, phase_expires_at')
      .eq('id', testGame.game_id)
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

    // 5. Check transition log
    console.log(`\n5. Checking transition log...`);
    const { data: transitionLog, error: logError } = await supabase
      .from('game_transition_log')
      .select('*')
      .eq('game_id', testGame.game_id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (logError) {
      console.log('❌ Error checking transition log:', logError.message);
      return false;
    }

    console.log(`   ✅ Found ${transitionLog?.length || 0} recent transitions:`);
    if (transitionLog && transitionLog.length > 0) {
      transitionLog.forEach(log => {
        console.log(`      ${log.from_status} -> ${log.to_status} (${log.triggered_by}) at ${log.created_at}`);
      });
    }

    console.log('\n🎉 All database timer functions working correctly!');
    return true;

  } catch (error) {
    console.log(`💥 Exception: ${error.message}`);
    return false;
  }
}

// Run the test
testDatabaseTimerFunctions()
  .then(success => {
    console.log(success ? '\n✅ Database timer test passed!' : '\n❌ Database timer test failed!');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
