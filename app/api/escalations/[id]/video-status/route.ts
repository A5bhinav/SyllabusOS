import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createUnauthorizedError, createNotFoundError } from '@/lib/utils/api-errors'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/escalations/[id]/video-status
 * Get video generation status for an escalation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  
  try {
    const { id: escalationId } = await params
    logger.apiRequest('GET', `/api/escalations/${escalationId}/video-status`)
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = Date.now() - startTime
      logger.apiResponse('GET', `/api/escalations/${escalationId}/video-status`, 401, duration)
      return createUnauthorizedError()
    }

    // Get escalation
    const { data: escalation, error: escalationError } = await supabase
      .from('escalations')
      .select('id, video_url, video_generation_status, student_id, course_id, courses!inner(professor_id)')
      .eq('id', escalationId)
      .single()

    if (escalationError || !escalation) {
      const duration = Date.now() - startTime
      logger.apiResponse('GET', `/api/escalations/${escalationId}/video-status`, 404, duration)
      return createNotFoundError('Escalation')
    }

    // Verify user has access (professor or the student who created it)
    const course = Array.isArray(escalation.courses)
      ? escalation.courses[0]
      : escalation.courses

    const isProfessor = course?.professor_id === user.id
    const isStudent = escalation.student_id === user.id

    if (!isProfessor && !isStudent) {
      const duration = Date.now() - startTime
      logger.apiResponse('GET', `/api/escalations/${escalationId}/video-status`, 403, duration)
      return createErrorResponse(
        new Error('Access denied'),
        'You do not have access to this escalation'
      )
    }

    const status = escalation.video_generation_status || 'pending'

    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/escalations/${escalationId}/video-status`, 200, duration)

    return NextResponse.json({
      status,
      videoUrl: escalation.video_url || undefined,
      ...(status === 'failed' ? { error: 'Video generation failed. Please try regenerating.' } : {}),
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('GET', `/api/escalations/[id]/video-status`, error, 500)
    return createErrorResponse(error, 'Failed to get video status')
  }
}

