#!/usr/bin/env node

// Test script to verify phase transition fix
// This script creates a game, waits for it to transition from briefing to drawing,
// and verifies that the navigation logic would be triggered

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

async function testPhaseTransition() {
  console.log('🧪 Testing phase transition fix...');
  
  try {
    // 1. Create a test game
    console.log('📝 Creating test game...');
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        prompt: 'Test drawing prompt',
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

    // 2. Transition to briefing with a short timer (5 seconds)
    console.log('⏰ Transitioning to briefing phase with 5-second timer...');
    const briefingExpiresAt = new Date(Date.now() + 5000).toISOString();
    
    const { error: updateError } = await supabase
      .from('games')
      .update({
        status: 'briefing',
        phase_expires_at: briefingExpiresAt,
        current_phase_duration: 5
      })
      .eq('id', game.id);

    if (updateError) {
      throw new Error(`Failed to update game: ${updateError.message}`);
    }

    console.log('✅ Game transitioned to briefing phase');
    console.log(`⏰ Phase expires at: ${briefingExpiresAt}`);

    // 3. Wait for the timer to expire and check if it transitions to drawing
    console.log('⏳ Waiting for phase transition to drawing...');
    
    let attempts = 0;
    const maxAttempts = 15; // Wait up to 15 seconds
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      const { data: updatedGame, error: fetchError } = await supabase
        .from('games')
        .select('status, phase_expires_at')
        .eq('id', game.id)
        .single();

      if (fetchError) {
        console.error(`Error fetching game: ${fetchError.message}`);
        continue;
      }

      console.log(`📊 Attempt ${attempts}: Game status = ${updatedGame.status}`);
      
      if (updatedGame.status === 'drawing') {
        console.log('🎉 SUCCESS! Game successfully transitioned to drawing phase');
        console.log('✅ Phase transition fix is working correctly');
        
        // Clean up
        await supabase.from('games').delete().eq('id', game.id);
        console.log('🧹 Test game cleaned up');
        return true;
      }
    }
    
    console.log('❌ FAILURE: Game did not transition to drawing phase within expected time');
    console.log('🔍 This suggests the timer system or phase transition logic may have issues');
    
    // Clean up
    await supabase.from('games').delete().eq('id', game.id);
    console.log('🧹 Test game cleaned up');
    return false;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Run the test
testPhaseTransition()
  .then(success => {
    if (success) {
      console.log('\n🎯 CONCLUSION: Phase transition fix appears to be working!');
      console.log('   The server-side timer system is correctly transitioning games from briefing to drawing.');
      console.log('   The navigation fix in useUnifiedGameState should now work properly.');
    } else {
      console.log('\n⚠️  CONCLUSION: Phase transition may have issues.');
      console.log('   Check the timer system and Edge Functions.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
