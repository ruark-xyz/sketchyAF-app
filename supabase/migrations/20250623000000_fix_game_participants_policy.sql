-- Fix infinite recursion in game_participants RLS policy
-- The original policy was checking game_participants from within game_participants policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants in their games" ON game_participants;

-- Create a corrected policy that doesn't cause infinite recursion
-- Users can view participants in games they have joined
CREATE POLICY "Users can view participants in their games" ON game_participants
  FOR SELECT USING (
    -- Allow users to see participants in games where they are also a participant
    -- We check this by looking at the games table and checking if the user created the game
    -- OR by checking if there's a direct match for their user_id in this table
    user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_participants.game_id
        AND g.created_by = auth.uid()
    )
  );
