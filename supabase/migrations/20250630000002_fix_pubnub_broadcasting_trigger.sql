/*
  # Fix PubNub Broadcasting Trigger
  
  This migration fixes the broadcast_game_event function to not reference
  the non-existent 'updated_at' field in the games table, which was causing
  warnings during game status transitions.
  
  Changes:
  1. Fix broadcast_game_event function to use now() instead of NEW.updated_at
  2. Improve error handling for local development vs production
  3. Add proper logging for debugging
  
  Date: 2025-06-30
  Task: Fix PubNub Broadcasting for Database Timer Monitoring
*/

-- =====================================================
-- FIX PUBNUB BROADCASTING FUNCTION
-- =====================================================

-- Enhanced function to broadcast game events via PubNub Edge Function
-- Fixed to not reference non-existent updated_at field
CREATE OR REPLACE FUNCTION broadcast_game_event()
RETURNS TRIGGER AS $$
DECLARE
  event_data JSONB;
  event_type TEXT;
  game_uuid UUID;
  supabase_url TEXT;
  service_role_key TEXT;
  http_response RECORD;
BEGIN
  -- Determine event type based on trigger operation and arguments
  event_type := TG_ARGV[0];
  game_uuid := COALESCE(NEW.id, OLD.id);
  
  -- Prepare event data based on trigger type
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
          'phaseStartedAt', now(), -- Fixed: use now() instead of NEW.updated_at
          'transitionTriggeredBy', 'database_trigger',
          'gameData', jsonb_build_object(
            'prompt', NEW.prompt,
            'maxPlayers', NEW.max_players,
            'currentPlayers', NEW.current_players,
            'phaseExpiresAt', NEW.phase_expires_at
          )
        )
      );
    WHEN 'player_joined' THEN
      event_data := jsonb_build_object(
        'type', 'player_joined',
        'gameId', NEW.game_id,
        'timestamp', extract(epoch from now()) * 1000,
        'userId', NEW.user_id,
        'version', '1.0.0',
        'data', jsonb_build_object(
          'userId', NEW.user_id,
          'joinedAt', NEW.joined_at,
          'currentPlayers', (SELECT current_players FROM games WHERE id = NEW.game_id)
        )
      );
    WHEN 'player_left' THEN
      event_data := jsonb_build_object(
        'type', 'player_left',
        'gameId', NEW.game_id,
        'timestamp', extract(epoch from now()) * 1000,
        'userId', NEW.user_id,
        'version', '1.0.0',
        'data', jsonb_build_object(
          'userId', NEW.user_id,
          'leftAt', NEW.left_at,
          'currentPlayers', (SELECT current_players FROM games WHERE id = NEW.game_id)
        )
      );
    WHEN 'drawing_submitted' THEN
      event_data := jsonb_build_object(
        'type', 'drawing_submitted',
        'gameId', NEW.game_id,
        'timestamp', extract(epoch from now()) * 1000,
        'userId', NEW.user_id,
        'version', '1.0.0',
        'data', jsonb_build_object(
          'submissionId', NEW.id,
          'userId', NEW.user_id,
          'submittedAt', NEW.submitted_at
        )
      );
    WHEN 'vote_cast' THEN
      event_data := jsonb_build_object(
        'type', 'vote_cast',
        'gameId', NEW.game_id,
        'timestamp', extract(epoch from now()) * 1000,
        'userId', NEW.user_id,
        'version', '1.0.0',
        'data', jsonb_build_object(
          'voteId', NEW.id,
          'userId', NEW.user_id,
          'submissionId', NEW.submission_id,
          'votedAt', NEW.voted_at
        )
      );
    ELSE
      -- Default event structure
      event_data := jsonb_build_object(
        'type', event_type,
        'gameId', game_uuid,
        'timestamp', extract(epoch from now()) * 1000,
        'userId', 'system',
        'version', '1.0.0',
        'data', '{}'::jsonb
      );
  END CASE;
  
  -- Get configuration from settings (production) or skip (local development)
  BEGIN
    supabase_url := current_setting('app.supabase_url', true);
    service_role_key := current_setting('app.service_role_key', true);
  EXCEPTION
    WHEN OTHERS THEN
      -- Settings not available (local development)
      supabase_url := NULL;
      service_role_key := NULL;
  END;
  
  -- Call Edge Function to broadcast via PubNub (production only)
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
    BEGIN
      -- Use pg_net extension for HTTP requests in production
      SELECT * INTO http_response FROM net.http_post(
        url := supabase_url || '/functions/v1/broadcast-pubnub-event',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || service_role_key,
          'Content-Type', 'application/json'
        ),
        body := event_data::text,
        timeout_milliseconds := 5000
      );
      
      -- Log success/failure
      IF http_response.status_code BETWEEN 200 AND 299 THEN
        RAISE NOTICE 'PubNub broadcast successful for % event on game %', event_type, game_uuid;
      ELSE
        RAISE WARNING 'PubNub broadcast failed for % event on game %: HTTP %', 
          event_type, game_uuid, http_response.status_code;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'PubNub broadcast error for % event on game %: %', 
          event_type, game_uuid, SQLERRM;
    END;
  ELSE
    -- Local development - just log the event
    RAISE NOTICE 'Game event (local): % for game % - %', 
      event_type, game_uuid, event_data->>'type';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the original operation
    RAISE WARNING 'Failed to broadcast game event: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test the fixed function by creating a test game and updating its status
DO $$
DECLARE
  test_game_id UUID;
  test_user_id UUID;
BEGIN
  -- Get a test user
  SELECT id INTO test_user_id FROM users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'No test users found, skipping trigger verification';
    RETURN;
  END IF;
  
  -- Create a test game
  INSERT INTO games (prompt, max_players, current_players, status, created_by)
  VALUES ('Test game for trigger verification', 2, 1, 'briefing', test_user_id)
  RETURNING id INTO test_game_id;
  
  -- Update the game status to trigger the broadcast function
  UPDATE games SET status = 'drawing' WHERE id = test_game_id;
  
  -- Clean up
  DELETE FROM games WHERE id = test_game_id;
  
  RAISE NOTICE 'PubNub broadcasting trigger fix migration completed successfully';
END $$;
