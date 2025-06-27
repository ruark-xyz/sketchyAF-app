#!/usr/bin/env node

// Create Persistent Test Game - No auto cleanup
// This script creates a test game with an expired timer and leaves it for testing

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createPersistentTestGame() {
  console.log('🎮 Creating persistent test game with expired timer...\n');

  try {
    // Get or create a test user
    console.log('1. Getting or creating test user...');
    
    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    let testUserId;
    
    if (existingUsers && existingUsers.length > 0) {
      testUserId = existingUsers[0].id;
      console.log(`   Using existing user: ${testUserId}`);
    } else {
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
    console.log('2. Creating persistent test game...');
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        prompt: 'PERSISTENT TEST: Drawing prompt for timer expiration testing',
        max_players: 4,
        round_duration: 60,
        voting_duration: 30,
        status: 'briefing',
        current_phase_duration: 10,
        phase_expires_at: new Date(Date.now() - 5000).toISOString(), // 5 seconds ago
        created_by: testUserId
      })
      .select()
      .single();

    if (gameError) {
      console.log('❌ Error creating test game:', gameError.message);
      return null;
    }

    console.log(`✅ Created persistent test game: ${game.id}`);
    console.log(`   Status: ${game.status}`);
    console.log(`   Phase Duration: ${game.current_phase_duration}s`);
    console.log(`   Expires At: ${game.phase_expires_at}`);
    console.log(`   Expired: ${new Date(game.phase_expires_at) < new Date() ? 'YES' : 'NO'}`);

    console.log('\n📋 Test this game with:');
    console.log('   node scripts/test-timer-monitor.js');
    console.log('   node scripts/local-timer-monitor.js');
    
    console.log('\n🧹 Clean up manually with:');
    console.log(`   node -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
await supabase.from('games').delete().eq('id', '${game.id}');
console.log('Game deleted');
"`);

    return game.id;

  } catch (error) {
    console.log(`💥 Exception: ${error.message}`);
    return null;
  }
}

// Run without cleanup
createPersistentTestGame()
  .then(gameId => {
    if (gameId) {
      console.log(`\n🎯 Test game ready: ${gameId}`);
    }
    process.exit(gameId ? 0 : 1);
  })
  .catch(error => {
    console.error('Failed to create test game:', error);
    process.exit(1);
  });
