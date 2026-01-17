import { retrieveRelevantChunks, generateCitations, combineChunksIntoContext } from '../rag/retrieval'
import { generateChatCompletion, isMockMode } from '../ai/client'
import type { AgentResponse } from './types'

/**
 * Concept Agent (CONCEPT)
 * Handles questions about course concepts, algorithms, theories, etc.
 * Retrieves chunks with contentType='concept'
 */
export class ConceptAgent {
  /**
   * Process a concept-related query
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
      // Retrieve relevant chunks (filtered by contentType='concept')
      const chunks = await retrieveRelevantChunks(query, {
        courseId,
        contentType: 'concept',
        limit: 5,
        scoreThreshold: 0.7, // Minimum similarity score
      })

      if (chunks.length === 0) {
        // No relevant chunks found - escalate
        return {
          response: "I don't have enough information about this concept in the course materials. Your question has been escalated to the professor.",
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
      const responsePrompt = `You are a helpful course assistant explaining course concepts and answering learning-related questions.

Use the following context from the course materials to answer the question. Always cite your sources using page numbers or week numbers when available.

Context from course materials:
${context}

Question: ${query}

Provide a clear, educational explanation based on the course materials. If the information is not in the context, respond with "I don't know" and escalate to the professor.
Include citations in your response format: "See Syllabus page X" or "See Lecture Week Y" when referencing specific materials.`

      const llmResponse = await generateChatCompletion(responsePrompt)

      // Check if response indicates "I don't know"
      const responseText = llmResponse.text.toLowerCase()
      if (responseText.includes("i don't know") || responseText.includes('not in the context') || responseText.includes('escalate')) {
        return {
          response: "I don't have enough information about this concept in the course materials. Your question has been escalated to the professor.",
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
      console.error('[Concept Agent] Error processing query:', error)
      
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
        source: 'Syllabus Week 3',
        page: 8,
        content: 'Concept explanation and algorithm details...',
      },
      {
        source: 'Syllabus Week 4',
        page: 12,
        content: 'Related concepts and examples...',
      },
    ]

    // Mock response based on query
    let mockResponse = 'Based on the course materials, here is an explanation of the concept you asked about. '
    
    if (query.toLowerCase().includes('algorithm') || query.toLowerCase().includes('data structure')) {
      mockResponse += 'The algorithm works by breaking down the problem into smaller subproblems. The key data structures used include arrays and hash tables for efficient lookup.'
    } else if (query.toLowerCase().includes('recursion')) {
      mockResponse += 'Recursion is a programming technique where a function calls itself. The base case stops the recursion, and the recursive case breaks the problem into smaller instances.'
    } else if (query.toLowerCase().includes('explain') || query.toLowerCase().includes('how does')) {
      mockResponse += 'The concept involves understanding the fundamental principles and applying them to solve problems. Please refer to the citations below for detailed explanations and examples.'
    } else {
      mockResponse += 'The course materials contain detailed explanations of this concept. Please refer to the citations below for specific details.'
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
 * Create a singleton instance of ConceptAgent
 */
let agentInstance: ConceptAgent | null = null

export function getConceptAgent(): ConceptAgent {
  if (!agentInstance) {
    agentInstance = new ConceptAgent()
  }
  return agentInstance
}

