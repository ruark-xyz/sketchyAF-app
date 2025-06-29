-- Comprehensive RLS fix for matchmaking flow
-- This ensures all matched players can properly access and interact with their games

-- =====================================================
-- GAMES TABLE POLICIES
-- =====================================================

-- Add policy for participants to view games they're in (not just creators)
CREATE POLICY "games_participants_can_view" ON games
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM game_participants gp
      WHERE gp.game_id = games.id
        AND gp.user_id = auth.uid()
        AND gp.left_at IS NULL
    )
  );

-- =====================================================
-- GAME_PARTICIPANTS TABLE POLICIES
-- =====================================================

-- Add policy for participants to view other participants in the same game
CREATE POLICY "participants_can_view_others_in_same_game" ON game_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM game_participants gp2
      WHERE gp2.game_id = game_participants.game_id
        AND gp2.user_id = auth.uid()
        AND gp2.left_at IS NULL
    )
  );

-- =====================================================
-- SUBMISSIONS TABLE POLICIES
-- =====================================================

-- Ensure the existing submission policies work with matchmaking
-- The current policy should work, but let's make it more explicit
DROP POLICY IF EXISTS "Game participants can view all submissions in their games" ON submissions;
CREATE POLICY "participants_can_view_submissions_in_their_games" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM game_participants gp
      WHERE gp.game_id = submissions.game_id
        AND gp.user_id = auth.uid()
        AND gp.left_at IS NULL
    )
  );

-- =====================================================
-- VOTES TABLE POLICIES
-- =====================================================

-- Ensure the existing vote policies work with matchmaking
DROP POLICY IF EXISTS "Game participants can view votes in their games" ON votes;
CREATE POLICY "participants_can_view_votes_in_their_games" ON votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM game_participants gp
      WHERE gp.game_id = votes.game_id
        AND gp.user_id = auth.uid()
        AND gp.left_at IS NULL
    )
  );

-- Update vote insertion policy to be more explicit
DROP POLICY IF EXISTS "Users can cast votes in their games" ON votes;
CREATE POLICY "participants_can_cast_votes_in_their_games" ON votes
  FOR INSERT TO authenticated WITH CHECK (
    voter_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM game_participants gp
      WHERE gp.game_id = votes.game_id
        AND gp.user_id = auth.uid()
        AND gp.left_at IS NULL
    )
  );

-- =====================================================
-- ADDITIONAL SAFETY POLICIES
-- =====================================================

-- Allow users to view waiting games they're participants in (for matchmaking detection)
CREATE POLICY "participants_can_view_waiting_games" ON games
  FOR SELECT USING (
    status = 'waiting' AND
    EXISTS (
      SELECT 1 FROM game_participants gp
      WHERE gp.game_id = games.id
        AND gp.user_id = auth.uid()
    )
  );
