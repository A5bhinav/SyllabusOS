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
  const embeddings = getEmbeddings()

  // Generate embeddings for all documents
  const texts = documents.map(doc => doc.content)
  const vectors = await embeddings.embedDocuments(texts)

  // Insert into database
  const records = documents.map((doc, index) => ({
    course_id: doc.metadata.courseId,
    content: doc.content,
    page_number: doc.metadata.pageNumber ?? null,
    week_number: doc.metadata.weekNumber ?? null,
    topic: doc.metadata.topic ?? null,
    content_type: doc.metadata.contentType,
    embedding: vectors[index],
    metadata: doc.metadata,
  }))

  const { error } = await supabaseClient
    .from('course_content')
    .insert(records)

  if (error) {
    throw new Error(`Failed to store documents: ${error.message}`)
  }
}

/**
 * Get Supabase client for vector operations
 */
export function getSupabaseClient() {
  return createServiceClient()
}

