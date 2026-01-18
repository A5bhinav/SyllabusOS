# Quick Start Guide - ProfAI

## Running the Development Server

### Prerequisites

1. **Node.js 18+** installed
2. **Supabase account** and project created
3. **Google Gemini API key** (optional for mock mode)

### Setup Steps

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Google Gemini AI Configuration (optional - can use mock mode)
   GOOGLE_GENAI_API_KEY=your_google_gemini_api_key

   # Application Configuration
   MOCK_MODE=false  # Set to true for development (saves API costs)
   DEMO_MODE=false  # Set to true to mock system time to Week 4
   DEMO_WEEK=4
   ```

3. **Run database migration**:
   
   In your Supabase dashboard:
   - Go to SQL Editor
   - Copy the contents of `supabase/migrations/001_initial_schema.sql`
   - Run the migration
   - Verify all tables are created

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   ```
   http://localhost:3000
   ```

## Testing the Integration

### 1. Create an Account

1. Navigate to `http://localhost:3000`
2. Click "Sign Up"
3. Fill in:
   - Full Name
   - Email
   - Password
   - Role (Student or Professor)
4. Click "Sign Up"

### 2. Test File Upload (Professor Only)

1. After signing up as a professor, you'll be redirected to `/onboarding`
2. Upload a sample PDF syllabus
3. Upload a sample CSV or Excel schedule file
4. Click "Upload and Process"
5. Verify success message shows chunk counts

### 3. Verify Database

In Supabase dashboard:
1. Go to Table Editor
2. Check `courses` table - should have your course
3. Check `course_content` table - should have chunks with `content_type` field
4. Check `schedules` table - should have schedule entries

## Troubleshooting

### Common Issues

**"Missing Supabase environment variables"**:
- Ensure `.env.local` file exists in root directory
- Verify all Supabase variables are set correctly
- Restart the dev server after adding variables

**"Unauthorized" errors**:
- Make sure you're logged in
- Check Supabase auth is working
- Verify RLS policies are set up correctly

**Upload fails**:
- Check file size limits (PDF max 10MB, Schedule max 5MB)
- Verify file formats are correct
- Check browser console for errors
- Check server logs in terminal

**TypeScript errors**:
- Run `npm install` to ensure all dependencies are installed
- Run `npx tsc --noEmit` to check for type errors

**Database errors**:
- Verify migration was run successfully
- Check pgvector extension is enabled
- Verify all tables exist in Supabase

## Next Steps

After verifying Phase 1 integration works:
1. Review `docs/INTEGRATION_TESTING.md` for detailed testing checklist
2. Proceed with Phase 2 development (Multi-Agent Router)
3. Continue with frontend development (Phase 3 - Chat Interface)

## Development Tips

- Use `MOCK_MODE=true` to save API costs during development
- Check browser DevTools Network tab to see API requests
- Check Supabase dashboard logs for database queries
- Use TypeScript compiler to catch errors early: `npx tsc --noEmit`

