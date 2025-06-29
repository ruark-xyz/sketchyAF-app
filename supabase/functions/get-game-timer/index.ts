// supabase/functions/get-game-timer/index.ts
// Edge Function for server-side timer synchronization
// Provides authoritative timer state for game clients

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface TimerRequest {
  gameId: string;
}

interface TimerResponse {
  timeRemaining: number | null;
  phaseDuration: number | null;
  phaseExpiresAt: string | null;
  serverTime: string;
  phase: string | null;
  error?: string;
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

    // Parse and validate request body
    let requestBody: TimerRequest;
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

    const { gameId } = requestBody;

    // Validate gameId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!gameId || !uuidRegex.test(gameId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid gameId format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authenticate user and verify game participation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify user has access to this game
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user is participant in the game
    const { data: participation, error: participationError } = await supabase
      .from('game_participants')
      .select('id')
      .eq('game_id', gameId)
      .eq('user_id', user.id)
      .is('left_at', null)
      .single();

    if (participationError || !participation) {
      return new Response(
        JSON.stringify({ error: 'Access denied: not a participant in this game' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get current game timer state using our database function
    const { data: timerData, error: timerError } = await supabase
      .rpc('get_game_timer_state', { game_uuid: gameId });

    if (timerError) {
      console.error('Database error fetching timer state:', timerError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch timer data' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!timerData || timerData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Game not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const timer = timerData[0];
    const now = new Date();

    const response: TimerResponse = {
      timeRemaining: timer.time_remaining,
      phaseDuration: timer.phase_duration,
      phaseExpiresAt: timer.phase_expires_at,
      serverTime: now.toISOString(),
      phase: timer.phase
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in get-game-timer:', error);
    return new Response(
      JSON.stringify({
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
