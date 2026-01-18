# Veo API Async Video Generation Implementation

## Overview

The Veo API uses **async job processing**. When you request a video, the API returns a job ID that must be polled until the job completes. This implementation handles the full async workflow.

## Architecture

### 1. Job Creation (`createVeoJob`)
- Creates a Veo API job for a single video clip
- Returns a job ID that needs to be polled
- Located in: `lib/video/generator.ts`

### 2. Job Polling (`pollVeoJobStatus`)
- Polls the Veo API to check job status
- Returns status: `pending`, `processing`, `completed`, or `failed`
- When completed, returns video URL or base64 data
- Located in: `lib/video/generator.ts`

### 3. Worker Functions (`lib/video/worker.ts`)
- **`createVideoJobs`**: Creates Veo jobs for an escalation response
  - Generates storyboard from response text
  - Creates Veo API jobs for each scene
  - Stores job ID in database (`video_job_id` column)
  - Sets status to `processing`

- **`pollVideoJob`**: Polls a single job and updates escalation when complete
  - Checks job status via Veo API
  - When completed, fetches video and uploads to Supabase Storage
  - Updates escalation with video URL and `completed` status

- **`processPendingVideoGenerations`**: Batch processor
  - Creates jobs for escalations with status `pending` and no job ID
  - Polls jobs for escalations with status `processing` and a job ID
  - Returns statistics: `created`, `polled`, `completed`, `failed`

### 4. Polling API Route (`/api/video/poll`)
- Endpoint: `POST /api/video/poll` or `GET /api/video/poll`
- Calls `processPendingVideoGenerations()`
- Should be called periodically (every 30-60 seconds)
- Can be triggered by:
  - Vercel Cron Jobs
  - Supabase Edge Functions
  - Client-side polling
  - Manual API calls

## Database Schema

### New Column (Migration 012)
```sql
ALTER TABLE escalations
ADD COLUMN video_job_id TEXT;
```

### Status Flow
1. `pending` → Job creation needed
2. `processing` → Job created, polling for completion
3. `completed` → Video generated and uploaded
4. `failed` → Job failed or error occurred

## Workflow

### When Professor Responds to Escalation:
1. `generateVideoAsync()` is called
2. Sets `video_generation_status = 'pending'`
3. Calls `createVideoJobs()` in background
4. `createVideoJobs()`:
   - Generates storyboard
   - Creates Veo API jobs
   - Stores job ID in `video_job_id`
   - Sets status to `processing`

### Periodic Polling:
1. Polling endpoint (`/api/video/poll`) is called every 30-60 seconds
2. For each escalation with `processing` status:
   - Polls Veo API job status
   - If `completed`: Fetches video, uploads to storage, updates status
   - If `failed`: Updates status to `failed`
   - If still `processing`: Continues polling on next cycle

## Setup

### 1. Run Database Migration
```sql
-- Run migration 012_add_video_job_id.sql
```

### 2. Set Up Polling

**Option A: Vercel Cron (Recommended)**
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/video/poll",
    "schedule": "*/1 * * * *"
  }]
}
```

**Option B: Client-Side Polling**
```typescript
// Poll every 30 seconds
setInterval(async () => {
  await fetch('/api/video/poll')
}, 30000)
```

**Option C: Manual Testing**
```bash
curl -X POST http://localhost:3000/api/video/poll
```

## Environment Variables

```env
GOOGLE_GENAI_API_KEY=your_api_key
VIDEO_GENERATION_ENABLED=true
MOCK_MODE=false
VEO_MODEL=veo-3.1  # Optional, defaults to veo-3.1
```

## API Endpoints

### Veo API Endpoints (Internal)
- **Create Job**: `POST https://generativelanguage.googleapis.com/v1beta/{model}:generateVideo`
- **Poll Status**: `GET https://generativelanguage.googleapis.com/v1beta/operations/{jobId}`

### Application Endpoints
- **Poll Jobs**: `POST /api/video/poll` - Processes pending and polling jobs

## Error Handling

- **Job Creation Failures**: Status set to `failed`, error logged
- **Polling Failures**: Error logged, job continues polling on next cycle
- **Video Fetch Failures**: Status set to `failed`, error logged
- **Storage Upload Failures**: Falls back to placeholder URL (if configured)

## Timing (OPTIMIZED)

- **Job Creation**: ~1-2 seconds
- **Job Processing**: 5-7 minutes (Veo API processing time) - **Single scene (5-8s) for faster generation**
- **Polling Interval**: **Every 15-30 seconds** (recommended for faster detection)
- **Immediate Poll**: Jobs are polled once immediately after creation to catch fast completions
- **Total Time**: ~5-8 minutes from job creation to video completion (optimized from 5-10 minutes)

### Speed Optimizations:
1. **Single Scene**: Only 1 video scene (5-8 seconds) instead of 2-4 scenes (faster processing)
2. **Shorter Duration**: 6 seconds default (instead of 8) for quicker generation
3. **Immediate Polling**: Jobs polled once right after creation
4. **Faster Polling**: 15-30 second intervals instead of 30-60 seconds

## Monitoring

Check logs for:
- `[Video Worker]` - Job creation and polling
- `[Video Generator]` - Veo API calls
- `[Video Poll API]` - Polling endpoint activity

## Troubleshooting

1. **Jobs stuck in `processing`**: Check if polling endpoint is being called
2. **Jobs failing**: Check Veo API access, billing, and API key
3. **No jobs created**: Check `VIDEO_GENERATION_ENABLED` and `MOCK_MODE` settings
4. **Video not uploading**: Check Supabase Storage bucket exists and RLS policies
