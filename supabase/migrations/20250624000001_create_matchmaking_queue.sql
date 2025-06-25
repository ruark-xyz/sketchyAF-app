-- Create matchmaking queue table for real-time player queue management
-- This replaces the in-memory queue with a persistent database solution

-- Create matchmaking_queue table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  preferences JSONB DEFAULT '{}',
  
  -- Constraints
  UNIQUE(user_id) -- Prevent duplicate entries for same user
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_joined_at ON matchmaking_queue(joined_at);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_user_id ON matchmaking_queue(user_id);

-- Enable RLS
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view all queue entries (needed for position calculation)
CREATE POLICY "Users can view matchmaking queue" ON matchmaking_queue
  FOR SELECT USING (true);

-- Users can only insert their own queue entry
CREATE POLICY "Users can join matchmaking queue" ON matchmaking_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own queue entry
CREATE POLICY "Users can leave matchmaking queue" ON matchmaking_queue
  FOR DELETE USING (auth.uid() = user_id);

-- Function to clean up old queue entries (older than 30 minutes)
CREATE OR REPLACE FUNCTION cleanup_old_queue_entries()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM matchmaking_queue 
  WHERE joined_at < now() - interval '30 minutes';
END;
$$;

-- Create a function to get queue position for a user
CREATE OR REPLACE FUNCTION get_queue_position(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  position INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO position
  FROM matchmaking_queue
  WHERE joined_at < (
    SELECT joined_at 
    FROM matchmaking_queue 
    WHERE user_id = target_user_id
  );
  
  RETURN position;
END;
$$;
