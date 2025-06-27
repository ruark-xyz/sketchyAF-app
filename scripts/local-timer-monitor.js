#!/usr/bin/env node

// Local Timer Monitor - Simulates the cron job for monitor-game-timers
// This script calls the monitor-game-timers Edge Function every 10 seconds

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Set a local cron secret for testing
const CRON_SECRET = process.env.CRON_SECRET || 'local-dev-secret-123';

let isRunning = false;
let intervalId = null;

async function callTimerMonitor() {
  if (isRunning) {
    console.log('⏭️  Previous monitor call still running, skipping...');
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  
  try {
    console.log(`🔍 [${new Date().toISOString()}] Calling monitor-game-timers...`);
    
    const { data, error } = await supabase.functions.invoke('monitor-game-timers', {
      body: {},
      headers: {
        'x-cron-secret': CRON_SECRET,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    const duration = Date.now() - startTime;

    if (error) {
      console.log(`❌ Error: ${error.message}`);
      console.log(`   Duration: ${duration}ms\n`);
    } else {
      console.log(`✅ Success: Processed ${data.processed}, Errors: ${data.errors}, Skipped: ${data.skipped}`);
      console.log(`   Duration: ${duration}ms\n`);
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`💥 Exception: ${error.message}`);
    console.log(`   Duration: ${duration}ms\n`);
  } finally {
    isRunning = false;
  }
}

function startMonitoring() {
  console.log('🚀 Starting local timer monitor...');
  console.log(`📡 Supabase URL: ${process.env.VITE_SUPABASE_URL}`);
  console.log(`🔑 Using cron secret: ${CRON_SECRET}`);
  console.log('⏰ Running every 10 seconds (Ctrl+C to stop)\n');

  // Call immediately
  callTimerMonitor();

  // Then call every 10 seconds
  intervalId = setInterval(callTimerMonitor, 10000);
}

function stopMonitoring() {
  console.log('\n🛑 Stopping timer monitor...');
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', stopMonitoring);
process.on('SIGTERM', stopMonitoring);

// Start monitoring
startMonitoring();
