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

-- ============================================================================
-- IMPORTANT: Storage Bucket Setup (Cannot be done via SQL - Manual Step Required)
-- ============================================================================
-- 
-- After running this migration, you MUST create the storage bucket manually:
--
-- Option 1: Via Supabase Dashboard (Recommended)
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to "Storage" → "Buckets"
-- 3. Click "New bucket"
-- 4. Bucket name: "escalation-videos"
-- 5. Set as: Public (for signed URLs, you can use private)
-- 6. Click "Create bucket"
--
-- Option 2: Via Supabase CLI
-- Run: supabase storage create escalation-videos --public
--
-- Option 3: Via API (if you have admin access)
-- POST /storage/v1/bucket
-- Body: { "name": "escalation-videos", "public": true }
--
-- After creating the bucket, set up RLS policies (if using private bucket):
-- - Professors: Can upload/delete videos
-- - Students: Can view videos for their own escalations
--
-- ============================================================================
