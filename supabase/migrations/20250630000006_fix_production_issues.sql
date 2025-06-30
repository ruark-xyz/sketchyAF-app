/*
  # Fix Production Issues
  
  Simple migration to fix the core production issues:
  1. Enable pg_net extension for HTTP requests
  2. Fix net.http_post function signature for pg_net v0.14.0
  
  Date: 2025-06-30
  Task: Fix PubNub Broadcasting in Production
*/

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Fix broadcast_game_event with correct pg_net v0.14.0 signature
CREATE OR REPLACE FUNCTION broadcast_game_event()
RETURNS TRIGGER AS $$
DECLARE
  event_data JSONB;
  event_type TEXT;
  game_uuid UUID;
  supabase_url TEXT;
  service_role_key TEXT;
  http_response_id BIGINT;
  is_local_dev BOOLEAN;
BEGIN
  event_type := TG_ARGV[0];
  game_uuid := COALESCE(NEW.id, OLD.id);
  
  -- Get configuration from helper functions
  supabase_url := get_supabase_url();
  service_role_key := get_service_role_key();
  is_local_dev := (supabase_url LIKE '%127.0.0.1%');
  
  -- For local development, use the local service key if vault key is not available
  IF is_local_dev AND service_role_key IS NULL THEN
    service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  END IF;
  
  -- Prepare event data
  CASE event_type
    WHEN 'phase_changed' THEN
      event_data := jsonb_build_object(
        'type', 'phase_changed',
        'gameId', game_uuid,
        'timestamp', extract(epoch from now()) * 1000,
        'userId', 'system',
        'version', '1.0.0',
        'data', jsonb_build_object(
          'newPhase', NEW.status,
          'previousPhase', OLD.status,
          'phaseStartedAt', now(),
          'transitionTriggeredBy', 'database_trigger',
          'gameData', jsonb_build_object(
            'prompt', NEW.prompt,
            'maxPlayers', NEW.max_players,
            'currentPlayers', NEW.current_players,
            'phaseExpiresAt', NEW.phase_expires_at
          )
        )
      );
    ELSE
      event_data := jsonb_build_object(
        'type', event_type,
        'gameId', game_uuid,
        'timestamp', extract(epoch from now()) * 1000,
        'userId', 'system',
        'version', '1.0.0',
        'data', '{}'::jsonb
      );
  END CASE;
  
  -- Call Edge Function to broadcast via PubNub (only if we have valid config)
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
    BEGIN
      -- FIXED: Use correct pg_net v0.14.0 signature
      -- net.http_post(url, body, params, headers, timeout_milliseconds)
      SELECT net.http_post(
        supabase_url || '/functions/v1/broadcast-pubnub-event',  -- url
        event_data,  -- body (jsonb)
        '{}'::jsonb,  -- params (empty)
        jsonb_build_object(
          'Authorization', 'Bearer ' || service_role_key,
          'Content-Type', 'application/json'
        ),  -- headers
        5000  -- timeout_milliseconds
      ) INTO http_response_id;
      
      -- Log success with environment context
      IF is_local_dev THEN
        RAISE NOTICE 'PubNub broadcast successful (LOCAL): % event for game % (request_id: %)', event_type, game_uuid, http_response_id;
      ELSE
        RAISE NOTICE 'PubNub broadcast successful (PROD): % event for game % (request_id: %)', event_type, game_uuid, http_response_id;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'PubNub broadcast error: % event for game % - %', 
          event_type, game_uuid, SQLERRM;
    END;
  ELSE
    -- No configuration available - log only
    RAISE NOTICE 'PubNub broadcast skipped (no config): % event for game %', event_type, game_uuid;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the original operation
    RAISE WARNING 'Failed to broadcast game event: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix broadcast_timer_event with correct pg_net v0.14.0 signature
CREATE OR REPLACE FUNCTION broadcast_timer_event(
  p_game_id uuid, 
  p_event_type text, 
  p_previous_phase text, 
  p_new_phase text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_data JSONB;
  http_response_id BIGINT;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get configuration from helper functions
  supabase_url := get_supabase_url();
  service_role_key := get_service_role_key();
  
  -- For local development, use the local service key if vault key is not available
  IF supabase_url LIKE '%127.0.0.1%' AND service_role_key IS NULL THEN
    service_role_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
  END IF;

  -- Skip if configuration is missing
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE NOTICE 'Skipping PubNub broadcast - missing configuration';
    RETURN TRUE;
  END IF;

  -- Build event data
  event_data := jsonb_build_object(
    'type', p_event_type,
    'gameId', p_game_id,
    'timestamp', extract(epoch from now()) * 1000,
    'userId', 'server-timer',
    'version', '1.0.0',
    'data', jsonb_build_object(
      'previousPhase', p_previous_phase,
      'newPhase', p_new_phase,
      'phaseStartedAt', now(),
      'transitionTriggeredBy', 'database_timer_monitor'
    )
  );

  -- Make HTTP request to broadcast Edge Function
  BEGIN
    -- FIXED: Use correct pg_net v0.14.0 signature
    -- net.http_post(url, body, params, headers, timeout_milliseconds)
    SELECT net.http_post(
      supabase_url || '/functions/v1/broadcast-pubnub-event',  -- url
      event_data,  -- body (jsonb)
      '{}'::jsonb,  -- params (empty)
      jsonb_build_object(
        'Authorization', 'Bearer ' || service_role_key,
        'Content-Type', 'application/json'
      ),  -- headers
      5000  -- timeout_milliseconds
    ) INTO http_response_id;

    -- Log success
    RAISE NOTICE 'Timer PubNub broadcast successful: % (request_id: %)', p_event_type, http_response_id;
    RETURN TRUE;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'PubNub broadcast error: %', SQLERRM;
      RETURN FALSE;
  END;
END;
$$;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Production issues fix completed';
  RAISE NOTICE 'pg_net extension enabled: %', (SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_net'));
  RAISE NOTICE 'Fixed net.http_post function signature for pg_net v0.14.0';
  RAISE NOTICE 'Updated broadcast_game_event() and broadcast_timer_event()';
END $$;
