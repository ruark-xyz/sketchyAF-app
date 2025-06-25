-- Fix the ambiguous column reference in check_user_in_queue function

-- Drop and recreate the function with proper table aliases
DROP FUNCTION IF EXISTS check_user_in_queue(UUID);

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
