import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'
import { createServiceClient } from '../supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  validateUploadSize,
  logApiUsage,
  rateLimitDelay,
  estimateEmbeddingCost,
  formatCost,
  MAX_CHUNKS_PER_UPLOAD,
} from '../utils/cost-control'

/**
 * Create embeddings instance
 */
export function getEmbeddings() {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GOOGLE_GENAI_API_KEY is not set or is empty')
  }

  // Try to create embeddings instance with proper error handling
  // According to @langchain/google-genai docs: use 'embedding-001' (without 'models/' prefix)
  // This model produces 768-dimensional vectors
  try {
    const embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: 'embedding-001', // Standard Google embedding model (768 dimensions)
      apiKey: apiKey.trim(),
    })
    
    // Test the instance by checking if it has the expected methods
    if (typeof embeddings.embedDocuments !== 'function') {
      throw new Error('GoogleGenerativeAIEmbeddings instance is missing embedDocuments method')
    }
    
    return embeddings
  } catch (error) {
    console.error('Failed to create GoogleGenerativeAIEmbeddings instance:', error)
    throw new Error(`Failed to initialize embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
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
  
  // COST CONTROL: Validate upload size before processing
  const totalCharacters = documents.reduce((sum, doc) => sum + (doc.content?.length || 0), 0)
  const validation = validateUploadSize(documents.length, totalCharacters)
  
  if (!validation.valid) {
    throw new Error(validation.error || 'Upload validation failed')
  }
  
  if (validation.warning) {
    console.warn(`[Cost Control] ${validation.warning}`)
  }
  
  // Check if mock mode is enabled
  const mockMode = process.env.MOCK_MODE === 'true'
  
  // Log estimated cost (even in mock mode for transparency)
  if (!mockMode) {
    const estimatedCost = estimateEmbeddingCost(totalCharacters)
    console.log(
      `[Cost Control] Processing ${documents.length} documents, ${totalCharacters.toLocaleString()} characters. ` +
      `Estimated cost: ${formatCost(estimatedCost)}`
    )
  }
  
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
      // Check API key first before attempting to call API
      const apiKey = process.env.GOOGLE_GENAI_API_KEY
      if (!apiKey || apiKey.trim() === '') {
        throw new Error('GOOGLE_GENAI_API_KEY is not set. Please set it in your .env file or enable MOCK_MODE=true for development.')
      }
      
      console.log(`[Embeddings] API key found, generating embeddings for ${documents.length} documents...`)
      
      const embeddings = getEmbeddings()
      const texts = documents.map(doc => doc.content || '')
      
      // Filter out empty documents
      const validDocs: typeof documents = []
      const validTexts: string[] = []
      
      for (let i = 0; i < documents.length; i++) {
        if (texts[i] && texts[i].trim().length > 0) {
          validDocs.push(documents[i])
          validTexts.push(texts[i])
        } else {
          console.warn(`Skipping empty document at index ${i}`)
        }
      }
      
      if (validDocs.length === 0) {
        throw new Error('No valid documents to process (all documents are empty)')
      }
      
      console.log(`[Embeddings] Processing ${validDocs.length} valid documents...`)
      
      // Generate embeddings only for valid documents
      // Process in smaller batches to avoid issues and get better error messages
      let validVectors: number[][] = []
      const batchSize = 10 // Process in smaller batches
      
      // COST CONTROL: Log total API usage
      const totalChars = validTexts.reduce((sum, text) => sum + text.length, 0)
      logApiUsage('embedding', validTexts.length, totalChars)
      
      try {
        for (let i = 0; i < validTexts.length; i += batchSize) {
          const batch = validTexts.slice(i, i + batchSize)
          const batchChars = batch.reduce((sum, text) => sum + text.length, 0)
          const batchCost = estimateEmbeddingCost(batchChars)
          
          console.log(
            `[Embeddings] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validTexts.length / batchSize)} ` +
            `(${batch.length} documents, ${batchChars.toLocaleString()} chars, est. ${formatCost(batchCost)})...`
          )
          
          // COST CONTROL: Rate limiting between batches
          if (i > 0) {
            await rateLimitDelay()
          }
          
          try {
            const batchVectors = await embeddings.embedDocuments(batch)
            
            // Log what we got back for debugging (including full structure)
            console.log(`[Embeddings] Batch result type:`, typeof batchVectors)
            console.log(`[Embeddings] Batch result:`, {
              batchIndex: Math.floor(i / batchSize) + 1,
              isArray: Array.isArray(batchVectors),
              vectorsReceived: Array.isArray(batchVectors) ? batchVectors.length : 'not an array',
              firstItemType: batchVectors?.[0] ? typeof batchVectors[0] : 'undefined',
              firstVectorLength: Array.isArray(batchVectors?.[0]) ? batchVectors[0].length : 'not an array',
              firstVectorPreview: Array.isArray(batchVectors?.[0]) ? batchVectors[0].slice(0, 3) : batchVectors?.[0],
              fullStructure: JSON.stringify(batchVectors).substring(0, 200)
            })
            
            // Handle different response formats
            let normalizedVectors: number[][]
            
            if (!batchVectors) {
              throw new Error(`No embeddings returned for batch ${Math.floor(i / batchSize) + 1}`)
            }
            
            // If it's already an array of arrays, use it directly
            if (Array.isArray(batchVectors)) {
              normalizedVectors = batchVectors
            } 
            // If it's an object (and not null or array), try to extract embeddings from common structures
            else if (typeof batchVectors === 'object' && batchVectors !== null && !Array.isArray(batchVectors)) {
              const batchObj = batchVectors as Record<string, any>
              // Check if it has a data property (common API response format)
              if (batchObj.data && Array.isArray(batchObj.data)) {
                normalizedVectors = batchObj.data
              }
              // Check if it has an embeddings property
              else if (batchObj.embeddings && Array.isArray(batchObj.embeddings)) {
                normalizedVectors = batchObj.embeddings
              }
              // Check if it's an object with numeric keys (could be a sparse array-like object)
              else if (Object.keys(batchObj).length > 0) {
                const keys = Object.keys(batchObj).map(k => parseInt(k)).filter(k => !isNaN(k))
                if (keys.length > 0) {
                  normalizedVectors = keys.sort((a, b) => a - b).map(k => batchObj[k]).filter(v => Array.isArray(v))
                } else {
                  throw new Error(`Unexpected response format for batch ${Math.floor(i / batchSize) + 1}: object with keys ${Object.keys(batchObj).join(', ')}`)
                }
              } else {
                throw new Error(`Unexpected response format for batch ${Math.floor(i / batchSize) + 1}: received ${typeof batchVectors} with ${Object.keys(batchObj).length} keys`)
              }
            } else {
              throw new Error(`Unexpected response type for batch ${Math.floor(i / batchSize) + 1}: ${typeof batchVectors}`)
            }
            
            // Validate normalized vectors
            if (!normalizedVectors || normalizedVectors.length === 0) {
              throw new Error(`No embeddings found in response for batch ${Math.floor(i / batchSize) + 1}`)
            }
            
            if (normalizedVectors.length !== batch.length) {
              throw new Error(`Expected ${batch.length} embeddings but got ${normalizedVectors.length} for batch ${Math.floor(i / batchSize) + 1}`)
            }
            
            // Check each vector in the batch
            for (let j = 0; j < normalizedVectors.length; j++) {
              const vector = normalizedVectors[j]
              if (!vector || !Array.isArray(vector) || vector.length === 0) {
                // If all vectors are empty, this is likely an API configuration issue
                const allEmpty = normalizedVectors.every(v => !v || !Array.isArray(v) || v.length === 0)
                if (allEmpty && j === 0) {
                  console.error('[Embeddings] API returned empty embeddings. This indicates an API configuration issue.')
                  console.error('[Embeddings] Common causes:')
                  console.error('[Embeddings] 1. API key lacks access to embedding models')
                  console.error('[Embeddings] 2. Embedding model not enabled in Google AI Studio')
                  console.error('[Embeddings] 3. Model name may be incorrect')
                  console.error('[Embeddings] Solution: Set MOCK_MODE=true in .env to continue development')
                  
                  throw new Error(
                    `Google Gemini API returned empty embeddings for all ${normalizedVectors.length} documents. ` +
                    `This usually means: (1) Your API key doesn't have access to embedding models, (2) The embedding model isn't enabled in your Google AI Studio project, or (3) There's an API configuration issue. ` +
                    `Please check your Google AI Studio project settings and enable the embedding model, or set MOCK_MODE=true in your .env file to skip API calls during development.`
                  )
                }
                throw new Error(`Invalid embedding at batch ${Math.floor(i / batchSize) + 1}, document ${j}: received ${typeof vector}, isArray: ${Array.isArray(vector)}, length: ${vector?.length || 0}`)
              }
            }
            
            validVectors.push(...normalizedVectors)
            console.log(`[Embeddings] Successfully processed batch ${Math.floor(i / batchSize) + 1}`)
          } catch (batchError: any) {
            console.error(`[Embeddings] Batch ${Math.floor(i / batchSize) + 1} failed:`, batchError)
            
            // If it's an empty result, try with a single document to see if it's a batch issue
            if (batch.length > 1 && (batchError?.message?.includes('[]') || batchError?.message?.includes('empty'))) {
              console.log(`[Embeddings] Retrying batch ${Math.floor(i / batchSize) + 1} with single document...`)
              try {
                const singleVector = await embeddings.embedQuery(batch[0])
                if (singleVector && Array.isArray(singleVector) && singleVector.length > 0) {
                  console.log(`[Embeddings] Single document worked! Vector length: ${singleVector.length}`)
                  // If single works, the issue might be with batch processing - suggest MOCK_MODE
                  throw new Error(`Batch embedding failed but single embedding works. This may indicate an API issue. Enable MOCK_MODE=true to skip API calls. Error: ${batchError?.message || 'Unknown'}`)
                }
              } catch (singleError) {
                // If single also fails, continue with original error
              }
            }
            
            throw batchError
          }
        }
      } catch (apiError: any) {
        console.error('[Embeddings] API call failed:', apiError)
        
        // Provide helpful error messages based on common API errors
        if (apiError?.message?.includes('API key') || apiError?.message?.includes('401')) {
          throw new Error('Google Gemini API key is invalid or not authorized. Please check your GOOGLE_GENAI_API_KEY in your .env file, or enable MOCK_MODE=true to skip API calls during development.')
        } else if (apiError?.message?.includes('429') || apiError?.message?.includes('rate limit')) {
          throw new Error('Google Gemini API rate limit exceeded. Please wait a moment and try again, or enable MOCK_MODE=true for development.')
        } else if (apiError?.message?.includes('network') || apiError?.message?.includes('fetch') || apiError?.code === 'ENOTFOUND') {
          throw new Error('Network error connecting to Google Gemini API. Please check your internet connection, or enable MOCK_MODE=true for development.')
        } else {
          throw new Error(`Failed to call Google Gemini API: ${apiError?.message || 'Unknown error'}. Enable MOCK_MODE=true to skip API calls during development.`)
        }
      }
      
      // Validate embeddings were generated
      if (!validVectors || validVectors.length === 0) {
        throw new Error('No embeddings were generated from the API. Enable MOCK_MODE=true to skip API calls during development.')
      }
      
      // Validate each vector
      for (let i = 0; i < validVectors.length; i++) {
        if (!validVectors[i] || !Array.isArray(validVectors[i]) || validVectors[i].length === 0) {
          throw new Error(`Invalid embedding generated for document ${i}: ${JSON.stringify(validVectors[i])?.substring(0, 100)}`)
        }
      }
      
      const finalChars = validTexts.reduce((sum, text) => sum + text.length, 0)
      const finalCost = estimateEmbeddingCost(finalChars)
      console.log(
        `[Embeddings] Successfully generated ${validVectors.length} embeddings. ` +
        `Total cost: ${formatCost(finalCost)}`
      )
      
      vectors = validVectors
      // Update documents to only include valid ones
      documents.length = 0
      documents.push(...validDocs)
    } catch (error) {
      console.error('[Embeddings] Failed to generate embeddings:', error)
      
      // Re-throw with helpful message if it's already our formatted error
      if (error instanceof Error && error.message.includes('MOCK_MODE')) {
        throw error
      }
      
      // Provide default helpful error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to generate embeddings: ${errorMessage}. Enable MOCK_MODE=true in your .env file to skip API calls and use mock embeddings during development.`)
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

