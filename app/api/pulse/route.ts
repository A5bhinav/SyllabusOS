import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createUnauthorizedError, createForbiddenError, createNotFoundError } from '@/lib/utils/api-errors'
import { logger } from '@/lib/utils/logger'
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

    // Build query for chat logs
    let chatLogsQuery = supabase
      .from('chat_logs')
      .select('id, message, agent, escalation_id, created_at, course_id')

    // Filter by course if provided (and verify it belongs to professor)
    if (courseId) {
      const { data: course } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('professor_id', user.id)
        .single()

      if (course) {
        chatLogsQuery = chatLogsQuery.eq('course_id', courseId)
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
        chatLogsQuery = chatLogsQuery.in('course_id', courseIds)
      } else {
        // No courses, return empty report
        return NextResponse.json({
          topConfusions: [],
          totalQueries: 0,
          escalationCount: 0,
          queryDistribution: {
            POLICY: 0,
            CONCEPT: 0,
            ESCALATE: 0,
          },
        } as PulseResponse)
      }
    }

    // Get chat logs
    const { data: chatLogs, error: chatLogsError } = await chatLogsQuery

    if (chatLogsError) {
      throw chatLogsError
    }

    // Calculate metrics
    const totalQueries = chatLogs?.length || 0

    // Count escalations
    const escalationCount =
      chatLogs?.filter((log) => log.escalation_id !== null).length || 0

    // Query distribution by agent type
    const queryDistribution = {
      POLICY: chatLogs?.filter((log) => log.agent === 'POLICY').length || 0,
      CONCEPT: chatLogs?.filter((log) => log.agent === 'CONCEPT').length || 0,
      ESCALATE: chatLogs?.filter((log) => log.agent === 'ESCALATE').length || 0,
    }

    // Analyze top confusions
    // Group messages by similarity (simple keyword matching for now)
    // In a production system, this could use more sophisticated NLP
    const messageCounts = new Map<string, number>()
    const messageExamples = new Map<string, string[]>()

    chatLogs?.forEach((log) => {
      if (!log.message) return

      const message = log.message.toLowerCase().trim()

      // Normalize message (remove extra whitespace, punctuation)
      const normalized = message.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ')

      // Group similar messages (exact match for now, could be enhanced with similarity)
      const key = normalized

      messageCounts.set(key, (messageCounts.get(key) || 0) + 1)

      // Store example (first occurrence)
      if (!messageExamples.has(key)) {
        messageExamples.set(key, [])
      }
      const examples = messageExamples.get(key)!
      if (examples.length < 3 && log.message !== examples[0]) {
        examples.push(log.message)
      }
    })

    // Sort by count and get top 5 (for better visualization)
    const sortedMessages = Array.from(messageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const topConfusions = sortedMessages.map(([key, count]) => ({
      topic: key.length > 50 ? key.substring(0, 50) + '...' : key,
      count,
      examples: messageExamples.get(key) || [],
    }))

    // Get most confused topic (top confusion)
    const mostConfusedTopic = topConfusions.length > 0 
      ? topConfusions[0].topic 
      : null

    // Calculate daily trends (last 14 days for better visualization)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const dailyTrends = []
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayCount =
        chatLogs?.filter((log) => {
          const logDate = new Date(log.created_at)
          return logDate >= date && logDate < nextDate
        }).length || 0

      dailyTrends.push({
        date: date.toISOString().split('T')[0],
        count: dayCount,
      })
    }

    // Calculate today's metrics
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const totalQueriesToday =
      chatLogs?.filter((log) => new Date(log.created_at) >= todayStart).length ||
      0

    // Get pending escalations count
    let escalationsQuery = supabase
      .from('escalations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (courseId) {
      escalationsQuery = escalationsQuery.eq('course_id', courseId)
    } else {
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('professor_id', user.id)

      if (courses && courses.length > 0) {
        const courseIds = courses.map((c) => c.id)
        escalationsQuery = escalationsQuery.in('course_id', courseIds)
      }
    }

    const { count: escalationsPending } = await escalationsQuery

    const response: PulseResponse = {
      topConfusions,
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

