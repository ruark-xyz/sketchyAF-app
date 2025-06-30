/*
  # Remove PubNub Dependencies from Database
  
  This migration removes all PubNub-related database triggers and functions
  to transition to a Supabase Realtime-only approach for client notifications.
  
  Changes:
  1. Drop PubNub broadcasting triggers from games table
  2. Drop broadcast_game_event function
  3. Clean up any PubNub-related database objects
  4. Add comments explaining the transition to Realtime
  
  Date: 2025-06-30
  Task: Remove PubNub Dependencies for Realtime-Only Approach
*/

-- =====================================================
-- REMOVE PUBNUB BROADCASTING TRIGGERS
-- =====================================================

-- Drop all PubNub broadcasting triggers first (they depend on the function)
DROP TRIGGER IF EXISTS trigger_broadcast_phase_change ON games;
DROP TRIGGER IF EXISTS trigger_broadcast_player_joined ON game_participants;
DROP TRIGGER IF EXISTS trigger_broadcast_player_left ON game_participants;
DROP TRIGGER IF EXISTS trigger_broadcast_drawing_submitted ON submissions;
DROP TRIGGER IF EXISTS trigger_broadcast_vote_cast ON votes;
DROP TRIGGER IF EXISTS broadcast_game_event_trigger ON games;

-- Now drop the PubNub broadcasting function
DROP FUNCTION IF EXISTS broadcast_game_event();

-- =====================================================
-- ADD DOCUMENTATION COMMENTS
-- =====================================================

-- Add a comment to the games table explaining the new approach
COMMENT ON TABLE games IS 'Game state table. Status changes are automatically broadcast to clients via Supabase Realtime postgres_changes subscriptions. No additional triggers needed for client notifications.';

-- Add a comment to the status column
COMMENT ON COLUMN games.status IS 'Current game phase status. Changes to this column trigger Supabase Realtime notifications to subscribed clients for automatic navigation between game phases.';

-- =====================================================
-- ENSURE REALTIME IS ENABLED FOR GAMES TABLE
-- =====================================================

-- Ensure the games table is included in the realtime publication
-- This allows clients to receive postgres_changes events
DO $$
BEGIN
  -- Check if games table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'games'
  ) THEN
    -- Add games table to realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE games;
    RAISE NOTICE 'Added games table to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'Games table already in supabase_realtime publication';
  END IF;
END $$;

-- =====================================================
-- VALIDATION AND CLEANUP
-- =====================================================

-- Verify that PubNub dependencies have been removed
DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Check for any remaining PubNub-related triggers
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers 
  WHERE trigger_name LIKE '%pubnub%' OR trigger_name LIKE '%broadcast%';
  
  -- Check for any remaining PubNub-related functions
  SELECT COUNT(*) INTO function_count
  FROM information_schema.routines 
  WHERE routine_name LIKE '%pubnub%' OR routine_name LIKE '%broadcast%';
  
  IF trigger_count > 0 THEN
    RAISE WARNING 'Found % PubNub-related triggers that may need manual cleanup', trigger_count;
  END IF;
  
  IF function_count > 0 THEN
    RAISE WARNING 'Found % PubNub-related functions that may need manual cleanup', function_count;
  END IF;
  
  RAISE NOTICE 'PubNub dependency removal completed successfully';
  RAISE NOTICE 'Games table is now configured for Supabase Realtime notifications only';
  RAISE NOTICE 'Clients should subscribe to postgres_changes events on the games table';
END $$;
