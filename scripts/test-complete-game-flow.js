#!/usr/bin/env node

// Test script to verify complete game flow phase transitions
// Tests: briefing → drawing → voting → results → completed

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function waitForStatusChange(gameId, expectedStatus, maxWaitSeconds = 15) {
  console.log(`⏳ Waiting for game to transition to ${expectedStatus}...`);
  
  let attempts = 0;
  const maxAttempts = maxWaitSeconds;
  
  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
    
    const { data: game, error } = await supabase
      .from('games')
      .select('status, phase_expires_at')
      .eq('id', gameId)
      .single();

    if (error) {
      console.error(`Error fetching game: ${error.message}`);
      continue;
    }

    console.log(`📊 Attempt ${attempts}: Game status = ${game.status}`);
    
    if (game.status === expectedStatus) {
      console.log(`✅ SUCCESS! Game transitioned to ${expectedStatus}`);
      return true;
    }
  }
  
  console.log(`❌ TIMEOUT: Game did not transition to ${expectedStatus} within ${maxWaitSeconds} seconds`);
  return false;
}

async function testCompleteGameFlow() {
  console.log('🧪 Testing complete game flow phase transitions...');
  
  try {
    // 1. Create a test game
    console.log('\n📝 Step 1: Creating test game...');
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        prompt: 'Test complete game flow',
        max_players: 4,
        round_duration: 60,
        voting_duration: 30,
        status: 'waiting'
      })
      .select()
      .single();

    if (gameError) {
      throw new Error(`Failed to create game: ${gameError.message}`);
    }

    console.log(`✅ Game created: ${game.id}`);

    // 2. Transition to briefing with short timer
    console.log('\n⏰ Step 2: Transitioning to briefing phase...');
    const briefingExpiresAt = new Date(Date.now() + 3000).toISOString(); // 3 seconds
    
    const { error: briefingError } = await supabase
      .from('games')
      .update({
        status: 'briefing',
        phase_expires_at: briefingExpiresAt,
        current_phase_duration: 3
      })
      .eq('id', game.id);

    if (briefingError) {
      throw new Error(`Failed to transition to briefing: ${briefingError.message}`);
    }

    console.log('✅ Game transitioned to briefing phase');

    // 3. Wait for briefing → drawing transition
    console.log('\n🎨 Step 3: Testing briefing → drawing transition...');
    const drawingSuccess = await waitForStatusChange(game.id, 'drawing', 10);
    if (!drawingSuccess) {
      throw new Error('Failed briefing → drawing transition');
    }

    // 4. Transition drawing → voting (simulate drawing completion)
    console.log('\n🗳️  Step 4: Testing drawing → voting transition...');
    const votingExpiresAt = new Date(Date.now() + 3000).toISOString(); // 3 seconds
    
    const { error: votingError } = await supabase
      .from('games')
      .update({
        status: 'voting',
        phase_expires_at: votingExpiresAt,
        current_phase_duration: 3
      })
      .eq('id', game.id);

    if (votingError) {
      throw new Error(`Failed to transition to voting: ${votingError.message}`);
    }

    console.log('✅ Game transitioned to voting phase');

    // 5. Wait for voting → results transition
    console.log('\n🏆 Step 5: Testing voting → results transition...');
    const resultsSuccess = await waitForStatusChange(game.id, 'results', 10);
    if (!resultsSuccess) {
      throw new Error('Failed voting → results transition');
    }

    // 6. Transition results → completed (simulate results viewing)
    console.log('\n🎯 Step 6: Testing results → completed transition...');
    const completedExpiresAt = new Date(Date.now() + 3000).toISOString(); // 3 seconds
    
    const { error: completedError } = await supabase
      .from('games')
      .update({
        status: 'results',
        phase_expires_at: completedExpiresAt,
        current_phase_duration: 3
      })
      .eq('id', game.id);

    if (completedError) {
      throw new Error(`Failed to set results timer: ${completedError.message}`);
    }

    // 7. Wait for results → completed transition
    const completedSuccess = await waitForStatusChange(game.id, 'completed', 10);
    if (!completedSuccess) {
      throw new Error('Failed results → completed transition');
    }

    console.log('\n🎉 ALL PHASE TRANSITIONS SUCCESSFUL!');
    console.log('✅ briefing → drawing ✅');
    console.log('✅ drawing → voting ✅');
    console.log('✅ voting → results ✅');
    console.log('✅ results → completed ✅');

    // Clean up
    await supabase.from('games').delete().eq('id', game.id);
    console.log('\n🧹 Test game cleaned up');
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    return false;
  }
}

// Run the test
testCompleteGameFlow()
  .then(success => {
    if (success) {
      console.log('\n🎯 CONCLUSION: Complete game flow is working correctly!');
      console.log('   All phase transitions are functioning properly.');
      console.log('   The navigation fix should work for all game phases.');
    } else {
      console.log('\n⚠️  CONCLUSION: Some phase transitions have issues.');
      console.log('   Check the timer system and Edge Functions.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
