import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/enrollments/[id]
 * Remove an enrollment (unenroll a student from a course)
 * Only professors can remove enrollments from their courses
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: enrollmentId } = await params
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    // Verify user is a professor
    // Try maybeSingle() first to avoid errors if profile doesn't exist
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email, name')
      .eq('id', user.id)
      .maybeSingle()

    // Debug logging - this will help us understand what's happening
    console.log('[Enrollments DELETE API] Profile check:', {
      userId: user.id,
      userEmail: user.email,
      profileFound: !!profile,
      profileRole: profile?.role,
      profileError: profileError?.message,
      profileErrorCode: profileError?.code,
      profileErrorDetails: profileError?.details,
    })

    if (profileError) {
      console.error('[Enrollments DELETE API] Profile query error:', {
        error: profileError,
        userId: user.id,
        email: user.email,
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      })
    }

    if (!profile) {
      console.error('[Enrollments DELETE API] Profile not found in database for user:', user.id)
      return NextResponse.json(
        { 
          error: 'Profile not found. Please ensure your account is set up correctly.',
          details: 'Your profile could not be found in the database. This may be a setup issue.'
        },
        { status: 403 }
      )
    }

    if (profile.role !== 'professor') {
      console.warn('[Enrollments DELETE API] User role mismatch:', {
        userId: user.id,
        currentRole: profile.role,
        expectedRole: 'professor',
      })
      return NextResponse.json(
        { 
          error: 'Forbidden - only professors can remove enrollments',
          details: `Your account role is '${profile.role}', but you need 'professor' role to perform this action.`
        },
        { status: 403 }
      )
    }

    if (!enrollmentId) {
      return NextResponse.json(
        { error: 'Enrollment ID is required' },
        { status: 400 }
      )
    }

    // Verify enrollment exists and belongs to professor's course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        id,
        course_id,
        courses!inner (
          professor_id
        )
      `)
      .eq('id', enrollmentId)
      .single()

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      )
    }

    // Verify course belongs to this professor
    const course = Array.isArray(enrollment.courses) 
      ? enrollment.courses[0] 
      : enrollment.courses
    
    if (!course || course.professor_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - cannot remove enrollment for this course' },
        { status: 403 }
      )
    }

    // Delete enrollment
    const { error: deleteError } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', enrollmentId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Enrollments API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to remove enrollment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

