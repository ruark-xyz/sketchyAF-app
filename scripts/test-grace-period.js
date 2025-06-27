#!/usr/bin/env node

/**
 * Test script for grace period functionality
 * This script tests the drawing phase grace period mechanism
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGracePeriod() {
  console.log('🧪 Testing grace period functionality...\n');

  try {
    // 1. Create a test game
    console.log('1. Creating test game...');
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        prompt: 'Test drawing for grace period',
        status: 'drawing',
        round_duration: 60,
        voting_duration: 30,
        current_players: 2,
        max_players: 4,
        phase_expires_at: new Date(Date.now() + 5000).toISOString(), // Expires in 5 seconds
        drawing_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (gameError) {
      throw new Error(`Failed to create game: ${gameError.message}`);
    }

    console.log(`✅ Game created: ${game.id}`);

    // 2. Add test participants
    console.log('2. Adding test participants...');
    const participants = [
      { game_id: game.id, user_id: '11111111-1111-1111-1111-111111111111' },
      { game_id: game.id, user_id: '22222222-2222-2222-2222-222222222222' }
    ];

    const { error: participantError } = await supabase
      .from('game_participants')
      .insert(participants);

    if (participantError) {
      throw new Error(`Failed to add participants: ${participantError.message}`);
    }

    console.log('✅ Participants added');

    // 3. Wait for timer to expire and test grace period
    console.log('3. Waiting for timer to expire...');
    await new Promise(resolve => setTimeout(resolve, 6000));

    // 4. Call the monitor function to trigger grace period
    console.log('4. Triggering monitor function...');
    const response = await fetch('http://127.0.0.1:54321/functions/v1/monitor-game-timers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({})
    });

    const result = await response.text();
    console.log('Monitor function response:', result);

    // 5. Check if grace period was created
    console.log('5. Checking grace period metadata...');
    const { data: metadata, error: metadataError } = await supabase
      .from('game_metadata')
      .select('*')
      .eq('game_id', game.id)
      .eq('key', `drawing_grace_${game.id}`);

    if (metadataError) {
      console.log('❌ Error checking metadata:', metadataError.message);
    } else if (metadata && metadata.length > 0) {
      console.log('✅ Grace period metadata found:', metadata[0]);
    } else {
      console.log('⚠️ No grace period metadata found');
    }

    // 6. Check game status
    const { data: updatedGame, error: gameCheckError } = await supabase
      .from('games')
      .select('status, phase_expires_at')
      .eq('id', game.id)
      .single();

    if (gameCheckError) {
      console.log('❌ Error checking game status:', gameCheckError.message);
    } else {
      console.log('📊 Game status:', updatedGame.status);
      console.log('📊 Phase expires at:', updatedGame.phase_expires_at);
    }

    // 7. Simulate a submission during grace period
    console.log('6. Simulating submission during grace period...');
    const { error: submissionError } = await supabase
      .from('submissions')
      .insert({
        game_id: game.id,
        user_id: participants[0].user_id,
        drawing_data: { elements: [], appState: {}, files: {} },
        drawing_url: 'https://example.com/test.png',
        canvas_width: 800,
        canvas_height: 600,
        element_count: 1,
        drawing_time_seconds: 30
      });

    if (submissionError) {
      console.log('❌ Submission failed:', submissionError.message);
    } else {
      console.log('✅ Submission successful during grace period');
    }

    // 8. Wait for grace period to expire and test transition
    console.log('7. Waiting for grace period to expire...');
    await new Promise(resolve => setTimeout(resolve, 16000)); // Wait 16 seconds

    // 9. Trigger monitor function again
    console.log('8. Triggering monitor function after grace period...');
    const response2 = await fetch('http://127.0.0.1:54321/functions/v1/monitor-game-timers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({})
    });

    const result2 = await response2.text();
    console.log('Monitor function response (after grace):', result2);

    // 10. Check final game status
    const { data: finalGame, error: finalGameError } = await supabase
      .from('games')
      .select('status, phase_expires_at')
      .eq('id', game.id)
      .single();

    if (finalGameError) {
      console.log('❌ Error checking final game status:', finalGameError.message);
    } else {
      console.log('🏁 Final game status:', finalGame.status);
      console.log('🏁 Final phase expires at:', finalGame.phase_expires_at);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('games').delete().eq('id', game.id);
    console.log('✅ Cleanup complete');

    console.log('\n🎉 Grace period test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testGracePeriod();
