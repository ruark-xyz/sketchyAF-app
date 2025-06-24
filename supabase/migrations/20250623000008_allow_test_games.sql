-- Allow test games to bypass the 2-player requirement
-- This enables single-player test games for development

-- Update the transition_game_status function to allow test games with 1 player
CREATE OR REPLACE FUNCTION transition_game_status(game_uuid UUID, new_status game_status)
RETURNS BOOLEAN AS $$
DECLARE
  current_status game_status;
  participant_count INTEGER;
  submission_count INTEGER;
  game_prompt TEXT;
  valid_transition BOOLEAN := FALSE;
BEGIN
  -- Get current game state
  SELECT status, current_players, prompt INTO current_status, participant_count, game_prompt
  FROM games WHERE id = game_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found: %', game_uuid;
  END IF;

  -- Validate state transitions
  CASE current_status
    WHEN 'waiting' THEN
      valid_transition := new_status IN ('briefing', 'cancelled');
    WHEN 'briefing' THEN
      valid_transition := new_status IN ('drawing', 'cancelled');
    WHEN 'drawing' THEN
      valid_transition := new_status IN ('voting', 'cancelled');
    WHEN 'voting' THEN
      valid_transition := new_status IN ('results', 'cancelled');
    WHEN 'results' THEN
      valid_transition := new_status IN ('completed');
    ELSE
      valid_transition := FALSE;
  END CASE;

  IF NOT valid_transition THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', current_status, new_status;
  END IF;

  -- Additional validation for specific transitions
  IF new_status = 'briefing' AND participant_count < 2 THEN
    -- Allow test games to bypass the 2-player requirement
    IF game_prompt NOT LIKE '%Test Drawing Session%' THEN
      RAISE EXCEPTION 'Cannot start game with less than 2 players';
    END IF;
  END IF;

  IF new_status = 'voting' THEN
    SELECT COUNT(*) INTO submission_count
    FROM submissions WHERE game_id = game_uuid;
    
    IF submission_count = 0 THEN
      RAISE EXCEPTION 'Cannot start voting with no submissions';
    END IF;
  END IF;

  -- Update game status and timestamps
  UPDATE games 
  SET 
    status = new_status,
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

  -- Calculate results if transitioning to results
  IF new_status = 'results' THEN
    PERFORM calculate_game_results(game_uuid);
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
