-- Allow students to view all courses (for browsing)
-- This enables the "Browse Courses" feature

-- Drop existing policy if it exists (for idempotent migration)
DROP POLICY IF EXISTS "Students can view all courses" ON courses;

-- Create policy that allows students to view all courses
CREATE POLICY "Students can view all courses" ON courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'student'
    )
  );

-- Allow students to view professor profiles (for displaying professor info in course listings)
-- Students need to see professor name and email when browsing courses
DROP POLICY IF EXISTS "Students can view professor profiles" ON profiles;

CREATE POLICY "Students can view professor profiles" ON profiles
  FOR SELECT USING (
    role = 'professor' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'student'
    )
  );

