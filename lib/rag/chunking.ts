const pdfParse = require('pdf-parse')
import type { CourseContent } from '../../types/database'

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
    const data = await pdfParse(pdfBuffer)
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
 * Process PDF and create chunks with metadata
 */
export async function processPDF(
  pdfBuffer: Buffer,
  courseId: string,
  options?: {
    weekNumber?: number
    topic?: string
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
    // Chunk the page text
    const pageChunks = chunkText(page.text)
    
    // Create chunk entries with metadata
    for (const chunkContent of pageChunks as string[]) {
      // Categorize chunk
      const contentType = categorizeChunk(chunkContent)
      
      chunks.push({
        content: chunkContent,
        pageNumber: page.page,
        weekNumber: options?.weekNumber ?? null,
        topic: options?.topic ?? null,
        contentType,
        metadata: {
          courseId,
          pageNumber: page.page,
          weekNumber: options?.weekNumber,
          topic: options?.topic,
          contentType,
        },
      })
    }
  }
  
  return chunks
}

