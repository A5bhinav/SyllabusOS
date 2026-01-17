import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidJoinCode } from '@/lib/utils/join-code'

/**
 * POST /api/enrollments/join
 * Enroll a student in a course using a join code
 * 
 * Request body:
 * {
 *   joinCode: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
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

    // Verify user is a student
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'student') {
      return NextResponse.json(
        { error: 'Forbidden - only students can join courses with join codes' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { joinCode } = body

    // Validate input
    if (!joinCode || typeof joinCode !== 'string') {
      return NextResponse.json(
        { error: 'joinCode is required' },
        { status: 400 }
      )
    }

    // Validate join code format
    const normalizedCode = joinCode.toUpperCase().trim()
    if (!isValidJoinCode(normalizedCode)) {
      return NextResponse.json(
        { error: 'Invalid join code format. Join code must be 6 alphanumeric characters.' },
        { status: 400 }
      )
    }

    // Find course by join code
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, name, professor_id')
      .eq('join_code', normalizedCode)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Invalid join code. No course found with this code.' },
        { status: 404 }
      )
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', course.id)
      .eq('student_id', user.id)
      .maybeSingle()

    if (existingEnrollment) {
      return NextResponse.json(
        { 
          error: 'You are already enrolled in this course',
          courseId: course.id,
          courseName: course.name,
        },
        { status: 409 }
      )
    }

    // Create enrollment
    const { data: enrollment, error: insertError } = await supabase
      .from('enrollments')
      .insert({
        course_id: course.id,
        student_id: user.id,
      })
      .select()
      .single()

    if (insertError || !enrollment) {
      console.error('[Enrollments Join API] Error creating enrollment:', insertError)
      
      // Provide more specific error message
      let errorMessage = 'Failed to enroll in course'
      if (insertError) {
        // Check for RLS policy violation
        if (insertError.message?.includes('policy') || insertError.message?.includes('permission denied')) {
          errorMessage = 'Permission denied. Please ensure you have the correct permissions to enroll in courses.'
        } else if (insertError.code === '23505') {
          // Unique constraint violation (already enrolled)
          errorMessage = 'You are already enrolled in this course'
        } else {
          errorMessage = insertError.message || errorMessage
        }
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        enrollment: {
          id: enrollment.id,
          courseId: course.id,
          courseName: course.name,
          enrolledAt: enrollment.enrolled_at,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Enrollments Join API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to join course',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
