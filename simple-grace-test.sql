-- Simple test for grace period mechanism
-- This test manually creates a game scenario and tests the grace period logic

-- Get existing users
\echo 'Getting existing users...'
SELECT id, username FROM users ORDER BY created_at LIMIT 2;

-- Create a simple test game manually
\echo 'Creating test game...'
INSERT INTO games (
  id, 
  status, 
  prompt, 
  max_players, 
  current_players, 
  round_duration, 
  voting_duration,
  created_by,
  phase_expires_at,
  current_phase_duration
) 
SELECT 
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid,
  'drawing'::game_status,
  'Test Grace Period Game',
  2,
  0, -- Start with 0, will be updated by triggers
  60,
  30,
  u.id,
  now() - interval '5 seconds', -- Timer expired 5 seconds ago
  60
FROM users u 
ORDER BY u.created_at 
LIMIT 1;

-- Add participants manually
\echo 'Adding participants...'
INSERT INTO game_participants (game_id, user_id) 
SELECT 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid, u.id
FROM users u 
ORDER BY u.created_at 
LIMIT 2;

-- Check initial game state
\echo 'Initial game state:'
SELECT 
  g.id,
  g.status,
  g.current_players,
  g.phase_expires_at,
  (g.phase_expires_at <= now()) as timer_expired,
  (SELECT COUNT(*) FROM submissions WHERE game_id = g.id) as submission_count
FROM games g 
WHERE g.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid;

-- Test 1: Run timer monitoring (should start grace period)
\echo 'TEST 1: Running timer monitoring - should start grace period'
SELECT * FROM monitor_game_timers_db();

-- Check game state after first run
\echo 'Game state after first timer monitoring run:'
SELECT 
  g.id,
  g.status,
  g.phase_expires_at,
  (g.phase_expires_at <= now()) as timer_expired,
  (SELECT COUNT(*) FROM submissions WHERE game_id = g.id) as submission_count,
  (SELECT COUNT(*) FROM game_metadata WHERE game_id = g.id AND key LIKE 'drawing_grace_%') as grace_period_active
FROM games g 
WHERE g.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid;

-- Check grace period metadata
\echo 'Grace period metadata:'
SELECT 
  key,
  value,
  created_at,
  expires_at,
  (expires_at <= now()) as grace_expired
FROM game_metadata 
WHERE game_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid
  AND key LIKE 'drawing_grace_%';

-- Test 2: Run timer monitoring again (should skip while grace period active)
\echo 'TEST 2: Running timer monitoring again - should skip during grace period'
SELECT * FROM monitor_game_timers_db();

-- Simulate grace period expiration by updating metadata
\echo 'Simulating grace period expiration...'
UPDATE game_metadata 
SET created_at = now() - interval '12 seconds',
    expires_at = now() - interval '2 seconds'
WHERE game_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid
  AND key LIKE 'drawing_grace_%';

-- Also update game timer to be expired
UPDATE games 
SET phase_expires_at = now() - interval '1 second'
WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid;

-- Test 3: Run timer monitoring after grace period expires (should transition to voting)
\echo 'TEST 3: Running timer monitoring after grace period expires - should transition to voting'
SELECT * FROM monitor_game_timers_db();

-- Check final game state
\echo 'Final game state:'
SELECT 
  g.id,
  g.status,
  g.phase_expires_at,
  (SELECT COUNT(*) FROM submissions WHERE game_id = g.id) as submission_count,
  (SELECT COUNT(*) FROM game_metadata WHERE game_id = g.id AND key LIKE 'drawing_grace_%') as grace_period_active
FROM games g 
WHERE g.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid;

-- Clean up
\echo 'Cleaning up test data...'
DELETE FROM game_participants WHERE game_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid;
DELETE FROM games WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::uuid;
DELETE FROM game_metadata WHERE key LIKE 'drawing_grace_%';

\echo 'Grace period test completed!'
