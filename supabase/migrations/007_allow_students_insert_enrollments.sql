-- Allow students to insert their own enrollments (for join code enrollment)
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Students can insert their own enrollments" ON enrollments;

-- Create policy for students to insert enrollments
CREATE POLICY "Students can insert their own enrollments" ON enrollments
  FOR INSERT 
  WITH CHECK (student_id = auth.uid());
