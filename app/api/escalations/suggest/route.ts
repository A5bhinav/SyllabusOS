import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createUnauthorizedError, createForbiddenError, validateRequired, validateType } from '@/lib/utils/api-errors'
import { logger } from '@/lib/utils/logger'
import { generateChatCompletion } from '@/lib/ai/client'
import { retrieveRelevantChunks, combineChunksIntoContext } from '@/lib/rag/retrieval'

/**
 * POST /api/escalations/suggest
 * Generate an AI-suggested response for a professor to respond to an escalation
 * 
 * Request body:
 * {
 *   query: string,      // The student's escalation query
 *   category?: string   // Optional: The escalation category
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    logger.apiRequest('POST', '/api/escalations/suggest')
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = Date.now() - startTime
      logger.apiResponse('POST', '/api/escalations/suggest', 401, duration)
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
      logger.apiResponse('POST', '/api/escalations/suggest', 403, duration)
      return createForbiddenError('Only professors can generate suggested responses')
    }

    // Parse request body
    let body: { query?: string; category?: string; courseId?: string; escalationId?: string }
    try {
      body = await request.json()
    } catch (error) {
      return createErrorResponse(
        new Error('Invalid JSON in request body'),
        'Invalid request body'
      )
    }

    const { query, category, courseId, escalationId } = body

    // Validate required fields
    const requiredValidation = validateRequired(body, ['query'])
    if (!requiredValidation.isValid) {
      const errorMsg = requiredValidation.errors.map(e => e.message).join(', ')
      return createErrorResponse(
        new Error(errorMsg),
        'Validation error'
      )
    }

    const queryTypeCheck = validateType({ query }, 'query', 'string')
    if (!queryTypeCheck.isValid) {
      return createErrorResponse(
        new Error(queryTypeCheck.error || 'Invalid query type'),
        'Validation error'
      )
    }

    if (!query || query.trim().length === 0) {
      return createErrorResponse(
        new Error('query must be a non-empty string'),
        'Validation error'
      )
    }

    // Get course ID from escalation if not provided
    let finalCourseId = courseId
    if (!finalCourseId && escalationId) {
      const { data: escalation, error: escalationError } = await supabase
        .from('escalations')
        .select('course_id')
        .eq('id', escalationId)
        .single()

      if (escalationError || !escalation) {
        return createErrorResponse(
          new Error('Escalation not found'),
          'Validation error'
        )
      }

      finalCourseId = escalation.course_id
    }

    // Retrieve relevant course content using RAG
    let courseContext = ''
    if (finalCourseId) {
      try {
        // Try to retrieve relevant chunks - search both concept and policy content
        const chunks = await retrieveRelevantChunks(query, {
          courseId: finalCourseId,
          limit: 3,
          scoreThreshold: 0.5, // Lower threshold to get more context
        })

        if (chunks.length > 0) {
          courseContext = combineChunksIntoContext(chunks)
        }
      } catch (ragError) {
        // If RAG fails, continue without context (graceful degradation)
        console.warn('[Escalation Suggest] RAG retrieval failed, continuing without context:', ragError)
      }
    }

    // Generate AI-suggested response with course context
    const systemPrompt = `You are a helpful professor assistant. Generate a professional, empathetic, and appropriate response to a student's escalation query.

IMPORTANT: This is a course-related query. Use the course context provided below to understand what the student is asking about. For example, if they ask "what are trees", they likely mean data structures (binary trees, etc.) in the context of this programming course, NOT real-world trees.

Guidelines:
- Be professional and warm
- Address the student's concern directly
- Use the course context to understand the student's question in the correct domain (e.g., programming concepts, course policies, etc.)
- If it's an extension request, acknowledge their situation and provide clear next steps
- If it's a grade dispute, offer to review and provide a timeline
- If it's a personal issue, express empathy and offer support
- If it's a technical problem, provide troubleshooting steps or offer to help
- If it's a concept question, reference the course materials when relevant
- Keep responses concise (2-4 sentences)
- Always end with an offer to discuss further if needed

Category: ${category || 'Other'}`

    const contextSection = courseContext 
      ? `\n\nRelevant Course Context:\n${courseContext}\n\nUse this context to understand what the student is asking about. For example, if they ask about "trees" and the context mentions "binary trees" or "data structures", they are asking about programming concepts, not real-world trees.`
      : ''

    const prompt = `Student Query: "${query}"${contextSection}

Generate a professional professor response to this student escalation. Make sure your response is appropriate for the course context.`

    const aiResponse = await generateChatCompletion(prompt, systemPrompt)
    const suggestion = aiResponse.text.trim()

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/escalations/suggest', 200, duration)
    
    return NextResponse.json({
      success: true,
      suggestion,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('POST', '/api/escalations/suggest', error, 500)
    return createErrorResponse(error, 'Failed to generate suggested response')
  }
}

