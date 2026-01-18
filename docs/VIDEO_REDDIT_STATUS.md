# Video Generation & Reddit Feedback Status

## Video Generation Status

### Current Status: **NOT IMPLEMENTED** (Placeholder Mode)

**Location**: `lib/video/generator.ts`

**Current Implementation**:
- `VEO_API_AVAILABLE = false` - Veo API integration is not implemented
- Video generation will create placeholder URLs instead of actual videos
- Works in MOCK_MODE or when VIDEO_GENERATION_ENABLED is false

**How it works**:
1. When an escalation response is submitted, `generateVideoAsync()` is called
2. Worker checks `MOCK_MODE` or `VIDEO_GENERATION_ENABLED`
3. If disabled/mock: Creates placeholder URL `https://example.com/videos/${escalationId}.mp4`
4. Sets `video_generation_status = 'completed'` in database
5. If enabled but Veo not implemented: Error is caught and placeholder is created

**To Enable Video Generation**:
1. Implement Veo API calls in `lib/video/generator.ts` → `generateVeoClip()`
2. Set `VEO_API_AVAILABLE = !!VEO_API_KEY && !MOCK_MODE && VIDEO_GENERATION_ENABLED`
3. Add `GOOGLE_VEO_API_KEY` to environment variables

**Files**:
- `lib/video/generator.ts` - Video generation logic
- `lib/video/worker.ts` - Background worker for processing
- `lib/video/storage.ts` - Supabase storage integration
- `app/api/escalations/[id]/generate-video/route.ts` - API endpoint
- `app/api/escalations/[id]/video-status/route.ts` - Status polling

---

## Reddit Feedback Status

### Current Status: **IMPLEMENTED** (Using JSON API, No Auth Required)

**Location**: `app/api/courses/feedback/[courseCode]/route.ts`

**How it works**:
1. Uses Reddit's public JSON API (append `.json` to URLs - no API key needed!)
2. Searches `/r/UCSC/search.json` for course codes
3. Fallback: Gets recent posts and filters client-side
4. Returns feedback with Reddit posts, difficulty, grades, etc.

**What's Displayed** (on `/student/enroll/[courseId]` page):
- ✅ Difficulty rating
- ✅ Average grade
- ✅ Professor rating  
- ✅ Grade distribution (with bars)
- ✅ Positive feedback (from Reddit posts)
- ✅ Negative feedback (from Reddit posts)
- ⚠️ **Reddit Review Links** - Only shows if `redditPosts.length > 0`

**Issue**: Reddit posts section only appears if Reddit API returns posts. If Reddit is blocked/rate-limited, the section is hidden.

**To Debug**:
1. Check browser console for `[Enroll] Feedback received:` log
2. Check `hasRedditPosts` count
3. Check Vercel function logs for `[Reddit JSON API]` messages
4. Verify Reddit API is accessible from Vercel (may be blocked)

**Files**:
- `app/api/courses/feedback/[courseCode]/route.ts` - API route
- `app/(dashboard)/student/enroll/[courseId]/page.tsx` - UI display

**Reddit API URLs Used**:
- Search: `https://www.reddit.com/r/UCSC/search.json?q=CSE101&restrict_sr=1&limit=10`
- Recent: `https://www.reddit.com/r/UCSC/new.json?limit=25`

---

## Troubleshooting

### Reddit Posts Not Showing

**Possible Causes**:
1. Reddit API blocked on Vercel
2. No posts found for course code
3. API timeout (10s limit)
4. User-Agent blocked by Reddit

**Debug Steps**:
```typescript
// Check browser console for:
[Enroll] Fetching feedback for course code: CSE 101
[Enroll] Feedback received: { hasRedditPosts: 0, ... }

// Check Vercel logs for:
[Reddit JSON API] Total unique posts found: 0
```

**Fix**: If Reddit is blocked, the fallback will still show grade distribution and other data, but Reddit posts will be empty.

### Video Generation Not Working

**Current Behavior** (Expected):
- Creates placeholder URLs (`https://example.com/videos/...`)
- Marks status as 'completed'
- Works in MOCK_MODE

**If you want real videos**:
- Veo API must be implemented first
- See `lib/video/generator.ts` line 213 for TODO
