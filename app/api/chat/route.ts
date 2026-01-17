import { NextRequest, NextResponse } from 'next/server'
import { getAgentRouter } from '@/lib/agents/router'
import { getSyllabusAgent } from '@/lib/agents/syllabus-agent'
import { getConceptAgent } from '@/lib/agents/concept-agent'
import { getEscalationHandler } from '@/lib/agents/escalation-handler'
import { createServiceClient } from '@/lib/supabase/server'
import { createErrorResponse, createUnauthorizedError, createNotFoundError, validateRequired, validateType } from '@/lib/utils/api-errors'
import { getDemoModeInfo } from '@/lib/utils/demo-mode'
import { logger } from '@/lib/utils/logger'
import type { ChatRequest, ChatResponse } from '@/types/api'

/**
 * POST /api/chat
 * Handles chat messages and routes to appropriate agents
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    logger.apiRequest('POST', '/api/chat')

    // Parse request body
    let body: ChatRequest
    try {
      body = await request.json()
    } catch (error) {
      return createErrorResponse(
        new Error('Invalid JSON in request body'),
        'Invalid request body'
      )
    }

    const { message, courseId, userId } = body

    // Validate required fields
    const requiredValidation = validateRequired(body, ['message', 'courseId', 'userId'])
    if (!requiredValidation.isValid) {
      const errorMsg = requiredValidation.errors.map(e => e.message).join(', ')
      return createErrorResponse(
        new Error(errorMsg),
        'Validation error'
      )
    }

    // Validate field types
    const messageTypeCheck = validateType({ message }, 'message', 'string')
    if (!messageTypeCheck.isValid) {
      return createErrorResponse(
        new Error(messageTypeCheck.error || 'Invalid message type'),
        'Validation error'
      )
    }

    if (message.trim().length === 0) {
      return createErrorResponse(
        new Error('message must be a non-empty string'),
        'Validation error'
      )
    }

    const courseIdTypeCheck = validateType({ courseId }, 'courseId', 'string')
    if (!courseIdTypeCheck.isValid) {
      return createErrorResponse(
        new Error(courseIdTypeCheck.error || 'Invalid courseId type'),
        'Validation error'
      )
    }

    const userIdTypeCheck = validateType({ userId }, 'userId', 'string')
    if (!userIdTypeCheck.isValid) {
      return createErrorResponse(
        new Error(userIdTypeCheck.error || 'Invalid userId type'),
        'Validation error'
      )
    }

    // Authenticate user (verify they have access to this course)
    const supabase = createServiceClient()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      const duration = Date.now() - startTime
      logger.apiResponse('POST', '/api/chat', 401, duration)
      return createUnauthorizedError('Invalid user')
    }

    // Verify course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      const duration = Date.now() - startTime
      logger.apiResponse('POST', '/api/chat', 404, duration)
      return createNotFoundError('Course')
    }

    // Route query using AgentRouter
    let routingDecision
    try {
    const router = getAgentRouter()
      routingDecision = await router.classifyQuery(message)
    } catch (error) {
      logger.error('[Chat API] Error in router classification:', error)
      const duration = Date.now() - startTime
      logger.apiError('POST', '/api/chat', error, 500)
      return createErrorResponse(
        error instanceof Error ? error : new Error('Failed to classify query'),
        'Failed to process your question. Please try again.'
      )
    }

    let agentResponse: {
      response: string
      citations: Array<{ source: string; page?: number; content: string }>
      shouldEscalate: boolean
    }
    let escalationId: string | undefined

    // Route to appropriate agent handler
    try {
    switch (routingDecision.route) {
      case 'POLICY': {
        const agent = getSyllabusAgent()
        const result = await agent.processQuery(message, courseId)
        
        // If agent says to escalate, create escalation
        if (result.shouldEscalate) {
            try {
          const escalationHandler = getEscalationHandler()
          const escalation = await escalationHandler.createEscalation(
            message,
            courseId,
            userId
          )
          escalationId = escalation.escalationId
            } catch (escalationError) {
              logger.error('[Chat API] Error creating escalation:', escalationError)
              // Continue even if escalation fails
            }
        }

        agentResponse = {
          response: result.response,
          citations: result.citations,
          shouldEscalate: result.shouldEscalate,
        }
        break
      }

      case 'CONCEPT': {
        const agent = getConceptAgent()
        const result = await agent.processQuery(message, courseId)
        
        // If agent says to escalate, create escalation
        if (result.shouldEscalate) {
            try {
          const escalationHandler = getEscalationHandler()
          const escalation = await escalationHandler.createEscalation(
            message,
            courseId,
            userId
          )
          escalationId = escalation.escalationId
            } catch (escalationError) {
              logger.error('[Chat API] Error creating escalation:', escalationError)
              // Continue even if escalation fails
            }
        }

        agentResponse = {
          response: result.response,
          citations: result.citations,
          shouldEscalate: result.shouldEscalate,
        }
        break
      }

      case 'ESCALATE': {
        // Direct escalation - create escalation entry
          try {
        const escalationHandler = getEscalationHandler()
        const escalation = await escalationHandler.createEscalation(
          message,
          courseId,
          userId
        )
        escalationId = escalation.escalationId

        agentResponse = {
          response: escalation.message,
          citations: [],
          shouldEscalate: true,
            }
          } catch (escalationError) {
            logger.error('[Chat API] Error creating escalation:', escalationError)
            // Fallback response if escalation creation fails
            agentResponse = {
              response: "I've received your question and will forward it to your professor. They will get back to you soon.",
              citations: [],
              shouldEscalate: true,
            }
        }
        break
      }

      default:
        // Should not reach here, but handle gracefully
        const duration = Date.now() - startTime
        logger.apiError('POST', '/api/chat', new Error('Invalid routing decision'), 500)
        return createErrorResponse(
          new Error('Invalid routing decision'),
          'Internal server error'
          )
      }
    } catch (agentError) {
      logger.error('[Chat API] Error in agent processing:', agentError)
      const duration = Date.now() - startTime
      logger.apiError('POST', '/api/chat', agentError, 500)
      return createErrorResponse(
        agentError instanceof Error ? agentError : new Error('Failed to process query'),
        'Failed to process your question. Please try again.'
        )
    }

    // Log conversation to chat_logs table
    try {
      const { error: logError } = await supabase
        .from('chat_logs')
        .insert({
          course_id: courseId,
          user_id: userId,
          message: message.trim(),
          response: agentResponse.response,
          agent: routingDecision.route,
          citations: agentResponse.citations.length > 0 ? agentResponse.citations : null,
          escalation_id: escalationId || null,
        })

      if (logError) {
        logger.error('[Chat API] Error logging conversation', logError)
        // Don't fail the request if logging fails, just log the error
      }
    } catch (logError) {
      logger.error('[Chat API] Error logging conversation', logError)
      // Don't fail the request if logging fails
    }

    // Build response
    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/chat', 200, duration, {
      agent: routingDecision.route,
      escalated: agentResponse.shouldEscalate || !!escalationId,
    })

    const demoInfo = getDemoModeInfo()
    const response: ChatResponse & { demoMode?: { enabled: boolean; currentWeek?: number } } = {
      response: agentResponse.response,
      agent: routingDecision.route,
      citations: agentResponse.citations,
      escalated: agentResponse.shouldEscalate || !!escalationId,
      escalationId: escalationId,
      ...(demoInfo.enabled && {
        demoMode: {
          enabled: demoInfo.enabled,
          currentWeek: demoInfo.currentWeek,
        },
      }),
    }

    return NextResponse.json(response)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('POST', '/api/chat', error, 500)
    return createErrorResponse(error, 'Internal server error', true)
  }
}

