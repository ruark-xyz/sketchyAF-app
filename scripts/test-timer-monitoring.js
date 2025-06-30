#!/usr/bin/env node

/**
 * Local Testing Script for Database Timer Monitoring
 * 
 * This script tests the monitor_game_timers_db() function locally
 * and provides utilities for creating test games and monitoring performance.
 * 
 * Usage:
 *   npm run monitor:test          # Run single test
 *   npm run monitor:continuous    # Run continuous monitoring (every 10s)
 *   npm run monitor:stats         # Show timer monitoring statistics
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
 * Test the database timer monitoring function
 */
async function testTimerMonitoring() {
  console.log('🔍 Testing database timer monitoring function...');
  
  try {
    const startTime = Date.now();
    
    // Call the database function
    const { data, error } = await supabase.rpc('monitor_game_timers_db');
    
    const endTime = Date.now();
    const clientExecutionTime = endTime - startTime;
    
    if (error) {
      console.error('❌ Database function error:', error);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.error('❌ No results returned from monitor_game_timers_db()');
      return false;
    }
    
    const result = data[0];
    
    console.log('✅ Timer monitoring completed successfully');
    console.log('📊 Results:', {
      processed: result.processed,
      errors: result.errors,
      skipped: result.skipped,
      dbExecutionTime: `${result.execution_time_ms}ms`,
      clientExecutionTime: `${clientExecutionTime}ms`,
      timestamp: result.result_timestamp
    });
    
    if (result.details && result.details.games && result.details.games.length > 0) {
      console.log('🎮 Game Details:');
      result.details.games.forEach((game, index) => {
        console.log(`  ${index + 1}. Game ${game.game_id}: ${game.action}`);
        if (game.from_status && game.to_status) {
          console.log(`     Transition: ${game.from_status} → ${game.to_status}`);
        }
        if (game.reason) {
          console.log(`     Reason: ${game.reason}`);
        }
      });
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

/**
 * Get timer monitoring statistics
 */
async function getTimerStats() {
  console.log('📈 Fetching timer monitoring statistics...');
  
  try {
    const { data, error } = await supabase.rpc('get_timer_monitoring_stats');
    
    if (error) {
      console.error('❌ Stats error:', error);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('📊 No statistics available');
      return;
    }
    
    const stats = data[0];
    
    console.log('📊 Timer Monitoring Statistics:');
    console.log(`   Active Games: ${stats.active_games}`);
    console.log(`   Expired Games: ${stats.expired_games}`);
    console.log(`   Next Expiration: ${stats.next_expiration || 'None'}`);
    
    if (stats.games_by_status) {
      console.log('   Games by Status:');
      Object.entries(stats.games_by_status).forEach(([status, count]) => {
        console.log(`     ${status}: ${count}`);
      });
    }
    
    if (stats.advisory_locks && stats.advisory_locks.length > 0) {
      console.log('   Advisory Locks:');
      stats.advisory_locks.forEach(lock => {
        console.log(`     ${lock.lock_key}: ${lock.acquired_by} (${lock.age_seconds}s ago)`);
      });
    } else {
      console.log('   Advisory Locks: None active');
    }
    
  } catch (error) {
    console.error('❌ Stats failed:', error.message);
  }
}

/**
 * Create a test game with expired timer for testing
 */
async function createTestGame() {
  console.log('🎮 Creating test game with expired timer...');

  try {
    // Get an existing test user
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('❌ No test users found. Please run: npm run seed:users');
      return null;
    }

    const testUser = users[0];
    console.log(`   Using test user: ${testUser.username} (${testUser.id})`);

    // Create a test game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        prompt: 'Test prompt for timer monitoring',
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
      return null;
    }

    console.log(`✅ Created test game: ${game.id}`);
    console.log(`   Status: ${game.status}`);
    console.log(`   Expires: ${game.phase_expires_at}`);
    console.log(`   Is Expired: ${new Date(game.phase_expires_at) < new Date()}`);

    return game.id;

  } catch (error) {
    console.error('❌ Test game creation failed:', error.message);
    return null;
  }
}

/**
 * Clean up test games
 */
async function cleanupTestGames() {
  console.log('🧹 Cleaning up test games...');
  
  try {
    const { data, error } = await supabase
      .from('games')
      .delete()
      .eq('prompt', 'Test prompt for timer monitoring')
      .select();
    
    if (error) {
      console.error('❌ Cleanup failed:', error);
      return;
    }
    
    console.log(`✅ Cleaned up ${data?.length || 0} test games`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

/**
 * Run continuous monitoring with Supabase Realtime (simulates production)
 */
async function runContinuousMonitoring() {
  console.log('🔄 Starting continuous timer monitoring (every 10 seconds)');
  console.log('   This simulates the production cron job with Supabase Realtime notifications');
  console.log('   Press Ctrl+C to stop');

  let iteration = 0;

  const runMonitoring = async () => {
    iteration++;
    console.log(`\n--- Iteration ${iteration} (${new Date().toISOString()}) ---`);

    try {
      // Run the database timer monitoring function
      const startTime = Date.now();
      const { data, error } = await supabase.rpc('monitor_game_timers_db');
      const endTime = Date.now();

      if (error) {
        console.error('❌ Database function error:', error);
        return;
      }

      if (!data || data.length === 0) {
        console.log('⚠️  No results returned from monitor_game_timers_db()');
        return;
      }

      const result = data[0];

      console.log('📊 Monitoring Results:', {
        processed: result.processed,
        errors: result.errors,
        skipped: result.skipped,
        dbExecutionTime: `${result.execution_time_ms}ms`,
        clientExecutionTime: `${endTime - startTime}ms`
      });

      // If games were processed, Supabase Realtime will automatically notify clients
      if (result.processed > 0 && result.details && result.details.games) {
        console.log('📡 Supabase Realtime will automatically notify clients of game changes...');

        for (const gameDetail of result.details.games) {
          if (gameDetail.action === 'transitioned') {
            console.log(`✅ Game transition: ${gameDetail.game_id} (${gameDetail.from_status} → ${gameDetail.to_status})`);
            console.log(`   Clients subscribed to postgres_changes will receive this update automatically`);
          } else if (gameDetail.action === 'grace_period_started') {
            console.log(`⏳ Grace period started: ${gameDetail.game_id} (${gameDetail.grace_period_seconds}s)`);
          } else if (gameDetail.action === 'grace_period_expired') {
            console.log(`⏰ Grace period expired: ${gameDetail.game_id} (proceeding with transition)`);
          }
        }
      }

    } catch (error) {
      console.error('❌ Continuous monitoring error:', error.message);
    }

    setTimeout(runMonitoring, 10000); // Run every 10 seconds
  };

  await runMonitoring();
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'test':
      await testTimerMonitoring();
      break;
      
    case 'stats':
      await getTimerStats();
      break;
      
    case 'continuous':
      await runContinuousMonitoring();
      break;
      
    case 'create-test':
      await createTestGame();
      break;
      
    case 'cleanup':
      await cleanupTestGames();
      break;
      
    case 'full-test':
      console.log('🧪 Running full test suite...\n');
      await getTimerStats();
      console.log('\n');
      const gameId = await createTestGame();
      if (gameId) {
        console.log('\n');
        await testTimerMonitoring();
        console.log('\n');
        await cleanupTestGames();
      }
      break;
      
    default:
      console.log('Usage:');
      console.log('  node scripts/test-timer-monitoring.js test         # Run single test');
      console.log('  node scripts/test-timer-monitoring.js stats        # Show statistics');
      console.log('  node scripts/test-timer-monitoring.js continuous   # Run continuous monitoring');
      console.log('  node scripts/test-timer-monitoring.js create-test  # Create test game');
      console.log('  node scripts/test-timer-monitoring.js cleanup      # Clean up test games');
      console.log('  node scripts/test-timer-monitoring.js full-test    # Run complete test suite');
      process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
