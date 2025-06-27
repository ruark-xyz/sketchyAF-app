#!/usr/bin/env node

// Manual Test for Timer Monitor - One-time execution
// Use this to test the monitor-game-timers function manually

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CRON_SECRET = process.env.CRON_SECRET || 'local-dev-secret-123';

async function testTimerMonitor() {
  console.log('🧪 Testing timer monitor function...\n');

  try {
    // 1. First, let's see if there are any expired games
    console.log('1. Checking for expired games in database...');
    const { data: expiredGames, error: queryError } = await supabase
      .rpc('find_expired_games', { limit_count: 10 });

    if (queryError) {
      console.log('❌ Error querying expired games:', queryError.message);
      return;
    }

    console.log(`   Found ${expiredGames?.length || 0} expired games`);
    if (expiredGames && expiredGames.length > 0) {
      expiredGames.forEach(game => {
        console.log(`   - Game ${game.game_id}: ${game.current_status} (expired: ${game.phase_expires_at})`);
      });
    }
    console.log('');

    // 2. Call the monitor function
    console.log('2. Calling monitor-game-timers Edge Function...');
    const startTime = Date.now();

    const { data, error } = await supabase.functions.invoke('monitor-game-timers', {
      body: {},
      headers: {
        'x-cron-secret': CRON_SECRET
      }
    });

    const duration = Date.now() - startTime;

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`   Duration: ${duration}ms`);
      return;
    }

    console.log(`✅ Monitor completed successfully!`);
    console.log(`   Processed: ${data.processed} games`);
    console.log(`   Errors: ${data.errors}`);
    console.log(`   Skipped: ${data.skipped}`);
    console.log(`   Execution Time: ${data.executionTime}ms`);
    console.log(`   Total Duration: ${duration}ms`);
    console.log(`   Timestamp: ${data.timestamp}`);

    if (data.message) {
      console.log(`   Message: ${data.message}`);
    }

    // 3. Check again for expired games after processing
    console.log('\n3. Checking for remaining expired games...');
    const { data: remainingGames } = await supabase
      .rpc('find_expired_games', { limit_count: 10 });

    console.log(`   Found ${remainingGames?.length || 0} expired games after processing`);

  } catch (error) {
    console.log(`💥 Exception: ${error.message}`);
  }
}

// Run the test
testTimerMonitor()
  .then(() => {
    console.log('\n🎉 Test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
