/*
  # Fix Advisory Lock Column Ambiguity

  This migration fixes the "column reference 'lock_key' is ambiguous" error
  in the advisory lock functions by renaming function parameters to avoid
  conflicts with table column names.

  Date: 2025-06-29
  Issue: Production monitor-game-timers edge function failing with SQL ambiguity error
*/

-- =====================================================
-- FIX ENHANCED ADVISORY LOCK FUNCTIONS
-- =====================================================

-- Drop existing functions to allow parameter name changes
DROP FUNCTION IF EXISTS acquire_advisory_lock_enhanced(TEXT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS release_advisory_lock_enhanced(TEXT);
DROP FUNCTION IF EXISTS acquire_advisory_lock(TEXT, INTEGER);
DROP FUNCTION IF EXISTS release_advisory_lock(TEXT);

-- Enhanced function to acquire advisory lock with metadata tracking
-- Fixed parameter names to avoid column ambiguity
CREATE FUNCTION acquire_advisory_lock_enhanced(
  p_lock_key TEXT,
  p_timeout_seconds INTEGER DEFAULT 10,
  p_acquired_by TEXT DEFAULT 'unknown'
)
RETURNS BOOLEAN AS $$
DECLARE
  lock_acquired BOOLEAN;
  existing_lock_age INTEGER;
BEGIN
  -- First, check if there's an existing lock that has timed out
  SELECT EXTRACT(EPOCH FROM (now() - acquired_at))::INTEGER INTO existing_lock_age
  FROM advisory_lock_metadata
  WHERE lock_key = p_lock_key;

  -- If lock exists and is older than its timeout, force release it
  IF existing_lock_age IS NOT NULL AND existing_lock_age > (
    SELECT timeout_seconds FROM advisory_lock_metadata
    WHERE lock_key = p_lock_key
  ) THEN
    RAISE NOTICE 'Forcing release of stuck advisory lock: % (age: %s)', p_lock_key, existing_lock_age;
    PERFORM pg_advisory_unlock(hashtext(p_lock_key));
    DELETE FROM advisory_lock_metadata WHERE lock_key = p_lock_key;
  END IF;

  -- Try to acquire the lock
  SELECT pg_try_advisory_lock(hashtext(p_lock_key)) INTO lock_acquired;

  -- If successful, record metadata
  IF lock_acquired THEN
    INSERT INTO advisory_lock_metadata (lock_key, acquired_at, acquired_by, timeout_seconds)
    VALUES (p_lock_key, now(), p_acquired_by, p_timeout_seconds)
    ON CONFLICT (lock_key)
    DO UPDATE SET
      acquired_at = now(),
      acquired_by = EXCLUDED.acquired_by,
      timeout_seconds = EXCLUDED.timeout_seconds;
  END IF;

  RETURN lock_acquired;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function to release advisory lock with metadata cleanup
-- Fixed parameter names to avoid column ambiguity
CREATE FUNCTION release_advisory_lock_enhanced(p_lock_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  lock_released BOOLEAN;
BEGIN
  -- Release the lock
  SELECT pg_advisory_unlock(hashtext(p_lock_key)) INTO lock_released;

  -- Clean up metadata regardless of release result
  DELETE FROM advisory_lock_metadata WHERE lock_key = p_lock_key;

  RETURN lock_released;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the original functions to use enhanced versions for backward compatibility
-- Fixed parameter names to avoid column ambiguity
CREATE FUNCTION acquire_advisory_lock(p_lock_key TEXT, p_timeout_seconds INTEGER DEFAULT 10)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN acquire_advisory_lock_enhanced(p_lock_key, p_timeout_seconds, 'legacy_caller');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE FUNCTION release_advisory_lock(p_lock_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN release_advisory_lock_enhanced(p_lock_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test the fixed functions to ensure they work correctly
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  -- Test acquire function
  SELECT acquire_advisory_lock_enhanced('test_lock_fix', 10, 'migration_test') INTO test_result;

  IF NOT test_result THEN
    RAISE EXCEPTION 'Migration verification failed: acquire_advisory_lock_enhanced test failed';
  END IF;

  -- Test release function
  SELECT release_advisory_lock_enhanced('test_lock_fix') INTO test_result;

  IF NOT test_result THEN
    RAISE EXCEPTION 'Migration verification failed: release_advisory_lock_enhanced test failed';
  END IF;

  RAISE NOTICE 'Advisory lock column ambiguity fix migration completed successfully';
END $$;