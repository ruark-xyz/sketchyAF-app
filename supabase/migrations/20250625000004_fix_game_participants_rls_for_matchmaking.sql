-- Fix RLS policies for game_participants to allow matchmaking service to add matched players
-- This is needed because the matchmaking service needs to add all matched players to the game

-- Add a policy to allow inserting participants for waiting games
-- This allows the matchmaking service to add matched players to newly created games
CREATE POLICY "matchmaking_can_add_participants_to_waiting_games" ON game_participants
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_participants.game_id
        AND g.status = 'waiting'
        AND g.created_at > NOW() - INTERVAL '5 minutes'  -- Only for recently created games
    )
  );

-- Also ensure users can view participants in waiting games (should already exist but adding for safety)
DROP POLICY IF EXISTS "users_can_view_participants_in_waiting_games" ON game_participants;
CREATE POLICY "users_can_view_participants_in_waiting_games" ON game_participants
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_participants.game_id
        AND g.status = 'waiting'
    )
  );
