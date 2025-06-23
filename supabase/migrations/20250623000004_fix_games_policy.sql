-- Fix infinite recursion in games table policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view games they participate in" ON games;
DROP POLICY IF EXISTS "Users can view participants in their games" ON game_participants;

-- Create a simpler games policy that doesn't cause recursion
-- Users can view games they created or games that are public/waiting
CREATE POLICY "Users can view accessible games" ON games
  FOR SELECT USING (
    -- Users can see games they created
    created_by = auth.uid()
    OR
    -- Users can see public waiting games
    (status = 'waiting' AND current_players < max_players)
    OR
    -- Users can see games they're participating in (direct check without recursion)
    id IN (
      SELECT DISTINCT game_id 
      FROM game_participants 
      WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

-- Create a simpler game_participants policy
-- Users can view participants in games they have access to
CREATE POLICY "Users can view game participants" ON game_participants
  FOR SELECT USING (
    -- Users can see participants in games they created
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_participants.game_id
        AND g.created_by = auth.uid()
    )
    OR
    -- Users can see participants in games they're also participating in
    user_id = auth.uid()
    OR
    -- Users can see participants in public waiting games
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_participants.game_id
        AND g.status = 'waiting'
        AND g.current_players < g.max_players
    )
  );
