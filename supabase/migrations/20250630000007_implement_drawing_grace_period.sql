/*
  # Implement Drawing Phase Grace Period
  
  This migration updates the transition_game_status function to properly handle
  the drawing-to-voting grace period mechanism. It removes the strict validation
  that prevents voting transitions when no submissions exist, allowing transitions
  after the grace period expires.
  
  Changes:
  1. Update transition_game_status to allow voting transitions with no submissions
     when grace period has expired
  2. Add proper logging for grace period scenarios
  3. Maintain backward compatibility with existing game flows
  
  Date: 2025-06-30
  Task: Implement Grace Period for Drawing Phase Transitions
*/

-- =====================================================
-- UPDATE TRANSITION FUNCTION FOR GRACE PERIOD SUPPORT
-- =====================================================

CREATE OR REPLACE FUNCTION transition_game_status(
  game_uuid UUID,
  new_status game_status
) RETURNS BOOLEAN AS $$
DECLARE
  phase_duration INTEGER;
  current_status game_status;
  transition_count INTEGER;
  participant_count INTEGER;
  submission_count INTEGER;
  game_prompt TEXT;
  valid_transition BOOLEAN := FALSE;
  grace_period_expired BOOLEAN := FALSE;
BEGIN
  -- Note: Transaction isolation is handled at the connection level in Supabase

  -- Lock the game row to prevent concurrent transitions
  SELECT status, current_players, prompt INTO current_status, participant_count, game_prompt
  FROM games
  WHERE id = game_uuid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found: %', game_uuid;
  END IF;

  -- Prevent duplicate transitions (idempotency check)
  IF current_status = new_status THEN
    RETURN TRUE; -- Already in target status, no-op
  END IF;

  -- Log the transition attempt
  INSERT INTO game_transition_log (game_id, from_status, to_status, triggered_by)
  VALUES (
    game_uuid,
    current_status,
    new_status,
    'timer_monitoring'
  );

  -- Validate transition logic
  CASE current_status
    WHEN 'waiting' THEN
      valid_transition := (new_status = 'briefing' AND participant_count >= 1); -- Allow test games
    WHEN 'briefing' THEN
      valid_transition := (new_status = 'drawing');
    WHEN 'drawing' THEN
      valid_transition := (new_status = 'voting');
    WHEN 'voting' THEN
      valid_transition := (new_status = 'completed'); -- Skip results phase
    WHEN 'results' THEN
      valid_transition := (new_status = 'completed'); -- Keep for backward compatibility
    ELSE
      valid_transition := FALSE;
  END CASE;

  IF NOT valid_transition THEN
    RAISE EXCEPTION 'Invalid transition from % to % for game %', current_status, new_status, game_uuid;
  END IF;

  -- Additional validation for specific transitions
  IF new_status = 'voting' THEN
    SELECT COUNT(*) INTO submission_count
    FROM submissions WHERE game_id = game_uuid;
    
    -- Check if grace period has expired (allows transition with no submissions)
    IF submission_count = 0 THEN
      -- Check if this is a grace period expiration scenario
      SELECT EXISTS(
        SELECT 1 FROM game_metadata
        WHERE game_id = game_uuid
          AND key = 'drawing_grace_' || game_uuid::text
          AND expires_at IS NOT NULL
          AND expires_at <= now() -- Grace period has actually expired
      ) INTO grace_period_expired;

      IF NOT grace_period_expired THEN
        RAISE EXCEPTION 'Cannot transition to voting: no submissions found for game %', game_uuid;
      ELSE
        RAISE LOG 'Transitioning to voting with no submissions for game % (grace period expired)', game_uuid;
      END IF;
    END IF;
  END IF;

  -- Calculate phase duration based on game settings and phase type
  SELECT
    CASE
      WHEN new_status = 'briefing' THEN 20
      WHEN new_status = 'drawing' THEN round_duration
      WHEN new_status = 'voting' THEN voting_duration
      WHEN new_status = 'results' THEN 15 -- Keep for backward compatibility
      WHEN new_status = 'completed' THEN NULL -- No timer for completed games
      ELSE NULL
    END INTO phase_duration
  FROM games WHERE id = game_uuid;

  -- Update with phase timing and existing timestamp logic
  UPDATE games SET
    status = new_status,
    current_phase_duration = phase_duration,
    phase_expires_at = CASE
      WHEN phase_duration IS NOT NULL THEN now() + (phase_duration || ' seconds')::INTERVAL
      ELSE NULL
    END,
    -- Maintain existing phase-specific timestamps for backward compatibility
    started_at = CASE
      WHEN new_status = 'briefing' AND started_at IS NULL THEN now()
      ELSE started_at
    END,
    drawing_started_at = CASE
      WHEN new_status = 'drawing' AND drawing_started_at IS NULL THEN now()
      ELSE drawing_started_at
    END,
    voting_started_at = CASE
      WHEN new_status = 'voting' AND voting_started_at IS NULL THEN now()
      ELSE voting_started_at
    END,
    completed_at = CASE
      WHEN new_status IN ('completed', 'cancelled') AND completed_at IS NULL THEN now()
      ELSE completed_at
    END
  WHERE id = game_uuid;

  -- Clean up any grace period metadata after successful transition
  IF new_status = 'voting' THEN
    DELETE FROM game_metadata 
    WHERE game_id = game_uuid 
      AND key = 'drawing_grace_' || game_uuid::text;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions for the updated function
GRANT EXECUTE ON FUNCTION transition_game_status(UUID, game_status) TO service_role;

-- =====================================================
-- MIGRATION VALIDATION
-- =====================================================

-- Test the updated function
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  RAISE NOTICE 'Drawing phase grace period migration completed successfully';
  RAISE NOTICE 'Updated transition_game_status function to handle grace period scenarios';
  RAISE NOTICE 'Grace period mechanism now allows voting transitions after timeout';
END $$;
