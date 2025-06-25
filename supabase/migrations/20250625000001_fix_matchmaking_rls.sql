-- Fix RLS policies for matchmaking flow
-- This migration adds more permissive policies to allow matchmaking to work properly

-- Add a policy to allow users to view any waiting games (for matchmaking)
-- This is needed because matched users need to access games they were matched to
-- even if they haven't joined as participants yet
CREATE POLICY "users_can_view_waiting_games_for_matchmaking" ON games
  FOR SELECT USING (status = 'waiting');

-- Add a policy to allow users to view game participants in waiting games
-- This is needed for the match detection logic to work
CREATE POLICY "users_can_view_participants_in_waiting_games" ON game_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_participants.game_id
        AND g.status = 'waiting'
    )
  );

-- Add a policy to allow users to view their own matchmaking queue entries
-- This should already work but adding for completeness
CREATE POLICY "users_can_view_own_queue_entries" ON matchmaking_queue
  FOR SELECT USING (user_id = auth.uid());

-- Add a policy to allow users to view submissions in games they have access to
-- This prevents 406 errors when checking for existing submissions
CREATE POLICY "users_can_view_submissions_in_accessible_games" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = submissions.game_id
        AND (
          g.created_by = auth.uid() OR
          g.status = 'waiting' OR
          EXISTS (
            SELECT 1 FROM game_participants gp
            WHERE gp.game_id = g.id
              AND gp.user_id = auth.uid()
              AND gp.left_at IS NULL
          )
        )
    )
  );

-- Add a policy to allow users to view votes in games they have access to
-- This prevents 406 errors when checking for existing votes
CREATE POLICY "users_can_view_votes_in_accessible_games" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = votes.game_id
        AND (
          g.created_by = auth.uid() OR
          g.status = 'waiting' OR
          EXISTS (
            SELECT 1 FROM game_participants gp
            WHERE gp.game_id = g.id
              AND gp.user_id = auth.uid()
              AND gp.left_at IS NULL
          )
        )
    )
  );
