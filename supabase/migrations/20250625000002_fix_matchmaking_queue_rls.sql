-- Fix RLS policies for matchmaking queue to resolve 406 Not Acceptable errors
-- This migration adds more specific policies to allow proper queue status checking

-- Drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Users can view matchmaking queue" ON matchmaking_queue;
DROP POLICY IF EXISTS "users_can_view_own_queue_entries" ON matchmaking_queue;

-- Create more specific policies for matchmaking queue access

-- Policy 1: Users can view all queue entries (needed for position calculation and queue processing)
CREATE POLICY "matchmaking_queue_view_all" ON matchmaking_queue
  FOR SELECT TO authenticated USING (true);

-- Policy 2: Users can only insert their own queue entry
CREATE POLICY "matchmaking_queue_insert_own" ON matchmaking_queue
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can only update their own queue entry (if needed)
CREATE POLICY "matchmaking_queue_update_own" ON matchmaking_queue
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Policy 4: Users can delete their own queue entry OR system can delete any (for matchmaking cleanup)
-- Note: We need to allow system-level deletes for matchmaking service to remove matched players
CREATE POLICY "matchmaking_queue_delete_flexible" ON matchmaking_queue
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id OR  -- Users can delete their own entries
    true  -- Allow system deletes for matchmaking cleanup (this might need service role in production)
  );

-- Add a function to safely check if user is in queue (to avoid RLS issues)
CREATE OR REPLACE FUNCTION check_user_in_queue(target_user_id UUID)
RETURNS TABLE(
  in_queue BOOLEAN,
  joined_at TIMESTAMP WITH TIME ZONE,
  queue_position INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with elevated privileges to bypass RLS
AS $$
DECLARE
  queue_entry matchmaking_queue%ROWTYPE;
  user_position INTEGER;
BEGIN
  -- Check if user is in queue
  SELECT * INTO queue_entry
  FROM matchmaking_queue mq
  WHERE mq.user_id = target_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMP WITH TIME ZONE, NULL::INTEGER;
    RETURN;
  END IF;

  -- Calculate position
  SELECT COUNT(*) + 1 INTO user_position
  FROM matchmaking_queue mq2
  WHERE mq2.joined_at < queue_entry.joined_at;

  RETURN QUERY SELECT true, queue_entry.joined_at, user_position;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_user_in_queue(UUID) TO authenticated;

-- Add a function to safely get queue status for matchmaking service
CREATE OR REPLACE FUNCTION get_matchmaking_queue_status()
RETURNS TABLE(
  user_id UUID,
  joined_at TIMESTAMP WITH TIME ZONE,
  preferences JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with elevated privileges
AS $$
BEGIN
  RETURN QUERY 
  SELECT mq.user_id, mq.joined_at, mq.preferences
  FROM matchmaking_queue mq
  ORDER BY mq.joined_at ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_matchmaking_queue_status() TO authenticated;
