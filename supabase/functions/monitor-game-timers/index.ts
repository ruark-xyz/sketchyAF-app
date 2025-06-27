// supabase/functions/monitor-game-timers/index.ts
// Scheduled Edge Function to monitor and process expired game timers
// Runs every 10 seconds via Supabase Cron

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface MonitoringResult {
  processed: number;
  errors: number;
  skipped: number;
  executionTime: number;
  timestamp: string;
  message?: string;
  error?: string;
}

serve(async (req) => {
  const startTime = Date.now();
  let processed = 0;
  let errors = 0;
  let skipped = 0;

  try {
    // Debug environment
    console.log('Monitor function called with headers:', {
      cronSecret: req.headers.get('x-cron-secret'),
      hasExpectedSecret: !!Deno.env.get('CRON_SECRET'),
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceRole: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    });

    // Validate this is a scheduled execution (basic security)
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');

    if (!cronSecret || cronSecret !== expectedSecret) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized cron execution',
          debug: {
            receivedSecret: cronSecret ? 'present' : 'missing',
            expectedSecret: expectedSecret ? 'present' : 'missing'
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Prevent overlapping executions using database lock (skip in local development)
    const isLocalDev = Deno.env.get('SUPABASE_URL')?.includes('127.0.0.1') ||
                       Deno.env.get('SUPABASE_URL')?.includes('localhost');

    let lockKey = 'timer_monitoring_lock';

    if (!isLocalDev) {
      const { data: lockResult, error: lockError } = await supabase.rpc('acquire_advisory_lock', {
        lock_key: lockKey,
        timeout_seconds: 5
      });

      if (lockError || !lockResult) {
        console.log('Timer monitoring already in progress, skipping execution');
        return new Response(JSON.stringify({
          processed: 0,
          errors: 0,
          skipped: 1,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          message: 'Execution skipped - already in progress'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    } else {
      console.log('Local development detected, skipping advisory lock');
    }

    try {
      // Find expired games using our database function
      const { data: expiredGames, error: queryError } = await supabase
        .rpc('find_expired_games', { limit_count: 50 });

      if (queryError) {
        console.error('Error querying expired games:', queryError);
        errors++;
        return new Response(JSON.stringify({
          processed: 0,
          errors: 1,
          skipped: 0,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          error: 'Database query failed'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`Found ${expiredGames?.length || 0} expired games to process`);

      if (!expiredGames || expiredGames.length === 0) {
        return new Response(JSON.stringify({
          processed: 0,
          errors: 0,
          skipped: 0,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          message: 'No expired games found'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Process expired games in parallel with concurrency limit
      const concurrencyLimit = 5;
      const gameChunks = [];

      for (let i = 0; i < expiredGames.length; i += concurrencyLimit) {
        gameChunks.push(expiredGames.slice(i, i + concurrencyLimit));
      }

      for (const chunk of gameChunks) {
        const promises = chunk.map(async (game) => {
          try {
            const executionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            console.log(`Processing expired game ${game.game_id}: ${game.current_status}`, { executionId });

            // Handle timer expiration directly in this function to avoid auth issues
            const nextPhaseMap: Record<string, string> = {
              'briefing': 'drawing',
              'drawing': 'voting',
              'voting': 'results',
              'results': 'completed'
            };

            const nextStatus = nextPhaseMap[game.current_status];
            if (!nextStatus) {
              console.log(`No valid next phase for ${game.current_status}, skipping game ${game.game_id}`);
              skipped++;
              return;
            }

            console.log(`Next phase for ${game.current_status} is ${nextStatus} for game ${game.game_id}`);

            // Special handling for drawing -> voting transition with grace period
            if (game.current_status === 'drawing' && nextStatus === 'voting') {
              const graceResult = await handleDrawingPhaseGracePeriod(supabase, game.game_id, executionId);
              if (graceResult.shouldSkip) {
                console.log(`Game ${game.game_id} transition skipped: ${graceResult.reason}`);
                skipped++;
                return;
              }
              if (graceResult.shouldDelay) {
                console.log(`Game ${game.game_id} transition delayed: ${graceResult.reason}`);
                skipped++;
                return;
              }
            }

            // Verify game still exists and is in expected state
            const { data: gameCheck, error: gameError } = await supabase
              .from('games')
              .select('id, status, phase_expires_at')
              .eq('id', game.game_id)
              .single();

            if (gameError || !gameCheck) {
              console.log(`Game ${game.game_id} not found or inaccessible, skipping`);
              skipped++;
              return;
            }

            // Check if game status has already changed (race condition)
            if (gameCheck.status !== game.current_status) {
              console.log(`Game ${game.game_id} status already changed from ${game.current_status} to ${gameCheck.status}, skipping`);
              skipped++;
              return;
            }

            console.log(`Game ${game.game_id} status confirmed: ${gameCheck.status}, proceeding with transition`);

            // Double-check timer hasn't been extended
            if (gameCheck.phase_expires_at) {
              const expiresAt = new Date(gameCheck.phase_expires_at);
              const now = new Date();
              console.log(`Game ${game.game_id} timer check: expires at ${expiresAt.toISOString()}, now is ${now.toISOString()}`);
              if (expiresAt > now) {
                console.log(`Game ${game.game_id} timer was extended, skipping expiration`);
                skipped++;
                return;
              }
            }

            // Trigger phase transition using database function
            const { error: transitionError } = await supabase.rpc('transition_game_status', {
              game_uuid: game.game_id,
              new_status: nextStatus
            });

            if (transitionError) {
              console.error(`Timer expiration transition failed for game ${game.game_id}:`, transitionError);
              errors++;
              return;
            }

            console.log(`Successfully transitioned game ${game.game_id} from ${game.current_status} to ${nextStatus}`);
            processed++;

            // Fetch the updated game object with all related data for broadcasting
            try {
              const { data: updatedGame, error: fetchError } = await supabase
                .from('games')
                // .select(`
                //   *,
                //   game_participants(
                //     user_id,
                //     joined_at,
                //     users(username, avatar_url)
                //   ),
                //   submissions(
                //     id,
                //     user_id,
                //     drawing_url,
                //     drawing_thumbnail_url,
                //     submitted_at,
                //     canvas_width,
                //     canvas_height,
                //     element_count,
                //     drawing_time_seconds
                //   )
                // `)
                .select(`*`)
                .eq('id', game.game_id)
                .single();

              if (fetchError) {
                console.warn(`Failed to fetch updated game data for ${game.game_id}:`, fetchError);
                // Fallback to minimal broadcast
                await broadcastPhaseChangeEvent(game.game_id, game.current_status, nextStatus, executionId);
              } else {
                // Broadcast with full game object
                await broadcastPhaseChangeEventWithGame(game.game_id, game.current_status, nextStatus, updatedGame, executionId);
                console.log(`Successfully broadcasted phase change event with game object for ${game.game_id}: ${game.current_status} → ${nextStatus}`);
              }
            } catch (broadcastError) {
              console.warn(`Failed to broadcast phase change event for game ${game.game_id}:`, broadcastError);
              // Don't increment errors for broadcast failures
            }

          } catch (error) {
            console.error(`Exception processing game ${game.game_id}:`, error);
            errors++;
          }
        });

        // Wait for current chunk to complete before processing next
        await Promise.allSettled(promises);
      }

    } finally {
      // Always release the advisory lock (skip in local development)
      if (!isLocalDev) {
        await supabase.rpc('release_advisory_lock', { lock_key: lockKey });
      }
    }

    const result: MonitoringResult = {
      processed,
      errors,
      skipped,
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    };

    console.log('Timer monitoring completed:', result);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error in timer monitoring:', error);
    return new Response(
      JSON.stringify({
        processed,
        errors: errors + 1,
        skipped,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Broadcast phase change event directly to PubNub
 *
 * Note: This sends minimal event data since Supabase realtime automatically
 * provides the full game state to clients when the database is updated.
 * PubNub events are used for immediate notifications only.
 */
async function broadcastPhaseChangeEvent(
  gameId: string,
  previousPhase: string,
  newPhase: string,
  executionId: string
): Promise<void> {
  console.log(`🔔 [${executionId}] Starting PubNub broadcast for game ${gameId}: ${previousPhase} → ${newPhase}`);

  const publishKey = Deno.env.get('PUBNUB_PUBLISH_KEY');
  const subscribeKey = Deno.env.get('PUBNUB_SUBSCRIBE_KEY');
  const secretKey = Deno.env.get('PUBNUB_SECRET_KEY');

  console.log(`🔑 [${executionId}] PubNub config check:`, {
    hasPublishKey: !!publishKey,
    hasSubscribeKey: !!subscribeKey,
    hasSecretKey: !!secretKey,
    publishKeyPrefix: publishKey?.substring(0, 10) + '...',
    subscribeKeyPrefix: subscribeKey?.substring(0, 10) + '...',
    secretKeyPrefix: secretKey?.substring(0, 10) + '...'
  });

  if (!publishKey || !subscribeKey) {
    throw new Error('PubNub configuration missing');
  }

  const gameEvent = {
    type: 'phase_changed',
    gameId,
    userId: 'server',
    timestamp: Date.now(),
    version: '1.0.0',
    data: {
      newPhase,
      previousPhase,
      phaseStartedAt: new Date().toISOString(),
      transitionTriggeredBy: 'server_timer',
      executionId
    }
  };

  console.log(`📦 [${executionId}] Game event payload:`, JSON.stringify(gameEvent, null, 2));

  // Build PubNub publish URL
  const timestamp = Math.floor(Date.now() / 1000);
  const uuid = 'server-monitor';
  const channel = `game-${gameId}`;

  console.log(`📡 [${executionId}] Publishing to channel: ${channel}`);

  // Use POST method to avoid URL length limits
  const publishUrl = new URL(`https://ps.pndsn.com/publish/${publishKey}/${subscribeKey}/0/${channel}/0`);

  // Add query parameters
  publishUrl.searchParams.set('uuid', uuid);
  publishUrl.searchParams.set('timestamp', timestamp.toString());
  // Note: Signature authentication is more complex for POST requests
  // For now, we'll rely on the publish/subscribe keys for authentication

  console.log(`🌐 [${executionId}] PubNub URL: ${publishUrl.toString()}`);
  console.log(`📦 [${executionId}] Payload size: ${JSON.stringify(gameEvent).length} characters`);

  // Make the HTTP request to PubNub using POST
  console.log(`🚀 [${executionId}] Making HTTP request to PubNub...`);

  const response = await fetch(publishUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gameEvent)
  });

  console.log(`📥 [${executionId}] PubNub response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [${executionId}] PubNub API error response:`, errorText);
    throw new Error(`PubNub API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`📊 [${executionId}] PubNub response result:`, JSON.stringify(result));

  // PubNub returns [1, "Sent", "timetoken"] for success
  if (!Array.isArray(result) || result[0] !== 1) {
    console.error(`❌ [${executionId}] PubNub publish failed with result:`, result);
    throw new Error(`PubNub publish failed: ${JSON.stringify(result)}`);
  }

  console.log(`✅ [${executionId}] PubNub event published successfully to ${channel}:`, {
    timetoken: result[2],
    status: result[1],
    eventType: gameEvent.type,
    transition: `${previousPhase} → ${newPhase}`
  });
}



/**
 * Broadcast phase change event with full game object
 * This version includes the complete game data in the event for better client-side handling
 */
async function broadcastPhaseChangeEventWithGame(
  gameId: string,
  previousPhase: string,
  newPhase: string,
  gameObject: Record<string, any>, // Game object with participants and submissions
  executionId: string
): Promise<void> {
  console.log(`🔔 [${executionId}] Starting PubNub broadcast with game object for ${gameId}: ${previousPhase} → ${newPhase}`);

  const publishKey = Deno.env.get('PUBNUB_PUBLISH_KEY');
  const subscribeKey = Deno.env.get('PUBNUB_SUBSCRIBE_KEY');

  if (!publishKey || !subscribeKey) {
    throw new Error('PubNub configuration missing');
  }

  console.log(`📡 [${executionId}] PubNub config loaded - Publish Key: ${publishKey.substring(0, 8)}...`);

  // Build the game event with full game object
  const gameEvent = {
    type: 'phase_changed',
    gameId,
    transition: `${previousPhase} → ${newPhase}`,
    gameStatus: newPhase,
    timestamp: new Date().toISOString(),
    data: {
      previousPhase,
      newPhase,
      game: gameObject, // Include full game object
      phaseStartedAt: new Date().toISOString(),
      transitionTriggeredBy: 'server_timer',
      executionId
    }
  };

  console.log(`📦 [${executionId}] Game event with full object:`, {
    type: gameEvent.type,
    gameId: gameEvent.gameId,
    transition: gameEvent.transition,
    gameStatus: gameEvent.gameStatus,
    hasGameObject: !!gameEvent.data.game
  });

  // Build PubNub publish URL
  const timestamp = Math.floor(Date.now() / 1000);
  const uuid = 'server-monitor';
  const channel = `game-${gameId}`;

  console.log(`📡 [${executionId}] Publishing to channel: ${channel}`);

  // Use POST method for large payloads to avoid URL length limits
  const publishUrl = new URL(`https://ps.pndsn.com/publish/${publishKey}/${subscribeKey}/0/${channel}/0`);

  publishUrl.searchParams.set('uuid', uuid);
  publishUrl.searchParams.set('timestamp', timestamp.toString());
  // Note: Signature authentication is more complex for POST requests
  // For now, we'll rely on the publish/subscribe keys for authentication

  console.log(`🌐 [${executionId}] PubNub URL: ${publishUrl.toString()}`);
  console.log(`📦 [${executionId}] Payload size: ${JSON.stringify(gameEvent).length} characters`);

  // Make the HTTP request to PubNub using POST for large payloads
  const response = await fetch(publishUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(gameEvent)
  });

  console.log(`📥 [${executionId}] PubNub response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ [${executionId}] PubNub API error response:`, errorText);
    throw new Error(`PubNub API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`📊 [${executionId}] PubNub response result:`, JSON.stringify(result));

  // PubNub returns [1, "Sent", "timetoken"] for success
  if (!Array.isArray(result) || result[0] !== 1) {
    console.error(`❌ [${executionId}] PubNub publish failed with result:`, result);
    throw new Error(`PubNub publish failed: ${JSON.stringify(result)}`);
  }

  console.log(`✅ [${executionId}] Successfully broadcast phase change event with game object for ${gameId}`);
}

/**
 * Handle grace period for drawing phase transitions
 * Implements logic to wait for auto-submissions before transitioning to voting
 */
async function handleDrawingPhaseGracePeriod(
  supabase: ReturnType<typeof createClient>,
  gameId: string,
  executionId: string
): Promise<{ shouldSkip: boolean; shouldDelay: boolean; reason: string }> {
  console.log(`🎯 [${executionId}] Checking drawing phase grace period for game ${gameId}`);

  // Get game participants and submissions
  const { data: gameData, error: gameError } = await supabase
    .from('games')
    .select(`
      id,
      status,
      phase_expires_at,
      current_players,
      game_participants(user_id),
      submissions(id, user_id, submitted_at)
    `)
    .eq('id', gameId)
    .single();

  if (gameError || !gameData) {
    console.log(`❌ [${executionId}] Failed to fetch game data: ${gameError?.message}`);
    return { shouldSkip: true, shouldDelay: false, reason: 'Failed to fetch game data' };
  }

  const participantCount = gameData.game_participants?.length || 0;
  const submissionCount = gameData.submissions?.length || 0;
  const allSubmitted = submissionCount >= participantCount;

  console.log(`📊 [${executionId}] Submission status: ${submissionCount}/${participantCount} submitted`);

  // If all players have submitted, proceed immediately
  if (allSubmitted) {
    console.log(`✅ [${executionId}] All players submitted, proceeding with transition`);
    return { shouldSkip: false, shouldDelay: false, reason: 'All submissions complete' };
  }

  // Check if we're already in grace period
  const graceKey = `drawing_grace_${gameId}`;
  const { data: graceData, error: graceError } = await supabase
    .from('game_metadata')
    .select('value')
    .eq('game_id', gameId)
    .eq('key', graceKey)
    .single();

  const now = new Date();
  const gracePeriodSeconds = 15; // 15 second grace period

  if (graceError && graceError.code !== 'PGRST116') { // PGRST116 = not found
    console.log(`❌ [${executionId}] Error checking grace period: ${graceError.message}`);
    return { shouldSkip: true, shouldDelay: false, reason: 'Grace period check failed' };
  }

  if (!graceData) {
    // Start grace period
    const graceStartTime = now.toISOString();
    console.log(`⏰ [${executionId}] Starting ${gracePeriodSeconds}s grace period for auto-submissions`);

    const { error: insertError } = await supabase
      .from('game_metadata')
      .insert({
        game_id: gameId,
        key: graceKey,
        value: graceStartTime
      });

    if (insertError) {
      console.log(`❌ [${executionId}] Failed to start grace period: ${insertError.message}`);
      return { shouldSkip: true, shouldDelay: false, reason: 'Failed to start grace period' };
    }

    // Extend the phase timer by grace period
    const newExpiresAt = new Date(now.getTime() + gracePeriodSeconds * 1000);
    const { error: updateError } = await supabase
      .from('games')
      .update({ phase_expires_at: newExpiresAt.toISOString() })
      .eq('id', gameId);

    if (updateError) {
      console.log(`⚠️ [${executionId}] Failed to extend timer: ${updateError.message}`);
    }

    return { shouldSkip: false, shouldDelay: true, reason: 'Grace period started' };
  }

  // Check if grace period has expired
  const graceStartTime = new Date(graceData.value);
  const graceEndTime = new Date(graceStartTime.getTime() + gracePeriodSeconds * 1000);
  const graceExpired = now >= graceEndTime;

  console.log(`⏱️ [${executionId}] Grace period: started ${graceStartTime.toISOString()}, expires ${graceEndTime.toISOString()}, expired: ${graceExpired}`);

  if (!graceExpired) {
    console.log(`⏳ [${executionId}] Grace period still active, delaying transition`);
    return { shouldSkip: false, shouldDelay: true, reason: 'Grace period still active' };
  }

  // Grace period expired, clean up and proceed
  console.log(`⏰ [${executionId}] Grace period expired, proceeding with transition`);

  // Clean up grace period metadata
  await supabase
    .from('game_metadata')
    .delete()
    .eq('game_id', gameId)
    .eq('key', graceKey);

  return { shouldSkip: false, shouldDelay: false, reason: 'Grace period expired' };
}


