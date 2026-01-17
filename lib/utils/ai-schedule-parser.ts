import { generateChatCompletion, isMockMode } from '../ai/client'
import type { ScheduleEntry } from '@/types/api'

/**
 * AI-powered schedule parser for unstructured formats
 * Supports PDF, Word, HTML, and plain text schedule formats
 * 
 * This is a Phase 2+ enhancement - CSV/Excel parsing takes priority
 */

export interface ScheduleParseOptions {
  courseId: string
  weekStart?: number // Starting week number (default: 1)
}

export interface ScheduleParseResult {
  entries: ScheduleEntry[]
  warnings: string[]
  errors: string[]
}

/**
 * Parse schedule from unstructured text using AI
 * Extracts week number, topic, assignments, readings, and due dates
 */
export async function parseScheduleFromText(
  text: string,
  options: ScheduleParseOptions
): Promise<ScheduleParseResult> {
  const mockMode = isMockMode()

  if (mockMode) {
    return parseScheduleFromTextMock(text, options)
  }

  try {
    // Construct prompt for AI extraction
    const prompt = `Extract schedule information from the following text and return it as a JSON array.
Each entry should have:
- weekNumber: integer (week number)
- topic: string (topic or topic title)
- assignments: string or null (assignment description)
- readings: string or null (reading description)
- dueDate: string or null (due date in YYYY-MM-DD format, or null if not specified)

Text to parse:
${text}

Return ONLY a valid JSON array, no additional text. Format:
[
  {
    "weekNumber": 1,
    "topic": "Introduction to Course",
    "assignments": "Assignment 1: Read chapters 1-3",
    "readings": "Textbook pages 1-50",
    "dueDate": "2024-01-15"
  },
  ...
]`

    const response = await generateChatCompletion(prompt)
    
    // Parse JSON response
    let entries: ScheduleEntry[]
    try {
      // Extract JSON from response (handle cases where response includes markdown code blocks)
      let jsonText = response.text.trim()
      
      // Remove markdown code blocks if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.slice(7)
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.slice(3)
      }
      if (jsonText.endsWith('```')) {
        jsonText = jsonText.slice(0, -3)
      }
      
      jsonText = jsonText.trim()
      
      entries = JSON.parse(jsonText) as ScheduleEntry[]
    } catch (parseError) {
      console.error('[AI Schedule Parser] JSON parse error:', parseError)
      return {
        entries: [],
        warnings: [],
        errors: [`Failed to parse AI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`],
      }
    }

    // Validate entries
    const validatedEntries: ScheduleEntry[] = []
    const warnings: string[] = []
    const errors: string[] = []

    for (const entry of entries) {
      // Validate required fields
      if (!entry.weekNumber || typeof entry.weekNumber !== 'number') {
        errors.push(`Invalid entry: missing or invalid weekNumber`)
        continue
      }

      if (!entry.topic || typeof entry.topic !== 'string' || entry.topic.trim().length === 0) {
        errors.push(`Invalid entry for week ${entry.weekNumber}: missing topic`)
        continue
      }

      // Validate optional fields
      if (entry.assignments && typeof entry.assignments !== 'string') {
        warnings.push(`Week ${entry.weekNumber}: assignments is not a string, setting to null`)
        entry.assignments = null
      }

      if (entry.readings && typeof entry.readings !== 'string') {
        warnings.push(`Week ${entry.weekNumber}: readings is not a string, setting to null`)
        entry.readings = null
      }

      if (entry.dueDate && typeof entry.dueDate !== 'string') {
        warnings.push(`Week ${entry.weekNumber}: dueDate is not a string, setting to null`)
        entry.dueDate = null
      }

      // Validate date format
      if (entry.dueDate) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(entry.dueDate)) {
          warnings.push(`Week ${entry.weekNumber}: invalid date format "${entry.dueDate}", setting to null`)
          entry.dueDate = null
        }
      }

      validatedEntries.push({
        weekNumber: entry.weekNumber,
        topic: entry.topic.trim(),
        assignments: entry.assignments?.trim() || null,
        readings: entry.readings?.trim() || null,
        dueDate: entry.dueDate || null,
      })
    }

    if (errors.length > 0) {
      return {
        entries: validatedEntries,
        warnings,
        errors,
      }
    }

    return {
      entries: validatedEntries,
      warnings,
      errors: [],
    }
  } catch (error) {
    console.error('[AI Schedule Parser] Error:', error)
    return {
      entries: [],
      warnings: [],
      errors: [`Failed to parse schedule: ${error instanceof Error ? error.message : 'Unknown error'}`],
    }
  }
}

/**
 * Mock parser for development
 * Used when MOCK_MODE is enabled
 */
function parseScheduleFromTextMock(
  text: string,
  options: ScheduleParseOptions
): ScheduleParseResult {
  // Extract week numbers and topics from text using simple pattern matching
  const weekRegex = /week\s+(\d+)/gi
  const matches = Array.from(text.matchAll(weekRegex))
  
  const entries: ScheduleEntry[] = []
  const warnings: string[] = []
  
  if (matches.length === 0) {
    // If no week numbers found, generate mock entries
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      entries.push({
        weekNumber: i + 1,
        topic: lines[i] || `Week ${i + 1} Topic`,
        assignments: i % 2 === 0 ? `Assignment ${i + 1}` : null,
        readings: i % 3 === 0 ? `Reading ${i + 1}` : null,
        dueDate: i % 2 === 0 ? `2024-01-${15 + i}` : null,
      })
    }
    
    warnings.push('No week numbers found in text, generated mock entries')
  } else {
    // Extract entries from matches
    for (const match of matches) {
      const weekNumber = parseInt(match[1], 10)
      const topicMatch = text.substring(match.index || 0, (match.index || 0) + 200).match(/:?\s*(.+?)(?:\n|$)/i)
      const topic = topicMatch ? topicMatch[1].trim() : `Week ${weekNumber} Topic`
      
      entries.push({
        weekNumber,
        topic,
        assignments: weekNumber % 2 === 0 ? `Assignment ${weekNumber}` : null,
        readings: weekNumber % 3 === 0 ? `Reading ${weekNumber}` : null,
        dueDate: weekNumber % 2 === 0 ? `2024-01-${15 + weekNumber}` : null,
      })
    }
  }

  return {
    entries,
    warnings,
    errors: [],
  }
}

/**
 * Parse schedule from HTML content
 * Extracts text from HTML and passes to parseScheduleFromText
 */
export async function parseScheduleFromHTML(
  html: string,
  options: ScheduleParseOptions
): Promise<ScheduleParseResult> {
  // Simple HTML text extraction (remove tags)
  // For production, consider using a proper HTML parser like cheerio
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
    .replace(/<[^>]+>/g, ' ') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()

  return parseScheduleFromText(text, options)
}

