import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createUnauthorizedError, createForbiddenError, createNotFoundError, validateRequired, validateType } from '@/lib/utils/api-errors'
import { logger } from '@/lib/utils/logger'
import { generateVideoAsync } from '@/lib/video/worker'
import type { EscalationContext } from '@/lib/video/generator'

/**
 * POST /api/escalations/[id]/generate-video
 * Trigger video generation for an escalation response
 * 
 * Request body:
 * {
 *   responseText?: string,  // Optional: override response text
 *   studentName?: string,   // Optional: for personalization
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  
  try {
    const { id: escalationId } = await params
    logger.apiRequest('POST', `/api/escalations/${escalationId}/generate-video`)
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = Date.now() - startTime
      logger.apiResponse('POST', `/api/escalations/${escalationId}/generate-video`, 401, duration)
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
      logger.apiResponse('POST', `/api/escalations/${escalationId}/generate-video`, 403, duration)
      return createForbiddenError('Only professors can generate videos')
    }

    // Get escalation to verify ownership
    const { data: escalation, error: escalationError } = await supabase
      .from('escalations')
      .select(`
        id,
        course_id,
        student_id,
        response,
        category,
        courses!inner (
          professor_id
        ),
        profiles!escalations_student_id_fkey (
          name
        )
      `)
      .eq('id', escalationId)
      .single()

    if (escalationError || !escalation) {
      const duration = Date.now() - startTime
      logger.apiResponse('POST', `/api/escalations/${escalationId}/generate-video`, 404, duration)
      return createNotFoundError('Escalation')
    }

    // Verify course belongs to this professor
    const course = Array.isArray(escalation.courses)
      ? escalation.courses[0]
      : escalation.courses

    if (!course || course.professor_id !== user.id) {
      const duration = Date.now() - startTime
      logger.apiResponse('POST', `/api/escalations/${escalationId}/generate-video`, 403, duration)
      return createForbiddenError('Cannot generate video for this escalation')
    }

    // Check if response exists
    let responseText = escalation.response
    if (!responseText) {
      // Parse request body for optional responseText override
      try {
        const body = await request.json()
        responseText = body.responseText
      } catch {
        // Ignore parse error
      }

      if (!responseText) {
        return createErrorResponse(
          new Error('No response text found. Please provide a response first.'),
          'No response text available'
        )
      }
    }

    // Get student name for context
    const studentProfile = Array.isArray(escalation.profiles)
      ? escalation.profiles[0]
      : escalation.profiles

    const context: EscalationContext = {
      studentName: studentProfile?.name || undefined,
      category: escalation.category || undefined,
    }

    // Trigger async video generation
    await generateVideoAsync(escalationId, responseText, context)

    const duration = Date.now() - startTime
    logger.apiResponse('POST', `/api/escalations/${escalationId}/generate-video`, 200, duration)

    return NextResponse.json({
      success: true,
      status: 'pending',
      message: 'Video generation started. Status will be updated when complete.',
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('POST', `/api/escalations/[id]/generate-video`, error, 500)
    return createErrorResponse(error, 'Failed to trigger video generation')
  }
}

