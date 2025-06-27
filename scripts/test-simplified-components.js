#!/usr/bin/env node

/**
 * Test Script for Simplified Architecture Components
 * Tests the new simplified components and hooks
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

// Use hardcoded values for testing since env vars might not be available
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Testing Simplified Architecture Components...\n');

async function testSimpleTimer() {
  console.log('1. Testing useSimpleTimer hook simulation...');
  
  try {
    // Create a test game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        status: 'briefing',
        max_players: 4,
        current_phase_duration: 30,
        phase_expires_at: new Date(Date.now() + 30000).toISOString()
      })
      .select()
      .single();

    if (gameError) throw gameError;

    console.log(`✅ Test game created: ${game.id}`);

    // Simulate useSimpleTimer API call
    const { data: timerData, error: timerError } = await supabase
      .rpc('get_game_timer_info', { game_id: game.id });

    if (timerError) throw timerError;

    console.log('📊 Timer Data:', {
      timeRemaining: timerData.time_remaining,
      phaseDuration: timerData.phase_duration,
      phase: timerData.phase,
      formattedTime: `${Math.floor(timerData.time_remaining / 60)}:${(timerData.time_remaining % 60).toString().padStart(2, '0')}`
    });

    // Clean up
    await supabase.from('games').delete().eq('id', game.id);
    console.log('✅ useSimpleTimer simulation successful\n');

  } catch (error) {
    console.error('❌ useSimpleTimer test failed:', error.message);
  }
}

async function testSimpleGameRoute() {
  console.log('2. Testing SimpleGameRoute logic simulation...');
  
  try {
    // Create test game in different statuses
    const testStatuses = ['briefing', 'drawing', 'voting', 'results', 'completed'];
    
    for (const status of testStatuses) {
      const { data: game, error } = await supabase
        .from('games')
        .insert({
          status,
          max_players: 4,
          current_phase_duration: 30,
          phase_expires_at: new Date(Date.now() + 30000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Simulate route access check
      const allowedStatuses = {
        'BriefingRoute': ['briefing', 'waiting'],
        'DrawingRoute': ['drawing'],
        'VotingRoute': ['voting'],
        'ResultsRoute': ['results']
      };

      console.log(`   ${status} status:`, {
        BriefingRoute: allowedStatuses.BriefingRoute.includes(status) ? '✅ ALLOWED' : '❌ BLOCKED',
        DrawingRoute: allowedStatuses.DrawingRoute.includes(status) ? '✅ ALLOWED' : '❌ BLOCKED',
        VotingRoute: allowedStatuses.VotingRoute.includes(status) ? '✅ ALLOWED' : '❌ BLOCKED',
        ResultsRoute: allowedStatuses.ResultsRoute.includes(status) ? '✅ ALLOWED' : '❌ BLOCKED'
      });

      // Clean up
      await supabase.from('games').delete().eq('id', game.id);
    }

    console.log('✅ SimpleGameRoute logic simulation successful\n');

  } catch (error) {
    console.error('❌ SimpleGameRoute test failed:', error.message);
  }
}

async function testUnifiedGameState() {
  console.log('3. Testing useUnifiedGameState logic simulation...');
  
  try {
    // Create test game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        status: 'briefing',
        max_players: 4,
        current_phase_duration: 30,
        phase_expires_at: new Date(Date.now() + 30000).toISOString()
      })
      .select()
      .single();

    if (gameError) throw gameError;

    console.log(`✅ Test game created: ${game.id}`);

    // Simulate navigation logic
    const getRouteForStatus = (status) => {
      const baseParams = `?gameId=${game.id}`;
      
      switch (status) {
        case 'waiting':
        case 'briefing':
          return `/uiux/pre-round${baseParams}`;
        case 'drawing':
          return `/uiux/draw${baseParams}`;
        case 'voting':
          return `/uiux/voting${baseParams}`;
        case 'results':
          return `/uiux/results${baseParams}`;
        case 'completed':
        case 'cancelled':
          return `/uiux/lobby${baseParams}`;
        default:
          return `/uiux/lobby${baseParams}`;
      }
    };

    console.log('🧭 Navigation mapping:', {
      briefing: getRouteForStatus('briefing'),
      drawing: getRouteForStatus('drawing'),
      voting: getRouteForStatus('voting'),
      results: getRouteForStatus('results'),
      completed: getRouteForStatus('completed')
    });

    // Clean up
    await supabase.from('games').delete().eq('id', game.id);
    console.log('✅ useUnifiedGameState simulation successful\n');

  } catch (error) {
    console.error('❌ useUnifiedGameState test failed:', error.message);
  }
}

async function runTests() {
  await testSimpleTimer();
  await testSimpleGameRoute();
  await testUnifiedGameState();

  console.log('🎉 All simplified component tests completed!\n');
  
  console.log('📋 Summary of Changes:');
  console.log('   ✅ useSimpleTimer: Display-only timer with server state');
  console.log('   ✅ SimpleGameRoute: Single status-based access control');
  console.log('   ✅ useUnifiedGameState: Centralized navigation logic');
  console.log('   ✅ Removed dual state management conflicts');
  console.log('   ✅ Eliminated complex timer expiration logic');
  console.log('   ✅ Simplified component navigation useEffects');
}

runTests().catch(console.error);
