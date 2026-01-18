# Video Generation Troubleshooting Guide

## Quick Checks

### 1. Environment Variables
```bash
# Check your .env file has:
VIDEO_GENERATION_ENABLED=true  # or not set (defaults to true)
MOCK_MODE=false                # Must be false for real video generation
GOOGLE_GENAI_API_KEY=your_key  # Same key works for Veo API
```

### 2. Database Migrations
Ensure these migrations have been run:
- `010_add_video_to_escalations.sql` - Adds `video_url`, `video_generated_at`, `video_generation_status`
- `012_add_video_job_id.sql` - Adds `video_job_id` column for async job tracking

**Check if migrations are applied:**
```sql
-- Run in Supabase SQL Editor:
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'escalations' 
AND column_name IN ('video_generation_status', 'video_job_id');
```

### 3. Check Video Generation is Triggered

**In Server Console (Terminal):**
Look for logs like:
```
[Video Worker] 🚀 generateVideoAsync called for escalation...
[Video Worker] 🎬 Creating video jobs for escalation...
```

**If you DON'T see these logs:**
- Video generation might not be triggered
- Check if `videoFieldsSupported` is `false` in the API

### 4. Check Video Generation Status

**In Browser Console (F12):**
Look for logs like:
```
🎬 Video Generation Started
📊 Progress: [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]   0.0% Job created...
```

**If status stays "pending":**
- Jobs aren't being created
- Check server logs for errors

**If status is "processing" but never completes:**
- Polling endpoint `/api/video/poll` might not be called
- Veo API job might be stuck
- Check server logs for polling errors

### 5. Common Issues

#### Issue: "Video generation skipped - video_generation_status column not found"
**Fix:** Run migration `010_add_video_to_escalations.sql`

#### Issue: Status stays "pending" forever
**Fix:** 
1. Ensure migration `012_add_video_job_id.sql` is run
2. Call `/api/video/poll` endpoint (manually or via cron)
3. Check server logs for job creation errors

#### Issue: Status is "processing" but video never appears
**Fix:**
1. Check if `/api/video/poll` is being called regularly (every 15-30 seconds)
2. Check server logs for Veo API errors
3. Verify `GOOGLE_GENAI_API_KEY` is valid and has Veo API access

#### Issue: "Veo API access denied" or 403 errors
**Fix:**
1. Ensure billing is enabled on Google Cloud project
2. Verify API key has Veo API access
3. Check if your Google account has Veo 3.1 access (Pro/Ultra subscription)

#### Issue: "Veo model not found" or 404 errors
**Fix:**
1. Veo API endpoint might be incorrect
2. Model name might need adjustment
3. Check Google's latest Veo API documentation

### 6. Manual Testing

**Step 1: Check database columns**
```sql
-- In Supabase SQL Editor
SELECT * FROM escalations WHERE response IS NOT NULL LIMIT 1;
-- Look for: video_url, video_generation_status, video_job_id columns
```

**Step 2: Trigger video generation manually**
```bash
# Call the API to trigger video generation for an escalation
curl -X POST http://localhost:3000/api/video/poll
```

**Step 3: Check polling endpoint**
```bash
# Poll for video status
curl http://localhost:3000/api/video/poll
```

**Step 4: Check a specific escalation**
```bash
# Replace ESCALATION_ID with actual ID
curl http://localhost:3000/api/escalations/ESCALATION_ID/video-status
```

### 7. Debug Steps

1. **Check server logs** (where `npm run dev` is running):
   - Look for `[Video Worker]` logs
   - Look for `[Video Generator]` logs
   - Look for `[Video Poll API]` logs

2. **Check browser console** (F12):
   - Look for video generation progress logs
   - Look for API errors

3. **Check database directly**:
   ```sql
   -- See all escalations with video status
   SELECT id, video_generation_status, video_job_id, video_url 
   FROM escalations 
   WHERE response IS NOT NULL
   ORDER BY created_at DESC;
   ```

4. **Enable verbose logging**:
   - All logs should already be verbose
   - Look for ❌ (errors), ⚠️ (warnings), ✓ (success), 📊 (progress)

### 8. Expected Flow

1. Professor submits response → `PUT /api/escalations`
2. API sets `video_generation_status = 'pending'`
3. `generateVideoAsync()` called → `createVideoJobs()`
4. Veo API job created → `video_job_id` stored
5. Status set to `processing`
6. `/api/video/poll` called periodically
7. Poll checks job status → When complete, uploads video
8. Status set to `completed` → Video URL stored

### 9. Verify Everything is Working

**Test in order:**
1. ✅ Database has video columns (migrations run)
2. ✅ Environment variables set correctly
3. ✅ Video generation triggered (check server logs)
4. ✅ Jobs created (check `video_job_id` in database)
5. ✅ Polling happening (call `/api/video/poll` or check cron)
6. ✅ Veo API accessible (check for 403/404 errors)

If all steps pass but videos still don't appear, check Veo API job status directly in server logs.
