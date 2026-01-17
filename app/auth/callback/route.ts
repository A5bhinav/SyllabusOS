import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Auth callback route for handling magic link redirects
 * Redirects users based on their role:
 * - Professors: /onboarding (if no courses) or /dashboard
 * - Students: /student/chat
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { error: authError } = await supabase.auth.exchangeCodeForSession(code)

    if (authError) {
      console.error('[Auth Callback] Error exchanging code for session:', authError)
      // Redirect to login with error
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(authError.message)}`, requestUrl.origin))
    }

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[Auth Callback] Error getting user:', userError)
      return NextResponse.redirect(new URL('/login?error=Failed to get user', requestUrl.origin))
    }

    // Get user profile to determine role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      // Profile might not exist yet (should be created by trigger, but handle gracefully)
      console.warn('[Auth Callback] Profile not found, creating default profile...')
      
      // Try to create profile with default role from metadata or 'student'
      const defaultRole = user.user_metadata?.role || 'student'
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          role: defaultRole,
        })

      if (createError) {
        console.error('[Auth Callback] Error creating profile:', createError)
      }

      // Redirect based on default role
      if (defaultRole === 'professor') {
        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
      } else {
        // Student - redirect to student dashboard
        return NextResponse.redirect(new URL('/student', requestUrl.origin))
      }
    }

    // Redirect based on role
    if (profile.role === 'professor') {
      // Check if professor has any courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('professor_id', user.id)
        .limit(1)

      // If no courses, redirect to onboarding to upload files
      if (!courses || courses.length === 0) {
        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
      } else {
        return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
      }
    } else {
      // Student - redirect to student dashboard
      return NextResponse.redirect(new URL('/student', requestUrl.origin))
    }
  }

  // If no code, redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}

