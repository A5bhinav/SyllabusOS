import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { createServiceClient } from '../supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Create embeddings instance
 */
export function getEmbeddings() {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_GENAI_API_KEY is not set')
  }

  return new GoogleGenerativeAIEmbeddings({
    modelName: 'embedding-001', // Google's embedding model
    apiKey,
  })
}

/**
 * Store documents with embeddings in Supabase
 */
export async function storeDocumentsWithEmbeddings(
  documents: Array<{
    content: string
    metadata: Record<string, any>
  }>
): Promise<void> {
  const supabaseClient = createServiceClient()
  
  // Check if mock mode is enabled
  const mockMode = process.env.MOCK_MODE === 'true'
  
  let vectors: number[][]
  
  if (mockMode) {
    // Generate mock embeddings (random vectors of dimension 768, which is embedding-001's dimension)
    console.log('[MOCK MODE] Generating mock embeddings for', documents.length, 'documents')
    const texts = documents.map(doc => doc.content || '')
    
    // Filter out empty documents and validate
    const validDocs: typeof documents = []
    const validTexts: string[] = []
    
    for (let i = 0; i < documents.length; i++) {
      if (texts[i] && texts[i].trim().length > 0) {
        validDocs.push(documents[i])
        validTexts.push(texts[i])
      } else {
        console.warn(`[MOCK MODE] Skipping empty document at index ${i}`)
      }
    }
    
    if (validDocs.length === 0) {
      throw new Error('No valid documents to process (all documents are empty)')
    }
    
    // Generate mock embeddings only for valid documents
    vectors = validTexts.map((text, idx) => {
      const vector = Array.from({ length: 768 }, () => (Math.random() - 0.5) * 0.1)
      // Validate vector was created correctly
      if (!vector || vector.length === 0) {
        throw new Error(`Failed to generate mock embedding for document ${idx}`)
      }
      return vector
    })
    
    // Update documents to only include valid ones
    documents.length = 0
    documents.push(...validDocs)
  } else {
    // Generate real embeddings
    try {
      const embeddings = getEmbeddings()
      const texts = documents.map(doc => doc.content || '')
      
      // Filter out empty documents
      const validDocs: typeof documents = []
      const validTexts: string[] = []
      const originalIndices: number[] = []
      
      for (let i = 0; i < documents.length; i++) {
        if (texts[i] && texts[i].trim().length > 0) {
          validDocs.push(documents[i])
          validTexts.push(texts[i])
          originalIndices.push(i)
        } else {
          console.warn(`Skipping empty document at index ${i}`)
        }
      }
      
      if (validDocs.length === 0) {
        throw new Error('No valid documents to process (all documents are empty)')
      }
      
      // Generate embeddings only for valid documents
      const validVectors = await embeddings.embedDocuments(validTexts)
      
      // Validate embeddings were generated
      if (!validVectors || validVectors.length === 0) {
        throw new Error('No embeddings were generated')
      }
      
      // Validate each vector
      for (let i = 0; i < validVectors.length; i++) {
        if (!validVectors[i] || !Array.isArray(validVectors[i]) || validVectors[i].length === 0) {
          throw new Error(`Invalid embedding generated for document ${i}: ${JSON.stringify(validVectors[i])}`)
        }
      }
      
      vectors = validVectors
      // Update documents to only include valid ones
      documents.length = 0
      documents.push(...validDocs)
    } catch (error) {
      console.error('Failed to generate embeddings:', error)
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Validate vectors match documents
  if (vectors.length !== documents.length) {
    throw new Error(`Vector count (${vectors.length}) does not match document count (${documents.length})`)
  }

  // Insert into database
  const records = documents.map((doc, index) => {
    const vector = vectors[index]
    
    // Final validation
    if (!vector || !Array.isArray(vector) || vector.length === 0) {
      throw new Error(`Invalid vector at index ${index}: vector is ${typeof vector}, length: ${vector?.length || 0}`)
    }
    
    return {
      course_id: doc.metadata.courseId,
      content: doc.content,
      page_number: doc.metadata.pageNumber ?? null,
      week_number: doc.metadata.weekNumber ?? null,
      topic: doc.metadata.topic ?? null,
      content_type: doc.metadata.contentType,
      embedding: vector,
      metadata: doc.metadata,
    }
  })

  const { error } = await supabaseClient
    .from('course_content')
    .insert(records)

  if (error) {
    console.error('Database insertion error:', error)
    throw new Error(`Failed to store documents: ${error.message}`)
  }
}

/**
 * Get Supabase client for vector operations
 */
export function getSupabaseClient() {
  return createServiceClient()
}

