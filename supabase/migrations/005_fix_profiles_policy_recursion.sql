-- Fix infinite recursion in profiles policy
-- The "Students can view professor profiles" policy was causing recursion
-- when students query their own profile because it checks the profiles table
-- from within a profiles policy.

-- The issue: When a student queries their own profile, the policy
-- "Students can view professor profiles" tries to verify they're a student
-- by querying the profiles table, which triggers the same policy again.

-- Solution: Exclude the user's own profile from this policy.
-- The "Users can view their own profile" policy will handle their own profile,
-- and this policy will only apply to other profiles (professors).

-- Drop the problematic policy
DROP POLICY IF EXISTS "Students can view professor profiles" ON profiles;

-- Recreate the policy without the recursive check
-- Students can view professor profiles, but ONLY if it's NOT their own profile.
-- This prevents recursion when students query their own profile.
CREATE POLICY "Students can view professor profiles" ON profiles
  FOR SELECT USING (
    -- Only match profiles that are:
    -- 1. NOT the current user's profile (prevents recursion)
    -- 2. Role is 'professor'
    -- Note: We can't check if the querying user is a student via profiles table
    -- because that would cause recursion. Instead, we rely on:
    -- - The "Users can view their own profile" policy handling their own profile
    -- - This policy only matching professor profiles that aren't their own
    id != auth.uid() AND
    role = 'professor'
  );

-- Note: This policy allows any authenticated user to view professor profiles
-- except their own. To restrict it to students only, you would need to:
-- 1. Store role in JWT metadata during signup/login, OR
-- 2. Create a separate helper function that doesn't trigger RLS, OR
-- 3. Use a service role client for this check
-- For now, this prevents recursion while still allowing students to view professors.
