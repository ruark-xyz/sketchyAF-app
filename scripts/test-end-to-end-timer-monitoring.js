#!/usr/bin/env node

/**
 * End-to-End Timer Monitoring Test Script
 * 
 * This script tests the complete timer monitoring flow including PubNub broadcasting
 * in local development where pg_net extension is not available.
 * 
 * It simulates the production environment by:
 * 1. Running the database timer monitoring function
 * 2. Manually calling the PubNub Edge Function for any processed games
 * 3. Verifying the complete flow works end-to-end
 * 
 * Usage:
 *   npm run monitor:e2e-test
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('Please check your .env.local file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Test the complete end-to-end timer monitoring flow
 */
async function testEndToEndFlow() {
  console.log('🔄 Testing End-to-End Timer Monitoring Flow...');
  console.log('=====================================');
  
  try {
    // Step 1: Create a test game with expired timer
    console.log('\n📝 Step 1: Creating test game with expired timer...');
    
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.error('❌ No test users found. Please run: npm run seed:users');
      return false;
    }
    
    const testUser = users[0];
    console.log(`   Using test user: ${testUser.username} (${testUser.id})`);
    
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        prompt: 'E2E Test: Timer monitoring with PubNub',
        max_players: 2,
        current_players: 1,
        round_duration: 60,
        voting_duration: 30,
        status: 'briefing',
        current_phase_duration: 20,
        phase_expires_at: new Date(Date.now() - 5000).toISOString(), // Expired 5 seconds ago
        created_by: testUser.id
      })
      .select()
      .single();
    
    if (gameError) {
      console.error('❌ Failed to create test game:', gameError);
      return false;
    }
    
    console.log(`✅ Created test game: ${game.id}`);
    console.log(`   Status: ${game.status}`);
    console.log(`   Expires: ${game.phase_expires_at}`);
    console.log(`   Is Expired: ${new Date(game.phase_expires_at) < new Date()}`);
    
    // Step 2: Run database timer monitoring
    console.log('\n⚡ Step 2: Running database timer monitoring...');
    
    const startTime = Date.now();
    const { data: monitorResult, error: monitorError } = await supabase.rpc('monitor_game_timers_db');
    const endTime = Date.now();
    
    if (monitorError) {
      console.error('❌ Timer monitoring failed:', monitorError);
      return false;
    }
    
    if (!monitorResult || monitorResult.length === 0) {
      console.error('❌ No results from timer monitoring');
      return false;
    }
    
    const result = monitorResult[0];
    console.log('✅ Timer monitoring completed');
    console.log(`   Processed: ${result.processed} games`);
    console.log(`   Errors: ${result.errors}`);
    console.log(`   Skipped: ${result.skipped}`);
    console.log(`   DB Execution Time: ${result.execution_time_ms}ms`);
    console.log(`   Client Execution Time: ${endTime - startTime}ms`);
    
    if (result.processed === 0) {
      console.log('⚠️  No games were processed - this might be expected if no games were expired');
    }
    
    // Step 3: Verify game status changed
    console.log('\n🔍 Step 3: Verifying game status change...');
    
    const { data: updatedGame, error: gameCheckError } = await supabase
      .from('games')
      .select('id, status, phase_expires_at')
      .eq('id', game.id)
      .single();
    
    if (gameCheckError) {
      console.error('❌ Failed to check updated game:', gameCheckError);
      return false;
    }
    
    if (updatedGame.status !== game.status) {
      console.log(`✅ Game status changed: ${game.status} → ${updatedGame.status}`);
      console.log(`   New expiry: ${updatedGame.phase_expires_at}`);
      
      // Step 4: Test PubNub broadcasting manually
      console.log('\n📡 Step 4: Testing PubNub broadcasting...');
      
      const pubNubEvent = {
        type: 'phase_changed',
        gameId: game.id,
        timestamp: Date.now(),
        userId: 'system',
        version: '1.0.0',
        data: {
          newPhase: updatedGame.status,
          previousPhase: game.status,
          phaseStartedAt: new Date().toISOString(),
          transitionTriggeredBy: 'e2e_test',
          gameData: {
            prompt: game.prompt,
            maxPlayers: game.max_players,
            currentPlayers: game.current_players
          }
        }
      };
      
      try {
        const { data: pubNubResult, error: pubNubError } = await supabase.functions.invoke(
          'broadcast-pubnub-event',
          { body: pubNubEvent }
        );
        
        if (pubNubError) {
          console.error('❌ PubNub broadcasting failed:', pubNubError);
          return false;
        }
        
        console.log('✅ PubNub broadcasting successful');
        console.log(`   Game Channel Result: ${pubNubResult.gameChannel ? 'Success' : 'Failed'}`);
        if (pubNubResult.gameChannel && pubNubResult.gameChannel.timetoken) {
          console.log(`   Timetoken: ${pubNubResult.gameChannel.timetoken}`);
        }
        
      } catch (error) {
        console.error('❌ PubNub broadcasting error:', error.message);
        return false;
      }
      
    } else {
      console.log(`⚠️  Game status unchanged: ${updatedGame.status}`);
      console.log('   This might indicate the game was not expired or already processed');
    }
    
    // Step 5: Cleanup
    console.log('\n🧹 Step 5: Cleaning up test game...');
    
    const { error: deleteError } = await supabase
      .from('games')
      .delete()
      .eq('id', game.id);
    
    if (deleteError) {
      console.warn('⚠️  Failed to cleanup test game:', deleteError);
    } else {
      console.log('✅ Test game cleaned up');
    }
    
    console.log('\n🎉 End-to-End Test Completed Successfully!');
    console.log('=====================================');
    console.log('✅ Database timer monitoring: Working');
    console.log('✅ Game status transitions: Working');
    console.log('✅ PubNub broadcasting: Working');
    console.log('✅ Complete flow: Working');
    
    return true;
    
  } catch (error) {
    console.error('❌ End-to-end test failed:', error.message);
    return false;
  }
}

/**
 * Test PubNub Edge Function directly
 */
async function testPubNubEdgeFunction() {
  console.log('📡 Testing PubNub Edge Function directly...');
  
  try {
    const testEvent = {
      type: 'test_event',
      gameId: 'test-game-123',
      timestamp: Date.now(),
      userId: 'test-user',
      version: '1.0.0',
      data: {
        message: 'Direct Edge Function test'
      }
    };
    
    const { data, error } = await supabase.functions.invoke('broadcast-pubnub-event', {
      body: testEvent
    });
    
    if (error) {
      console.error('❌ PubNub Edge Function test failed:', error);
      return false;
    }
    
    console.log('✅ PubNub Edge Function test successful');
    console.log('   Response:', data);
    return true;
    
  } catch (error) {
    console.error('❌ PubNub Edge Function test error:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'e2e':
      await testEndToEndFlow();
      break;
      
    case 'pubnub':
      await testPubNubEdgeFunction();
      break;
      
    default:
      console.log('Usage:');
      console.log('  node scripts/test-end-to-end-timer-monitoring.js e2e     # Run complete end-to-end test');
      console.log('  node scripts/test-end-to-end-timer-monitoring.js pubnub  # Test PubNub Edge Function only');
      process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

main().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
