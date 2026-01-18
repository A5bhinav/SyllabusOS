# Video Storage Bucket Setup Guide

## ⚠️ IMPORTANT: Storage Bucket Must Be Created Manually

**Storage buckets CANNOT be created via SQL migrations** in Supabase. You must create the bucket manually using one of the methods below.

## Step 1: Create Storage Bucket

### Method 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click **"Storage"** in the left sidebar
3. Click **"Buckets"** tab
4. Click **"New bucket"** button
5. Configure the bucket:
   - **Name**: `escalation-videos` (must match exactly)
   - **Public bucket**: ✅ Check this (recommended for easier access)
   - Or uncheck if you want private bucket with signed URLs
6. Click **"Create bucket"**

### Method 2: Via Supabase CLI

```bash
supabase storage create escalation-videos --public
```

### Method 3: Via REST API (requires service role key)

```bash
curl -X POST 'https://<your-project-ref>.supabase.co/storage/v1/bucket' \
  -H 'Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>' \
  -H 'Content-Type: application/json' \
  -d '{"name": "escalation-videos", "public": true}'
```

## Step 2: Verify Bucket Exists

Run this query in Supabase SQL Editor to verify:

```sql
SELECT name, public, created_at 
FROM storage.buckets 
WHERE name = 'escalation-videos';
```

If it returns a row, the bucket exists ✅. If it returns no rows, create it using Method 1 above.

## Step 3: Set Up RLS Policies (Optional - for Private Buckets)

If you created a **private** bucket, you need to set up RLS policies:

### Allow Professors to Upload Videos

```sql
-- Allow professors to upload videos
CREATE POLICY "Professors can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'escalation-videos' AND
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'professor'
);
```

### Allow Students to View Their Escalation Videos

```sql
-- Allow students to view videos for their escalations
CREATE POLICY "Students can view their escalation videos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'escalation-videos' AND
  (
    -- Check if the file path matches their escalation ID
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM escalations 
      WHERE student_id = auth.uid()
    )
    OR
    -- Or allow if they're viewing their own escalations (via RLS on escalations table)
    EXISTS (
      SELECT 1 FROM escalations 
      WHERE id::text = (storage.foldername(name))[1]
      AND student_id = auth.uid()
    )
  )
);
```

## Step 4: Test Video Upload

After creating the bucket, test that video upload works:

1. Submit a response to an escalation as a professor
2. Check the browser console/Vercel logs for `[Video Worker]` messages
3. If you see `Storage bucket "escalation-videos" does not exist`, the bucket wasn't created properly

## Troubleshooting

### Error: "Storage bucket 'escalation-videos' does not exist"

**Solution**: Create the bucket manually using Method 1 (Dashboard) above.

### Error: "new row violates row-level security policy"

**Solution**: 
- Either make the bucket public (recommended for testing)
- Or set up RLS policies as shown in Step 3

### Error: "JWT expired" or "unauthorized"

**Solution**: Check your `SUPABASE_SERVICE_ROLE_KEY` environment variable is set correctly.

### Videos not showing in UI

**Check**:
1. Is `video_url` populated in the database? (Check `escalations` table)
2. Is the URL accessible? (Try opening `video_url` in a browser)
3. Is the video player code rendered? (Check browser DevTools Elements tab)

## Environment Variables

Make sure these are set in your `.env.local` (local) and Vercel (production):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Custom bucket name (defaults to 'escalation-videos')
SUPABASE_STORAGE_BUCKET=escalation-videos
```

## Current Status

- ✅ Migration `010_add_video_to_escalations.sql` adds database columns
- ✅ Video worker creates placeholder URLs if bucket doesn't exist
- ⚠️ **Storage bucket must be created manually** (this file)
- ✅ Video display code exists in `StudentEscalations.tsx`

After creating the bucket, video URLs should be stored properly when videos are generated (or placeholder URLs in MOCK_MODE).
