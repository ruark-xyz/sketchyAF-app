#!/usr/bin/env node

/**
 * Test Phase Transition Script
 * 
 * This script tests the automatic phase transition from briefing to drawing
 * by creating a game and monitoring the database for status changes.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Create a test game that will transition from briefing to drawing
 */
async function createTestGame() {
  console.log('🎮 Creating test game for phase transition...');
  
  // Create a game that will expire in 10 seconds
  const now = new Date();
  const briefingStartTime = new Date(now.getTime() + 1000); // Start in 1 second
  const briefingEndTime = new Date(briefingStartTime.getTime() + 10000); // End in 10 seconds
  
  const { data: game, error } = await supabase
    .from('games')
    .insert({
      status: 'briefing',
      prompt: 'Test phase transition - draw a simple circle',
      max_players: 2,
      current_players: 1,
      round_duration: 60,
      voting_duration: 30,
      created_by: '00000000-0000-0000-0000-000000000001', // Test user
      created_at: now.toISOString(),
      started_at: briefingStartTime.toISOString(),
      current_phase_duration: 10, // 10 seconds briefing
      phase_expires_at: briefingEndTime.toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create test game:', error);
    return null;
  }

  console.log('✅ Test game created:', {
    id: game.id,
    status: game.status,
    briefingStartTime: briefingStartTime.toISOString(),
    briefingEndTime: briefingEndTime.toISOString(),
    timeUntilTransition: '10 seconds'
  });

  return game;
}

/**
 * Monitor game status changes
 */
async function monitorGameStatus(gameId) {
  console.log('👀 Monitoring game status changes...');
  
  let lastStatus = null;
  let checkCount = 0;
  const maxChecks = 30; // Check for 30 seconds
  
  const checkStatus = async () => {
    checkCount++;
    
    const { data: game, error } = await supabase
      .from('games')
      .select('id, status, phase_expires_at, updated_at')
      .eq('id', gameId)
      .single();
    
    if (error) {
      console.error('❌ Error checking game status:', error);
      return;
    }
    
    if (game.status !== lastStatus) {
      console.log(`🔄 Status changed: ${lastStatus || 'initial'} → ${game.status}`, {
        timestamp: new Date().toISOString(),
        phaseExpiresAt: game.phase_expires_at,
        updatedAt: game.updated_at
      });
      lastStatus = game.status;
      
      if (game.status === 'drawing') {
        console.log('🎉 SUCCESS: Game transitioned to drawing phase!');
        return true; // Stop monitoring
      }
    } else {
      console.log(`⏳ Status check ${checkCount}: ${game.status} (no change)`);
    }
    
    if (checkCount >= maxChecks) {
      console.log('⏰ Monitoring timeout reached');
      return true; // Stop monitoring
    }
    
    return false; // Continue monitoring
  };
  
  // Check every second
  const interval = setInterval(async () => {
    const shouldStop = await checkStatus();
    if (shouldStop) {
      clearInterval(interval);
      console.log('🏁 Monitoring complete');
    }
  }, 1000);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Phase Transition Test');
  console.log('==================================');
  
  try {
    // Create test game
    const game = await createTestGame();
    if (!game) {
      console.error('❌ Failed to create test game');
      return;
    }
    
    console.log('');
    console.log('📊 Test Details:');
    console.log(`Game ID: ${game.id}`);
    console.log(`Initial Status: ${game.status}`);
    console.log(`Expected Transition: briefing → drawing`);
    console.log(`Monitor Duration: 30 seconds`);
    console.log('');
    
    // Monitor status changes
    await monitorGameStatus(game.id);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
main().catch(console.error);
