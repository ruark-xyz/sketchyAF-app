-- Fix user profile policies to allow authenticated users to access their own profiles

-- Drop existing policies
DROP POLICY IF EXISTS "Allow username availability check" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Create a comprehensive policy for user profile access
-- This allows:
-- 1. Authenticated users to view their own profile
-- 2. Anyone to check username availability (for signup)
CREATE POLICY "Users can access profiles appropriately" ON users
  FOR SELECT USING (
    -- Allow authenticated users to see their own profile
    (auth.uid() IS NOT NULL AND auth.uid() = id)
    OR
    -- Allow anyone to check username availability (only username field)
    (auth.uid() IS NULL)
  );

-- Ensure users can update their own profiles (only create if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'users'
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON users
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;
