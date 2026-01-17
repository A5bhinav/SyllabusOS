import { getSupabaseClient, getEmbeddings } from './vector-store'

export interface RetrievalOptions {
  courseId: string
  contentType?: 'policy' | 'concept'
  limit?: number
  scoreThreshold?: number
}

export interface RetrievedChunk {
  content: string
  pageNumber?: number
  weekNumber?: number
  topic?: string
  contentType: 'policy' | 'concept'
  score: number
  metadata: Record<string, any>
}

/**
 * Retrieve relevant chunks from vector store based on query
 */
export async function retrieveRelevantChunks(
  query: string,
  options: RetrievalOptions
): Promise<RetrievedChunk[]> {
  try {
    const supabaseClient = getSupabaseClient()
    const embeddings = getEmbeddings()
    const limit = options.limit ?? 5
    
    // Generate embedding for the query
    const queryEmbedding = await embeddings.embedQuery(query)
    
    // Use Supabase RPC function for vector similarity search
    const { data, error } = await supabaseClient.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: limit * 2, // Get more results to filter by threshold
      filter_course_id: options.courseId,
      filter_content_type: options.contentType || null,
    })
    
    if (error) {
      // Fallback: if RPC function doesn't exist, log warning and return empty
      console.warn('Vector search RPC function not available, falling back to simple query:', error.message)
      
      // Fallback query (without vector search)
      let queryBuilder = supabaseClient
        .from('course_content')
        .select('id, content, page_number, week_number, topic, content_type, metadata')
        .eq('course_id', options.courseId)
        .limit(limit)
      
      if (options.contentType) {
        queryBuilder = queryBuilder.eq('content_type', options.contentType)
      }
      
      const { data: fallbackData, error: fallbackError } = await queryBuilder
      
      if (fallbackError || !fallbackData) {
        throw new Error(`Failed to query database: ${fallbackError?.message || 'Unknown error'}`)
      }
      
      // Return fallback results without similarity scores
      return fallbackData.map((chunk: any) => ({
        content: chunk.content,
        pageNumber: chunk.page_number ?? undefined,
        weekNumber: chunk.week_number ?? undefined,
        topic: chunk.topic ?? undefined,
        contentType: (chunk.content_type as 'policy' | 'concept') || 'policy',
        score: 0.5, // Default score for fallback
        metadata: chunk.metadata || {},
      }))
    }
    
    if (!data || data.length === 0) {
      return []
    }
    
    // Filter by score threshold and format results
    const results: RetrievedChunk[] = []
    
    for (const chunk of data as any[]) {
      const similarity = chunk.similarity || 0
      
      // Apply score threshold if specified
      if (options.scoreThreshold !== undefined && similarity < options.scoreThreshold) {
        continue
      }
      
      results.push({
        content: chunk.content,
        pageNumber: chunk.page_number ?? undefined,
        weekNumber: chunk.week_number ?? undefined,
        topic: chunk.topic ?? undefined,
        contentType: (chunk.content_type as 'policy' | 'concept') || 'policy',
        score: similarity,
        metadata: chunk.metadata || {},
      })
    }
    
    // Results are already sorted by similarity from the RPC function
    return results.slice(0, limit)
  } catch (error) {
    console.error('Error retrieving chunks:', error)
    throw new Error('Failed to retrieve relevant content')
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) {
    return 0
  }
  
  return dotProduct / denominator
}

/**
 * Generate citations from retrieved chunks
 */
export function generateCitations(chunks: RetrievedChunk[]): Array<{
  source: string
  page?: number
  content: string
}> {
  return chunks.map(chunk => {
    let source = 'Syllabus'
    if (chunk.weekNumber) {
      source += ` Week ${chunk.weekNumber}`
    }
    if (chunk.topic) {
      source += ` - ${chunk.topic}`
    }
    
    return {
      source,
      page: chunk.pageNumber,
      content: chunk.content.substring(0, 200) + '...', // Truncate for citation
    }
  })
}

/**
 * Combine retrieved chunks into context for LLM
 */
export function combineChunksIntoContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk, index) => {
      let prefix = `[Source ${index + 1}]`
      if (chunk.pageNumber) {
        prefix += ` Page ${chunk.pageNumber}`
      }
      if (chunk.weekNumber) {
        prefix += ` Week ${chunk.weekNumber}`
      }
      if (chunk.topic) {
        prefix += ` - ${chunk.topic}`
      }
      
      return `${prefix}\n${chunk.content}`
    })
    .join('\n\n')
}

