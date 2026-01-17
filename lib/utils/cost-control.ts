/**
 * Cost Control Utilities
 * Protects against excessive API usage and unexpected charges
 */

// Google Gemini API pricing (as of 2024)
// Embeddings: ~$0.0001 per 1K characters
// Chat: Varies by model, typically $0.00025-$0.002 per 1K tokens
const EMBEDDING_COST_PER_1K_CHARS = 0.0001 // $0.0001 per 1K characters
const CHAT_COST_PER_1K_TOKENS = 0.0005 // Estimated average

// Safety limits
export const MAX_CHUNKS_PER_UPLOAD = 200 // Maximum chunks to process in one upload
export const MAX_CHARACTERS_PER_UPLOAD = 500000 // ~500K characters max per upload
export const MAX_CHUNKS_WITHOUT_WARNING = 50 // Warn if more than this
export const BATCH_DELAY_MS = 100 // Delay between batches to avoid rate limits

/**
 * Estimate cost for embedding generation
 */
export function estimateEmbeddingCost(characterCount: number): number {
  return (characterCount / 1000) * EMBEDDING_COST_PER_1K_CHARS
}

/**
 * Estimate cost for chat completion (rough estimate)
 */
export function estimateChatCost(tokenCount: number): number {
  return (tokenCount / 1000) * CHAT_COST_PER_1K_TOKENS
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `~$${(cost * 100).toFixed(2)} cents`
  }
  return `~$${cost.toFixed(2)}`
}

/**
 * Check if upload exceeds safety limits
 */
export function validateUploadSize(
  chunkCount: number,
  totalCharacters: number
): { valid: boolean; error?: string; warning?: string } {
  if (chunkCount > MAX_CHUNKS_PER_UPLOAD) {
    return {
      valid: false,
      error: `Upload exceeds maximum limit of ${MAX_CHUNKS_PER_UPLOAD} chunks. Your PDF generated ${chunkCount} chunks. Please use a smaller PDF or split it into multiple uploads.`,
    }
  }

  if (totalCharacters > MAX_CHARACTERS_PER_UPLOAD) {
    return {
      valid: false,
      error: `Upload exceeds maximum limit of ${MAX_CHARACTERS_PER_UPLOAD.toLocaleString()} characters. Your PDF has ${totalCharacters.toLocaleString()} characters. Please use a smaller PDF.`,
    }
  }

  if (chunkCount > MAX_CHUNKS_WITHOUT_WARNING) {
    const estimatedCost = estimateEmbeddingCost(totalCharacters)
    return {
      valid: true,
      warning: `Large upload detected: ${chunkCount} chunks, ${totalCharacters.toLocaleString()} characters. Estimated cost: ${formatCost(estimatedCost)}. Processing...`,
    }
  }

  return { valid: true }
}

/**
 * Log API usage for cost tracking
 */
export function logApiUsage(
  operation: 'embedding' | 'chat',
  itemCount: number,
  characterOrTokenCount: number
) {
  const cost =
    operation === 'embedding'
      ? estimateEmbeddingCost(characterOrTokenCount)
      : estimateChatCost(characterOrTokenCount)

  console.log(
    `[Cost Control] ${operation.toUpperCase()}: ${itemCount} items, ` +
      `${characterOrTokenCount.toLocaleString()} ${operation === 'embedding' ? 'chars' : 'tokens'}, ` +
      `Estimated cost: ${formatCost(cost)}`
  )
}

/**
 * Add delay between batches to avoid rate limits
 */
export async function rateLimitDelay(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
}

