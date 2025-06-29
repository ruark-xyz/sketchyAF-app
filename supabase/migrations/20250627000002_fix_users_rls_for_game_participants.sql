-- Fix users table RLS to allow viewing other participants' profiles in shared games
-- This is needed for the voting screen to display usernames and avatars of other participants

-- Drop the old restrictive policy first
DROP POLICY IF EXISTS "authenticated_users_own_profile" ON users;

-- Add policy to allow users to view basic profile info of other participants in their games
CREATE POLICY "users_can_view_game_participants_profiles" ON users
  FOR SELECT USING (
    -- Users can always see their own profile
    auth.uid() = id
    OR
    -- Users can see profiles of other participants in games they're also participating in
    EXISTS (
      SELECT 1 FROM game_participants gp1
      JOIN game_participants gp2 ON gp1.game_id = gp2.game_id
      WHERE gp1.user_id = auth.uid()
        AND gp2.user_id = users.id
        AND gp1.left_at IS NULL
        AND gp2.left_at IS NULL
    )
  );

-- Keep the anonymous username check policy
-- (This should already exist from previous migrations)
