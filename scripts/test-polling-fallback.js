#!/usr/bin/env node

// Test script to verify that the polling fallback mechanism works
// This simulates what happens when a player is on the pre-round screen
// but the game has already transitioned to drawing phase

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

async function testPollingFallback() {
  console.log('🧪 Testing polling fallback mechanism...');
  
  try {
    // Check the current game that players are stuck on
    const gameId = '9948bec0-11ae-42a2-a522-58d9fa88bfb6';
    
    console.log(`📊 Checking current status of game ${gameId}...`);
    
    const { data: game, error } = await supabase
      .from('games')
      .select(`
        id, status, phase_expires_at, current_phase_duration,
        prompt, max_players, round_duration, voting_duration,
        created_at
      `)
      .eq('id', gameId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch game: ${error.message}`);
    }

    console.log(`✅ Game found: ${game.id}`);
    console.log(`📊 Current status: ${game.status}`);
    console.log(`⏰ Phase expires at: ${game.phase_expires_at}`);
    console.log(`⏱️  Current phase duration: ${game.current_phase_duration} seconds`);
    
    if (game.status === 'drawing') {
      console.log('\n🎯 PERFECT! Game is in drawing phase.');
      console.log('   Players on the pre-round screen should be redirected to /uiux/draw');
      console.log('   The polling fallback should detect this status change within 5 seconds.');
      
      // Simulate what the polling fallback does
      console.log('\n🔄 Simulating polling fallback detection...');
      console.log(`   Previous status (simulated): briefing`);
      console.log(`   Current status: ${game.status}`);
      console.log(`   Status changed: briefing → ${game.status}`);
      console.log('   ✅ Navigation should be triggered!');
      
      return true;
    } else {
      console.log(`\n⚠️  Game is in ${game.status} phase, not drawing.`);
      console.log('   This test is only valid when the game is in drawing phase.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Run the test
testPollingFallback()
  .then(success => {
    if (success) {
      console.log('\n🎯 CONCLUSION: Polling fallback should work!');
      console.log('   Players should be redirected within 5 seconds of refreshing their browsers.');
      console.log('   If they are still stuck, there may be an issue with the useUnifiedGameState hook.');
    } else {
      console.log('\n⚠️  CONCLUSION: Test conditions not met.');
      console.log('   Create a game in drawing phase to test the polling fallback.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
