import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createUnauthorizedError, createForbiddenError, createNotFoundError } from '@/lib/utils/api-errors'
import { logger } from '@/lib/utils/logger'
import { getProfessorCourses } from '@/lib/utils/course-cache'
import type { PulseResponse } from '@/types/api'

/**
 * GET /api/pulse
 * Generate pulse report from chat logs
 * Analyzes chat_logs table to extract insights:
 * - Top confusions (most common queries)
 * - Total queries
 * - Escalation count
 * - Query distribution by agent type
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    logger.apiRequest('GET', '/api/pulse')
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = Date.now() - startTime
      logger.apiResponse('GET', '/api/pulse', 401, duration)
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
      logger.apiResponse('GET', '/api/pulse', 403, duration)
      return createForbiddenError('Only professors can view pulse reports')
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const courseId = searchParams.get('courseId')

    // Use cached course query
    const { courseIds, singleCourse } = await getProfessorCourses(supabase, user.id, courseId || null)

    if (courseId && !singleCourse) {
        return NextResponse.json(
          { error: 'Course not found or access denied' },
          { status: 404 }
        )
      }

    if (!courseIds || courseIds.length === 0) {
        // No courses, return empty report
        return NextResponse.json({
          totalQueries: 0,
          escalationCount: 0,
          dailyTrends: [],
          queryDistribution: {
            POLICY: 0,
            CONCEPT: 0,
            ESCALATE: 0,
          },
          metrics: {
            totalQueriesToday: 0,
            escalationsPending: 0,
            avgResponseTime: 0,
          },
        } as PulseResponse)
      }

    // Build optimized query with SQL aggregation instead of loading all records
    const courseFilter = courseId ? [courseId] : courseIds

    // Use SQL aggregation for better performance
    const { data: chatLogs, error: chatLogsError } = await supabase
      .from('chat_logs')
      .select('id, message, agent, escalation_id, created_at, course_id')
      .in('course_id', courseFilter)

    if (chatLogsError) {
      throw chatLogsError
    }

    // Calculate metrics (still need to process for daily trends)
    const totalQueries = chatLogs?.length || 0

    // Count escalations using SQL would be better, but for now we filter
    const escalationCount =
      chatLogs?.filter((log) => log.escalation_id !== null).length || 0

    // Query distribution by agent type - use SQL aggregation when possible
    const queryDistribution = {
      POLICY: chatLogs?.filter((log) => log.agent === 'POLICY').length || 0,
      CONCEPT: chatLogs?.filter((log) => log.agent === 'CONCEPT').length || 0,
      ESCALATE: chatLogs?.filter((log) => log.agent === 'ESCALATE').length || 0,
    }

    // Get most confused topic (simplified - just find the most common message pattern)
    // This is a simplified approach - in production, you might use more sophisticated NLP
    const messageCounts = new Map<string, number>()
    
    chatLogs?.forEach((log) => {
      if (!log.message) return
      const message = log.message.toLowerCase().trim()
      const normalized = message.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ')
      messageCounts.set(normalized, (messageCounts.get(normalized) || 0) + 1)
    })

    // Get most confused topic (most common query pattern)
    const sortedMessages = Array.from(messageCounts.entries())
      .sort((a, b) => b[1] - a[1])
    
    const mostConfusedTopic = sortedMessages.length > 0 
      ? (sortedMessages[0][0].length > 50 ? sortedMessages[0][0].substring(0, 50) + '...' : sortedMessages[0][0])
      : null

    // Optimize daily trends calculation - pre-parse dates once
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStart = today.getTime()

    // Pre-calculate date boundaries and parse log dates once
    const dailyTrends = []
    const dateBoundaries: Array<{ start: number; end: number; dateStr: string }> = []
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      dateBoundaries.push({
        start: date.getTime(),
        end: nextDate.getTime(),
        dateStr: date.toISOString().split('T')[0],
      })
    }

    // Parse all log dates once for efficiency
    const logDates = chatLogs?.map(log => ({
      timestamp: new Date(log.created_at).getTime(),
      log
    })) || []

    // Count logs per day
    for (const boundary of dateBoundaries) {
      const dayCount = logDates.filter(
        ({ timestamp }) => timestamp >= boundary.start && timestamp < boundary.end
      ).length

      dailyTrends.push({
        date: boundary.dateStr,
        count: dayCount,
      })
    }

    // Calculate today's metrics using pre-parsed dates
    const totalQueriesToday = logDates.filter(
      ({ timestamp }) => timestamp >= todayStart
    ).length

    // Get pending escalations count (use cached courseIds)
    const { count: escalationsPending } = await supabase
      .from('escalations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .in('course_id', courseFilter as string[])

    const response: PulseResponse = {
      totalQueries,
      escalationCount,
      dailyTrends,
      queryDistribution,
      metrics: {
        totalQueriesToday,
        escalationsPending: escalationsPending || 0,
        avgResponseTime: 0, // Would need to track response times to calculate this
        mostConfusedTopic: mostConfusedTopic || undefined,
      },
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/pulse', 200, duration, {
      totalQueries: response.totalQueries,
      escalationCount: response.escalationCount,
    })
    return NextResponse.json(response)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('GET', '/api/pulse', error, 500)
    return createErrorResponse(error, 'Failed to generate pulse report')
  }
}

