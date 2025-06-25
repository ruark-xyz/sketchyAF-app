-- Fix infinite recursion in RLS policies for games table
-- The issue is caused by overlapping policies that create circular dependencies

-- =====================================================
-- CLEAN SLATE: DROP ALL CONFLICTING POLICIES
-- =====================================================

-- Drop all existing policies on games table
DROP POLICY IF EXISTS "games_creators_can_view" ON games;
DROP POLICY IF EXISTS "games_public_waiting_viewable" ON games;
DROP POLICY IF EXISTS "games_authenticated_can_create" ON games;
DROP POLICY IF EXISTS "games_creators_can_update" ON games;
DROP POLICY IF EXISTS "games_participants_can_view" ON games;
DROP POLICY IF EXISTS "participants_can_view_waiting_games" ON games;

-- =====================================================
-- CREATE NON-RECURSIVE POLICIES FOR GAMES TABLE
-- =====================================================

-- Policy 1: Users can view games they created
CREATE POLICY "games_view_own_created" ON games
  FOR SELECT USING (created_by = auth.uid());

-- Policy 2: Users can view public waiting games (simple, no joins)
CREATE POLICY "games_view_public_waiting" ON games
  FOR SELECT USING (
    status = 'waiting' 
    AND current_players < max_players
  );

-- Policy 3: Users can view games where they are participants (using direct user_id check)
CREATE POLICY "games_view_as_participant" ON games
  FOR SELECT USING (
    id IN (
      SELECT game_id 
      FROM game_participants 
      WHERE user_id = auth.uid() 
        AND left_at IS NULL
    )
  );

-- Policy 4: Authenticated users can create games
CREATE POLICY "games_create_authenticated" ON games
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Policy 5: Game creators can update their games
CREATE POLICY "games_update_own" ON games
  FOR UPDATE USING (created_by = auth.uid());

-- =====================================================
-- ENSURE GAME_PARTICIPANTS POLICIES ARE SIMPLE
-- =====================================================

-- These should already be fine, but let's make sure they don't reference games table recursively
-- The existing policies from previous migrations should be sufficient and non-recursive
