-- Add join_code column to courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;

-- Create index for join_code lookups
CREATE INDEX IF NOT EXISTS idx_courses_join_code ON courses(join_code);

-- Generate join codes for existing courses that don't have one
-- Format: 6-character alphanumeric code
UPDATE courses 
SET join_code = UPPER(
  SUBSTRING(
    MD5(id::text || created_at::text || random()::text),
    1,
    6
  )
)
WHERE join_code IS NULL;
