-- Temporarily disable RLS on games table to fix infinite recursion
-- This is a quick fix to get matchmaking working while we debug the policy issues

-- Disable RLS on games table temporarily
ALTER TABLE games DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on other tables as they're working fine
-- ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY; -- Already enabled
-- ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY; -- Already enabled

-- Note: This temporarily removes access control on games table
-- In production, we would need to fix the recursive policies instead
-- But for development/testing, this allows matchmaking to work
