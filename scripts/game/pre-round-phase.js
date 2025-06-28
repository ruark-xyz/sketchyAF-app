#!/usr/bin/env node

/**
 * Pre-Round Phase Test Script
 *
 * Creates a complete game scenario for testing the pre-round/briefing screen functionality.
 * This script sets up a realistic briefing phase with multiple participants ready to start.
 *
 * Features:
 * - Creates a test game in 'briefing' status
 * - Adds 4 test participants with realistic user data
 * - Sets all participants as ready for immediate testing
 * - Sets appropriate game timing for briefing phase
 * - Includes database cleanup before creating new test data
 * - Outputs game ID and navigation instructions
 *
 * Usage:
 *   node scripts/game/pre-round-phase.js
 *
 * After running, navigate to:
 *   http://localhost:5173/uiux/pre-round?gameId=<GAME_ID>
 *
 * Requirements:
 * - Supabase local development environment running
 * - Environment variables in .env.local
 * - Test users must already exist (run seed-users.js first)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getTestUsers, displayTestUserCredentials } from '../shared/test-users.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Validate environment variables early
if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!process.env.VITE_SUPABASE_URL) {
    console.error('   - VITE_SUPABASE_URL is not set');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('   - SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  console.error('\nPlease check your .env.local file and ensure these variables are properly configured.');
  process.exit(1);
}

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test configuration
const TEST_CONFIG = {
  gamePrompt: 'Draw a magical creature having breakfast in a cozy kitchen',
  maxPlayers: 4,
  roundDuration: 180, // 3 minutes
  votingDuration: 60,  // 1 minute
  briefingDuration: 60, // 60 seconds for testing (longer than default 20s)
};

/**
 * Clean up existing test data
 */
async function cleanupTestData() {
  console.log('🧹 Cleaning up existing test data...');

  try {
    // Delete existing test games (cascades to participants, submissions, votes)
    const { error: gamesError } = await supabase
      .from('games')
      .delete()
      .ilike('prompt', '%magical%creature%breakfast%kitchen%');

    if (gamesError) {
      console.log(`⚠️  Warning cleaning games: ${gamesError.message}`);
    }

    console.log('✅ Cleanup completed');
  } catch (error) {
    console.log(`⚠️  Warning during cleanup: ${error.message}`);
  }
}



/**
 * Create test game in briefing phase
 */
async function createTestGame(creatorUserId) {
  console.log('🎮 Creating test game in briefing phase...');

  const now = new Date();

  // Calculate timestamps for briefing phase
  const createdAt = new Date(now.getTime() - 60000); // 1 minute ago (game was created)
  const startedAt = new Date(now.getTime() - 5000); // 5 seconds ago (briefing started)
  const phaseExpiresAt = new Date(now.getTime() + (TEST_CONFIG.briefingDuration * 1000) - 5000); // Briefing expires in ~55 seconds

  const { data: game, error } = await supabase
    .from('games')
    .insert({
      status: 'briefing',
      prompt: TEST_CONFIG.gamePrompt,
      max_players: TEST_CONFIG.maxPlayers,
      current_players: 0, // Start with 0, will be updated when participants are added
      round_duration: TEST_CONFIG.roundDuration,
      voting_duration: TEST_CONFIG.votingDuration,
      created_by: creatorUserId,
      created_at: createdAt,
      started_at: startedAt,
      current_phase_duration: TEST_CONFIG.briefingDuration,
      phase_expires_at: phaseExpiresAt
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create game: ${error.message}`);
  }

  console.log(`✅ Created game: ${game.id}`);
  console.log(`   Prompt: "${game.prompt}"`);
  console.log(`   Status: ${game.status}`);
  console.log(`   Created: ${createdAt.toISOString()}`);
  console.log(`   Briefing started: ${startedAt.toISOString()}`);
  console.log(`   Briefing expires: ${phaseExpiresAt.toISOString()}`);

  return game;
}

/**
 * Add participants to game
 */
async function addParticipants(gameId, users) {
  console.log('👥 Adding participants to game...');

  const participants = [];

  for (const user of users) {
    const { data: participant, error } = await supabase
      .from('game_participants')
      .insert({
        game_id: gameId,
        user_id: user.id,
        is_ready: true // All participants are ready for immediate testing
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add participant ${user.username}: ${error.message}`);
    }

    console.log(`   ✅ Added participant: ${user.username} (ready)`);
    participants.push(participant);
  }

  // Update the game's current_players count
  const { error: updateError } = await supabase
    .from('games')
    .update({ current_players: users.length })
    .eq('id', gameId);

  if (updateError) {
    throw new Error(`Failed to update player count: ${updateError.message}`);
  }

  console.log(`   ✅ Updated game player count to ${users.length}`);

  return participants;
}

/**
 * Display final results and instructions
 */
function displayResults(game, users) {
  console.log('\n🎉 Pre-round phase test setup complete!');
  console.log('=' .repeat(60));
  console.log(`Game ID: ${game.id}`);
  console.log(`Prompt: "${game.prompt}"`);
  console.log(`Status: ${game.status}`);
  console.log(`Participants: ${users.length} (all ready)`);
  console.log('');

  displayTestUserCredentials();
  console.log('');

  console.log('🌐 Navigation Instructions:');
  console.log(`1. Open: http://localhost:5173/uiux/pre-round?gameId=${game.id}`);
  console.log('2. Login with any of the test user credentials above');
  console.log('3. You should see the pre-round briefing screen');
  console.log('4. Test the briefing phase functionality and timer');
  console.log('5. Watch automatic transition to drawing phase when timer expires');
  console.log('');

  console.log('🔄 To test real-time updates:');
  console.log('1. Open multiple browser windows/tabs');
  console.log('2. Login with different test users in each');
  console.log('3. Watch synchronized briefing phase and transitions');
  console.log('');

  console.log('⏰ Timer Info:');
  console.log(`   Briefing phase expires: ${game.phase_expires_at}`);
  console.log(`   Briefing duration: ${TEST_CONFIG.briefingDuration} seconds`);
  console.log(`   Drawing duration: ${TEST_CONFIG.roundDuration} seconds`);
  console.log(`   Voting duration: ${TEST_CONFIG.votingDuration} seconds`);

  // Calculate time remaining
  const now = new Date();
  const expiresAt = new Date(game.phase_expires_at);
  const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
  console.log(`   Time remaining: ~${timeRemaining} seconds`);
  console.log('');

  console.log('🧹 Cleanup:');
  console.log('   Run this script again to create a fresh test scenario');
  console.log('   Previous test data will be automatically cleaned up');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Pre-Round Phase Test Setup');
  console.log('======================================');

  try {
    console.log(`📡 Supabase URL: ${process.env.VITE_SUPABASE_URL}`);
    console.log('');

    // Step 1: Cleanup existing test data
    await cleanupTestData();
    console.log('');

    // Step 2: Get test users (assumes they already exist)
    const users = await getTestUsers(supabase);
    console.log('');

    // Step 3: Create test game (use first user as creator)
    const game = await createTestGame(users[0].id);
    console.log('');

    // Step 4: Add participants to game
    await addParticipants(game.id, users);
    console.log('');

    // Step 5: Display results and instructions
    displayResults(game, users);

  } catch (error) {
    console.error('\n❌ Error setting up pre-round phase test:');
    console.error(error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure Supabase is running: npx supabase start');
    console.error('2. Check .env.local has correct environment variables');
    console.error('3. Verify database migrations are applied');
    console.error('4. Check network connectivity to Supabase');
    console.error('5. Create test users first: node scripts/seed/seed-users.js');
    process.exit(1);
  }
}

/**
 * Handle script termination
 */
process.on('SIGINT', () => {
  console.log('\n\n🛑 Script interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Script terminated');
  process.exit(0);
});

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}
