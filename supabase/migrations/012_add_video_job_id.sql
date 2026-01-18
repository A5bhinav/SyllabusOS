-- Add video_job_id column to escalations table
-- This stores the Veo API job ID for async video generation polling

ALTER TABLE escalations
ADD COLUMN IF NOT EXISTS video_job_id TEXT;

-- Add index for faster queries on video_job_id
CREATE INDEX IF NOT EXISTS idx_escalations_video_job_id 
ON escalations(video_job_id) 
WHERE video_job_id IS NOT NULL;

-- Add comment to document the new field
COMMENT ON COLUMN escalations.video_job_id IS 'Veo API job ID for async video generation. Used to poll job status.';
