# Reddit OAuth2 Setup Guide

## Why Use Reddit OAuth?

The public JSON API (`.json` endpoints) can be unreliable:
- Rate limiting on Vercel serverless functions
- IP-based blocking
- Lower rate limits

OAuth2 provides:
- ✅ Higher rate limits (60 requests/minute vs 30)
- ✅ More reliable access
- ✅ Better for production

## Step 1: Create Reddit App

1. Go to https://www.reddit.com/prefs/apps
2. Scroll down and click **"Create App"** or **"Create Another App"**
3. Fill in the form:
   - **Name**: `SyllabusOS` (or any name you want)
   - **App type**: Select **"script"** (bottom option)
   - **Description**: Optional - "Course feedback scraper for SyllabusOS"
   - **About URL**: Optional - `https://syllabusos.vercel.app`
   - **Redirect URI**: Enter `http://localhost:3000` (not actually used for script type, but required)
4. Click **"Create app"**

## Step 2: Get Your Credentials

After creating the app, you'll see:
- **Client ID**: The string under the app name (looks like: `abcd1234EFGH5678`)
- **Client Secret**: The "secret" field (looks like: `xyz789_SECRET_abc123`)

**Important**: Copy these immediately - the secret is only shown once!

## Step 3: Set User Agent

Your User-Agent should follow Reddit's format:
```
SyllabusOS/1.0 (by /u/yourredditusername)
```

Replace `yourredditusername` with your actual Reddit username (without the `/u/`).

Example:
```
SyllabusOS/1.0 (by /u/gautam123)
```

## Step 4: Add Environment Variables

### Local Development (`.env.local`)

Add these to your `.env.local` file:

```env
# Reddit OAuth2 Configuration (optional - falls back to public API if not set)
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT=SyllabusOS/1.0 (by /u/yourusername)
```

### Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: `REDDIT_CLIENT_ID` → **Value**: (paste your client ID)
   - **Key**: `REDDIT_CLIENT_SECRET` → **Value**: (paste your client secret)
   - **Key**: `REDDIT_USER_AGENT` → **Value**: `SyllabusOS/1.0 (by /u/yourusername)`
4. Select **Production**, **Preview**, and **Development** environments
5. Click **Save**
6. **Redeploy** your application for changes to take effect

## Step 5: Verify Setup

After adding environment variables:

1. **Restart your dev server** (if running locally)
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. **Check logs** when fetching course feedback:
   - You should see `[Reddit] Attempting OAuth2 authenticated API`
   - If OAuth works: `[Reddit OAuth] Found X posts`
   - If OAuth fails: `[Reddit OAuth] Failed, falling back to public JSON API`

3. **Test the API**:
   - Navigate to a course enrollment page
   - Check browser console for `[Reddit]` logs
   - Check Vercel function logs if deployed

## Fallback Behavior

If OAuth credentials are **not set** or **invalid**, the system automatically falls back to:
- Public JSON API (no authentication)
- Works but with lower rate limits
- May be less reliable on Vercel

## Troubleshooting

### "REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set"
- Check that variables are spelled correctly (case-sensitive)
- Verify they're in `.env.local` for local dev
- Verify they're added to Vercel environment variables
- Restart dev server after adding to `.env.local`

### "Reddit OAuth failed: 401"
- Check that Client ID and Secret are correct
- Make sure you copied the full secret (it's long)
- Verify app type is "script" (not web app)

### "Reddit OAuth failed: 403"
- Check User-Agent format: `SyllabusOS/1.0 (by /u/username)`
- Make sure you included your actual Reddit username

### Still getting "No Reddit posts found"
- Check Vercel function logs for detailed error messages
- OAuth might be working but no posts found for that course
- Try a different course code (e.g., "CSE 101")
- Check that r/UCSC has posts about that course

## Environment Variables Summary

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `REDDIT_CLIENT_ID` | Yes (for OAuth) | `abcd1234EFGH5678` | From Reddit app settings |
| `REDDIT_CLIENT_SECRET` | Yes (for OAuth) | `xyz789_SECRET_abc123` | From Reddit app settings |
| `REDDIT_USER_AGENT` | Yes (for OAuth) | `SyllabusOS/1.0 (by /u/username)` | Must include your Reddit username |

## Next Steps

Once OAuth is working, Reddit scraping should be more reliable. If you still see issues, check:
- Vercel function logs for specific error messages
- Reddit API status
- Rate limiting (OAuth gives you 60 req/min vs 30 for public API)
