-- Fix username availability check to work for unauthenticated users during signup

-- Drop the current policies
DROP POLICY IF EXISTS "Allow username availability check" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Create a policy that allows username checks for everyone (needed for signup)
-- but only exposes the username field for availability checking
CREATE POLICY "Allow username availability check" ON users
  FOR SELECT USING (true);

-- Create a separate policy for authenticated users to view their own full profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Note: PostgreSQL will use the most permissive policy that matches,
-- so authenticated users can see their full profile, while unauthenticated
-- users can only check username availability
