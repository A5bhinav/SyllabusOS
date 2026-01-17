import { NextRequest, NextResponse } from 'next/server'
import { getAgentRouter } from '@/lib/agents/router'
import { getSyllabusAgent } from '@/lib/agents/syllabus-agent'
import { getConceptAgent } from '@/lib/agents/concept-agent'
import { getEscalationHandler } from '@/lib/agents/escalation-handler'
import { createServiceClient } from '@/lib/supabase/server'
import type { ChatRequest, ChatResponse } from '@/types/api'

/**
 * POST /api/chat
 * Handles chat messages and routes to appropriate agents
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: ChatRequest = await request.json()
    const { message, courseId, userId } = body

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!courseId || typeof courseId !== 'string') {
      return NextResponse.json(
        { error: 'courseId is required and must be a string' },
        { status: 400 }
      )
    }

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required and must be a string' },
        { status: 400 }
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
      return NextResponse.json(
        { error: 'Invalid user' },
        { status: 401 }
      )
    }

    // Verify course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    // Route query using AgentRouter
    const router = getAgentRouter()
    const routingDecision = await router.classifyQuery(message)

    let agentResponse: {
      response: string
      citations: Array<{ source: string; page?: number; content: string }>
      shouldEscalate: boolean
    }
    let escalationId: string | undefined

    // Route to appropriate agent handler
    switch (routingDecision.route) {
      case 'POLICY': {
        const agent = getSyllabusAgent()
        const result = await agent.processQuery(message, courseId)
        
        // If agent says to escalate, create escalation
        if (result.shouldEscalate) {
          const escalationHandler = getEscalationHandler()
          const escalation = await escalationHandler.createEscalation(
            message,
            courseId,
            userId,
            'POLICY'
          )
          escalationId = escalation.escalationId
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
          const escalationHandler = getEscalationHandler()
          const escalation = await escalationHandler.createEscalation(
            message,
            courseId,
            userId,
            'CONCEPT'
          )
          escalationId = escalation.escalationId
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
        const escalationHandler = getEscalationHandler()
        const escalation = await escalationHandler.createEscalation(
          message,
          courseId,
          userId,
          routingDecision.route
        )
        escalationId = escalation.escalationId

        agentResponse = {
          response: escalation.message,
          citations: [],
          shouldEscalate: true,
        }
        break
      }

      default:
        // Should not reach here, but handle gracefully
        return NextResponse.json(
          { error: 'Invalid routing decision' },
          { status: 500 }
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
        console.error('[Chat API] Error logging conversation:', logError)
        // Don't fail the request if logging fails, just log the error
      }
    } catch (logError) {
      console.error('[Chat API] Error logging conversation:', logError)
      // Don't fail the request if logging fails
    }

    // Build response
    const response: ChatResponse = {
      response: agentResponse.response,
      agent: routingDecision.route,
      citations: agentResponse.citations,
      escalated: agentResponse.shouldEscalate || !!escalationId,
      escalationId: escalationId,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Chat API] Error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

