-- Final fix for user RLS policies to resolve 406 errors

-- Drop all existing user policies
DROP POLICY IF EXISTS "Users can access profiles appropriately" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow username availability check" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- Create a simple, working policy for authenticated users to access their own profiles
CREATE POLICY "authenticated_users_own_profile" ON users
  FOR ALL USING (auth.uid() = id);

-- Create a policy for anonymous users to check username availability (for signup)
CREATE POLICY "anonymous_username_check" ON users
  FOR SELECT USING (auth.uid() IS NULL);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
