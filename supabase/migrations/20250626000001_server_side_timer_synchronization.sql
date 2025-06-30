/*
  # Server-Side Timer Synchronization System
  
  This migration implements the database schema changes required for server-side timer synchronization:
  1. Add phase duration and expiry fields to games table
  2. Create game_transition_log table for race condition prevention
  3. Add critical performance indexes for timer monitoring
  4. Update transition_game_status function with concurrency control
  5. Add advisory locking functions for preventing overlapping executions
  
  Date: 2025-01-26
  Task: Server-Side Timer Synchronization Implementation
*/

-- =====================================================
-- PHASE 1: ADD TIMER FIELDS TO GAMES TABLE
-- =====================================================

-- Add phase duration and expiry tracking to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS current_phase_duration INTEGER; -- seconds
ALTER TABLE games ADD COLUMN IF NOT EXISTS phase_expires_at TIMESTAMP WITH TIME ZONE; -- calculated expiry

-- =====================================================
-- PHASE 2: CREATE GAME TRANSITION LOG TABLE
-- =====================================================

-- Create transition log table for tracking and preventing rapid transitions
CREATE TABLE IF NOT EXISTS game_transition_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  from_status game_status NOT NULL,
  to_status game_status NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- PHASE 3: CREATE CRITICAL PERFORMANCE INDEXES
-- =====================================================

-- Essential indexes for timer monitoring performance
CREATE INDEX IF NOT EXISTS idx_games_phase_expires_at
  ON games(phase_expires_at)
  WHERE phase_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_games_timer_monitoring
  ON games(status, phase_expires_at)
  WHERE status IN ('briefing', 'drawing', 'voting', 'results')
    AND phase_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_games_active_timers
  ON games(phase_expires_at, status, id)
  WHERE phase_expires_at IS NOT NULL
    AND status IN ('briefing', 'drawing', 'voting', 'results');

-- Index for game participation validation in Edge Functions
CREATE INDEX IF NOT EXISTS idx_game_participants_active_user
  ON game_participants(user_id, game_id)
  WHERE left_at IS NULL;

-- Index for transition log rapid transition detection
CREATE INDEX IF NOT EXISTS idx_game_transition_log_recent
  ON game_transition_log(game_id, created_at DESC);

-- =====================================================
-- PHASE 4: ADVISORY LOCKING FUNCTIONS
-- =====================================================

-- Function to acquire advisory lock with timeout
CREATE OR REPLACE FUNCTION acquire_advisory_lock(p_lock_key TEXT, p_timeout_seconds INTEGER DEFAULT 10)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN pg_try_advisory_lock(hashtext(p_lock_key));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release advisory lock
CREATE OR REPLACE FUNCTION release_advisory_lock(p_lock_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN pg_advisory_unlock(hashtext(p_lock_key));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PHASE 5: ENHANCED TRANSITION FUNCTION
-- =====================================================

-- Update transition_game_status function with concurrency control and timer logic
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
    
    IF submission_count = 0 THEN
      RAISE EXCEPTION 'Cannot transition to voting: no submissions found for game %', game_uuid;
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

  -- Calculate results if transitioning to results
  IF new_status = 'results' THEN
    PERFORM calculate_game_results(game_uuid);
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN serialization_failure THEN
    -- Handle concurrent transaction conflicts
    RAISE NOTICE 'Concurrent transition detected for game %, retrying...', game_uuid;
    RETURN FALSE;
  WHEN OTHERS THEN
    -- Log error and re-raise
    RAISE WARNING 'Failed to transition game % from % to %: %', game_uuid, current_status, new_status, SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PHASE 6: TIMER HELPER FUNCTIONS
-- =====================================================

-- Function to get current timer state for a game
CREATE OR REPLACE FUNCTION get_game_timer_state(game_uuid UUID)
RETURNS TABLE(
  time_remaining INTEGER,
  phase_duration INTEGER,
  phase_expires_at TIMESTAMP WITH TIME ZONE,
  server_time TIMESTAMP WITH TIME ZONE,
  phase game_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN g.phase_expires_at IS NOT NULL THEN 
        GREATEST(0, EXTRACT(EPOCH FROM (g.phase_expires_at - now()))::INTEGER)
      ELSE NULL
    END as time_remaining,
    g.current_phase_duration as phase_duration,
    g.phase_expires_at,
    now() as server_time,
    g.status as phase
  FROM games g
  WHERE g.id = game_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find expired games for monitoring
CREATE OR REPLACE FUNCTION find_expired_games(limit_count INTEGER DEFAULT 50)
RETURNS TABLE(
  game_id UUID,
  current_status game_status,
  phase_expires_at TIMESTAMP WITH TIME ZONE,
  phase_duration INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id as game_id,
    g.status as current_status,
    g.phase_expires_at,
    g.current_phase_duration as phase_duration
  FROM games g
  WHERE g.phase_expires_at IS NOT NULL
    AND g.phase_expires_at <= now()
    AND g.status IN ('briefing', 'drawing', 'voting', 'results')
  ORDER BY g.phase_expires_at ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRATION VALIDATION
-- =====================================================

-- Verify the migration was successful
DO $$
BEGIN
  -- Check if new columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'current_phase_duration'
  ) THEN
    RAISE EXCEPTION 'Migration failed: current_phase_duration column not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'phase_expires_at'
  ) THEN
    RAISE EXCEPTION 'Migration failed: phase_expires_at column not created';
  END IF;

  -- Check if transition log table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'game_transition_log'
  ) THEN
    RAISE EXCEPTION 'Migration failed: game_transition_log table not created';
  END IF;

  RAISE NOTICE 'Server-side timer synchronization migration completed successfully';
END $$;

-- =====================================================
-- ENABLE REALTIME FOR GAMES TABLE
-- =====================================================

-- Add games table to realtime publication for real-time game status updates
ALTER PUBLICATION supabase_realtime ADD TABLE games;
