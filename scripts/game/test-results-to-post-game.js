#!/usr/bin/env node

/**
 * Test Results to Post-Game Flow Script
 *
 * This script creates a game in results phase and tests the automatic
 * transition to post-game screen after the results timer expires.
 *
 * Usage:
 *   node scripts/game/test-results-to-post-game.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getTestUsers, displayTestUserCredentials } from '../shared/test-users.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test configuration
const TEST_CONFIG = {
  gamePrompt: 'Draw a robot chef making pizza',
  maxPlayers: 4,
  roundDuration: 180, // 3 minutes
  votingDuration: 60,  // 1 minute
  resultsDuration: 10  // 10 seconds for testing
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
      .ilike('prompt', '%robot%chef%pizza%');

    if (gamesError) {
      console.log(`⚠️  Warning cleaning games: ${gamesError.message}`);
    }

    console.log('✅ Cleanup completed');
  } catch (error) {
    console.log(`⚠️  Warning during cleanup: ${error.message}`);
  }
}

/**
 * Create test game in results phase
 */
async function createResultsPhaseGame(creatorUserId) {
  console.log('🎮 Creating test game in results phase...');

  const now = new Date();

  // Calculate timestamps for a game that just entered results phase
  const createdAt = new Date(now.getTime() - (TEST_CONFIG.roundDuration * 1000) - 180000); // 3 minutes before drawing started
  const startedAt = new Date(createdAt.getTime() + 60000); // 1 minute after created
  const drawingStartedAt = new Date(startedAt.getTime() + 20000); // 20 seconds after started
  const votingStartedAt = new Date(drawingStartedAt.getTime() + (TEST_CONFIG.roundDuration * 1000)); // After drawing phase
  const resultsStartedAt = new Date(votingStartedAt.getTime() + (TEST_CONFIG.votingDuration * 1000)); // After voting phase
  const resultsExpiresAt = new Date(resultsStartedAt.getTime() + (TEST_CONFIG.resultsDuration * 1000)); // Results expires

  const { data: game, error } = await supabase
    .from('games')
    .insert({
      status: 'results',
      prompt: TEST_CONFIG.gamePrompt,
      max_players: TEST_CONFIG.maxPlayers,
      current_players: 0, // Will be updated when participants are added
      round_duration: TEST_CONFIG.roundDuration,
      voting_duration: TEST_CONFIG.votingDuration,
      created_by: creatorUserId,
      created_at: createdAt,
      started_at: startedAt,
      drawing_started_at: drawingStartedAt,
      voting_started_at: votingStartedAt,
      current_phase_duration: TEST_CONFIG.resultsDuration,
      phase_expires_at: resultsExpiresAt
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create game: ${error.message}`);
  }

  console.log(`✅ Created game: ${game.id}`);
  console.log(`   Prompt: "${game.prompt}"`);
  console.log(`   Status: ${game.status}`);
  console.log(`   Results expires: ${resultsExpiresAt.toISOString()}`);
  console.log(`   Time until transition: ${Math.ceil((resultsExpiresAt.getTime() - now.getTime()) / 1000)} seconds`);

  return game;
}

/**
 * Add participants and create submissions/votes
 */
async function setupGameData(gameId, users) {
  console.log('👥 Setting up game data...');

  // Add participants
  const participants = [];
  for (const user of users) {
    const { data: participant, error } = await supabase
      .from('game_participants')
      .insert({
        game_id: gameId,
        user_id: user.id,
        is_ready: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add participant ${user.username}: ${error.message}`);
    }

    participants.push(participant);
  }

  // Update game player count
  const { error: updateError } = await supabase
    .from('games')
    .update({ current_players: users.length })
    .eq('id', gameId);

  if (updateError) {
    throw new Error(`Failed to update player count: ${updateError.message}`);
  }

  // Create mock submissions
  const submissions = [];
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const timestamp = Date.now() + i;
    const fileName = `${gameId}/${user.id}/${timestamp}.png`;
    
    const { data: urlData } = supabase.storage
      .from('drawings')
      .getPublicUrl(fileName);

    const { data: submission, error } = await supabase
      .from('submissions')
      .insert({
        game_id: gameId,
        user_id: user.id,
        drawing_data: { elements: [], appState: {}, files: {} },
        drawing_url: urlData.publicUrl,
        canvas_width: 400,
        canvas_height: 300,
        element_count: 5,
        drawing_time_seconds: 120,
        vote_count: 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create submission for ${user.username}: ${error.message}`);
    }

    submissions.push(submission);
  }

  // Create some votes
  const votePatterns = [
    { submissionIndex: 0, votes: 3 }, // First player gets 3 votes (winner)
    { submissionIndex: 1, votes: 2 }, // Second player gets 2 votes
    { submissionIndex: 2, votes: 1 }, // Third player gets 1 vote
    { submissionIndex: 3, votes: 0 }, // Fourth player gets 0 votes
  ];

  for (const pattern of votePatterns) {
    const submission = submissions[pattern.submissionIndex];
    if (!submission) continue;

    for (let i = 0; i < pattern.votes && i < users.length; i++) {
      const voter = users[i];
      
      // Skip if voter is voting for their own submission
      if (voter.id === submission.user_id) continue;

      const { error } = await supabase
        .from('votes')
        .insert({
          game_id: gameId,
          submission_id: submission.id,
          voter_id: voter.id
        });

      if (error) {
        console.log(`   ⚠️  Warning adding vote: ${error.message}`);
      }
    }

    // Update vote count on submission
    const { error } = await supabase
      .from('submissions')
      .update({ vote_count: pattern.votes })
      .eq('id', submission.id);

    if (error) {
      console.log(`   ⚠️  Warning updating vote count: ${error.message}`);
    }
  }

  console.log(`   ✅ Added ${users.length} participants`);
  console.log(`   ✅ Created ${submissions.length} submissions`);
  console.log(`   ✅ Added voting data`);

  return { participants, submissions };
}

/**
 * Display results and instructions
 */
function displayResults(game) {
  console.log('\n🎉 Results to Post-Game test setup complete!');
  console.log('=' .repeat(60));
  console.log(`Game ID: ${game.id}`);
  console.log(`Prompt: "${game.prompt}"`);
  console.log(`Status: ${game.status}`);
  console.log(`Results expires: ${game.phase_expires_at}`);
  console.log('');

  displayTestUserCredentials();
  console.log('');

  console.log('🌐 Testing Instructions:');
  console.log(`1. Open: http://localhost:5173/uiux/results?gameId=${game.id}`);
  console.log('2. Login with any test user credentials above');
  console.log('3. Watch the results screen for ~10 seconds');
  console.log('4. The game should automatically transition to completed status');
  console.log('5. You should be redirected to the post-game screen');
  console.log('6. Verify all game data is displayed correctly');
  console.log('');

  console.log('🔄 Alternative test:');
  console.log(`   Direct post-game: http://localhost:5173/uiux/post-game?gameId=${game.id}`);
  console.log('   (after the game transitions to completed status)');
  console.log('');

  console.log('⏰ Timing:');
  console.log(`   Results phase duration: ${TEST_CONFIG.resultsDuration} seconds`);
  console.log('   Auto-transition should happen shortly after results expire');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Results to Post-Game Test Setup');
  console.log('==========================================');

  try {
    // Validate environment
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables. Check .env.local file.');
    }

    console.log(`📡 Supabase URL: ${process.env.VITE_SUPABASE_URL}`);
    console.log('');

    // Step 1: Cleanup existing test data
    await cleanupTestData();
    console.log('');

    // Step 2: Get test users
    const users = await getTestUsers(supabase);
    console.log('');

    // Step 3: Create test game in results phase
    const game = await createResultsPhaseGame(users[0].id);
    console.log('');

    // Step 4: Setup game data (participants, submissions, votes)
    await setupGameData(game.id, users);
    console.log('');

    // Step 5: Display results and instructions
    displayResults(game);

  } catch (error) {
    console.error('\n❌ Error setting up results to post-game test:');
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

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}
