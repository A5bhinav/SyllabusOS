-- Add video storage fields to escalations table
-- This enables video generation for escalation responses

ALTER TABLE escalations
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS video_generation_status TEXT DEFAULT 'pending' 
  CHECK (video_generation_status IN ('pending', 'processing', 'completed', 'failed'));

-- Add index for video generation status queries
CREATE INDEX IF NOT EXISTS idx_escalations_video_status 
ON escalations(video_generation_status) 
WHERE video_generation_status IN ('pending', 'processing');

-- Add comment to document the new fields
COMMENT ON COLUMN escalations.video_url IS 'URL to the generated video response';
COMMENT ON COLUMN escalations.video_generated_at IS 'Timestamp when the video was generated';
COMMENT ON COLUMN escalations.video_generation_status IS 'Status of video generation: pending, processing, completed, or failed';

