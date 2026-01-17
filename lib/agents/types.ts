/**
 * Shared types for agent responses
 */

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

