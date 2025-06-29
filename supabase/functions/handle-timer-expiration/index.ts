// supabase/functions/handle-timer-expiration/index.ts
// Edge Function to handle individual timer expiration events
// Called by monitor-game-timers for each expired game

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ExpirationRequest {
  gameId: string;
  currentStatus: string;
  executionId?: string;
}

interface ExpirationResponse {
  success: boolean;
  transitioned?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log environment for debugging
    console.log('Environment check:', {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceRole: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      authHeader: req.headers.get('Authorization')?.substring(0, 20) + '...'
    });

    // Parse request body
    let requestBody: ExpirationRequest;
    try {
      requestBody = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { gameId, currentStatus, executionId } = requestBody;

    // Validate required fields
    if (!gameId || !currentStatus) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: gameId, currentStatus' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate gameId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(gameId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid gameId format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role (no user auth needed for server-side calls)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Determine next phase
    const nextPhaseMap: Record<string, string> = {
      'briefing': 'drawing',
      'drawing': 'voting',
      'voting': 'results',
      'results': 'completed'
    };

    const nextStatus = nextPhaseMap[currentStatus];
    if (!nextStatus) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `No valid next phase for status: ${currentStatus}`,
          skipped: true,
          reason: 'invalid_phase'
        }),
        {
          status: 200, // Not an error, just no transition needed
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Processing timer expiration for game ${gameId}: ${currentStatus} -> ${nextStatus}`, {
      executionId,
      timestamp: new Date().toISOString()
    });

    // Verify game still exists and is in expected state
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, status, phase_expires_at')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Game not found or inaccessible',
          skipped: true,
          reason: 'game_not_found'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if game status has already changed (race condition)
    if (game.status !== currentStatus) {
      console.log(`Game ${gameId} status already changed from ${currentStatus} to ${game.status}, skipping`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true,
          reason: 'already_transitioned',
          transitioned: `${currentStatus} -> ${game.status} (already done)`
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Double-check timer hasn't been extended (edge case)
    if (game.phase_expires_at) {
      const expiresAt = new Date(game.phase_expires_at);
      const now = new Date();
      if (expiresAt > now) {
        console.log(`Game ${gameId} timer was extended, skipping expiration`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            skipped: true,
            reason: 'timer_extended',
            transitioned: 'none (timer extended)'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Trigger phase transition using existing database function
    const { error: transitionError } = await supabase.rpc('transition_game_status', {
      game_uuid: gameId,
      new_status: nextStatus
    });

    if (transitionError) {
      console.error('Timer expiration transition failed:', transitionError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: transitionError.message,
          details: transitionError
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Successfully transitioned game ${gameId} from ${currentStatus} to ${nextStatus}`);

    // Broadcast timer expiration event via PubNub
    try {
      await supabase.functions.invoke('broadcast-pubnub-event', {
        body: {
          type: 'timer_expired',
          gameId,
          userId: 'server',
          timestamp: Date.now(),
          version: '1.0.0',
          data: {
            expiredPhase: currentStatus,
            nextPhase: nextStatus,
            expiredAt: new Date().toISOString(),
            transitionTriggeredBy: 'server_timer',
            executionId
          }
        }
      });
    } catch (broadcastError) {
      console.warn('Failed to broadcast timer expiration event:', broadcastError);
      // Don't fail the transition if broadcast fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        transitioned: `${currentStatus} -> ${nextStatus}`,
        executionId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in handle-timer-expiration:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
