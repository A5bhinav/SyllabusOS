import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/courses
 * Get list of courses
 * - Students see all courses with their enrollment status
 * - Professors see their own courses
 * 
 * Query params (optional):
 * - enrolled: Filter to only enrolled courses (students only)
 * - available: Filter to only available (not enrolled) courses (students only)
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
    const enrolledOnly = searchParams.get('enrolled') === 'true'
    const availableOnly = searchParams.get('available') === 'true'

    if (profile.role === 'professor') {
      // Professors see only their own courses
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          professor_id,
          join_code,
          created_at,
          updated_at,
          profiles!courses_professor_id_fkey (
            id,
            name,
            email
          )
        `)
        .eq('professor_id', user.id)
        .order('created_at', { ascending: false })

      if (coursesError) {
        throw coursesError
      }

      // Transform response
      const response = (courses || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        professorId: c.professor_id,
        professorName: c.profiles?.name || null,
        professorEmail: c.profiles?.email || null,
        joinCode: c.join_code || null, // Only professors can see join codes
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        isEnrolled: true, // Professors are always "enrolled" in their own courses
      }))

      return NextResponse.json(response)
    } else {
      // Students see all courses with enrollment status
      // First, get all courses with professor info
      const { data: allCourses, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          name,
          professor_id,
          created_at,
          updated_at,
          profiles!courses_professor_id_fkey (
            id,
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (coursesError) {
        throw coursesError
      }

      // Get student's enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id)

      if (enrollmentsError) {
        throw enrollmentsError
      }

      const enrolledCourseIds = new Set((enrollments || []).map((e) => e.course_id))

      // Transform courses with enrollment status
      let response = (allCourses || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        professorId: c.professor_id,
        professorName: c.profiles?.name || null,
        professorEmail: c.profiles?.email || null,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        isEnrolled: enrolledCourseIds.has(c.id),
      }))

      // Apply filters
      if (enrolledOnly) {
        response = response.filter((c) => c.isEnrolled)
      } else if (availableOnly) {
        response = response.filter((c) => !c.isEnrolled)
      }

      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('[Courses API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch courses',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

