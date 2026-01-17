import { retrieveRelevantChunks, generateCitations, combineChunksIntoContext } from '../rag/retrieval'
import { generateChatCompletion, isMockMode } from '../ai/client'

export interface AgentResponse {
  response: string
  citations: Array<{
    source: string
    page?: number
    content: string
  }>
  confidence: number
  shouldEscalate: boolean
}

/**
 * Syllabus Agent (POLICY)
 * Handles questions about course policies, deadlines, grading, etc.
 * Retrieves chunks with contentType='policy'
 */
export class SyllabusAgent {
  /**
   * Process a policy-related query
   */
  async processQuery(
    query: string,
    courseId: string
  ): Promise<AgentResponse> {
    const mockMode = isMockMode()

    if (mockMode) {
      return this.processQueryMock(query)
    }

    try {
      // Retrieve relevant chunks (filtered by contentType='policy')
      const chunks = await retrieveRelevantChunks(query, {
        courseId,
        contentType: 'policy',
        limit: 5,
        scoreThreshold: 0.7, // Minimum similarity score
      })

      if (chunks.length === 0) {
        // No relevant chunks found - escalate
        return {
          response: "I don't have enough information in the syllabus to answer this question. Your question has been escalated to the professor.",
          citations: [],
          confidence: 0.0,
          shouldEscalate: true,
        }
      }

      // Check if confidence is too low (all chunks below threshold)
      const avgScore = chunks.reduce((sum, chunk) => sum + chunk.score, 0) / chunks.length
      if (avgScore < 0.7) {
        return {
          response: "I'm not confident in the answer to this question. Your question has been escalated to the professor.",
          citations: [],
          confidence: avgScore,
          shouldEscalate: true,
        }
      }

      // Combine chunks into context
      const context = combineChunksIntoContext(chunks)

      // Generate response using LLM
      const responsePrompt = `You are a helpful course assistant answering questions about course policies, deadlines, and administrative matters.

Use the following context from the course syllabus to answer the question. Always cite your sources using page numbers when available.

Context from syllabus:
${context}

Question: ${query}

Provide a clear, concise answer based on the syllabus. If the information is not in the context, respond with "I don't know" and escalate to the professor.
Include citations in your response format: "See Syllabus page X" when referencing specific pages.`

      const llmResponse = await generateChatCompletion(responsePrompt)

      // Check if response indicates "I don't know"
      const responseText = llmResponse.text.toLowerCase()
      if (responseText.includes("i don't know") || responseText.includes('not in the context') || responseText.includes('escalate')) {
        return {
          response: "I don't have enough information in the syllabus to answer this question. Your question has been escalated to the professor.",
          citations: [],
          confidence: avgScore,
          shouldEscalate: true,
        }
      }

      // Generate citations
      const citations = generateCitations(chunks)

      return {
        response: llmResponse.text,
        citations,
        confidence: avgScore,
        shouldEscalate: false,
      }
    } catch (error) {
      console.error('[Syllabus Agent] Error processing query:', error)
      
      // On error, escalate
      return {
        response: "I encountered an error processing your question. Your question has been escalated to the professor.",
        citations: [],
        confidence: 0.0,
        shouldEscalate: true,
      }
    }
  }

  /**
   * Mock response for development
   * Used when MOCK_MODE is enabled
   */
  private processQueryMock(query: string): AgentResponse {
    // Generate mock citations
    const mockCitations = [
      {
        source: 'Syllabus',
        page: 3,
        content: 'Course policies and grading information...',
      },
      {
        source: 'Syllabus',
        page: 5,
        content: 'Deadline and submission policies...',
      },
    ]

    // Mock response based on query
    let mockResponse = 'Based on the course syllabus, here is the policy information you requested. '
    
    if (query.toLowerCase().includes('deadline') || query.toLowerCase().includes('due date')) {
      mockResponse += 'Assignments are typically due on Fridays at 11:59 PM. Please refer to the specific assignment for exact due dates.'
    } else if (query.toLowerCase().includes('grading') || query.toLowerCase().includes('grade')) {
      mockResponse += 'The course uses a weighted grading system. Please refer to the syllabus for the complete breakdown of grade components.'
    } else if (query.toLowerCase().includes('late') || query.toLowerCase().includes('submission')) {
      mockResponse += 'Late submissions are accepted with a penalty. Please see the syllabus for the specific late policy.'
    } else {
      mockResponse += 'The syllabus contains detailed information about course policies. Please refer to the citations below for specific details.'
    }

    return {
      response: mockResponse,
      citations: mockCitations,
      confidence: 0.85,
      shouldEscalate: false,
    }
  }
}

/**
 * Create a singleton instance of SyllabusAgent
 */
let agentInstance: SyllabusAgent | null = null

export function getSyllabusAgent(): SyllabusAgent {
  if (!agentInstance) {
    agentInstance = new SyllabusAgent()
  }
  return agentInstance
}

