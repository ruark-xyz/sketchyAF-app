-- Test script for drawing phase grace period mechanism
-- This script simulates the scenario where a game's drawing phase timer expires
-- but no submissions exist, testing the grace period functionality

-- Clean up any existing test data
DELETE FROM game_metadata WHERE key LIKE 'drawing_grace_%';
DELETE FROM submissions WHERE game_id IN (SELECT id FROM games WHERE prompt LIKE 'Test Grace Period%');
DELETE FROM game_participants WHERE game_id IN (SELECT id FROM games WHERE prompt LIKE 'Test Grace Period%');
DELETE FROM games WHERE prompt LIKE 'Test Grace Period%';

-- Get existing users for testing
DO $$
DECLARE
  user1_id UUID;
  user2_id UUID;
BEGIN
  -- Get first two users
  SELECT id INTO user1_id FROM users ORDER BY created_at LIMIT 1;
  SELECT id INTO user2_id FROM users ORDER BY created_at LIMIT 1 OFFSET 1;

  -- Create a test game in drawing phase with expired timer
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
  ) VALUES (
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'drawing',
    'Test Grace Period Game',
    2,
    2,
    60,
    30,
    user1_id,
    now() - interval '5 seconds', -- Timer expired 5 seconds ago
    60
  );

  -- Add participants to the game
  INSERT INTO game_participants (game_id, user_id) VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', user1_id),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', user2_id);
END $$;

-- Display initial state
SELECT 
  'INITIAL STATE' as test_phase,
  g.id as game_id,
  g.status,
  g.current_players,
  g.phase_expires_at,
  (g.phase_expires_at <= now()) as timer_expired,
  (SELECT COUNT(*) FROM submissions WHERE game_id = g.id) as submission_count,
  (SELECT COUNT(*) FROM game_participants WHERE game_id = g.id) as participant_count
FROM games g 
WHERE g.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Test 1: Run timer monitoring - should start grace period
SELECT 'TEST 1: First timer monitoring run (should start grace period)' as test_description;
SELECT * FROM monitor_game_timers_db();

-- Check game state after first run
SELECT 
  'AFTER FIRST RUN' as test_phase,
  g.id as game_id,
  g.status,
  g.phase_expires_at,
  (g.phase_expires_at <= now()) as timer_expired,
  (SELECT COUNT(*) FROM submissions WHERE game_id = g.id) as submission_count,
  (SELECT COUNT(*) FROM game_metadata WHERE game_id = g.id AND key LIKE 'drawing_grace_%') as grace_period_active
FROM games g 
WHERE g.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Check grace period metadata
SELECT 
  'GRACE PERIOD METADATA' as info,
  key,
  value,
  created_at,
  expires_at,
  (expires_at <= now()) as grace_expired
FROM game_metadata 
WHERE game_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' 
  AND key LIKE 'drawing_grace_%';

-- Test 2: Run timer monitoring again while grace period is active - should skip
SELECT 'TEST 2: Second timer monitoring run (grace period active, should skip)' as test_description;
SELECT * FROM monitor_game_timers_db();

-- Wait for grace period to expire (simulate by updating the metadata)
UPDATE game_metadata 
SET created_at = now() - interval '12 seconds',
    expires_at = now() - interval '2 seconds'
WHERE game_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' 
  AND key LIKE 'drawing_grace_%';

-- Also update the game timer to be expired again
UPDATE games 
SET phase_expires_at = now() - interval '1 second'
WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Test 3: Run timer monitoring after grace period expires - should transition to voting
SELECT 'TEST 3: Third timer monitoring run (grace period expired, should transition to voting)' as test_description;
SELECT * FROM monitor_game_timers_db();

-- Check final game state
SELECT 
  'FINAL STATE' as test_phase,
  g.id as game_id,
  g.status,
  g.phase_expires_at,
  (SELECT COUNT(*) FROM submissions WHERE game_id = g.id) as submission_count,
  (SELECT COUNT(*) FROM game_metadata WHERE game_id = g.id AND key LIKE 'drawing_grace_%') as grace_period_active
FROM games g 
WHERE g.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Test 4: Test with all submissions present
-- Reset the game to drawing phase
UPDATE games 
SET status = 'drawing',
    phase_expires_at = now() - interval '1 second',
    current_phase_duration = 60
WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Add submissions for all players using existing users
DO $$
DECLARE
  user1_id UUID;
  user2_id UUID;
BEGIN
  -- Get the same users we used for the game
  SELECT id INTO user1_id FROM users ORDER BY created_at LIMIT 1;
  SELECT id INTO user2_id FROM users ORDER BY created_at LIMIT 1 OFFSET 1;

  INSERT INTO submissions (game_id, user_id, drawing_data) VALUES
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', user1_id, '{"elements": []}'),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', user2_id, '{"elements": []}');
END $$;

SELECT 'TEST 4: Timer monitoring with all submissions present (should transition immediately)' as test_description;
SELECT * FROM monitor_game_timers_db();

-- Check final state with submissions
SELECT 
  'FINAL STATE WITH SUBMISSIONS' as test_phase,
  g.id as game_id,
  g.status,
  (SELECT COUNT(*) FROM submissions WHERE game_id = g.id) as submission_count,
  (SELECT COUNT(*) FROM game_metadata WHERE game_id = g.id AND key LIKE 'drawing_grace_%') as grace_period_active
FROM games g 
WHERE g.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

-- Clean up test data
DELETE FROM submissions WHERE game_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
DELETE FROM game_participants WHERE game_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
DELETE FROM games WHERE id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
DELETE FROM game_metadata WHERE key LIKE 'drawing_grace_%';

SELECT 'Grace period testing completed successfully!' as result;
