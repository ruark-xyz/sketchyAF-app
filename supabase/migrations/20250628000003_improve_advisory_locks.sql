/*
  # Improve Advisory Lock System
  
  This migration enhances the advisory lock system to prevent stuck locks
  and improve reliability of the timer monitoring system.
  
  Date: 2025-06-28
  Task: Fix Advisory Lock Issues in Timer Monitoring
*/

-- =====================================================
-- ENHANCED ADVISORY LOCK FUNCTIONS
-- =====================================================

-- Create a table to track advisory lock metadata
CREATE TABLE IF NOT EXISTS advisory_lock_metadata (
  lock_key TEXT PRIMARY KEY,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  acquired_by TEXT DEFAULT 'unknown',
  timeout_seconds INTEGER DEFAULT 300 -- 5 minutes default timeout
);

-- Enhanced function to acquire advisory lock with metadata tracking
CREATE OR REPLACE FUNCTION acquire_advisory_lock_enhanced(
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
CREATE OR REPLACE FUNCTION release_advisory_lock_enhanced(p_lock_key TEXT)
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

-- Function to clean up all stuck advisory locks
CREATE OR REPLACE FUNCTION cleanup_stuck_advisory_locks()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER := 0;
  lock_record RECORD;
BEGIN
  -- Find all locks that have exceeded their timeout
  FOR lock_record IN 
    SELECT lock_key, acquired_at, timeout_seconds,
           EXTRACT(EPOCH FROM (now() - acquired_at))::INTEGER as age_seconds
    FROM advisory_lock_metadata 
    WHERE EXTRACT(EPOCH FROM (now() - acquired_at))::INTEGER > timeout_seconds
  LOOP
    RAISE NOTICE 'Cleaning up stuck lock: % (age: %s, timeout: %s)', 
      lock_record.lock_key, lock_record.age_seconds, lock_record.timeout_seconds;
    
    -- Force release the lock
    PERFORM pg_advisory_unlock(hashtext(lock_record.lock_key));
    
    -- Remove metadata
    DELETE FROM advisory_lock_metadata WHERE lock_key = lock_record.lock_key;
    
    cleanup_count := cleanup_count + 1;
  END LOOP;
  
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get advisory lock status
CREATE OR REPLACE FUNCTION get_advisory_lock_status()
RETURNS TABLE(
  lock_key TEXT,
  acquired_at TIMESTAMP WITH TIME ZONE,
  acquired_by TEXT,
  timeout_seconds INTEGER,
  age_seconds INTEGER,
  is_stuck BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.lock_key,
    m.acquired_at,
    m.acquired_by,
    m.timeout_seconds,
    EXTRACT(EPOCH FROM (now() - m.acquired_at))::INTEGER as age_seconds,
    EXTRACT(EPOCH FROM (now() - m.acquired_at))::INTEGER > m.timeout_seconds as is_stuck
  FROM advisory_lock_metadata m
  ORDER BY m.acquired_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE EXISTING FUNCTIONS TO USE ENHANCED VERSIONS
-- =====================================================

-- Update the original functions to use enhanced versions for backward compatibility
CREATE OR REPLACE FUNCTION acquire_advisory_lock(p_lock_key TEXT, p_timeout_seconds INTEGER DEFAULT 10)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN acquire_advisory_lock_enhanced(p_lock_key, p_timeout_seconds, 'legacy_caller');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION release_advisory_lock(p_lock_key TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN release_advisory_lock_enhanced(p_lock_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ENABLE RLS ON ADVISORY LOCK METADATA
-- =====================================================

-- Enable RLS but allow service role to manage locks
ALTER TABLE advisory_lock_metadata ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role full access
CREATE POLICY "service_role_full_access" ON advisory_lock_metadata
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Verify the migration was successful
DO $$
BEGIN
  -- Check if enhanced functions exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'acquire_advisory_lock_enhanced'
  ) THEN
    RAISE EXCEPTION 'Migration failed: acquire_advisory_lock_enhanced function not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'advisory_lock_metadata'
  ) THEN
    RAISE EXCEPTION 'Migration failed: advisory_lock_metadata table not created';
  END IF;

  RAISE NOTICE 'Enhanced advisory lock system migration completed successfully';
END $$;
