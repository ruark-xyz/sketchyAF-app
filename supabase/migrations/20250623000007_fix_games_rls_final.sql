-- Final fix for games table RLS policies to eliminate infinite recursion
-- This migration completely resets all policies for games and game_participants tables

-- Drop ALL existing policies on games table
DROP POLICY IF EXISTS "Users can view games they participate in" ON games;
DROP POLICY IF EXISTS "Users can view public waiting games" ON games;
DROP POLICY IF EXISTS "Authenticated users can create games" ON games;
DROP POLICY IF EXISTS "Game creators can update their games" ON games;
DROP POLICY IF EXISTS "Users can view accessible games" ON games;

-- Drop ALL existing policies on game_participants table
DROP POLICY IF EXISTS "Users can view participants in their games" ON game_participants;
DROP POLICY IF EXISTS "Users can join games" ON game_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON game_participants;
DROP POLICY IF EXISTS "Users can view game participants" ON game_participants;

-- Create simple, non-recursive policies for games table
-- Policy 1: Users can view games they created
CREATE POLICY "games_creators_can_view" ON games
  FOR SELECT USING (created_by = auth.uid());

-- Policy 2: Users can view public waiting games
CREATE POLICY "games_public_waiting_viewable" ON games
  FOR SELECT USING (status = 'waiting' AND current_players < max_players);

-- Policy 3: Users can create games
CREATE POLICY "games_authenticated_can_create" ON games
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Policy 4: Game creators can update their games
CREATE POLICY "games_creators_can_update" ON games
  FOR UPDATE USING (created_by = auth.uid());

-- Create simple, non-recursive policies for game_participants table
-- Policy 1: Users can view their own participation records
CREATE POLICY "participants_can_view_own" ON game_participants
  FOR SELECT USING (user_id = auth.uid());

-- Policy 2: Game creators can view all participants in their games
CREATE POLICY "participants_creators_can_view_all" ON game_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_participants.game_id
        AND g.created_by = auth.uid()
    )
  );

-- Policy 3: Users can join games
CREATE POLICY "participants_can_join" ON game_participants
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Policy 4: Users can update their own participation
CREATE POLICY "participants_can_update_own" ON game_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Ensure RLS is enabled
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
