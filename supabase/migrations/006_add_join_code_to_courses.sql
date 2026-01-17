-- Add join_code column to courses table
-- This is a unique 6-character code that students can use to enroll

ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_courses_join_code ON courses(join_code);

-- Generate join codes for existing courses (if any)
-- This generates a random 6-character alphanumeric code
UPDATE courses
SET join_code = UPPER(
  SUBSTRING(
    MD5(id::text || name || created_at::text),
    1,
    6
  )
)
WHERE join_code IS NULL;

-- Create a function to generate a unique join code
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 6-character alphanumeric code
    new_code := UPPER(
      SUBSTRING(
        MD5(RANDOM()::text || NOW()::text),
        1,
        6
      )
    );
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM courses WHERE join_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to auto-generate join_code when a course is created
CREATE OR REPLACE FUNCTION set_course_join_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.join_code IS NULL THEN
    NEW.join_code := generate_join_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_course_join_code ON courses;

-- Create trigger
CREATE TRIGGER trigger_set_course_join_code
  BEFORE INSERT ON courses
  FOR EACH ROW
  EXECUTE FUNCTION set_course_join_code();

