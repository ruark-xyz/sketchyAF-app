-- Add grace period support for drawing phase transitions
-- This migration adds the game_metadata table to track grace periods
-- and updates the transition_game_status function to handle grace periods

-- Create game_metadata table for storing temporary game state
CREATE TABLE IF NOT EXISTS game_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure unique key per game
  UNIQUE(game_id, key)
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_game_metadata_game_key ON game_metadata(game_id, key);
CREATE INDEX IF NOT EXISTS idx_game_metadata_expires ON game_metadata(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE game_metadata ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_metadata
CREATE POLICY "Users can read metadata for their games" ON game_metadata
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM game_participants gp 
      WHERE gp.game_id = game_metadata.game_id 
      AND gp.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage all metadata" ON game_metadata
  FOR ALL USING (auth.role() = 'service_role');

-- Add cleanup function for expired metadata
CREATE OR REPLACE FUNCTION cleanup_expired_game_metadata()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM game_metadata 
  WHERE expires_at IS NOT NULL 
    AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the transition_game_status function to handle grace periods better
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
  grace_period_active BOOLEAN := FALSE;
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

  -- Check if grace period is active for drawing -> voting transition
  IF current_status = 'drawing' AND new_status = 'voting' THEN
    SELECT EXISTS(
      SELECT 1 FROM game_metadata 
      WHERE game_id = game_uuid 
        AND key = 'drawing_grace_' || game_uuid::text
        AND created_at > now() - INTERVAL '30 seconds'
    ) INTO grace_period_active;
    
    IF grace_period_active THEN
      RAISE EXCEPTION 'Grace period active for game %, transition blocked', game_uuid;
    END IF;
  END IF;

  -- Add transition tracking to prevent rapid successive transitions
  INSERT INTO game_transition_log (game_id, from_status, to_status, triggered_by, created_at)
  VALUES (game_uuid, current_status, new_status, 'timer_expired', now());

  -- Check for recent transitions (prevent rapid fire)
  SELECT COUNT(*) INTO transition_count
  FROM game_transition_log
  WHERE game_id = game_uuid
    AND created_at > now() - INTERVAL '5 seconds';

  IF transition_count > 2 THEN
    RAISE EXCEPTION 'Too many rapid transitions for game %', game_uuid;
  END IF;

  -- Validate transition logic (from existing function)
  CASE current_status
    WHEN 'waiting' THEN
      valid_transition := (new_status = 'briefing' AND participant_count >= 1); -- Allow test games
    WHEN 'briefing' THEN
      valid_transition := (new_status = 'drawing');
    WHEN 'drawing' THEN
      valid_transition := (new_status = 'voting');
    WHEN 'voting' THEN
      valid_transition := (new_status = 'results');
    WHEN 'results' THEN
      valid_transition := (new_status = 'completed');
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
    
    -- Allow transition even with no submissions if grace period has expired
    -- This prevents games from getting stuck if all players fail to submit
    IF submission_count = 0 THEN
      RAISE LOG 'Transitioning to voting with no submissions for game % (grace period expired)', game_uuid;
    END IF;
  END IF;

  -- Calculate phase duration based on game settings and phase type
  SELECT
    CASE
      WHEN new_status = 'briefing' THEN 20
      WHEN new_status = 'drawing' THEN round_duration
      WHEN new_status = 'voting' THEN voting_duration
      WHEN new_status = 'results' THEN 15
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_game_metadata() TO service_role;
GRANT ALL ON TABLE game_metadata TO service_role;
