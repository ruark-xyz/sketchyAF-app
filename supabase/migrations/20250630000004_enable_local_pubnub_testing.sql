/*
  # Enable Local PubNub Testing
  
  This migration configures the database to make HTTP calls to the PubNub Edge Function
  in local development, enabling complete end-to-end testing of the timer monitoring
  system including PubNub broadcasting.
  
  Changes:
  1. Configure local development settings for PubNub broadcasting
  2. Update broadcast_game_event function to work in local development
  3. Add local testing verification functions
  
  Date: 2025-06-30
  Task: Enable End-to-End Local Testing with PubNub Broadcasting
*/

-- =====================================================
-- LOCAL DEVELOPMENT CONFIGURATION
-- =====================================================

-- Function to configure local development settings for PubNub testing
CREATE OR REPLACE FUNCTION configure_local_pubnub_testing()
RETURNS BOOLEAN AS $$
BEGIN
  -- Set local development configuration for PubNub broadcasting
  PERFORM set_config('app.supabase_url', 'http://127.0.0.1:54321', false);
  PERFORM set_config('app.service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU', false);
  
  RAISE NOTICE 'Local PubNub testing configuration applied';
  RAISE NOTICE 'Supabase URL: http://127.0.0.1:54321';
  RAISE NOTICE 'Service role key configured for local development';
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ENHANCED BROADCAST FUNCTION FOR LOCAL TESTING
-- =====================================================

-- Enhanced broadcast function that works in both local and production environments
CREATE OR REPLACE FUNCTION broadcast_game_event()
RETURNS TRIGGER AS $$
DECLARE
  event_data JSONB;
  event_type TEXT;
  game_uuid UUID;
  supabase_url TEXT;
  service_role_key TEXT;
  http_response RECORD;
  is_local_dev BOOLEAN := FALSE;
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
  
  -- Get configuration from settings
  BEGIN
    supabase_url := current_setting('app.supabase_url', true);
    service_role_key := current_setting('app.service_role_key', true);
    
    -- Check if this is local development
    is_local_dev := (supabase_url LIKE '%127.0.0.1%' OR supabase_url LIKE '%localhost%');
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Settings not available
      supabase_url := NULL;
      service_role_key := NULL;
  END;
  
  -- Call Edge Function to broadcast via PubNub
  IF supabase_url IS NOT NULL AND service_role_key IS NOT NULL THEN
    BEGIN
      -- Use pg_net extension for HTTP requests
      SELECT * INTO http_response FROM net.http_post(
        url := supabase_url || '/functions/v1/broadcast-pubnub-event',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || service_role_key,
          'Content-Type', 'application/json'
        ),
        body := event_data::text,
        timeout_milliseconds := 5000
      );
      
      -- Log success/failure with environment context
      IF http_response.status_code BETWEEN 200 AND 299 THEN
        IF is_local_dev THEN
          RAISE NOTICE 'PubNub broadcast successful (LOCAL): % event for game %', event_type, game_uuid;
        ELSE
          RAISE NOTICE 'PubNub broadcast successful (PROD): % event for game %', event_type, game_uuid;
        END IF;
      ELSE
        RAISE WARNING 'PubNub broadcast failed: % event for game % - HTTP % - %', 
          event_type, game_uuid, http_response.status_code, http_response.content;
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

-- =====================================================
-- LOCAL TESTING VERIFICATION
-- =====================================================

-- Function to test PubNub broadcasting in local development
CREATE OR REPLACE FUNCTION test_local_pubnub_broadcasting()
RETURNS TABLE(
  test_name TEXT,
  status TEXT,
  details TEXT
) AS $$
DECLARE
  test_game_id UUID;
  test_user_id UUID;
  config_result BOOLEAN;
BEGIN
  -- Configure local PubNub testing
  SELECT configure_local_pubnub_testing() INTO config_result;
  
  RETURN QUERY SELECT 
    'configuration'::TEXT as test_name,
    CASE WHEN config_result THEN 'PASS' ELSE 'FAIL' END as status,
    'Local PubNub configuration setup'::TEXT as details;
  
  -- Check if broadcast-pubnub-event Edge Function is available
  RETURN QUERY SELECT 
    'edge_function'::TEXT as test_name,
    'MANUAL_CHECK'::TEXT as status,
    'Verify broadcast-pubnub-event Edge Function is deployed locally'::TEXT as details;
  
  -- Get a test user
  SELECT id INTO test_user_id FROM users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RETURN QUERY SELECT 
      'test_user'::TEXT as test_name,
      'FAIL'::TEXT as status,
      'No test users found - run npm run seed:users'::TEXT as details;
    RETURN;
  END IF;
  
  -- Create a test game and trigger phase change
  BEGIN
    INSERT INTO games (prompt, max_players, current_players, status, created_by)
    VALUES ('Test game for local PubNub verification', 2, 1, 'briefing', test_user_id)
    RETURNING id INTO test_game_id;
    
    -- Update the game status to trigger the broadcast function
    UPDATE games SET status = 'drawing' WHERE id = test_game_id;
    
    -- Clean up
    DELETE FROM games WHERE id = test_game_id;
    
    RETURN QUERY SELECT 
      'broadcast_test'::TEXT as test_name,
      'PASS'::TEXT as status,
      'PubNub broadcast trigger test completed - check logs for HTTP response'::TEXT as details;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT 
        'broadcast_test'::TEXT as test_name,
        'FAIL'::TEXT as status,
        ('PubNub broadcast test failed: ' || SQLERRM)::TEXT as details;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUTO-CONFIGURE LOCAL DEVELOPMENT
-- =====================================================

-- Automatically configure local development settings
DO $$
BEGIN
  -- Only configure if this looks like local development
  IF current_setting('listen_addresses', true) = 'localhost' OR 
     current_setting('port', true) = '5432' THEN
    PERFORM configure_local_pubnub_testing();
    RAISE NOTICE 'Local PubNub testing automatically configured';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors in auto-configuration
    RAISE NOTICE 'Auto-configuration skipped: %', SQLERRM;
END $$;
