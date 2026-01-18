/**
 * Video storage service for Supabase Storage
 * Handles uploading, retrieving, and deleting video files
 */

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'escalation-videos'
const SIGNED_URL_EXPIRY = 3600 // 1 hour in seconds

export interface VideoUploadResult {
  url: string
  path: string
}

/**
 * Upload video buffer to Supabase Storage
 * @param buffer Video file buffer
 * @param escalationId Escalation ID for file naming
 * @param supabase Optional Supabase client (for server-side usage)
 * @returns Public URL and file path
 */
export async function uploadVideo(
  buffer: Buffer,
  escalationId: string,
  supabase?: SupabaseClient
): Promise<VideoUploadResult> {
  const client = supabase || await createClient()
  
  const filePath = `${escalationId}/${Date.now()}.mp4`
  
  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: 'video/mp4',
      upsert: false, // Don't overwrite existing files
    })

  if (error) {
    // Provide helpful error messages for common storage issues
    if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
      throw new Error(`Storage bucket "${BUCKET_NAME}" does not exist. Please create it in Supabase dashboard under Storage → Buckets. See migration 011 for instructions.`)
    } else if (error.message?.includes('new row violates row-level security') || error.message?.includes('RLS')) {
      throw new Error(`Storage bucket "${BUCKET_NAME}" RLS policy denied access. Check bucket permissions in Supabase dashboard.`)
    } else if (error.message?.includes('JWT') || error.message?.includes('unauthorized')) {
      throw new Error(`Unauthorized to upload to storage bucket "${BUCKET_NAME}". Check your Supabase credentials and RLS policies.`)
    }
    throw new Error(`Failed to upload video to storage: ${error.message}`)
  }

  // Get public URL (or signed URL if private)
  const { data: urlData } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return {
    url: urlData.publicUrl,
    path: filePath,
  }
}

/**
 * Generate signed URL for video access (for private buckets)
 * @param filePath Path to the video file in storage
 * @returns Signed URL with expiration
 */
export async function getSignedVideoUrl(filePath: string): Promise<string> {
  const supabase = await createClient()
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRY)

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Get video URL (public or signed)
 * @param filePath Path to the video file
 * @returns Video URL
 */
export async function getVideoUrl(filePath: string): Promise<string | null> {
  const supabase = await createClient()
  
  if (!filePath) {
    return null
  }

  // Check if bucket is public or private
  // For now, assume public URL works (adjust if bucket is private)
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)

  return data.publicUrl
}

/**
 * Delete video from storage
 * @param filePath Path to the video file
 */
export async function deleteVideo(filePath: string): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath])

  if (error) {
    console.error('Failed to delete video:', error.message)
    // Don't throw - deletion is not critical
  }
}

/**
 * Delete all videos for an escalation
 * @param escalationId Escalation ID
 */
export async function deleteEscalationVideos(escalationId: string): Promise<void> {
  const supabase = await createClient()
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(escalationId)

  if (error) {
    console.error('Failed to list escalation videos:', error.message)
    return
  }

  if (data && data.length > 0) {
    const filesToDelete = data.map(file => `${escalationId}/${file.name}`)
    
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filesToDelete)

    if (deleteError) {
      console.error('Failed to delete escalation videos:', deleteError.message)
    }
  }
}

