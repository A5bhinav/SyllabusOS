import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createUnauthorizedError, createForbiddenError, createNotFoundError, validateRequired, validateType } from '@/lib/utils/api-errors'
import { logger } from '@/lib/utils/logger'
import { getProfessorCourses } from '@/lib/utils/course-cache'
import { generateVideoAsync } from '@/lib/video/worker'
import type { Escalation } from '@/types/api'
import type { EscalationContext } from '@/lib/video/generator'

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
        response,
        responded_at,
        responded_by,
        video_url,
        video_generated_at,
        video_generation_status,
        profiles!escalations_student_id_fkey (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters based on role
    if (profile.role === 'professor') {
      // Professors see escalations for their courses (use cached query)
      try {
        const { courseIds, singleCourse } = await getProfessorCourses(supabase, user.id, courseId || null)

        if (courseId && !singleCourse) {
          const duration = Date.now() - startTime
          logger.apiResponse('GET', '/api/escalations', 404, duration)
          return NextResponse.json(
            { error: 'Course not found or access denied' },
            { status: 404 }
          )
        }

        if (!courseIds || courseIds.length === 0) {
          // No courses, return empty array
          const duration = Date.now() - startTime
          logger.apiResponse('GET', '/api/escalations', 200, duration)
          return NextResponse.json({
            escalations: [],
            patterns: undefined,
          })
        }

        query = query.in('course_id', courseIds)
      } catch (cacheError) {
        logger.apiError('GET', '/api/escalations', cacheError, 500)
        throw new Error(`Failed to fetch professor courses: ${cacheError instanceof Error ? cacheError.message : 'Unknown error'}`)
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

    // Add limit to prevent loading too many escalations at once (max 100)
    // For pagination, add offset parameter later if needed
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    query = query.limit(Math.min(limit, 100))

    const { data: escalations, error: escalationsError } = await query

    if (escalationsError) {
      throw escalationsError
    }

    // Transform response to match API contract
    const response: Escalation[] = (escalations || []).map((e: any) => {
      // Handle profiles being an array or object
      const studentProfile = Array.isArray(e.profiles) 
        ? e.profiles[0] 
        : e.profiles
      
      return {
        id: e.id,
        courseId: e.course_id,
        studentId: e.student_id,
        studentName: studentProfile?.name || null,
        studentEmail: studentProfile?.email || null,
        query: e.query,
        status: e.status,
        category: e.category,
        createdAt: e.created_at,
        resolvedAt: e.resolved_at || null,
        response: e.response || null,
        respondedAt: e.responded_at || null,
        respondedBy: e.responded_by || null,
        videoUrl: e.video_url || null,
        videoGeneratedAt: e.video_generated_at || null,
        videoGenerationStatus: e.video_generation_status || null,
      }
    })

    // Pattern detection: Count escalations by category for the past week
    const patterns: Array<{ category: string; count: number }> = []
    if (profile.role === 'professor' && response.length > 0) {
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      
      const categoryCounts: Record<string, number> = {}
      for (const escalation of response) {
        // Only count pending escalations from the past week
        const createdAt = new Date(escalation.createdAt)
        if (escalation.status === 'pending' && createdAt >= oneWeekAgo && escalation.category) {
          categoryCounts[escalation.category] = (categoryCounts[escalation.category] || 0) + 1
        }
      }

      // Convert to array and filter out categories with count < 2 (only show patterns)
      for (const [category, count] of Object.entries(categoryCounts)) {
        if (count >= 2) {
          patterns.push({ category, count })
        }
      }

      // Sort by count descending
      patterns.sort((a, b) => b.count - a.count)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/escalations', 200, duration, { count: response.length })
    
    // Return escalations with pattern detection metadata
    return NextResponse.json({
      escalations: response,
      patterns: patterns.length > 0 ? patterns : undefined,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('GET', '/api/escalations', error, 500)
    return createErrorResponse(error, 'Failed to fetch escalations')
  }
}

/**
 * PUT /api/escalations
 * Update escalation status and/or response
 * 
 * Request body:
 * {
 *   escalationId: string,
 *   status?: 'resolved' | 'pending',
 *   response?: string
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
    let body: { escalationId?: string; status?: string; response?: string }
    try {
      body = await request.json()
    } catch (error) {
      return createErrorResponse(
        new Error('Invalid JSON in request body'),
        'Invalid request body'
      )
    }

    const { escalationId, status, response } = body

    // Validate required fields
    const requiredValidation = validateRequired(body, ['escalationId'])
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

    // Validate status if provided
    if (status !== undefined && !['pending', 'resolved'].includes(status)) {
      return createErrorResponse(
        new Error('status must be "pending" or "resolved"'),
        'Validation error'
      )
    }

    // Validate response if provided
    if (response !== undefined && typeof response !== 'string') {
      return createErrorResponse(
        new Error('response must be a string'),
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
    const updateData: any = {}
    
    // Update status if provided
    if (status !== undefined) {
      updateData.status = status
      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
      } else {
        updateData.resolved_at = null
      }
    }
    
    // Update response if provided
    if (response !== undefined) {
      updateData.response = response
      updateData.responded_at = new Date().toISOString()
      updateData.responded_by = user.id
      // Trigger video generation automatically
      updateData.video_generation_status = 'pending'
    }

    const { data: updatedEscalation, error: updateError } = await supabase
      .from('escalations')
      .update(updateData)
      .eq('id', escalationId)
      .select(`
        id,
        status,
        resolved_at,
        response,
        responded_at,
        responded_by,
        student_id,
        category,
        courses (
          name
        ),
        profiles!escalations_student_id_fkey (
          name
        )
      `)
      .single()

    if (updateError || !updatedEscalation) {
      throw updateError || new Error('Failed to update escalation')
    }

    // Trigger async video generation if response was provided
    if (response !== undefined && response.trim().length > 0) {
      try {
        // Get student and course context
        const studentProfile = Array.isArray(updatedEscalation.profiles)
          ? updatedEscalation.profiles[0]
          : updatedEscalation.profiles
        const course = Array.isArray(updatedEscalation.courses)
          ? updatedEscalation.courses[0]
          : updatedEscalation.courses

        const context: EscalationContext = {
          studentName: studentProfile?.name || undefined,
          category: updatedEscalation.category || undefined,
          courseName: course?.name || undefined,
        }

        // Trigger video generation asynchronously (non-blocking)
        generateVideoAsync(updatedEscalation.id, response, context).catch(error => {
          console.error(`[Escalations API] Failed to trigger video generation:`, error)
          // Don't fail the request if video generation fails
        })
      } catch (videoError) {
        // Log but don't fail the request if video context setup fails
        console.error(`[Escalations API] Error setting up video generation context:`, videoError)
      }
    }

    const duration = Date.now() - startTime
    logger.apiResponse('PUT', '/api/escalations', 200, duration)
    return NextResponse.json({
      success: true,
      escalation: {
        id: updatedEscalation.id,
        status: updatedEscalation.status,
        resolvedAt: updatedEscalation.resolved_at,
        response: updatedEscalation.response,
        respondedAt: updatedEscalation.responded_at,
        respondedBy: updatedEscalation.responded_by,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('PUT', '/api/escalations', error, 500)
    return createErrorResponse(error, 'Failed to update escalation')
  }
}

