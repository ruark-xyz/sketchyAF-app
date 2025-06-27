#!/usr/bin/env node

// Create Test Game with Expired Timer
// This script creates a test game with an expired timer to test the monitor

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestExpiredGame() {
  console.log('🎮 Creating test game with expired timer...\n');

  try {
    // First, get or create a test user
    console.log('1. Getting or creating test user...');

    // Try to find an existing user first
    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    let testUserId;

    if (existingUsers && existingUsers.length > 0) {
      testUserId = existingUsers[0].id;
      console.log(`   Using existing user: ${testUserId}`);
    } else {
      // Create a test user if none exist
      const testUserEmail = `test-timer-${Date.now()}@example.com`;
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: testUserEmail,
        password: 'test-password-123',
        email_confirm: true
      });

      if (authError) {
        console.log('❌ Error creating test user:', authError.message);
        return null;
      }

      testUserId = authData.user.id;
      console.log(`   Created test user: ${testUserId}`);
    }

    // Create a test game with expired timer
    console.log('2. Creating test game...');
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        prompt: 'Test drawing prompt for timer expiration',
        max_players: 4,
        round_duration: 60,
        voting_duration: 30,
        status: 'drawing',
        current_phase_duration: 60,
        phase_expires_at: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
        created_by: testUserId
      })
      .select()
      .single();

    if (gameError) {
      console.log('❌ Error creating test game:', gameError.message);
      return null;
    }

    console.log(`✅ Created test game: ${game.id}`);
    console.log(`   Status: ${game.status}`);
    console.log(`   Phase Duration: ${game.current_phase_duration}s`);
    console.log(`   Expires At: ${game.phase_expires_at}`);
    console.log(`   Expired: ${new Date(game.phase_expires_at) < new Date() ? 'YES' : 'NO'}`);

    return game.id;

  } catch (error) {
    console.log(`💥 Exception: ${error.message}`);
    return null;
  }
}

async function cleanupTestGame(gameId) {
  if (!gameId) return;

  try {
    console.log(`\n🧹 Cleaning up test game: ${gameId}`);
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', gameId);

    if (error) {
      console.log('❌ Error cleaning up:', error.message);
    } else {
      console.log('✅ Test game cleaned up');
    }
  } catch (error) {
    console.log(`💥 Cleanup exception: ${error.message}`);
  }
}

async function runTest() {
  const gameId = await createTestExpiredGame();
  
  if (gameId) {
    console.log('\n📋 Next steps:');
    console.log('1. Run: node scripts/test-timer-monitor.js');
    console.log('2. Or run: node scripts/local-timer-monitor.js');
    console.log('3. Watch the logs to see the expired game being processed');
    console.log(`4. Game ID: ${gameId}`);
    
    // Ask if user wants to clean up immediately
    console.log('\n⏳ Waiting 30 seconds before cleanup (Ctrl+C to keep the game)...');

    setTimeout(async () => {
      await cleanupTestGame(gameId);
      process.exit(0);
    }, 30000);
  } else {
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Keeping test game for manual testing...');
  process.exit(0);
});

// Run the test
runTest();
