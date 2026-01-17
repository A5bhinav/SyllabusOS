/**
 * AI module exports
 * Centralized exports for AI-related functionality
 */

export { getGeminiClient, generateChatCompletion, isMockMode } from './client'
export type { AgentRoute, LLMResponse } from './client'

export { 
  createClassificationPrompt, 
  createResponsePrompt, 
  createClassificationChain, 
  createResponseChain 
} from './langchain-setup'

