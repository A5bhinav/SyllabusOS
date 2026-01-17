import { generateChatCompletion, isMockMode, type AgentRoute } from '../ai/client'
import { createClassificationChain } from '../ai/langchain-setup'

export interface RoutingDecision {
  route: AgentRoute
  confidence: number
  reason?: string
}

/**
 * AgentRouter classifies student queries into three categories:
 * - POLICY: Syllabus/policy questions → Syllabus Agent
 * - CONCEPT: Learning/concept questions → Concept Agent
 * - ESCALATE: Personal/complex issues → Escalation Handler
 */
export class AgentRouter {
  /**
   * Classify a query into one of three agent routes
   */
  async classifyQuery(query: string): Promise<RoutingDecision> {
    const mockMode = isMockMode()

    if (mockMode) {
      return this.classifyQueryMock(query)
    }

    try {
      // Use LLM-based classification
      const classificationPrompt = `Classify this student query into one of these categories:
- POLICY: Questions about course policies, deadlines, grading, attendance, exam dates, late submissions
- CONCEPT: Questions about course concepts, explanations, "how does X work", algorithms, theories
- ESCALATE: Personal situations, health issues, emergencies, complex issues that need professor attention

Query: "${query}"

Respond with ONLY the category name (POLICY, CONCEPT, or ESCALATE):`

      const response = await generateChatCompletion(classificationPrompt)

      // Parse response to get category
      const categoryText = response.text.trim().toUpperCase()
      let route: AgentRoute

      if (categoryText.includes('POLICY')) {
        route = 'POLICY'
      } else if (categoryText.includes('CONCEPT')) {
        route = 'CONCEPT'
      } else if (categoryText.includes('ESCALATE')) {
        route = 'ESCALATE'
      } else {
        // Default to POLICY if parsing fails
        console.warn(`[Router] Failed to parse classification: "${response.text}", defaulting to POLICY`)
        route = 'POLICY'
      }

      // Confidence based on response clarity
      const confidence = categoryText === route ? 0.9 : 0.7

      return {
        route,
        confidence,
        reason: `LLM classified as ${route}`,
      }
    } catch (error) {
      console.error('[Router] Classification error:', error)
      // Fallback to mock classification on error
      return this.classifyQueryMock(query)
    }
  }

  /**
   * Mock classification based on keyword matching
   * Used when MOCK_MODE is enabled
   */
  private classifyQueryMock(query: string): RoutingDecision {
    const lowerQuery = query.toLowerCase()

    // POLICY keywords
    const policyKeywords = [
      'deadline', 'due date', 'grading', 'late', 'attendance',
      'policy', 'exam date', 'midterm', 'final', 'assignment',
      'submission', 'late policy', 'makeup', 'extension'
    ]

    // CONCEPT keywords
    const conceptKeywords = [
      'explain', 'how does', 'what is', 'algorithm', 'concept',
      'theory', 'define', 'understand', 'learn', 'study',
      'data structure', 'recursion', 'how to', 'example'
    ]

    // ESCALATE keywords
    const escalateKeywords = [
      'sick', 'emergency', 'personal', 'family', 'illness',
      'death', 'hospital', 'can\'t attend', 'missed',
      'conflict', 'issue', 'problem', 'help', 'urgent'
    ]

    // Check for escalate keywords first (highest priority)
    for (const keyword of escalateKeywords) {
      if (lowerQuery.includes(keyword)) {
        return {
          route: 'ESCALATE',
          confidence: 0.9,
          reason: `Mock classification: contains escalate keyword "${keyword}"`,
        }
      }
    }

    // Check for policy keywords
    for (const keyword of policyKeywords) {
      if (lowerQuery.includes(keyword)) {
        return {
          route: 'POLICY',
          confidence: 0.85,
          reason: `Mock classification: contains policy keyword "${keyword}"`,
        }
      }
    }

    // Check for concept keywords
    for (const keyword of conceptKeywords) {
      if (lowerQuery.includes(keyword)) {
        return {
          route: 'CONCEPT',
          confidence: 0.85,
          reason: `Mock classification: contains concept keyword "${keyword}"`,
        }
      }
    }

    // Default to POLICY if no keywords match
    return {
      route: 'POLICY',
      confidence: 0.6,
      reason: 'Mock classification: default to POLICY (no keywords matched)',
    }
  }
}

/**
 * Create a singleton instance of AgentRouter
 */
let routerInstance: AgentRouter | null = null

export function getAgentRouter(): AgentRouter {
  if (!routerInstance) {
    routerInstance = new AgentRouter()
  }
  return routerInstance
}

