import type { CourseContent } from '../../types/database'

// Use require for pdf-parse to avoid webpack ES module issues
// pdf-parse v2.x is now a class-based API (not a function like v1)
let PDFParseClass: any = null

function getPdfParseClass() {
  if (!PDFParseClass) {
    // Use eval to prevent webpack from trying to bundle this
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParseModule = eval('require')('pdf-parse')
    
    // pdf-parse 2.x exports PDFParse as a class
    // Get the class from the module
    if (pdfParseModule?.PDFParse && typeof pdfParseModule.PDFParse === 'function') {
      PDFParseClass = pdfParseModule.PDFParse
    } else if (typeof pdfParseModule === 'function') {
      // Fallback: module might export class directly
      PDFParseClass = pdfParseModule
    } else {
      console.error('pdf-parse module structure:', {
        type: typeof pdfParseModule,
        keys: Object.keys(pdfParseModule || {}).slice(0, 10),
        hasPDFParse: 'PDFParse' in (pdfParseModule || {})
      })
      throw new Error(`pdf-parse module did not export PDFParse class. Got type: ${typeof pdfParseModule}`)
    }
  }
  return PDFParseClass
}

// Parse PDF buffer using pdf-parse v2.x class-based API
async function parsePDFBuffer(pdfBuffer: Buffer): Promise<{ text: string; numpages?: number }> {
  const PDFParse = getPdfParseClass()
  
  // Create instance with buffer data
  const parser = new PDFParse({ data: pdfBuffer })
  
  // Get text from PDF using the new API
  const result = await parser.getText()
  
  return {
    text: result.text,
    numpages: result.total
  }
}

/**
 * Extract course name using pattern matching (fast, free)
 */
async function extractCourseNamePattern(pdfBuffer: Buffer): Promise<string | null> {
  try {
    const data = await parsePDFBuffer(pdfBuffer)
    const firstPageText = data.text.split('\f')[0] || data.text // First page or all text
    
    // Get first 20 lines (usually contains course info)
    const lines = firstPageText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .slice(0, 20)
    
    // Pattern 1: "Course Name: ..." or "Course: ..." or "Course Title: ..."
    for (const line of lines) {
      const courseMatch = line.match(/(?:course\s*(?:name|title|code)?:?\s*)([A-Z0-9\s\-:&,]+(?:[A-Za-z][A-Za-z0-9\s\-:&,]*)?)/i)
      if (courseMatch && courseMatch[1]) {
        const extracted = courseMatch[1].trim()
        if (extracted.length > 3 && extracted.length < 100) {
          return extracted
        }
      }
    }
    
    // Pattern 2: Title-like line (all caps or title case, reasonable length)
    for (const line of lines.slice(0, 5)) { // Check first 5 lines more carefully
      if (line.length > 5 && line.length < 100) {
        // Skip common non-course-name lines
        if (
          line.toLowerCase().includes('syllabus') ||
          line.toLowerCase().includes('instructor') ||
          line.toLowerCase().includes('office hours') ||
          line.toLowerCase().includes('email') ||
          line.toLowerCase().includes('phone') ||
          line.match(/^\d{4}/) // Starts with year
        ) {
          continue
        }
        
        // Check if it looks like a course name
        const isTitleCase = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*/.test(line)
        const isAllCaps = /^[A-Z\s0-9\-:&,]+$/.test(line) && line.length < 60
        const hasCourseCode = /[A-Z]{2,}\s*\d{3,4}/.test(line) // e.g., "CS 101" or "MATH 200"
        
        if ((isTitleCase || isAllCaps || hasCourseCode) && line.length > 5) {
          return line
        }
      }
    }
    
    // Pattern 3: First substantial line that's not a header
    for (const line of lines) {
      if (
        line.length > 10 &&
        line.length < 100 &&
        !line.toLowerCase().includes('syllabus') &&
        !line.toLowerCase().includes('instructor') &&
        !line.match(/^\d{4}/) // Doesn't start with year
      ) {
        return line
      }
    }
    
    return null
  } catch (error) {
    console.error('[Course Name Extraction] Pattern matching error:', error)
    return null
  }
}

/**
 * Extract course name using AI (more accurate, costs money)
 */
async function extractCourseNameWithAI(pdfBuffer: Buffer): Promise<string | null> {
  try {
    const data = await parsePDFBuffer(pdfBuffer)
    const firstPageText = data.text.substring(0, 2000) // First 2000 chars
    
    const { generateChatCompletion } = await import('../ai/client')
    
    const prompt = `Extract the course name from this syllabus text. Return ONLY the course name (e.g., "CS 101 - Introduction to Computer Science" or "MATH 200 - Calculus I"). 
    
If you cannot find a clear course name, return exactly "New Course".

Syllabus text:
${firstPageText}

Course name:`
    
    const response = await generateChatCompletion(prompt)
    const extractedName = response.text.trim()
    
    // Validate the AI response
    if (extractedName && extractedName !== 'New Course' && extractedName.length > 3 && extractedName.length < 150) {
      return extractedName
    }
    
    return null
  } catch (error) {
    console.error('[Course Name Extraction] AI extraction error:', error)
    return null
  }
}

/**
 * Extract course name from PDF using combined approach:
 * 1. Try pattern matching (fast, free)
 * 2. Fall back to AI extraction (if not in MOCK_MODE)
 * 3. Default to "New Course" if both fail
 */
export async function extractCourseName(pdfBuffer: Buffer): Promise<string> {
  try {
    // Step 1: Try pattern matching (fast, free)
    const patternResult = await extractCourseNamePattern(pdfBuffer)
    if (patternResult && patternResult.length > 3) {
      console.log('[Course Name Extraction] Extracted via pattern matching:', patternResult)
      return patternResult
    }
    
    // Step 2: If pattern matching failed, try AI (slower, costs money)
    const mockMode = process.env.MOCK_MODE === 'true'
    if (!mockMode) {
      console.log('[Course Name Extraction] Pattern matching failed, trying AI extraction...')
      const aiResult = await extractCourseNameWithAI(pdfBuffer)
      if (aiResult && aiResult !== 'New Course' && aiResult.length > 3) {
        console.log('[Course Name Extraction] Extracted via AI:', aiResult)
        return aiResult
      }
    } else {
      console.log('[Course Name Extraction] MOCK_MODE enabled, skipping AI extraction')
    }
    
    // Step 3: Fallback to default
    console.log('[Course Name Extraction] Using default name: New Course')
    return 'New Course'
  } catch (error) {
    console.error('[Course Name Extraction] Error:', error)
    return 'New Course'
  }
}

/**
 * Extract week number and topic from text using pattern matching
 * Looks for patterns like "Week 1:", "Week 1 - Topic Name", etc.
 */
export function extractWeekAndTopic(text: string): { weekNumber: number | null; topic: string | null } {
  const lowerText = text.toLowerCase()
  
  // Pattern 1: "Week X:" or "Week X -" or "Week X:" followed by topic
  const weekPattern1 = /week\s+(\d+)[\s:–\-]*(.+?)(?:\n|$)/gi
  let match = weekPattern1.exec(text)
  
  if (match) {
    const weekNumber = parseInt(match[1], 10)
    const topicText = match[2]?.trim()
    
    if (!isNaN(weekNumber) && weekNumber > 0 && weekNumber <= 52) {
      // Try to extract just the topic (stop at common delimiters)
      const topic = topicText
        ?.split(/[\n\r,;]/)[0] // Take first line or segment
        .trim()
        .replace(/^[:\-–—\s]+/, '') // Remove leading punctuation
        .replace(/[:\-–—\s]+$/, '') // Remove trailing punctuation
        .substring(0, 200) // Limit length
      
      if (topic && topic.length > 2) {
        return { weekNumber, topic }
      }
      
      return { weekNumber, topic: null }
    }
  }
  
  // Pattern 2: "Week X" at start of line, topic on next line
  const weekPattern2 = /^week\s+(\d+)$/gim
  match = weekPattern2.exec(text)
  
  if (match) {
    const weekNumber = parseInt(match[1], 10)
    if (!isNaN(weekNumber) && weekNumber > 0 && weekNumber <= 52) {
      // Look for topic in the next few lines
      const lines = text.split('\n')
      const weekLineIndex = lines.findIndex((line, idx) => 
        line.toLowerCase().includes(`week ${weekNumber}`)
      )
      
      if (weekLineIndex >= 0 && weekLineIndex < lines.length - 1) {
        // Check next few lines for topic
        for (let i = weekLineIndex + 1; i < Math.min(weekLineIndex + 5, lines.length); i++) {
          const potentialTopic = lines[i]?.trim()
          if (potentialTopic && potentialTopic.length > 5 && potentialTopic.length < 200) {
            // Skip lines that look like headers or metadata
            if (
              !potentialTopic.toLowerCase().includes('assignment') &&
              !potentialTopic.toLowerCase().includes('reading') &&
              !potentialTopic.toLowerCase().includes('due date') &&
              !potentialTopic.match(/^\d+\/\d+\/\d+$/) // Skip dates
            ) {
              return { weekNumber, topic: potentialTopic }
            }
          }
        }
      }
      
      return { weekNumber, topic: null }
    }
  }
  
  // Pattern 3: Just a number at the start that might be a week number
  const numberPattern = /^(\d+)[\s\.:–\-]*(.+?)(?:\n|$)/m
  match = numberPattern.exec(text.substring(0, 200)) // Only check first 200 chars
  
  if (match) {
    const potentialWeek = parseInt(match[1], 10)
    const topicText = match[2]?.trim()
    
    // Only consider it a week if it's a reasonable week number
    if (!isNaN(potentialWeek) && potentialWeek > 0 && potentialWeek <= 20 && topicText && topicText.length > 5) {
      const topic = topicText
        .split(/[\n\r,;]/)[0]
        .trim()
        .replace(/^[:\-–—\s]+/, '')
        .substring(0, 200)
      
      if (topic && topic.length > 2) {
        return { weekNumber: potentialWeek, topic }
      }
    }
  }
  
  return { weekNumber: null, topic: null }
}

/**
 * Content type categorization based on keyword analysis
 */
export function categorizeChunk(content: string): 'policy' | 'concept' {
  const lowerContent = content.toLowerCase()
  
  // Policy keywords
  const policyKeywords = [
    'deadline', 'grading', 'late', 'attendance', 'policy', 'exam date',
    'due date', 'submission', 'penalty', 'extension', 'absence', 'missed',
    'grade', 'points', 'percentage', 'rubric', 'cheating', 'academic integrity',
    'syllabus', 'course policy', 'late work', 'makeup', 'retake', 'drop date',
    'withdrawal', 'office hours', 'email policy', 'communication policy'
  ]
  
  // Concept keywords
  const conceptKeywords = [
    'explain', 'algorithm', 'data structure', 'recursion', 'how does', 'what is',
    'concept', 'definition', 'example', 'understand', 'learn', 'teach', 'demonstrate',
    'theory', 'principle', 'method', 'technique', 'approach', 'implementation',
    'analysis', 'design', 'pattern', 'optimization', 'complexity', 'efficiency'
  ]
  
  let policyScore = 0
  let conceptScore = 0
  
  // Count keyword matches
  for (const keyword of policyKeywords) {
    if (lowerContent.includes(keyword)) {
      policyScore++
    }
  }
  
  for (const keyword of conceptKeywords) {
    if (lowerContent.includes(keyword)) {
      conceptScore++
    }
  }
  
  // If policy score is higher or equal, categorize as policy
  // Otherwise, categorize as concept
  return policyScore >= conceptScore ? 'policy' : 'concept'
}

/**
 * Parse PDF and extract text with page numbers
 */
export async function parsePDF(pdfBuffer: Buffer): Promise<Array<{ text: string; page: number }>> {
  try {
    const data = await parsePDFBuffer(pdfBuffer)
    const pages: Array<{ text: string; page: number }> = []
    
    // pdf-parse returns text with page breaks marked
    // For now, we'll treat the entire document as one text
    // You can enhance this to split by actual pages if needed
    pages.push({
      text: data.text,
      page: 1, // Default page number
    })
    
    // If pdf-parse provides page-specific text, use that
    if (data.numpages && data.numpages > 1) {
      // Note: pdf-parse doesn't provide per-page text by default
      // You might need to use a different library or enhancement
      // For now, we'll split the text roughly by page count
      const textPerPage = Math.ceil(data.text.length / data.numpages)
      pages.length = 0 // Clear the single page entry
      
      for (let i = 0; i < data.numpages; i++) {
        const start = i * textPerPage
        const end = Math.min((i + 1) * textPerPage, data.text.length)
        pages.push({
          text: data.text.substring(start, end),
          page: i + 1,
        })
      }
    }
    
    return pages
  } catch (error) {
    console.error('Error parsing PDF:', error)
    throw new Error('Failed to parse PDF file')
  }
}

/**
 * Chunk text into smaller pieces with overlap
 * Simple implementation that splits on paragraph boundaries, then sentences, then words
 */
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  chunkOverlap: number = 200
): string[] {
  const chunks: string[] = []
  
  // Split by paragraphs first (double newline)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim()
    
    // If adding this paragraph would exceed chunk size, save current chunk and start new one
    if (currentChunk.length > 0 && (currentChunk.length + trimmedParagraph.length) > chunkSize) {
      chunks.push(currentChunk.trim())
      
      // Add overlap: take last chunkOverlap characters from current chunk
      if (currentChunk.length > chunkOverlap) {
        currentChunk = currentChunk.slice(-chunkOverlap) + ' ' + trimmedParagraph
      } else {
        currentChunk = trimmedParagraph
      }
    } else {
      // Add paragraph to current chunk
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + trimmedParagraph
      } else {
        currentChunk = trimmedParagraph
      }
    }
    
    // If current chunk is already large enough, split it further
    if (currentChunk.length > chunkSize) {
      // Split by sentences
      const sentences = currentChunk.split(/(?<=[.!?])\s+/)
      let sentenceChunk = ''
      
      for (const sentence of sentences) {
        if (sentenceChunk.length > 0 && (sentenceChunk.length + sentence.length) > chunkSize) {
          chunks.push(sentenceChunk.trim())
          sentenceChunk = sentence
        } else {
          sentenceChunk += (sentenceChunk ? ' ' : '') + sentence
        }
      }
      
      currentChunk = sentenceChunk
    }
  }
  
  // Add remaining chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }
  
  // If no chunks were created (text is shorter than chunk size), return it as is
  return chunks.length > 0 ? chunks : [text.trim()]
}

/**
 * Match chunk to schedule entry based on topic similarity
 */
function matchChunkToSchedule(
  chunkContent: string,
  scheduleEntries: Array<{ weekNumber: number; topic: string }>
): { weekNumber: number | null; topic: string | null } {
  const lowerContent = chunkContent.toLowerCase()
  
  // Try to find matching schedule entry by topic
  for (const entry of scheduleEntries) {
    const lowerTopic = entry.topic.toLowerCase()
    
    // Check if chunk content mentions the topic
    // Look for topic keywords in chunk content
    const topicWords = lowerTopic.split(/\s+/).filter(w => w.length > 3) // Words longer than 3 chars
    
    if (topicWords.length === 0) continue
    
    // Count how many topic words appear in chunk
    let matchCount = 0
    for (const word of topicWords) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (regex.test(lowerContent)) {
        matchCount++
      }
    }
    
    // If at least 2 words match, or if topic is short and all words match, consider it a match
    const matchThreshold = topicWords.length <= 2 ? topicWords.length : Math.max(2, Math.ceil(topicWords.length * 0.5))
    
    if (matchCount >= matchThreshold) {
      return { weekNumber: entry.weekNumber, topic: entry.topic }
    }
  }
  
  return { weekNumber: null, topic: null }
}

/**
 * Process PDF and create chunks with metadata
 */
export async function processPDF(
  pdfBuffer: Buffer,
  courseId: string,
  options?: {
    weekNumber?: number
    topic?: string
    scheduleEntries?: Array<{ weekNumber: number; topic: string }> // Optional schedule entries for matching
  }
): Promise<Array<{
  content: string
  pageNumber: number | null
  weekNumber: number | null
  topic: string | null
  contentType: 'policy' | 'concept'
  metadata: Record<string, any>
}>> {
  // Parse PDF
  const pages = await parsePDF(pdfBuffer)
  
  const chunks: Array<{
    content: string
    pageNumber: number | null
    weekNumber: number | null
    topic: string | null
    contentType: 'policy' | 'concept'
    metadata: Record<string, any>
  }> = []
  
  // Process each page
  for (const page of pages) {
    // Skip empty pages
    if (!page.text || page.text.trim().length === 0) {
      console.warn(`Skipping empty page ${page.page}`)
      continue
    }
    
    // Chunk the page text
    const pageChunks = chunkText(page.text)
    
    // Create chunk entries with metadata
    for (const chunkContent of pageChunks as string[]) {
      // Skip empty chunks
      if (!chunkContent || chunkContent.trim().length === 0) {
        console.warn(`Skipping empty chunk on page ${page.page}`)
        continue
      }
      
      // Categorize chunk
      const contentType = categorizeChunk(chunkContent)
      
      // Try to extract week number and topic from chunk content
      // Priority: 1. Options provided, 2. Schedule matching, 3. Content extraction
      let weekNumber: number | null = options?.weekNumber ?? null
      let topic: string | null = options?.topic ?? null
      
      // If not provided in options, try to match to schedule entries
      if ((!weekNumber || !topic) && options?.scheduleEntries && options.scheduleEntries.length > 0) {
        const scheduleMatch = matchChunkToSchedule(chunkContent, options.scheduleEntries)
        if (!weekNumber && scheduleMatch.weekNumber) {
          weekNumber = scheduleMatch.weekNumber
        }
        if (!topic && scheduleMatch.topic) {
          topic = scheduleMatch.topic
        }
      }
      
      // If still not found, try to extract from chunk content
      if (!weekNumber || !topic) {
        const extracted = extractWeekAndTopic(chunkContent)
        // Only use extracted values if not already found
        if (!weekNumber && extracted.weekNumber) {
          weekNumber = extracted.weekNumber
        }
        if (!topic && extracted.topic) {
          topic = extracted.topic
        }
      }
      
      chunks.push({
        content: chunkContent.trim(), // Ensure trimmed content
        pageNumber: page.page,
        weekNumber,
        topic,
        contentType,
        metadata: {
          courseId,
          pageNumber: page.page,
          weekNumber,
          topic,
          contentType,
        },
      })
    }
  }
  
  // Validate we have at least one chunk
  if (chunks.length === 0) {
    throw new Error('No valid chunks were created from the PDF. The PDF may be empty or contain only images.')
  }
  
  return chunks
}

