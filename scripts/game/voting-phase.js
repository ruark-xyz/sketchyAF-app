#!/usr/bin/env node

/**
 * Voting Phase Test Script
 *
 * Creates a complete game scenario for testing the voting screen functionality.
 * This script sets up a realistic voting phase with multiple participants and submissions.
 *
 * Features:
 * - Creates a test game in 'voting' status
 * - Adds 4 test participants with realistic user data
 * - Generates mock drawing submissions for each participant
 * - Sets appropriate game timing for voting phase
 * - Includes database cleanup before creating new test data
 * - Outputs game ID and navigation instructions
 *
 * Usage:
 *   node scripts/game/voting-phase.js
 *
 * After running, navigate to:
 *   http://localhost:5173/uiux/voting?gameId=<GAME_ID>
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

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test configuration
const TEST_CONFIG = {
  gamePrompt: 'Draw a funny robot doing household chores',
  maxPlayers: 4,
  roundDuration: 180, // 3 minutes
  votingDuration: 60,  // 1 minute
};

// Mock Excalidraw drawing data for test submissions
const MOCK_DRAWINGS = [
  {
    elements: [
      {
        type: 'rectangle',
        id: 'rect-1',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        strokeColor: '#000000',
        backgroundColor: '#ff6b6b',
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 1,
        opacity: 100,
        angle: 0,
        strokeStyle: 'solid',
        seed: 1234567890,
        versionNonce: 1234567890,
        isDeleted: false,
        groupIds: [],
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false
      },
      {
        type: 'ellipse',
        id: 'ellipse-1',
        x: 150,
        y: 50,
        width: 100,
        height: 100,
        strokeColor: '#000000',
        backgroundColor: '#4ecdc4',
        fillStyle: 'solid',
        strokeWidth: 2,
        roughness: 1,
        opacity: 100,
        angle: 0,
        strokeStyle: 'solid',
        seed: 1234567891,
        versionNonce: 1234567891,
        isDeleted: false,
        groupIds: [],
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false
      }
    ],
    appState: {
      viewBackgroundColor: '#ffffff',
      currentItemStrokeColor: '#000000',
      currentItemBackgroundColor: 'transparent',
      currentItemFillStyle: 'solid',
      currentItemStrokeWidth: 2,
      currentItemStrokeStyle: 'solid',
      currentItemRoughness: 1,
      currentItemOpacity: 100,
      gridSize: null,
      colorPalette: {}
    },
    files: {}
  },
  {
    elements: [
      {
        type: 'freedraw',
        id: 'freedraw-1',
        x: 50,
        y: 80,
        width: 300,
        height: 200,
        strokeColor: '#e74c3c',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 3,
        roughness: 1,
        opacity: 100,
        angle: 0,
        strokeStyle: 'solid',
        seed: 1234567892,
        versionNonce: 1234567892,
        isDeleted: false,
        groupIds: [],
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        points: [[0, 0], [50, 30], [100, 10], [150, 40], [200, 20], [250, 50]]
      }
    ],
    appState: {
      viewBackgroundColor: '#ffffff',
      currentItemStrokeColor: '#e74c3c',
      currentItemBackgroundColor: 'transparent',
      currentItemFillStyle: 'solid',
      currentItemStrokeWidth: 3,
      currentItemStrokeStyle: 'solid',
      currentItemRoughness: 1,
      currentItemOpacity: 100,
      gridSize: null,
      colorPalette: {}
    },
    files: {}
  },
  {
    elements: [
      {
        type: 'line',
        id: 'line-1',
        x: 80,
        y: 120,
        width: 240,
        height: 160,
        strokeColor: '#9b59b6',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 4,
        roughness: 1,
        opacity: 100,
        angle: 0,
        strokeStyle: 'solid',
        seed: 1234567893,
        versionNonce: 1234567893,
        isDeleted: false,
        groupIds: [],
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        points: [[0, 0], [120, 80], [240, 160]]
      },
      {
        type: 'text',
        id: 'text-1',
        x: 100,
        y: 300,
        width: 200,
        height: 25,
        strokeColor: '#2c3e50',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        roughness: 1,
        opacity: 100,
        angle: 0,
        strokeStyle: 'solid',
        seed: 1234567894,
        versionNonce: 1234567894,
        isDeleted: false,
        groupIds: [],
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        text: 'Robot Helper!',
        fontSize: 20,
        fontFamily: 1,
        textAlign: 'left',
        verticalAlign: 'top',
        containerId: null,
        originalText: 'Robot Helper!'
      }
    ],
    appState: {
      viewBackgroundColor: '#ffffff',
      currentItemStrokeColor: '#9b59b6',
      currentItemBackgroundColor: 'transparent',
      currentItemFillStyle: 'solid',
      currentItemStrokeWidth: 4,
      currentItemStrokeStyle: 'solid',
      currentItemRoughness: 1,
      currentItemOpacity: 100,
      gridSize: null,
      colorPalette: {}
    },
    files: {}
  },
  {
    elements: [
      {
        type: 'diamond',
        id: 'diamond-1',
        x: 120,
        y: 90,
        width: 160,
        height: 160,
        strokeColor: '#f39c12',
        backgroundColor: '#f1c40f',
        fillStyle: 'solid',
        strokeWidth: 3,
        roughness: 1,
        opacity: 100,
        angle: 0,
        strokeStyle: 'solid',
        seed: 1234567895,
        versionNonce: 1234567895,
        isDeleted: false,
        groupIds: [],
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false
      }
    ],
    appState: {
      viewBackgroundColor: '#ffffff',
      currentItemStrokeColor: '#f39c12',
      currentItemBackgroundColor: '#f1c40f',
      currentItemFillStyle: 'solid',
      currentItemStrokeWidth: 3,
      currentItemStrokeStyle: 'solid',
      currentItemRoughness: 1,
      currentItemOpacity: 100,
      gridSize: null,
      colorPalette: {}
    },
    files: {}
  }
];

// Placeholder image URLs for submissions
const PLACEHOLDER_IMAGES = [
  'https://placehold.co/600x400/ff6b6b/ffffff?text=Robot+Drawing+1',
  'https://placehold.co/600x400/4ecdc4/ffffff?text=Robot+Drawing+2',
  'https://placehold.co/600x400/9b59b6/ffffff?text=Robot+Drawing+3',
  'https://placehold.co/600x400/f1c40f/000000?text=Robot+Drawing+4'
];

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
      .ilike('prompt', '%robot%household%chores%');

    if (gamesError) {
      console.log(`⚠️  Warning cleaning games: ${gamesError.message}`);
    }

    console.log('✅ Cleanup completed');
  } catch (error) {
    console.log(`⚠️  Warning during cleanup: ${error.message}`);
  }
}



/**
 * Create test game
 */
async function createTestGame(creatorUserId) {
  console.log('🎮 Creating test game...');

  const now = new Date();

  // Calculate timestamps in proper chronological order to satisfy constraints
  const createdAt = new Date(now.getTime() - (TEST_CONFIG.roundDuration * 1000) - 120000); // 2 minutes before drawing started
  const startedAt = new Date(createdAt.getTime() + 60000); // 1 minute after created (briefing phase)
  const drawingStartedAt = new Date(startedAt.getTime() + 20000); // 20 seconds after started (briefing duration)
  const votingStartedAt = new Date(drawingStartedAt.getTime() + (TEST_CONFIG.roundDuration * 1000)); // After drawing phase
  const phaseExpiresAt = new Date(votingStartedAt.getTime() + (TEST_CONFIG.votingDuration * 1000)); // Voting expires

  const { data: game, error } = await supabase
    .from('games')
    .insert({
      status: 'voting',
      prompt: TEST_CONFIG.gamePrompt,
      max_players: TEST_CONFIG.maxPlayers,
      current_players: 0, // Start with 0, will be updated when participants are added
      round_duration: TEST_CONFIG.roundDuration,
      voting_duration: TEST_CONFIG.votingDuration,
      created_by: creatorUserId,
      created_at: createdAt,
      started_at: startedAt,
      drawing_started_at: drawingStartedAt,
      voting_started_at: votingStartedAt,
      current_phase_duration: TEST_CONFIG.votingDuration,
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
  console.log(`   Started: ${startedAt.toISOString()}`);
  console.log(`   Drawing started: ${drawingStartedAt.toISOString()}`);
  console.log(`   Voting started: ${votingStartedAt.toISOString()}`);
  console.log(`   Voting expires: ${phaseExpiresAt.toISOString()}`);

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
        is_ready: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add participant ${user.username}: ${error.message}`);
    }

    console.log(`   ✅ Added participant: ${user.username}`);
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
 * Create mock submissions for each participant
 */
async function createSubmissions(gameId, users) {
  console.log('🎨 Creating mock submissions...');

  const submissions = [];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const drawingData = MOCK_DRAWINGS[i % MOCK_DRAWINGS.length];
    const imageUrl = PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length];

    const { data: submission, error } = await supabase
      .from('submissions')
      .insert({
        game_id: gameId,
        user_id: user.id,
        drawing_data: drawingData,
        drawing_url: imageUrl,
        drawing_thumbnail_url: imageUrl,
        canvas_width: 400,
        canvas_height: 300,
        element_count: drawingData.elements.length,
        drawing_time_seconds: Math.floor(Math.random() * 120) + 60, // 1-3 minutes
        vote_count: 0
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create submission for ${user.username}: ${error.message}`);
    }

    console.log(`   ✅ Created submission for: ${user.username}`);
    submissions.push(submission);
  }

  return submissions;
}

/**
 * Display final results and instructions
 */
function displayResults(game, users) {
  console.log('\n🎉 Voting phase test setup complete!');
  console.log('=' .repeat(60));
  console.log(`Game ID: ${game.id}`);
  console.log(`Prompt: "${game.prompt}"`);
  console.log(`Status: ${game.status}`);
  console.log(`Participants: ${users.length}`);
  console.log('');

  displayTestUserCredentials();
  console.log('');

  console.log('🌐 Navigation Instructions:');
  console.log(`1. Open: http://localhost:5173/uiux/voting?gameId=${game.id}`);
  console.log('2. Login with any of the test user credentials above');
  console.log('3. You should see the voting screen with 4 submissions');
  console.log('4. Test voting functionality and real-time updates');
  console.log('');

  console.log('🔄 To test real-time updates:');
  console.log('1. Open multiple browser windows/tabs');
  console.log('2. Login with different test users in each');
  console.log('3. Vote from different accounts and watch real-time updates');
  console.log('');

  console.log('⏰ Timer Info:');
  console.log(`   Voting phase expires: ${game.phase_expires_at}`);
  console.log(`   Voting duration: ${TEST_CONFIG.votingDuration} seconds`);
  console.log('');

  console.log('🧹 Cleanup:');
  console.log('   Run this script again to create a fresh test scenario');
  console.log('   Previous test data will be automatically cleaned up');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Voting Phase Test Setup');
  console.log('====================================');

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

    // Step 2: Get test users (assumes they already exist)
    const users = await getTestUsers(supabase);
    console.log('');

    // Step 3: Create test game (use first user as creator)
    const game = await createTestGame(users[0].id);
    console.log('');

    // Step 4: Add participants to game
    await addParticipants(game.id, users);
    console.log('');

    // Step 5: Create mock submissions
    await createSubmissions(game.id, users);
    console.log('');

    // Step 6: Display results and instructions
    displayResults(game, users);

  } catch (error) {
    console.error('\n❌ Error setting up voting phase test:');
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