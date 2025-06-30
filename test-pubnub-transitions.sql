-- Test script to compare PubNub broadcasting between different phase transitions
-- This will help identify why briefing → drawing works but drawing → voting doesn't

\echo 'Setting up test game for PubNub transition testing...'

-- Clean up any existing test data
DELETE FROM game_participants WHERE game_id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid;
DELETE FROM games WHERE id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid;

-- Create test game in briefing phase
DO $$
DECLARE
  user1_id UUID;
BEGIN
  -- Get first user
  SELECT id INTO user1_id FROM users ORDER BY created_at LIMIT 1;
  
  -- Create test game in briefing phase
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
    'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid,
    'briefing',
    'Test PubNub Transitions',
    2,
    1,
    60,
    30,
    user1_id,
    now() + interval '5 seconds', -- Will expire in 5 seconds
    20
  );

  -- Add participant
  INSERT INTO game_participants (game_id, user_id) VALUES 
  ('bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid, user1_id);
END $$;

-- Check initial state
\echo 'Initial game state:'
SELECT 
  id,
  status,
  phase_expires_at,
  (phase_expires_at <= now()) as timer_expired
FROM games 
WHERE id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid;

-- Wait for timer to expire
\echo 'Waiting for timer to expire...'
SELECT pg_sleep(6);

-- Test 1: Briefing → Drawing transition via timer monitoring
\echo 'TEST 1: Testing briefing → drawing transition'
SELECT * FROM monitor_game_timers_db();

-- Check game state after briefing → drawing
\echo 'Game state after briefing → drawing:'
SELECT 
  id,
  status,
  phase_expires_at,
  (phase_expires_at <= now()) as timer_expired
FROM games 
WHERE id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid;

-- Check transition log
\echo 'Transition log:'
SELECT 
  from_status,
  to_status,
  triggered_by,
  created_at
FROM game_transition_log 
WHERE game_id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid
ORDER BY created_at DESC;

-- Now set up for drawing → voting transition
\echo 'Setting up for drawing → voting transition...'
UPDATE games 
SET phase_expires_at = now() + interval '3 seconds'
WHERE id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid;

-- Wait for timer to expire
\echo 'Waiting for drawing timer to expire...'
SELECT pg_sleep(4);

-- Test 2: Drawing → Voting transition via timer monitoring
\echo 'TEST 2: Testing drawing → voting transition (should trigger grace period)'
SELECT * FROM monitor_game_timers_db();

-- Check game state after first attempt (should be in grace period)
\echo 'Game state after first drawing → voting attempt (grace period):'
SELECT 
  id,
  status,
  phase_expires_at,
  (phase_expires_at <= now()) as timer_expired
FROM games 
WHERE id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid;

-- Check grace period metadata
\echo 'Grace period metadata:'
SELECT 
  key,
  value,
  created_at,
  expires_at,
  (expires_at <= now()) as grace_expired
FROM game_metadata 
WHERE game_id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid
  AND key LIKE 'drawing_grace_%';

-- Simulate grace period expiration
\echo 'Simulating grace period expiration...'
UPDATE game_metadata 
SET created_at = now() - interval '12 seconds',
    expires_at = now() - interval '2 seconds'
WHERE game_id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid
  AND key LIKE 'drawing_grace_%';

-- Also update game timer to be expired
UPDATE games 
SET phase_expires_at = now() - interval '1 second'
WHERE id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid;

-- Test 3: Drawing → Voting transition after grace period expires
\echo 'TEST 3: Testing drawing → voting transition after grace period expires'
SELECT * FROM monitor_game_timers_db();

-- Check final game state
\echo 'Final game state:'
SELECT 
  id,
  status,
  phase_expires_at
FROM games 
WHERE id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid;

-- Check all transition logs
\echo 'All transition logs for this test:'
SELECT 
  from_status,
  to_status,
  triggered_by,
  created_at
FROM game_transition_log 
WHERE game_id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid
ORDER BY created_at ASC;

-- Test manual transition to see if PubNub works
\echo 'TEST 4: Testing manual transition to see if PubNub trigger works'
UPDATE games 
SET status = 'completed'
WHERE id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid;

-- Clean up
\echo 'Cleaning up test data...'
DELETE FROM game_participants WHERE game_id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid;
DELETE FROM games WHERE id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid;
DELETE FROM game_metadata WHERE key LIKE 'drawing_grace_%';
DELETE FROM game_transition_log WHERE game_id = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'::uuid;

\echo 'PubNub transition testing completed!'
