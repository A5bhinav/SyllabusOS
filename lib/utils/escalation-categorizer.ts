/**
 * Escalation Categorizer
 * Automatically categorizes escalation queries to help professors prioritize
 */

export type EscalationCategory = 
  | 'Extension Request'
  | 'Grade Dispute'
  | 'Personal Issue'
  | 'Technical Problem'
  | 'Other'

export interface CategorizationResult {
  category: EscalationCategory
  confidence: number // 0-1, where 1 is highest confidence
}

/**
 * Keyword patterns for each category
 * These are case-insensitive and match partial words
 */
const CATEGORY_KEYWORDS: Record<EscalationCategory, string[]> = {
  'Extension Request': [
    'extension',
    'extend',
    'deadline',
    'due date',
    'late',
    'submit',
    'submission',
    'turn in',
    'more time',
    'extra time',
    'need more',
    'can\'t finish',
    'won\'t be able',
    'unable to complete',
    'miss the deadline',
    'after the due date',
  ],
  'Grade Dispute': [
    'grade',
    'grading',
    'score',
    'points',
    'marked',
    'incorrect',
    'wrong',
    'dispute',
    'appeal',
    'disagree',
    'unfair',
    'mistake',
    'error',
    'regrade',
    'reconsider',
    'review my grade',
  ],
  'Personal Issue': [
    'personal',
    'family',
    'emergency',
    'sick',
    'illness',
    'health',
    'medical',
    'hospital',
    'death',
    'bereavement',
    'grief',
    'mental health',
    'anxiety',
    'depression',
    'stress',
    'crisis',
    'difficult',
    'struggling',
    'help',
    'support',
  ],
  'Technical Problem': [
    'technical',
    'technology',
    'computer',
    'laptop',
    'internet',
    'connection',
    'wifi',
    'network',
    'website',
    'platform',
    'system',
    'bug',
    'error',
    'not working',
    'broken',
    'crash',
    'freeze',
    'access',
    'login',
    'password',
    'upload',
    'download',
    'file',
    'software',
    'hardware',
  ],
  'Other': [], // Catch-all category
}

/**
 * Categorize an escalation query
 * Uses keyword matching to determine the most likely category
 * 
 * @param query - The escalation query text
 * @returns Categorization result with category and confidence score
 */
export function categorizeEscalation(query: string): CategorizationResult {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return {
      category: 'Other',
      confidence: 0,
    }
  }

  const normalizedQuery = query.toLowerCase().trim()
  
  // Count matches for each category
  const categoryScores: Record<EscalationCategory, number> = {
    'Extension Request': 0,
    'Grade Dispute': 0,
    'Personal Issue': 0,
    'Technical Problem': 0,
    'Other': 0,
  }

  // Score each category based on keyword matches
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'Other') continue // Skip Other category
    
    for (const keyword of keywords) {
      // Check if keyword appears in the query
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        categoryScores[category as EscalationCategory]++
      }
    }
  }

  // Find the category with the highest score
  let maxScore = 0
  let bestCategory: EscalationCategory = 'Other'
  
  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > maxScore) {
      maxScore = score
      bestCategory = category as EscalationCategory
    }
  }

  // Calculate confidence based on:
  // 1. How many keywords matched (more = higher confidence)
  // 2. Whether there's a clear winner (if multiple categories have same score, lower confidence)
  const totalMatches = Object.values(categoryScores).reduce((sum, score) => sum + score, 0)
  
  let confidence = 0
  if (totalMatches === 0) {
    // No keywords matched, default to Other with low confidence
    confidence = 0.3
  } else if (maxScore === 0) {
    // Should not happen, but handle gracefully
    confidence = 0.3
  } else {
    // Check if there's a clear winner
    const sortedScores = Object.values(categoryScores).sort((a, b) => b - a)
    const isClearWinner = sortedScores[0] > sortedScores[1]
    
    if (isClearWinner) {
      // Clear winner: confidence based on number of matches
      confidence = Math.min(0.7 + (maxScore * 0.1), 0.95)
    } else {
      // Tie or close scores: lower confidence
      confidence = Math.min(0.5 + (maxScore * 0.05), 0.7)
    }
  }

  return {
    category: bestCategory,
    confidence: Math.round(confidence * 100) / 100, // Round to 2 decimal places
  }
}

/**
 * Get category color for UI display
 * Used by frontend to display color-coded badges
 */
export function getCategoryColor(category: EscalationCategory): string {
  const colors: Record<EscalationCategory, string> = {
    'Extension Request': 'blue',
    'Grade Dispute': 'red',
    'Personal Issue': 'yellow',
    'Technical Problem': 'green',
    'Other': 'gray',
  }
  return colors[category]
}

