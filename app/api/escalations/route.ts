import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Escalation } from '@/types/api'

/**
 * GET /api/escalations
 * Get escalations for the authenticated user
 * - Professors see all escalations for their courses
 * - Students see only their own escalations
 * 
 * Query params (optional):
 * - courseId: Filter by course ID
 * - status: Filter by status ('pending' | 'resolved')
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
    const status = searchParams.get('status') as 'pending' | 'resolved' | null

    // Build query
    let query = supabase
      .from('escalations')
      .select(`
        id,
        course_id,
        student_id,
        query,
        status,
        category,
        created_at,
        resolved_at,
        profiles!escalations_student_id_fkey (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters based on role
    if (profile.role === 'professor') {
      // Professors see escalations for their courses
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
    } else {
      // Students see only their own escalations
      query = query.eq('student_id', user.id)
      if (courseId) {
        query = query.eq('course_id', courseId)
      }
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status)
    }

    const { data: escalations, error: escalationsError } = await query

    if (escalationsError) {
      throw escalationsError
    }

    // Transform response to match API contract
    const response: Escalation[] = (escalations || []).map((e: any) => ({
      id: e.id,
      courseId: e.course_id,
      studentId: e.student_id,
      studentName: e.profiles?.name || null,
      studentEmail: e.profiles?.email || null,
      query: e.query,
      status: e.status,
      category: e.category,
      createdAt: e.created_at,
      resolvedAt: e.resolved_at || null,
    }))

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Escalations API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch escalations',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/escalations
 * Update escalation status (resolve)
 * 
 * Request body:
 * {
 *   escalationId: string,
 *   status: 'resolved' | 'pending'
 * }
 */
export async function PUT(request: NextRequest) {
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
        { error: 'Forbidden - only professors can update escalations' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { escalationId, status } = body

    if (!escalationId || typeof escalationId !== 'string') {
      return NextResponse.json(
        { error: 'escalationId is required' },
        { status: 400 }
      )
    }

    if (!status || !['pending', 'resolved'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be "pending" or "resolved"' },
        { status: 400 }
      )
    }

    // Verify escalation exists and belongs to professor's course
    const { data: escalation, error: escalationError } = await supabase
      .from('escalations')
      .select(`
        id,
        course_id,
        courses!inner (
          professor_id
        )
      `)
      .eq('id', escalationId)
      .single()

    if (escalationError || !escalation) {
      return NextResponse.json(
        { error: 'Escalation not found' },
        { status: 404 }
      )
    }

    // Verify course belongs to this professor
    const course = Array.isArray(escalation.courses) 
      ? escalation.courses[0] 
      : escalation.courses
    
    if (!course || course.professor_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - cannot update escalation for this course' },
        { status: 403 }
      )
    }

    // Update escalation
    const updateData: any = { status }
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString()
    } else {
      updateData.resolved_at = null
    }

    const { data: updatedEscalation, error: updateError } = await supabase
      .from('escalations')
      .update(updateData)
      .eq('id', escalationId)
      .select()
      .single()

    if (updateError || !updatedEscalation) {
      throw updateError || new Error('Failed to update escalation')
    }

    return NextResponse.json({
      success: true,
      escalation: {
        id: updatedEscalation.id,
        status: updatedEscalation.status,
        resolvedAt: updatedEscalation.resolved_at,
      },
    })
  } catch (error) {
    console.error('[Escalations API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to update escalation',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

