#!/usr/bin/env node

/**
 * Test Post-Game Flow Script
 *
 * This script takes an existing game in voting phase and transitions it through
 * results to completed status to test the post-game screen functionality.
 *
 * Usage:
 *   node scripts/game/test-post-game.js <GAME_ID>
 *
 * Example:
 *   node scripts/game/test-post-game.js aa0a4b8c-7d17-4a57-a7a7-4e279df56955
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Add some votes to make the results more interesting
 */
async function addTestVotes(gameId, submissions) {
  console.log('🗳️  Adding test votes...');

  // Create some realistic voting patterns
  const votePatterns = [
    { submissionIndex: 0, votes: 3 }, // Alice gets 3 votes (winner)
    { submissionIndex: 1, votes: 2 }, // Bob gets 2 votes (2nd place)
    { submissionIndex: 2, votes: 1 }, // Charlie gets 1 vote (3rd place)
    { submissionIndex: 3, votes: 0 }, // Diana gets 0 votes (4th place)
  ];

  // Get all participants to use as voters
  const { data: participants } = await supabase
    .from('game_participants')
    .select('user_id')
    .eq('game_id', gameId);

  if (!participants || participants.length === 0) {
    throw new Error('No participants found for game');
  }

  let voteCount = 0;
  
  for (const pattern of votePatterns) {
    const submission = submissions[pattern.submissionIndex];
    if (!submission) continue;

    // Add votes from different participants
    for (let i = 0; i < pattern.votes && i < participants.length; i++) {
      const voter = participants[i];
      
      // Skip if voter is voting for their own submission
      if (voter.user_id === submission.user_id) continue;

      const { error } = await supabase
        .from('votes')
        .insert({
          game_id: gameId,
          submission_id: submission.id,
          voter_id: voter.user_id
        });

      if (error) {
        console.log(`   ⚠️  Warning adding vote: ${error.message}`);
      } else {
        voteCount++;
        console.log(`   ✅ Added vote for submission ${pattern.submissionIndex + 1}`);
      }
    }
  }

  // Update vote counts on submissions
  for (const pattern of votePatterns) {
    const submission = submissions[pattern.submissionIndex];
    if (!submission) continue;

    const { error } = await supabase
      .from('submissions')
      .update({ vote_count: pattern.votes })
      .eq('id', submission.id);

    if (error) {
      console.log(`   ⚠️  Warning updating vote count: ${error.message}`);
    }
  }

  console.log(`   ✅ Added ${voteCount} total votes`);
  return voteCount;
}

/**
 * Transition game directly to completed phase (skipping results)
 */
async function transitionToCompleted(gameId) {
  console.log('🏁 Transitioning game directly to completed phase...');

  const now = new Date();

  const { error } = await supabase
    .from('games')
    .update({
      status: 'completed',
      completed_at: now
    })
    .eq('id', gameId);

  if (error) {
    throw new Error(`Failed to transition to completed: ${error.message}`);
  }

  console.log('   ✅ Game transitioned to completed phase');

  return now;
}


/**
 * Display final results and navigation instructions
 */
function displayResults(gameId) {
  console.log('\n🎉 Post-game test setup complete!');
  console.log('=' .repeat(60));
  console.log(`Game ID: ${gameId}`);
  console.log('Status: completed');
  console.log('');

  console.log('👥 Test Users (login credentials):');
  console.log('   1. alice_sketcher - Email: alice@example.com - Password: testpass123');
  console.log('   2. bob_artist - Email: bob@example.com - Password: testpass123');
  console.log('   3. charlie_draws - Email: charlie@example.com - Password: testpass123');
  console.log('   4. diana_creative - Email: diana@example.com - Password: testpass123');
  console.log('');

  console.log('🌐 Navigation Instructions:');
  console.log(`1. Open: http://localhost:5173/uiux/post-game?gameId=${gameId}`);
  console.log('2. Login with any of the test user credentials above');
  console.log('3. You should see the post-game screen with:');
  console.log('   - Final scores and player rankings');
  console.log('   - Your drawing submission');
  console.log('   - Vote counts and placement');
  console.log('   - Level/XP progress');
  console.log('   - Options to play again or view profile');
  console.log('');

  console.log('🏆 Expected Results:');
  console.log('   1st Place: alice_sketcher (3 votes)');
  console.log('   2nd Place: bob_artist (2 votes)');
  console.log('   3rd Place: charlie_draws (1 vote)');
  console.log('   4th Place: diana_creative (0 votes)');
  console.log('');

  console.log('🔄 To test the complete flow:');
  console.log('1. Start with voting phase: node scripts/game/voting-phase.js');
  console.log('2. Run this script to complete the game');
  console.log('3. Navigate to post-game screen to verify functionality');
}

/**
 * Main execution function
 */
async function main() {
  const gameId = process.argv[2];
  
  if (!gameId) {
    console.error('❌ Error: Game ID is required');
    console.error('Usage: node scripts/game/test-post-game.js <GAME_ID>');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/game/test-post-game.js aa0a4b8c-7d17-4a57-a7a7-4e279df56955');
    process.exit(1);
  }

  console.log('🚀 Starting Post-Game Test Setup');
  console.log('=================================');
  console.log(`Game ID: ${gameId}`);
  console.log('');

  try {
    // Validate environment
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables. Check .env.local file.');
    }

    // Get game and submissions
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      throw new Error(`Game not found: ${gameError?.message || 'Unknown error'}`);
    }

    console.log(`📋 Current game status: ${game.status}`);

    // Get submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select('*')
      .eq('game_id', gameId);

    if (submissionsError) {
      throw new Error(`Failed to get submissions: ${submissionsError.message}`);
    }

    console.log(`🎨 Found ${submissions?.length || 0} submissions`);
    console.log('');

    // Add test votes if in voting phase
    if (game.status === 'voting') {
      await addTestVotes(gameId, submissions || []);
      console.log('');
    }

    // Transition directly to completed if not already there
    if (game.status !== 'completed') {
      await transitionToCompleted(gameId);
      console.log('');
    } else {
      console.log('🏁 Game is already completed');
      console.log('');
    }

    // Display results and instructions
    displayResults(gameId);

  } catch (error) {
    console.error('\n❌ Error setting up post-game test:');
    console.error(error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure Supabase is running: npx supabase start');
    console.error('2. Check .env.local has correct environment variables');
    console.error('3. Verify the game ID exists and is in voting/results phase');
    console.error('4. Check network connectivity to Supabase');
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
