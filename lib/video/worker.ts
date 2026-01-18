/**
 * Background worker for processing video generation jobs
 * Polls database for pending video generations and processes them
 */

import { createClient } from '@/lib/supabase/server'
import { 
  generateVideoPrompt, 
  createVeoJobsForStoryboard,
  pollVeoJobStatus,
  type EscalationContext 
} from './generator'
import { uploadVideo } from './storage'

const MOCK_MODE = process.env.MOCK_MODE === 'true'
const VIDEO_GENERATION_ENABLED = process.env.VIDEO_GENERATION_ENABLED !== 'false'

/**
 * Console progress bar helper for video generation
 */
function renderProgressBar(
  current: number,
  total: number,
  width: number = 30,
  label: string = ''
): string {
  const percentage = Math.min((current / total) * 100, 100)
  const filled = Math.round((percentage / 100) * width)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  const percentageStr = percentage.toFixed(1).padStart(5)
  return `[${bar}] ${percentageStr}% ${label}`
}

/**
 * Format time elapsed in human-readable format
 */
function formatTimeElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}

/**
 * Track progress for video generation jobs
 */
const jobProgress = new Map<string, { startTime: number; pollCount: number; lastStatus: string }>()

/**
 * Create Veo API jobs for video generation (async)
 * This creates the jobs and stores job IDs, but doesn't wait for completion
 */
export async function createVideoJobs(escalationId: string): Promise<void> {
  const startTime = Date.now()
  console.log(`\n${'='.repeat(60)}`)
  console.log(`[Video Worker] 🎬 Creating video jobs for escalation ${escalationId}`)
  console.log(`[Video Worker] ⏰ Started at: ${new Date().toISOString()}`)
  console.log(`${'='.repeat(60)}`)
  const supabase = await createClient()

  try {
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
        video_job_id,
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
      const errorMsg = `Escalation not found: ${fetchError?.message || 'Unknown error'}`
      console.error('[Video Worker] ❌', errorMsg, {
        escalationId,
        fetchError: fetchError?.message,
        escalationExists: !!escalation,
      })
      throw new Error(errorMsg)
    }

    if (!escalation.response) {
      const errorMsg = 'No response text found for video generation'
      console.error('[Video Worker] ❌', errorMsg, {
        escalationId,
        hasResponse: !!escalation.response,
        responseLength: escalation.response?.length || 0,
      })
      throw new Error(errorMsg)
    }

    // If job already exists, skip creation
    if (escalation.video_job_id) {
      console.log(`[Video Worker] Job ID already exists for escalation ${escalationId}: ${escalation.video_job_id}`)
      return
    }

    // Check if we should skip real video generation
    if (MOCK_MODE || !VIDEO_GENERATION_ENABLED) {
      console.log(`[Video Worker] Mock mode or generation disabled - marking as completed for escalation ${escalationId}`)
      await supabase
        .from('escalations')
        .update({
          video_generation_status: 'completed',
          video_generated_at: new Date().toISOString(),
        })
        .eq('id', escalationId)
      return
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

    // Generate storyboard
    const storyboard = await generateVideoPrompt(
      escalation.response,
      context.studentName || 'Student',
      context
    )

    // Create Veo API jobs for each scene
    const jobs = await createVeoJobsForStoryboard(storyboard)

    if (jobs.length === 0) {
      throw new Error('No Veo jobs were created')
    }

    // Store the first job ID (for now, we'll use the first scene's job)
    // TODO: Support multiple scenes by storing all job IDs in a JSON array
    const primaryJobId = jobs[0].jobId

    // Update escalation with job ID and status
    const { error: updateError } = await supabase
      .from('escalations')
      .update({
        video_job_id: primaryJobId,
        video_generation_status: 'processing',
      })
      .eq('id', escalationId)

    if (updateError) {
      throw new Error(`Failed to store job ID: ${updateError.message}`)
    }

    const duration = Date.now() - startTime
    jobProgress.set(escalationId, { startTime, pollCount: 0, lastStatus: 'created' })
    
    console.log(`[Video Worker] ✓ Created Veo job ${primaryJobId}`)
    console.log(`[Video Worker] ⏱️  Job creation took ${formatTimeElapsed(duration)}`)
    console.log(`[Video Worker] 📊 Progress: ${renderProgressBar(0, 100, 30, 'Job created, starting generation...')}\n`)
  } catch (error: any) {
    const errorDetails = {
      escalationId,
      error: error?.message || error,
      stack: error?.stack,
      errorType: error?.name || typeof error,
    }
    console.error('[Video Worker] ❌ Failed to create video jobs:', errorDetails)

    // Update status to failed
    try {
      const { error: updateError } = await supabase
        .from('escalations')
        .update({
          video_generation_status: 'failed',
        })
        .eq('id', escalationId)
      
      if (updateError) {
        console.error('[Video Worker] ❌ Failed to update status to failed:', {
          escalationId,
          updateError: updateError.message,
          originalError: error?.message,
        })
      } else {
        console.log('[Video Worker] ✓ Status updated to failed for escalation', escalationId)
      }
    } catch (updateError: any) {
      console.error('[Video Worker] ❌ Exception updating status to failed:', {
        escalationId,
        updateError: updateError?.message || updateError,
        originalError: error?.message,
      })
    }

    throw error
  }
}

/**
 * Poll a Veo API job and update escalation when complete
 */
export async function pollVideoJob(escalationId: string): Promise<void> {
  const supabase = await createClient()

  try {
    // Get escalation with job ID
    const { data: escalation, error: fetchError } = await supabase
      .from('escalations')
      .select('id, video_job_id, video_generation_status')
      .eq('id', escalationId)
      .single()

    if (fetchError || !escalation) {
      throw new Error(`Escalation not found: ${fetchError?.message}`)
    }

    if (!escalation.video_job_id) {
      throw new Error('No video job ID found for escalation')
    }

    // Initialize or update progress tracking
    const progress = jobProgress.get(escalationId) || { startTime: Date.now(), pollCount: 0, lastStatus: 'pending' }
    progress.pollCount++
    const timeElapsed = Date.now() - progress.startTime
    
    // Estimate progress (Veo API typically takes 5-7 minutes)
    const estimatedTotalTime = 6 * 60 * 1000 // 6 minutes in ms
    const estimatedProgress = Math.min((timeElapsed / estimatedTotalTime) * 95, 95) // Cap at 95% until actually completed

    // Poll job status
    const jobStatus = await pollVeoJobStatus(escalation.video_job_id)
    progress.lastStatus = jobStatus.status
    
    // Update progress tracking
    if (jobStatus.status === 'processing' || jobStatus.status === 'pending') {
      jobProgress.set(escalationId, progress)
    }

    // Display progress bar
    const statusEmoji = jobStatus.status === 'completed' ? '✅' : jobStatus.status === 'failed' ? '❌' : '⏳'
    const statusLabel = jobStatus.status === 'processing' ? 'Generating video...' : 
                        jobStatus.status === 'pending' ? 'Queued...' :
                        jobStatus.status === 'completed' ? 'Completed!' : 
                        'Failed'
    
    const progressPercent = jobStatus.status === 'completed' ? 100 : estimatedProgress
    console.log(`\n[Video Worker] ${statusEmoji} Escalation ${escalationId.substring(0, 8)}... | Poll #${progress.pollCount}`)
    console.log(`[Video Worker] 📊 ${renderProgressBar(progressPercent, 100, 30, statusLabel)}`)
    console.log(`[Video Worker] ⏱️  Time elapsed: ${formatTimeElapsed(timeElapsed)} | Estimated: ~6 minutes`)
    console.log(`[Video Worker] 🔄 Job ${escalation.video_job_id.substring(0, 20)}... | Status: ${jobStatus.status}`)

    if (jobStatus.status === 'completed') {
      // Job completed - fetch video and upload
      let videoBuffer: Buffer

      if (jobStatus.videoBase64) {
        videoBuffer = Buffer.from(jobStatus.videoBase64, 'base64')
      } else if (jobStatus.videoUrl) {
        // Fetch video from URL
        console.log(`[Video Worker] Fetching video from URL: ${jobStatus.videoUrl}`)
        const videoResponse = await fetch(jobStatus.videoUrl)
        if (!videoResponse.ok) {
          throw new Error(`Failed to fetch video from URL: ${videoResponse.statusText}`)
        }
        const arrayBuffer = await videoResponse.arrayBuffer()
        videoBuffer = Buffer.from(arrayBuffer)
      } else {
        throw new Error('Job completed but no video data available')
      }

      // Upload video to storage
      const { url } = await uploadVideo(videoBuffer, escalationId, supabase)

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

      const totalTime = Date.now() - progress.startTime
      jobProgress.delete(escalationId) // Clean up progress tracking
      
      console.log(`[Video Worker] ✅ ${renderProgressBar(100, 100, 30, 'Video generation complete!')}`)
      console.log(`[Video Worker] ⏱️  Total time: ${formatTimeElapsed(totalTime)}`)
      console.log(`[Video Worker] 📹 Video uploaded: ${url.substring(0, 50)}...`)
      console.log(`${'='.repeat(60)}\n`)
    } else if (jobStatus.status === 'failed') {
      // Job failed
      const { error: updateError } = await supabase
        .from('escalations')
        .update({
          video_generation_status: 'failed',
        })
        .eq('id', escalationId)

      if (updateError) {
        console.error(`[Video Worker] Failed to update status to 'failed':`, updateError)
      }

      throw new Error(`Video generation failed: ${jobStatus.error || 'Unknown error'}`)
    } else {
      // Still processing - status will be updated on next poll
      // Progress bar already displayed above
    }
  } catch (error: any) {
    // Try to get escalation data for error details (might not exist if fetch failed)
    let jobId = 'unknown'
    try {
      const { data: escalationData } = await supabase
        .from('escalations')
        .select('video_job_id')
        .eq('id', escalationId)
        .single()
      jobId = escalationData?.video_job_id || 'unknown'
    } catch {
      // Ignore errors when fetching escalation for error details
    }
    
    const errorDetails = {
      escalationId,
      jobId,
      error: error?.message || error,
      stack: error?.stack,
      errorType: error?.name || typeof error,
    }
    console.error('[Video Worker] ❌ Failed to poll video job:', errorDetails)
    
    // Update status to failed if it's a critical error
    if (error?.message?.includes('failed') || error?.message?.includes('not found')) {
      try {
        await supabase
          .from('escalations')
          .update({
            video_generation_status: 'failed',
          })
          .eq('id', escalationId)
        console.log('[Video Worker] ✓ Status updated to failed due to polling error')
      } catch (updateError: any) {
        console.error('[Video Worker] ❌ Failed to update status after polling error:', {
          escalationId,
          updateError: updateError?.message,
        })
      }
    }
    
    throw error
  }
}

/**
 * Process all pending video generation jobs
 * Creates jobs for pending escalations and polls processing ones
 */
export async function processPendingVideoGenerations(): Promise<{
  created: number
  polled: number
  completed: number
  failed: number
}> {
  const supabase = await createClient()

  // Get pending escalations (need job creation)
  const { data: pendingEscalations, error: pendingError } = await supabase
    .from('escalations')
    .select('id')
    .eq('video_generation_status', 'pending')
    .is('video_job_id', null)
    .not('response', 'is', null)
    .limit(5) // Create up to 5 jobs at a time

  // Get processing escalations (need polling)
  const { data: processingEscalations, error: processingError } = await supabase
    .from('escalations')
    .select('id')
    .eq('video_generation_status', 'processing')
    .not('video_job_id', 'is', null)
    .limit(10) // Poll up to 10 jobs at a time

  if (pendingError || processingError) {
    console.error('[Video Worker] ❌ Failed to fetch escalations:', {
      pendingError: pendingError?.message || pendingError,
      processingError: processingError?.message || processingError,
      pendingCount: pendingEscalations?.length || 0,
      processingCount: processingEscalations?.length || 0,
    })
    return { created: 0, polled: 0, completed: 0, failed: 0 }
  }

  let created = 0
  let polled = 0
  let completed = 0
  let failed = 0

  // Create jobs for pending escalations
  for (const escalation of pendingEscalations || []) {
    try {
      await createVideoJobs(escalation.id)
      created++
      console.log('[Video Worker] ✓ Created video jobs for escalation', escalation.id)
      
      // Immediately poll once to catch fast-completing jobs
      try {
        await pollVideoJob(escalation.id)
      } catch (pollError: any) {
        // Ignore errors if job is still processing (expected)
        if (!pollError?.message?.includes('still') && !pollError?.message?.includes('processing')) {
          console.warn('[Video Worker] ⚠️ Immediate poll after job creation failed:', {
            escalationId: escalation.id,
            error: pollError?.message,
          })
        }
      }
    } catch (error: any) {
      console.error('[Video Worker] ❌ Failed to create jobs:', {
        escalationId: escalation.id,
        error: error?.message || error,
        stack: error?.stack,
      })
      failed++
    }
  }

  // Poll processing escalations
  for (const escalation of processingEscalations || []) {
    try {
      const previousStatus = await supabase
        .from('escalations')
        .select('video_generation_status')
        .eq('id', escalation.id)
        .single()

      await pollVideoJob(escalation.id)
      polled++

      // Check if status changed to completed
      const { data: currentStatus } = await supabase
        .from('escalations')
        .select('video_generation_status')
        .eq('id', escalation.id)
        .single()

      if (currentStatus?.video_generation_status === 'completed' && 
          previousStatus?.data?.video_generation_status !== 'completed') {
        completed++
      } else if (currentStatus?.video_generation_status === 'failed') {
        failed++
      }
    } catch (error: any) {
      // Don't increment failed here - the pollVideoJob function handles status updates
      // Only log if it's not an expected "still processing" scenario
      if (!error?.message?.includes('still') && !error?.message?.includes('processing')) {
        console.error('[Video Worker] ❌ Failed to poll job:', {
          escalationId: escalation.id,
          error: error?.message || error,
          stack: error?.stack,
        })
      }
    }
  }

  if (created > 0 || polled > 0 || completed > 0 || failed > 0) {
    console.log('[Video Worker] 📊 Batch processing summary:', {
      created,
      polled,
      completed,
      failed,
      totalProcessed: created + polled,
    })
  }

  return { created, polled, completed, failed }
}

/**
 * Generate video asynchronously (non-blocking)
 * Creates Veo API jobs and triggers polling
 */
export async function generateVideoAsync(
  escalationId: string,
  responseText: string,
  context: EscalationContext
): Promise<void> {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`[Video Worker] 🚀 generateVideoAsync called for escalation ${escalationId}`)
  console.log(`[Video Worker] 📝 Response length: ${responseText?.length || 0} characters`)
  console.log(`[Video Worker] 👤 Student: ${context.studentName || 'Unknown'}`)
  
  // Diagnostic: Check configuration
  console.log(`[Video Worker] 🔧 Configuration check:`, {
    MOCK_MODE,
    VIDEO_GENERATION_ENABLED,
    VEO_API_KEY_EXISTS: !!process.env.GOOGLE_GENAI_API_KEY || !!process.env.GOOGLE_VEO_API_KEY,
    VEO_API_AVAILABLE: !MOCK_MODE && VIDEO_GENERATION_ENABLED && (!!process.env.GOOGLE_GENAI_API_KEY || !!process.env.GOOGLE_VEO_API_KEY),
  })
  
  if (MOCK_MODE) {
    console.warn(`[Video Worker] ⚠️ MOCK_MODE is enabled - video generation will be skipped`)
  }
  if (!VIDEO_GENERATION_ENABLED) {
    console.warn(`[Video Worker] ⚠️ VIDEO_GENERATION_ENABLED is false - video generation is disabled`)
  }
  if (!process.env.GOOGLE_GENAI_API_KEY && !process.env.GOOGLE_VEO_API_KEY) {
    console.error(`[Video Worker] ❌ No API key found - GOOGLE_GENAI_API_KEY or GOOGLE_VEO_API_KEY must be set`)
  }
  
  console.log(`${'='.repeat(60)}`)
  
  const supabase = await createClient()

  // Mark as pending - worker will create jobs
  const { error: updateError } = await supabase
    .from('escalations')
    .update({
      video_generation_status: 'pending',
    })
    .eq('id', escalationId)
  
  if (updateError) {
    console.error(`[Video Worker] ❌ Failed to set status to pending for ${escalationId}:`, updateError.message)
    // Continue anyway - will try to process
  } else {
    console.log(`[Video Worker] ✓ Set video_generation_status to 'pending' for escalation ${escalationId}`)
  }

  // Create jobs immediately in the background (non-blocking)
  console.log(`[Video Worker] 🎬 Starting createVideoJobs for escalation ${escalationId}...`)
  createVideoJobs(escalationId)
    .then(async () => {
      console.log(`[Video Worker] ✓ createVideoJobs completed for escalation ${escalationId}`)
      
      // Wait a moment for the database to update with the job ID
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Immediately poll once to catch fast-completing jobs and start the polling process
      try {
        console.log(`[Video Worker] 🔄 Polling job immediately after creation for escalation ${escalationId}`)
        await pollVideoJob(escalationId)
        console.log(`[Video Worker] ✓ Initial poll completed for escalation ${escalationId}`)
      } catch (pollError: any) {
        // If job is still processing (expected), that's fine - frontend will continue polling
        // Also handle case where job ID might not be set yet
        if (pollError?.message?.includes('still') || 
            pollError?.message?.includes('processing') || 
            pollError?.message?.includes('pending') ||
            pollError?.message?.includes('No video job ID')) {
          console.log(`[Video Worker] ℹ️ Job still processing or not ready (expected) for escalation ${escalationId}, frontend will continue polling`)
        } else {
          console.warn(`[Video Worker] ⚠️ Initial poll had unexpected error (non-critical):`, pollError?.message || pollError)
        }
      }
    })
    .catch(error => {
      console.error(`[Video Worker] ❌ Background job creation failed for ${escalationId}:`, {
        error: error?.message || error,
        stack: error?.stack,
      })
    })
}

