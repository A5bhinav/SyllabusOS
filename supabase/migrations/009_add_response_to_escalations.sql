-- Add response field to escalations table
-- This allows professors to provide answers to student escalation questions

ALTER TABLE escalations
ADD COLUMN IF NOT EXISTS response TEXT,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES profiles(id);

-- Add index for faster queries on responded_by
CREATE INDEX IF NOT EXISTS idx_escalations_responded_by ON escalations(responded_by);

-- Add comment to document the new fields
COMMENT ON COLUMN escalations.response IS 'Professor response to the student escalation query';
COMMENT ON COLUMN escalations.responded_at IS 'Timestamp when the professor responded';
COMMENT ON COLUMN escalations.responded_by IS 'ID of the professor who responded';

