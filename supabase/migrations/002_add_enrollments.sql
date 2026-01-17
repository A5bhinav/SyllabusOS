-- Enrollments table - Links students to courses
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);
-- Indexes for performance
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_course_student ON enrollments(course_id, student_id);

-- Enable RLS
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent migration)
DROP POLICY IF EXISTS "Students can view their own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Professors can view enrollments for their courses" ON enrollments;
DROP POLICY IF EXISTS "Professors can manage enrollments for their courses" ON enrollments;

-- RLS Policies

-- Students can view their own enrollments
CREATE POLICY "Students can view their own enrollments" ON enrollments
  FOR SELECT USING (student_id = auth.uid());

-- Professors can view enrollments for their courses
CREATE POLICY "Professors can view enrollments for their courses" ON enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = enrollments.course_id 
      AND courses.professor_id = auth.uid()
    )
  );

-- Professors can manage enrollments for their courses (insert, update, delete)
CREATE POLICY "Professors can manage enrollments for their courses" ON enrollments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM courses 
      WHERE courses.id = enrollments.course_id 
      AND courses.professor_id = auth.uid()
    )
  );

