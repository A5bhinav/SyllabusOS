import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/enrollments
 * Get enrollments
 * - Professors see enrollments for their courses
 * - Students see only their own enrollments
 * 
 * Query params (optional):
 * - courseId: Filter by course ID
 * - studentId: Filter by student ID (professors only)
 */
export async function GET(request: NextRequest) {
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

    // Get user profile to determine role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const courseId = searchParams.get('courseId')
    const studentId = searchParams.get('studentId')

    // Build query
    let query = supabase
      .from('enrollments')
      .select(`
        id,
        course_id,
        student_id,
        enrolled_at,
        courses!enrollments_course_id_fkey (
          id,
          name,
          professor_id
        ),
        profiles!enrollments_student_id_fkey (
          id,
          name,
          email
        )
      `)
      .order('enrolled_at', { ascending: false })

    // Apply filters based on role
    if (profile.role === 'professor') {
      // Professors see enrollments for their courses
      if (courseId) {
        // Verify the course belongs to this professor
        const { data: course } = await supabase
          .from('courses')
          .select('id')
          .eq('id', courseId)
          .eq('professor_id', user.id)
          .single()

        if (course) {
          query = query.eq('course_id', courseId)
        } else {
          return NextResponse.json(
            { error: 'Course not found or access denied' },
            { status: 404 }
          )
        }
      } else {
        // Get all courses for this professor
        const { data: courses } = await supabase
          .from('courses')
          .select('id')
          .eq('professor_id', user.id)

        if (courses && courses.length > 0) {
          const courseIds = courses.map((c) => c.id)
          query = query.in('course_id', courseIds)
        } else {
          // No courses, return empty array
          return NextResponse.json([])
        }
      }

      // Filter by student ID if provided (professors only)
      if (studentId) {
        query = query.eq('student_id', studentId)
      }
    } else {
      // Students see only their own enrollments
      query = query.eq('student_id', user.id)
      if (courseId) {
        query = query.eq('course_id', courseId)
      }
    }

    const { data: enrollments, error: enrollmentsError } = await query

    if (enrollmentsError) {
      throw enrollmentsError
    }

    // Transform response with profile data
    // The profiles are already joined via the foreign key relationship in the query
    // Use the joined data directly - it's already there!
    const response = (enrollments || []).map((e: any) => {
      // Access the joined profile data from the foreign key relationship
      // The query already includes: profiles!enrollments_student_id_fkey (id, name, email)
      // Supabase returns this as e.profiles (singular or array depending on relationship type)
      let profile: any = null
      
      // Handle the joined profiles data structure
      const joinedProfile = e.profiles
      
      if (joinedProfile) {
        // Check if it's an array (one-to-many relationship representation)
        if (Array.isArray(joinedProfile) && joinedProfile.length > 0) {
          profile = joinedProfile[0] // Take the first one
        } 
        // Check if it's an object (one-to-one relationship representation)
        else if (typeof joinedProfile === 'object' && joinedProfile !== null) {
          profile = joinedProfile
        }
      }
      
      // Extract student name directly from the joined profile
      let studentName: string | null = null
      
      if (profile && profile.name) {
        // Use the name from the joined profile - trim whitespace
        const trimmedName = String(profile.name).trim()
        if (trimmedName.length > 0) {
          studentName = trimmedName
        }
      }
      
      // Fallback to email prefix if name is missing or empty
      if (!studentName && profile && profile.email) {
        studentName = profile.email.split('@')[0]
      }
      
      return {
        id: e.id,
        courseId: e.course_id,
        courseName: Array.isArray(e.courses) ? e.courses[0]?.name : e.courses?.name || null,
        studentId: e.student_id,
        studentName: studentName,
        studentEmail: profile?.email || null,
        enrolledAt: e.enrolled_at,
      }
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Enrollments API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch enrollments',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/enrollments
 * Enroll a student in a course (professors only)
 * 
 * Request body:
 * {
 *   courseId: string,
 *   studentEmail: string  // Enroll by email
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

    // Verify user is a professor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'professor') {
      return NextResponse.json(
        { error: 'Forbidden - only professors can enroll students' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { courseId, studentEmail, studentId } = body

    // Validate input
    if (!courseId || typeof courseId !== 'string') {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 }
      )
    }

    if (!studentEmail && !studentId) {
      return NextResponse.json(
        { error: 'Either studentEmail or studentId is required' },
        { status: 400 }
      )
    }

    // Verify course exists and belongs to this professor
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, name')
      .eq('id', courseId)
      .eq('professor_id', user.id)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found or access denied' },
        { status: 404 }
      )
    }

    // Find student by email or ID
    let targetStudentId: string

    if (studentId) {
      // Verify student exists
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', studentId)
        .single()

      if (!studentProfile || studentProfile.role !== 'student') {
        return NextResponse.json(
          { error: 'Student not found or invalid student ID' },
          { status: 404 }
        )
      }

      targetStudentId = studentId
    } else {
      // Find student by email
      const { data: studentProfile, error: studentError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', studentEmail)
        .eq('role', 'student')
        .single()

      if (studentError || !studentProfile) {
        return NextResponse.json(
          { error: 'Student not found with that email address' },
          { status: 404 }
        )
      }

      targetStudentId = studentProfile.id
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('course_id', courseId)
      .eq('student_id', targetStudentId)
      .maybeSingle()

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Student is already enrolled in this course' },
        { status: 409 }
      )
    }

    // Create enrollment
    const { data: enrollment, error: insertError } = await supabase
      .from('enrollments')
      .insert({
        course_id: courseId,
        student_id: targetStudentId,
      })
      .select()
      .single()

    if (insertError || !enrollment) {
      throw insertError || new Error('Failed to create enrollment')
    }

    // Get student profile for response
    const { data: studentProfile } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', targetStudentId)
      .single()

    return NextResponse.json(
      {
        success: true,
        enrollment: {
          id: enrollment.id,
          courseId: enrollment.course_id,
          courseName: course.name,
          studentId: enrollment.student_id,
          studentName: studentProfile?.name || null,
          studentEmail: studentProfile?.email || null,
          enrolledAt: enrollment.enrolled_at,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Enrollments API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to create enrollment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

