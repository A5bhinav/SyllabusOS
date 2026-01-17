-- Allow professors to view student profiles when viewing enrollments
-- This enables professors to see student names in the enrolled students list

-- Drop existing policy if it exists (for idempotent migration)
DROP POLICY IF EXISTS "Professors can view student profiles" ON profiles;

-- Create a helper function to check if user is a professor
-- This function uses SECURITY DEFINER to bypass RLS and prevent recursion
CREATE OR REPLACE FUNCTION public.is_professor(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.id = user_id 
    AND profiles.role = 'professor'
  );
END;
$$;

-- Create policy that allows professors to view student profiles
-- Professors need to see student names when viewing enrollments in their courses
-- Uses the helper function to avoid RLS recursion
CREATE POLICY "Professors can view student profiles" ON profiles
  FOR SELECT USING (
    role = 'student' AND
    public.is_professor(auth.uid())
  );

