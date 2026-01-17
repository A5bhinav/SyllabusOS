import { retrieveRelevantChunks, generateCitations, combineChunksIntoContext } from '../rag/retrieval'
import { generateChatCompletion, isMockMode } from '../ai/client'
import type { AgentResponse } from './types'

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
    const lowerQuery = query.toLowerCase() // Declare at function level to avoid scope issues
    const isExamQuestion = lowerQuery.includes('midterm') || lowerQuery.includes('final') || lowerQuery.includes('exam')

    if (mockMode) {
      return this.processQueryMock(query, courseId)
    }

    try {
      // Retrieve relevant chunks (filtered by contentType='policy')
      let chunks
      try {
        chunks = await retrieveRelevantChunks(query, {
        courseId,
        contentType: 'policy',
        limit: 5,
          scoreThreshold: mockMode ? 0.5 : 0.7, // Lower threshold in mock mode
        })
      } catch (retrievalError) {
        console.error('[Syllabus Agent] Error retrieving chunks:', retrievalError)
        // Check if it's a "no content" error or a real error
        if (retrievalError instanceof Error && retrievalError.message.includes('Failed to query database')) {
          // Database query failed - likely no content exists
          return {
            response: "I don't have enough information in the syllabus to answer this question. It looks like no course content has been uploaded yet. Your question has been escalated to the professor.",
            citations: [],
            confidence: 0.0,
            shouldEscalate: true,
          }
        }
        // Re-throw other retrieval errors
        throw retrievalError
      }

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
      const minConfidence = mockMode ? 0.5 : 0.7
      if (avgScore < minConfidence) {
        return {
          response: "I'm not confident in the answer to this question. Your question has been escalated to the professor.",
          citations: [],
          confidence: avgScore,
          shouldEscalate: true,
        }
      }

      // Combine chunks into context
      const context = combineChunksIntoContext(chunks)

      // Generate response using LLM (Gemini API)
      const responsePrompt = `You are a helpful course assistant answering questions about course policies, deadlines, and administrative matters.

IMPORTANT: Answer ONLY using the information provided in the context below. The context comes directly from the course syllabus database. Do not make up or guess information.

Context from syllabus (from database):
${context}

Question: ${query}

${isExamQuestion ? 'IMPORTANT: Look carefully in the context above for exam dates. The context may contain information about both midterm and final exams. Answer the specific exam type asked about (midterm OR final exam). Extract the exact date from the context.' : ''}

Instructions:
1. Read the context carefully and find the answer to the question
2. Extract the specific information requested (dates, policies, etc.)
3. Provide a clear, concise answer based ONLY on what is in the context
4. If the information is not in the context, respond with "I don't know"
5. Include citations in your response format: "See Syllabus page X" when referencing specific pages

Answer:`

      let llmResponse
      try {
        llmResponse = await generateChatCompletion(responsePrompt)
      } catch (llmError) {
        console.error('[Syllabus Agent] Error generating LLM response:', llmError)
        // If LLM fails but we have chunks, try to answer from chunks directly
        if (chunks.length > 0) {
          // Extract key information from chunks for common questions
          let directAnswer = ''
          
          // Look for dates in chunks for exam questions (midterm, final, exam, test)
          if (lowerQuery.includes('midterm') || lowerQuery.includes('final') || lowerQuery.includes('exam') || lowerQuery.includes('test')) {
            // Determine which exam type we're looking for
            const isFinal = lowerQuery.includes('final')
            const isMidterm = lowerQuery.includes('midterm')
            const examType = isFinal ? 'final exam' : isMidterm ? 'midterm' : 'exam'
            
            // Try multiple date patterns - look for the specific exam type first
            const searchTerm = isFinal ? 'final' : isMidterm ? 'midterm' : 'exam'
            const searchTermIndex = context.toLowerCase().indexOf(searchTerm)
            
            if (searchTermIndex !== -1) {
              // Found the exam type in context - extract surrounding text
              const surroundingText = context.substring(Math.max(0, searchTermIndex - 100), Math.min(context.length, searchTermIndex + 400))
              
              // Try to find date patterns in the surrounding text
              const datePatterns = [
                // Pattern: "Final Exam - December 12th" or "Midterm Exam - Week 7 (November 18th)"
                new RegExp(`${searchTerm}.*?(?:exam|test)?.*?(?:nov|november|oct|october|dec|december|jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september)\\s+(\\d{1,2})`, 'i'),
                // Pattern: "December 12th - Final Exam"
                new RegExp(`(?:nov|november|oct|october|dec|december|jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september)\\s+(\\d{1,2}).*?${searchTerm}`, 'i'),
                // Pattern: "Final Exam - December 12" (without "th")
                new RegExp(`${searchTerm}.*?(?:exam|test)?.*?-\\s*(?:nov|november|oct|october|dec|december|jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september)\\s+(\\d{1,2})`, 'i'),
              ]
              
              for (const pattern of datePatterns) {
                const match = surroundingText.match(pattern)
                if (match) {
                  // Extract a clean sentence containing the match
                  const matchIndex = surroundingText.indexOf(match[0])
                  const sentenceStart = Math.max(0, surroundingText.lastIndexOf('.', matchIndex) + 1, surroundingText.lastIndexOf('\n', matchIndex) + 1)
                  const sentenceEnd = Math.min(surroundingText.length, surroundingText.indexOf('.', matchIndex + match[0].length), surroundingText.indexOf('\n', matchIndex + match[0].length))
                  const sentence = surroundingText.substring(sentenceStart, sentenceEnd > 0 ? sentenceEnd : surroundingText.length).trim()
                  
                  if (sentence) {
                    directAnswer = `Based on the syllabus: ${sentence}.`
                    break
                  }
                }
              }
              
              // If no date pattern found, extract the sentence containing the exam type
              if (!directAnswer) {
                const sentences = surroundingText.split(/[.!?\n]/)
                // Look for sentence with exam type and any date pattern (month name or number)
                const relevantSentence = sentences.find(s => {
                  const lowerS = s.toLowerCase()
                  return lowerS.includes(searchTerm) && (
                    // Check for month names
                    /(?:nov|november|oct|october|dec|december|jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september)/.test(lowerS) ||
                    // Check for date pattern (number followed by "th", "st", "nd", "rd" or just a number)
                    /\d{1,2}(?:th|st|nd|rd)?/.test(s)
                  )
                })
                if (relevantSentence) {
                  directAnswer = `Based on the syllabus: ${relevantSentence.trim()}.`
                } else {
                  // Fallback: return the first sentence with the exam type
                  const firstSentence = sentences.find(s => s.toLowerCase().includes(searchTerm))
                  if (firstSentence) {
                    directAnswer = `Based on the syllabus: ${firstSentence.trim()}.`
                  }
                }
              }
            }
          }
          
          if (directAnswer) {
            return {
              response: directAnswer,
              citations: generateCitations(chunks),
              confidence: avgScore,
              shouldEscalate: false,
            }
          }
          
          // If we have chunks but couldn't extract a specific answer, return the context
          return {
            response: `Based on the course syllabus: ${context.substring(0, 500)}${context.length > 500 ? '...' : ''}`,
            citations: generateCitations(chunks),
            confidence: avgScore * 0.8, // Slightly lower confidence since we couldn't use LLM
            shouldEscalate: false,
          }
        }
        
        // If we can't answer directly, re-throw the error
        throw llmError
      }

      // Check if response indicates "I don't know" or if it's an exam question that wasn't answered
      const responseText = llmResponse.text.toLowerCase()
      
      // If LLM says "I don't know" or if it's an exam question but the response doesn't contain the exam type or a date, try direct extraction
      if (responseText.includes("i don't know") || responseText.includes('not in the context') || responseText.includes('escalate') ||
          (isExamQuestion && !responseText.includes(lowerQuery.includes('final') ? 'final' : lowerQuery.includes('midterm') ? 'midterm' : 'exam') && !responseText.match(/\d{1,2}/))) {
        
        // Try direct extraction from chunks before escalating
        if (isExamQuestion && chunks.length > 0) {
          const isFinal = lowerQuery.includes('final')
          const isMidterm = lowerQuery.includes('midterm')
          const searchTerm = isFinal ? 'final' : isMidterm ? 'midterm' : 'exam'
          const searchTermIndex = context.toLowerCase().indexOf(searchTerm)
          
          if (searchTermIndex !== -1) {
            const surroundingText = context.substring(Math.max(0, searchTermIndex - 100), Math.min(context.length, searchTermIndex + 400))
            const sentences = surroundingText.split(/[.!?\n]/)
            const relevantSentence = sentences.find(s => 
              s.toLowerCase().includes(searchTerm) && 
              // Check for any date pattern (month name or number)
              (/(?:nov|november|oct|october|dec|december|jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september)/.test(s.toLowerCase()) ||
               /\d{1,2}(?:th|st|nd|rd)?/.test(s))
            )
            
            if (relevantSentence) {
              return {
                response: `Based on the syllabus: ${relevantSentence.trim()}.`,
                citations: generateCitations(chunks),
                confidence: avgScore,
                shouldEscalate: false,
              }
            }
          }
        }
        
        // If direct extraction also fails, escalate
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
      console.error('[Syllabus Agent] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        courseId,
        query,
      })
      
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
   * In mock mode, we still try to retrieve chunks and answer from them
   */
  private async processQueryMock(query: string, courseId: string): Promise<AgentResponse> {
    try {
      // Even in mock mode, try to retrieve actual chunks
      const chunks = await retrieveRelevantChunks(query, {
        courseId,
        contentType: 'policy',
        limit: 5,
        scoreThreshold: 0.5,
      })

      if (chunks.length > 0) {
        // We have chunks - try to extract answer from them
        const context = combineChunksIntoContext(chunks)
        const lowerQuery = query.toLowerCase()
        
        // Try to find specific information in chunks
        if (lowerQuery.includes('midterm') || lowerQuery.includes('final') || lowerQuery.includes('exam') || lowerQuery.includes('test')) {
          // Determine which exam type we're looking for
          const isFinal = lowerQuery.includes('final')
          const isMidterm = lowerQuery.includes('midterm')
          const searchTerm = isFinal ? 'final' : isMidterm ? 'midterm' : 'exam'
          const examType = isFinal ? 'final exam' : isMidterm ? 'midterm' : 'exam'
          
          const searchTermIndex = context.toLowerCase().indexOf(searchTerm)
          
          if (searchTermIndex !== -1) {
            // Found the exam type in context - extract surrounding text
            const surroundingText = context.substring(Math.max(0, searchTermIndex - 100), Math.min(context.length, searchTermIndex + 400))
            
            // Try to find date patterns in the surrounding text
            const datePatterns = [
              // Pattern: "Final Exam - December 12th" or "Midterm Exam - Week 7 (November 18th)"
              new RegExp(`${searchTerm}.*?(?:exam|test)?.*?(?:nov|november|oct|october|dec|december|jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september)\\s+(\\d{1,2})`, 'i'),
              // Pattern: "December 12th - Final Exam"
              new RegExp(`(?:nov|november|oct|october|dec|december|jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september)\\s+(\\d{1,2}).*?${searchTerm}`, 'i'),
              // Pattern: "Final Exam - December 12" (without "th")
              new RegExp(`${searchTerm}.*?(?:exam|test)?.*?-\\s*(?:nov|november|oct|october|dec|december|jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september)\\s+(\\d{1,2})`, 'i'),
            ]
            
            for (const pattern of datePatterns) {
              const match = surroundingText.match(pattern)
              if (match) {
                // Extract a clean sentence containing the match
                const matchIndex = surroundingText.indexOf(match[0])
                const sentenceStart = Math.max(0, surroundingText.lastIndexOf('.', matchIndex) + 1, surroundingText.lastIndexOf('\n', matchIndex) + 1)
                const sentenceEnd = Math.min(surroundingText.length, surroundingText.indexOf('.', matchIndex + match[0].length), surroundingText.indexOf('\n', matchIndex + match[0].length))
                const sentence = surroundingText.substring(sentenceStart, sentenceEnd > 0 ? sentenceEnd : surroundingText.length).trim()
                
                if (sentence) {
                  return {
                    response: `Based on the syllabus: ${sentence}.`,
                    citations: generateCitations(chunks),
                    confidence: 0.85,
                    shouldEscalate: false,
                  }
                }
              }
            }
            
            // If no date pattern found, extract the sentence containing the exam type
            const sentences = surroundingText.split(/[.!?\n]/)
            const relevantSentence = sentences.find(s => 
              s.toLowerCase().includes(searchTerm) && 
              // Check for any date pattern (month name or number)
              (/(?:nov|november|oct|october|dec|december|jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september)/.test(s.toLowerCase()) ||
               /\d{1,2}(?:th|st|nd|rd)?/.test(s))
            )
            if (relevantSentence) {
              return {
                response: `Based on the syllabus: ${relevantSentence.trim()}.`,
                citations: generateCitations(chunks),
                confidence: 0.85,
                shouldEscalate: false,
              }
            }
            
            // Fallback: return the first sentence with the exam type
            const firstSentence = sentences.find(s => s.toLowerCase().includes(searchTerm))
            if (firstSentence) {
    return {
                response: `Based on the syllabus: ${firstSentence.trim()}.`,
                citations: generateCitations(chunks),
      confidence: 0.85,
      shouldEscalate: false,
              }
            }
          }
        }
        
        // Generic response with context
        return {
          response: `Based on the course syllabus: ${context.substring(0, 500)}${context.length > 500 ? '...' : ''}`,
          citations: generateCitations(chunks),
          confidence: 0.85,
          shouldEscalate: false,
        }
      }
      
      // No chunks found - return generic mock response
      return {
        response: "I don't have enough information in the syllabus to answer this question. Your question has been escalated to the professor.",
        citations: [],
        confidence: 0.0,
        shouldEscalate: true,
      }
    } catch (error) {
      console.error('[Syllabus Agent] Error in mock mode:', error)
      // Fallback to simple mock response
      return {
        response: "I don't have enough information in the syllabus to answer this question. Your question has been escalated to the professor.",
        citations: [],
        confidence: 0.0,
        shouldEscalate: true,
      }
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

