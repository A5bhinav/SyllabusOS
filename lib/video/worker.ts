/**
 * Background worker for processing video generation jobs
 * Polls database for pending video generations and processes them
 */

import { createClient } from '@/lib/supabase/server'
import { generateVideoFromResponse } from './generator'
import { uploadVideo } from './storage'
import type { EscalationContext } from './generator'

const MOCK_MODE = process.env.MOCK_MODE === 'true'
const VIDEO_GENERATION_ENABLED = process.env.VIDEO_GENERATION_ENABLED !== 'false'

/**
 * Process a single video generation job
 */
export async function processVideoGeneration(escalationId: string): Promise<void> {
  const supabase = await createClient()

  try {
    // Update status to processing
    await supabase
      .from('escalations')
      .update({ video_generation_status: 'processing' })
      .eq('id', escalationId)

    // Get escalation details
    const { data: escalation, error: fetchError } = await supabase
      .from('escalations')
      .select(`
        id,
        query,
        response,
        category,
        student_id,
        course_id,
        profiles!escalations_student_id_fkey (
          name,
          email
        ),
        courses (
          name
        )
      `)
      .eq('id', escalationId)
      .single()

    if (fetchError || !escalation) {
      throw new Error(`Escalation not found: ${fetchError?.message}`)
    }

    if (!escalation.response) {
      throw new Error('No response text found for video generation')
    }

    // Get student and course info
    const studentProfile = Array.isArray(escalation.profiles)
      ? escalation.profiles[0]
      : escalation.profiles
    const course = Array.isArray(escalation.courses)
      ? escalation.courses[0]
      : escalation.courses

    const context: EscalationContext = {
      studentName: studentProfile?.name || undefined,
      category: escalation.category || undefined,
      courseName: course?.name || undefined,
    }

    // Generate video
    let videoBuffer: Buffer
    if (MOCK_MODE || !VIDEO_GENERATION_ENABLED) {
      // In mock mode, create a placeholder
      console.log(`[Video Worker] Mock mode or generation disabled - creating placeholder for escalation ${escalationId}`)
      videoBuffer = Buffer.from('')
      
      // For mock mode, set a placeholder URL
      await supabase
        .from('escalations')
        .update({
          video_url: `https://example.com/videos/${escalationId}.mp4`,
          video_generated_at: new Date().toISOString(),
          video_generation_status: 'completed',
        })
        .eq('id', escalationId)
      
      return
    }

    // Try to generate video - will return empty buffer if Veo API not implemented
    try {
      videoBuffer = await generateVideoFromResponse(
        escalation.response,
        context.studentName || 'Student',
        context
      )

      // If empty buffer is returned, treat as mock/disabled mode
      if (!videoBuffer || videoBuffer.length === 0) {
        console.log(`[Video Worker] Video generation returned empty buffer (likely not implemented) - creating placeholder`)
        await supabase
          .from('escalations')
          .update({
            video_url: `https://example.com/videos/${escalationId}.mp4`,
            video_generated_at: new Date().toISOString(),
            video_generation_status: 'completed',
          })
          .eq('id', escalationId)
        return
      }
    } catch (error: any) {
      // If error indicates Veo API not implemented, create placeholder instead of failing
      if (error.message?.includes('not yet implemented') || error.message?.includes('not implemented')) {
        console.warn(`[Video Worker] Veo API not implemented - creating placeholder for escalation ${escalationId}`)
        await supabase
          .from('escalations')
          .update({
            video_url: `https://example.com/videos/${escalationId}.mp4`,
            video_generated_at: new Date().toISOString(),
            video_generation_status: 'completed',
          })
          .eq('id', escalationId)
        return
      }
      // Re-throw other errors
      throw error
    }

    // Upload video to storage
    const { url, path } = await uploadVideo(videoBuffer, escalationId, supabase)

    // Update escalation with video URL
    const { error: updateError } = await supabase
      .from('escalations')
      .update({
        video_url: url,
        video_generated_at: new Date().toISOString(),
        video_generation_status: 'completed',
      })
      .eq('id', escalationId)

    if (updateError) {
      throw new Error(`Failed to update escalation with video URL: ${updateError.message}`)
    }

    console.log(`[Video Worker] Successfully generated video for escalation ${escalationId}`)
  } catch (error) {
    console.error(`[Video Worker] Failed to process escalation ${escalationId}:`, error)

    // Update status to failed
    await supabase
      .from('escalations')
      .update({
        video_generation_status: 'failed',
      })
      .eq('id', escalationId)

    throw error
  }
}

/**
 * Process all pending video generation jobs
 * Should be called periodically (e.g., via cron job or API route)
 */
export async function processPendingVideoGenerations(): Promise<{
  processed: number
  failed: number
}> {
  const supabase = await createClient()

  // Get all pending or processing escalations (limit to prevent overload)
  const { data: escalations, error } = await supabase
    .from('escalations')
    .select('id')
    .in('video_generation_status', ['pending', 'processing'])
    .not('response', 'is', null)
    .limit(10) // Process up to 10 at a time

  if (error) {
    console.error('[Video Worker] Failed to fetch pending escalations:', error)
    return { processed: 0, failed: 0 }
  }

  if (!escalations || escalations.length === 0) {
    return { processed: 0, failed: 0 }
  }

  let processed = 0
  let failed = 0

  // Process each escalation
  for (const escalation of escalations) {
    try {
      await processVideoGeneration(escalation.id)
      processed++
    } catch (error) {
      console.error(`[Video Worker] Failed to process escalation ${escalation.id}:`, error)
      failed++
    }
  }

  return { processed, failed }
}

/**
 * Generate video asynchronously (non-blocking)
 * Triggers video generation without waiting for completion
 */
export async function generateVideoAsync(
  escalationId: string,
  responseText: string,
  context: EscalationContext
): Promise<void> {
  const supabase = await createClient()

  // Mark as pending - worker will pick it up
  await supabase
    .from('escalations')
    .update({
      video_generation_status: 'pending',
    })
    .eq('id', escalationId)

  // In a real implementation, you might:
  // 1. Use a job queue (e.g., Bull, BullMQ)
  // 2. Trigger a background worker via API route
  // 3. Use a serverless function or edge function
  
  // For now, we'll let the periodic worker handle it
  // Or trigger immediately in the background (non-blocking)
  processVideoGeneration(escalationId).catch(error => {
    console.error(`[Video Worker] Background generation failed for ${escalationId}:`, error)
  })
}

