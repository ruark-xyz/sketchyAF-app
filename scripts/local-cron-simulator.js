#!/usr/bin/env node

/**
 * Local Cron Job Simulator
 * Simulates periodic execution of the monitor-game-timers function for local development
 */

const MONITOR_INTERVAL = 10000; // 10 seconds (adjust as needed)
const SUPABASE_URL = 'http://127.0.0.1:54321';
const CRON_SECRET = 'local-dev-secret-123';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

let isRunning = false;
let executionCount = 0;

async function callMonitorFunction() {
  if (isRunning) {
    console.log('⏳ Previous execution still running, skipping...');
    return;
  }

  isRunning = true;
  executionCount++;
  
  try {
    console.log(`\n🔄 [${new Date().toISOString()}] Execution #${executionCount}: Calling monitor-game-timers...`);
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/monitor-game-timers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('✅ Monitor function result:', {
      processed: result.processed,
      errors: result.errors,
      skipped: result.skipped,
      executionTime: `${result.executionTime}ms`
    });

    if (result.processed > 0) {
      console.log(`🎮 ${result.processed} games transitioned!`);
    }
    
    if (result.errors > 0) {
      console.log(`❌ ${result.errors} errors occurred`);
    }

  } catch (error) {
    console.error('❌ Monitor function failed:', error.message);
  } finally {
    isRunning = false;
  }
}

// Start the periodic execution
console.log('🚀 Starting local cron simulator...');
console.log(`⏰ Monitoring every ${MONITOR_INTERVAL / 1000} seconds`);
console.log('📋 Press Ctrl+C to stop\n');

// Initial call
callMonitorFunction();

// Set up periodic execution
const interval = setInterval(callMonitorFunction, MONITOR_INTERVAL);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping local cron simulator...');
  clearInterval(interval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping local cron simulator...');
  clearInterval(interval);
  process.exit(0);
});
