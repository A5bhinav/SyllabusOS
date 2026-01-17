import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'

/**
 * Gemini AI Client for chat completions
 * Supports MOCK_MODE for development without API costs
 */

export type AgentRoute = 'POLICY' | 'CONCEPT' | 'ESCALATE'

export interface LLMResponse {
  text: string
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
}

/**
 * Get Gemini AI client instance
 * Returns null if MOCK_MODE is enabled or API key is missing
 */
export function getGeminiClient(): ChatGoogleGenerativeAI | null {
  const mockMode = process.env.MOCK_MODE === 'true'
  const apiKey = process.env.GOOGLE_GENAI_API_KEY

  if (mockMode) {
    console.log('[MOCK MODE] Gemini AI client disabled - using mock responses')
    return null
  }

  if (!apiKey || apiKey.trim() === '') {
    console.warn('[AI Client] GOOGLE_GENAI_API_KEY not set - enable MOCK_MODE=true for development')
    return null
  }

  try {
    const client = new ChatGoogleGenerativeAI({
      model: 'gemini-pro', // Using gemini-pro for chat completions
      apiKey: apiKey.trim(),
      temperature: 0.7,
      maxOutputTokens: 1024,
    })

    return client
  } catch (error) {
    console.error('[AI Client] Failed to create Gemini client:', error)
    throw new Error(`Failed to initialize Gemini AI client: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate a chat completion using Gemini
 * Returns mock response if MOCK_MODE is enabled
 */
export async function generateChatCompletion(
  prompt: string,
  systemPrompt?: string
): Promise<LLMResponse> {
  const mockMode = process.env.MOCK_MODE === 'true'
  const client = getGeminiClient()

  if (mockMode || !client) {
    // Return mock response
    return generateMockResponse(prompt, systemPrompt)
  }

  try {
    const messages = []
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt))
    }
    messages.push(new HumanMessage(prompt))

    const response = await client.invoke(messages)
    
    return {
      text: typeof response.content === 'string' ? response.content : String(response.content),
      usage: {
        // Gemini API doesn't always provide token counts in response
        // These would need to be calculated separately if needed
      },
    }
  } catch (error) {
    console.error('[AI Client] Failed to generate chat completion:', error)
    
    // If API call fails in non-mock mode, throw error
    // In mock mode, fall back to mock response
    if (mockMode) {
      console.warn('[AI Client] API call failed in mock mode, using mock response')
      return generateMockResponse(prompt, systemPrompt)
    }
    
    throw new Error(`Failed to generate chat completion: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate a mock response based on prompt content
 * Used when MOCK_MODE is enabled
 */
function generateMockResponse(
  prompt: string,
  systemPrompt?: string
): LLMResponse {
  const lowerPrompt = prompt.toLowerCase()

  // Mock response based on prompt content
  if (systemPrompt?.toLowerCase().includes('classify')) {
    // Classification prompt
    if (lowerPrompt.includes('midterm') || lowerPrompt.includes('deadline') || lowerPrompt.includes('due date')) {
      return { text: 'POLICY' }
    }
    if (lowerPrompt.includes('explain') || lowerPrompt.includes('how does') || lowerPrompt.includes('algorithm')) {
      return { text: 'CONCEPT' }
    }
    if (lowerPrompt.includes('sick') || lowerPrompt.includes('personal') || lowerPrompt.includes('emergency')) {
      return { text: 'ESCALATE' }
    }
    // Default to POLICY
    return { text: 'POLICY' }
  }

  // General chat response
  if (lowerPrompt.includes('policy') || lowerPrompt.includes('deadline') || lowerPrompt.includes('grading')) {
    return {
      text: 'Based on the course syllabus, here is the policy information you requested. Please refer to the citations for detailed information.',
    }
  }

  if (lowerPrompt.includes('explain') || lowerPrompt.includes('concept') || lowerPrompt.includes('algorithm')) {
    return {
      text: 'Here is an explanation of the concept you asked about. The syllabus contains detailed information on this topic.',
    }
  }

  // Default mock response
  return {
    text: 'I understand your question. Here is the relevant information from the course materials.',
  }
}

/**
 * Check if MOCK_MODE is enabled
 */
export function isMockMode(): boolean {
  return process.env.MOCK_MODE === 'true'
}

