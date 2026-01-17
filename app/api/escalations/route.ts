import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createUnauthorizedError, createForbiddenError, createNotFoundError, validateRequired, validateType } from '@/lib/utils/api-errors'
import { logger } from '@/lib/utils/logger'
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
  const startTime = Date.now()
  
  try {
    logger.apiRequest('GET', '/api/escalations')
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = Date.now() - startTime
      logger.apiResponse('GET', '/api/escalations', 401, duration)
      return createUnauthorizedError()
    }

    // Get user profile to determine role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      const duration = Date.now() - startTime
      logger.apiResponse('GET', '/api/escalations', 404, duration)
      return createNotFoundError('User profile')
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

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/escalations', 200, duration, { count: response.length })
    return NextResponse.json(response)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('GET', '/api/escalations', error, 500)
    return createErrorResponse(error, 'Failed to fetch escalations')
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
  const startTime = Date.now()
  
  try {
    logger.apiRequest('PUT', '/api/escalations')
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = Date.now() - startTime
      logger.apiResponse('PUT', '/api/escalations', 401, duration)
      return createUnauthorizedError()
    }

    // Verify user is a professor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'professor') {
      const duration = Date.now() - startTime
      logger.apiResponse('PUT', '/api/escalations', 403, duration)
      return createForbiddenError('Only professors can update escalations')
    }

    // Parse request body
    let body: { escalationId?: string; status?: string }
    try {
      body = await request.json()
    } catch (error) {
      return createErrorResponse(
        new Error('Invalid JSON in request body'),
        'Invalid request body'
      )
    }

    const { escalationId, status } = body

    // Validate required fields
    const requiredValidation = validateRequired(body, ['escalationId', 'status'])
    if (!requiredValidation.isValid) {
      const errorMsg = requiredValidation.errors.map(e => e.message).join(', ')
      return createErrorResponse(
        new Error(errorMsg),
        'Validation error'
      )
    }

    const escalationIdTypeCheck = validateType({ escalationId }, 'escalationId', 'string')
    if (!escalationIdTypeCheck.isValid) {
      return createErrorResponse(
        new Error(escalationIdTypeCheck.error || 'Invalid escalationId type'),
        'Validation error'
      )
    }

    if (!status || !['pending', 'resolved'].includes(status)) {
      return createErrorResponse(
        new Error('status must be "pending" or "resolved"'),
        'Validation error'
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
      const duration = Date.now() - startTime
      logger.apiResponse('PUT', '/api/escalations', 404, duration)
      return createNotFoundError('Escalation')
    }

    // Verify course belongs to this professor
    const course = Array.isArray(escalation.courses) 
      ? escalation.courses[0] 
      : escalation.courses
    
    if (!course || course.professor_id !== user.id) {
      const duration = Date.now() - startTime
      logger.apiResponse('PUT', '/api/escalations', 403, duration)
      return createForbiddenError('Cannot update escalation for this course')
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

    const duration = Date.now() - startTime
    logger.apiResponse('PUT', '/api/escalations', 200, duration)
    return NextResponse.json({
      success: true,
      escalation: {
        id: updatedEscalation.id,
        status: updatedEscalation.status,
        resolvedAt: updatedEscalation.resolved_at,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('PUT', '/api/escalations', error, 500)
    return createErrorResponse(error, 'Failed to update escalation')
  }
}

