import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createUnauthorizedError } from '@/lib/utils/api-errors'
import { logger } from '@/lib/utils/logger'
import { getProfessorCourses } from '@/lib/utils/course-cache'

/**
 * GET /api/chat/history
 * Get chat history for a course and user
 * 
 * Query params:
 * - courseId: Course ID
 * - userId: User ID (optional, defaults to authenticated user)
 * - limit: Number of messages to return (default: 50)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    logger.apiRequest('GET', '/api/chat/history')
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = Date.now() - startTime
      logger.apiResponse('GET', '/api/chat/history', 401, duration)
      return createUnauthorizedError()
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const courseId = searchParams.get('courseId')
    const userId = searchParams.get('userId') || user.id
    const limit = parseInt(searchParams.get('limit') || '30', 10) // Reduced from 50 to 30 for better performance

    if (!courseId) {
      return NextResponse.json(
        { error: 'courseId is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this course (either as student or professor)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'student') {
      // Students can only see their own chat history
      if (userId !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden - students can only view their own chat history' },
          { status: 403 }
        )
      }

      // Verify student is enrolled
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('student_id', user.id)
        .maybeSingle()

      if (!enrollment) {
        return NextResponse.json(
          { error: 'Not enrolled in this course' },
          { status: 403 }
        )
      }
    } else if (profile?.role === 'professor') {
      // Professors can view any student's chat history for their courses (use cached query)
      const { singleCourse } = await getProfessorCourses(supabase, user.id, courseId)

      if (!singleCourse) {
        return NextResponse.json(
          { error: 'Course not found or access denied' },
          { status: 403 }
        )
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid user role' },
        { status: 403 }
      )
    }

    // Fetch chat logs
    const { data: chatLogs, error: chatLogsError } = await supabase
      .from('chat_logs')
      .select('id, message, response, agent, citations, escalation_id, created_at')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (chatLogsError) {
      logger.error('[Chat History API] Error fetching chat logs:', chatLogsError)
      throw chatLogsError
    }

    // Transform chat logs into message pairs (user message + assistant response)
    const messages: Array<{
      id: string
      text: string
      role: 'user' | 'assistant'
      timestamp: string // Return as ISO string, client will convert to Date
      agent?: string
      citations?: Array<{ source: string; page?: number; content: string }>
      escalated?: boolean
      escalationId?: string
    }> = []

    for (const log of chatLogs || []) {
      // Add user message
      messages.push({
        id: `${log.id}-user`,
        text: log.message,
        role: 'user',
        timestamp: log.created_at,
      })

      // Add assistant response if available
      if (log.response) {
        messages.push({
          id: `${log.id}-assistant`,
          text: log.response,
          role: 'assistant',
          timestamp: log.created_at,
          agent: log.agent || undefined,
          citations: log.citations as Array<{ source: string; page?: number; content: string }> | undefined,
          escalated: !!log.escalation_id,
          escalationId: log.escalation_id || undefined,
        })
      }
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/chat/history', 200, duration, {
      messageCount: messages.length,
    })

    return NextResponse.json({ messages })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('GET', '/api/chat/history', error, 500)
    return createErrorResponse(error, 'Failed to fetch chat history')
  }
}
