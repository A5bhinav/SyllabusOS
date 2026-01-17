/**
 * LangChain setup and configuration
 * This file provides additional LangChain utilities if needed
 */

import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'

/**
 * Create a prompt template for agent classification
 */
export function createClassificationPrompt() {
  return ChatPromptTemplate.fromMessages([
    ['system', `You are a query classifier for a course management system. 
Classify student queries into one of three categories:
- POLICY: Questions about course policies, deadlines, grading, attendance, exam dates, late submissions
- CONCEPT: Questions about course concepts, explanations, "how does X work", algorithms, theories
- ESCALATE: Personal situations, health issues, emergencies, complex issues that need professor attention

Respond with ONLY the category name (POLICY, CONCEPT, or ESCALATE).`],
    ['human', '{query}'],
  ])
}

/**
 * Create a prompt template for generating responses with context
 */
export function createResponsePrompt(agentType: 'POLICY' | 'CONCEPT') {
  const agentInstructions = agentType === 'POLICY'
    ? `You are a helpful course assistant answering questions about course policies, deadlines, and administrative matters.
    Provide clear, concise answers based on the course syllabus.
    Always cite your sources using page numbers when available.
    If you are not confident in your answer or the information is not in the provided context, respond with "I don't know" and escalate to the professor.`
    : `You are a helpful course assistant explaining course concepts and answering learning-related questions.
    Provide clear, educational explanations based on the course materials.
    Always cite your sources using page numbers or week numbers when available.
    If you are not confident in your answer or the information is not in the provided context, respond with "I don't know" and escalate to the professor.`

  return ChatPromptTemplate.fromMessages([
    ['system', agentInstructions],
    ['system', 'Use the following context from the course materials to answer the question:\n\n{context}'],
    ['human', '{query}'],
  ])
}

/**
 * Create a LangChain chain for classification
 * Returns null if MOCK_MODE is enabled
 */
export function createClassificationChain() {
  const mockMode = process.env.MOCK_MODE === 'true'
  const apiKey = process.env.GOOGLE_GENAI_API_KEY

  if (mockMode || !apiKey) {
    return null
  }

  try {
    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-pro',
      apiKey: apiKey.trim(),
      temperature: 0.1, // Low temperature for consistent classification
      maxOutputTokens: 10, // Only need category name
    })

    const prompt = createClassificationPrompt()
    
    return RunnableSequence.from([
      prompt,
      model,
    ])
  } catch (error) {
    console.error('[LangChain Setup] Failed to create classification chain:', error)
    return null
  }
}

/**
 * Create a LangChain chain for generating responses
 * Returns null if MOCK_MODE is enabled
 */
export function createResponseChain(agentType: 'POLICY' | 'CONCEPT') {
  const mockMode = process.env.MOCK_MODE === 'true'
  const apiKey = process.env.GOOGLE_GENAI_API_KEY

  if (mockMode || !apiKey) {
    return null
  }

  try {
    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-pro',
      apiKey: apiKey.trim(),
      temperature: 0.7,
      maxOutputTokens: 1024,
    })

    const prompt = createResponsePrompt(agentType)
    
    return RunnableSequence.from([
      prompt,
      model,
    ])
  } catch (error) {
    console.error('[LangChain Setup] Failed to create response chain:', error)
    return null
  }
}

