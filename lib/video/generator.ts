/**
 * Video generation service using Gemini Veo API
 * Converts text responses into short video messages
 */

import { generateChatCompletion } from '@/lib/ai/client'
import { Buffer } from 'buffer'

// Optional ffmpeg for video stitching (only load if needed)
let ffmpeg: any = null
let ffmpegStatic: string | null = null

try {
  // Dynamically import ffmpeg only when needed (to avoid build issues)
  if (typeof window === 'undefined') {
    // Server-side only
    const ffmpegModule = require('fluent-ffmpeg')
    ffmpegStatic = require('ffmpeg-static')
    ffmpeg = ffmpegModule
    if (ffmpegStatic && ffmpeg) {
      ffmpeg.setFfmpegPath(ffmpegStatic)
    }
  }
} catch (err) {
  console.warn('[Video] ffmpeg not available:', err)
}

export interface EscalationContext {
  studentName?: string
  category?: string
  courseName?: string
}

export interface VideoStyle {
  aspectRatio?: '16:9' | '9:16'
  tone?: 'professional' | 'casual' | 'empathetic'
  duration?: number // Target duration in seconds
}

export interface VideoClip {
  buffer: Buffer
  duration: number
  order: number
}

export interface VideoStoryboard {
  scenes: Array<{
    sceneNumber: number
    description: string
    audioText: string
    duration: number
  }>
}

const MOCK_MODE = process.env.MOCK_MODE === 'true'
const VIDEO_GENERATION_ENABLED = process.env.VIDEO_GENERATION_ENABLED !== 'false'
const VEO_MODEL = process.env.VEO_MODEL || 'veo-3.1'
const VEO_API_KEY = process.env.GOOGLE_VEO_API_KEY || process.env.GOOGLE_GENAI_API_KEY
const MAX_VIDEO_DURATION = parseInt(process.env.VIDEO_MAX_DURATION || '30', 10)

// Check if Veo API is actually available
// Veo API is available if we have an API key, video generation is enabled, and not in mock mode
const VEO_API_AVAILABLE = !!VEO_API_KEY && !MOCK_MODE && VIDEO_GENERATION_ENABLED

/**
 * Check if video generation is enabled and available
 * Note: Even if enabled, Veo API integration may not be implemented
 */
export function isVideoGenerationEnabled(): boolean {
  // Video generation is only enabled if:
  // 1. Not in mock mode
  // 2. VIDEO_GENERATION_ENABLED is not false
  // 3. VEO_API_KEY is provided
  // 4. Veo API is actually implemented (currently returns false as it's not implemented)
  return VEO_API_AVAILABLE
}

/**
 * Generate video prompt/storyboard from response text using Gemini
 */
export async function generateVideoPrompt(
  responseText: string,
  studentName: string,
  context: EscalationContext
): Promise<VideoStoryboard> {
  if (MOCK_MODE || !VIDEO_GENERATION_ENABLED) {
    // Return mock storyboard for testing
    console.log('[MOCK MODE] Video prompt generation - returning mock storyboard')
    return {
      scenes: [
        {
          sceneNumber: 1,
          description: 'Professional video background with warm lighting. Text overlay appears with greeting.',
          audioText: `Hello ${studentName || 'there'}`,
          duration: 4,
        },
        {
          sceneNumber: 2,
          description: 'Supportive message with checkmark icon and positive imagery.',
          audioText: responseText.substring(0, 100),
          duration: 6,
        },
      ],
    }
  }

  const analysisPrompt = `
Analyze this professor response to a student escalation and create a video storyboard.

Response: "${responseText}"
Student Name: ${studentName || 'Student'}
Context: ${context.category || 'General'} - ${context.courseName || 'Course'}

Create a SINGLE video scene (5-8 seconds) that:
1. Is professional, empathetic, and clear
2. Summarizes the key points from the response concisely
3. Uses appropriate imagery:
   - Calendars for deadline extensions
   - Checkmarks for confirmations/approvals
   - Supportive icons for empathy
   - Question marks for clarifications
   - Academic settings for course context
4. Matches the tone of the response (supportive, informative, etc.)

IMPORTANT: Return ONLY ONE scene (not multiple). Keep it concise and under 8 seconds total.

Return ONLY valid JSON with this structure:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "description": "Detailed visual description for Veo (be specific about colors, lighting, objects, text overlays)",
      "audioText": "Concise summary text (max 20 words) that captures the essence of the response",
      "duration": 5
    }
  ]
}

Keep duration between 5-8 seconds. Use only ONE scene for faster generation.
`

  try {
    const systemPrompt = `You are a video production assistant. Analyze text responses and create detailed video storyboards with specific visual descriptions that can be used to generate video clips.`

    const aiResponse = await generateChatCompletion(analysisPrompt, systemPrompt)
    const responseText = aiResponse.text.trim()

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || 
                     responseText.match(/```\s*([\s\S]*?)\s*```/) ||
                     [null, responseText]
    
    const jsonText = jsonMatch[1] || responseText
    const storyboard = JSON.parse(jsonText) as VideoStoryboard

    // Validate storyboard
    if (!storyboard.scenes || !Array.isArray(storyboard.scenes)) {
      throw new Error('Invalid storyboard format: missing scenes array')
    }

    return storyboard
  } catch (error: any) {
    console.error('[Video Generator] ❌ Failed to generate video storyboard:', {
      error: error?.message || error,
      stack: error?.stack,
      escalationId: context.courseName,
      responseLength: responseText?.length || 0,
    })
    // Fallback to simple single-scene storyboard (faster generation)
    const fallbackStoryboard = {
      scenes: [
        {
          sceneNumber: 1,
          description: 'Professional academic setting with warm lighting. Text overlay with response summary.',
          audioText: responseText.substring(0, 100), // Shorter for faster generation
          duration: 6, // 6 seconds instead of 8
        },
      ],
    }
    console.warn('[Video Generator] ⚠️ Using fallback single-scene storyboard for faster generation')
    return fallbackStoryboard
  }
}

/**
 * Veo API job status response
 */
export interface VeoJobStatus {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  videoBase64?: string
  error?: string
}

/**
 * Create a Veo API video generation job (async)
 * Returns the job ID that needs to be polled
 */
export async function createVeoJob(
  prompt: string,
  style: VideoStyle
): Promise<string> {
  if (MOCK_MODE || !VIDEO_GENERATION_ENABLED || !VEO_API_KEY) {
    throw new Error('Veo API is not available in mock mode or when disabled')
  }

  if (!VEO_API_AVAILABLE) {
    throw new Error('Veo API is not available. Check API key, MOCK_MODE, and VIDEO_GENERATION_ENABLED settings.')
  }

  try {
    const modelName = VEO_MODEL.includes('3.1') ? 'veo-3.1-generate-preview' : 'veo-3.0-generate-preview'
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateVideo?key=${VEO_API_KEY}`
    
    const duration = Math.min(Math.max(style.duration || 5, 1), 8)
    
    const requestBody = {
      prompt: prompt,
      aspectRatio: style.aspectRatio || '16:9',
      duration: duration,
    }

    console.log(`[Video Generator] Creating Veo API job: ${modelName}, duration: ${duration}s`)
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error(`[Video Generator] Veo API error (${response.status}):`, errorText)
      
      if (response.status === 403) {
        throw new Error('Veo API access denied. Ensure billing is enabled on your Google Cloud project and the model is available for your account.')
      } else if (response.status === 404) {
        throw new Error(`Veo model "${modelName}" not found. The model may not be available yet or requires special access.`)
      } else if (response.status === 429) {
        throw new Error('Veo API rate limit exceeded. Please try again later.')
      }
      
      throw new Error(`Veo API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`[Video Generator] Veo API job creation response:`, JSON.stringify(data).substring(0, 1000))
    
    // Extract job ID from response
    // Veo API typically returns: { name: "operations/...", ... } or { jobId: "...", ... }
    const jobId = data.name || data.operation || data.jobId || data.job_id
    
    if (!jobId) {
      console.error('[Video Generator] No job ID in response. Full response:', JSON.stringify(data).substring(0, 2000))
      throw new Error('Veo API did not return a job ID. The API may have changed or the response format is unexpected.')
    }

    console.log(`[Video Generator] Created Veo API job: ${jobId}`)
    return jobId
  } catch (error: any) {
    if (error.message && error.message.includes('Veo API')) {
      console.error('[Video Generator] ❌ Veo API error creating job:', {
        error: error.message,
        modelName,
        promptLength: prompt?.length || 0,
        duration,
        apiUrl: apiUrl.replace(VEO_API_KEY || '', 'HIDDEN'),
      })
      throw error
    }
    console.error('[Video Generator] ❌ Error creating Veo job:', {
      error: error?.message || error,
      stack: error?.stack,
      modelName,
      promptLength: prompt?.length || 0,
    })
    throw new Error(`Failed to create Veo job: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Poll Veo API job status
 * Returns the current status and video data if completed
 */
export async function pollVeoJobStatus(jobId: string): Promise<VeoJobStatus> {
  if (!VEO_API_KEY) {
    throw new Error('Veo API key is not configured')
  }

  try {
    // Veo API status endpoint format: operations/{jobId} or jobs/{jobId}
    // Try multiple possible endpoint formats
    const possibleEndpoints = [
      `https://generativelanguage.googleapis.com/v1beta/operations/${jobId}?key=${VEO_API_KEY}`,
      `https://generativelanguage.googleapis.com/v1beta/${jobId}?key=${VEO_API_KEY}`,
      `https://generativelanguage.googleapis.com/v1beta/jobs/${jobId}?key=${VEO_API_KEY}`,
    ]

    let lastError: Error | null = null
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`[Video Generator] Polling Veo job status: ${endpoint}`)
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          if (response.status === 404 && possibleEndpoints.indexOf(endpoint) < possibleEndpoints.length - 1) {
            // Try next endpoint format
            continue
          }
          const errorText = await response.text().catch(() => 'Unknown error')
          throw new Error(`Veo API status check failed: ${response.status} ${response.statusText}. ${errorText.substring(0, 200)}`)
        }

        const data = await response.json()
        console.log(`[Video Generator] Veo job status response:`, JSON.stringify(data).substring(0, 1000))

        // Parse response to determine status
        // Common formats:
        // - { done: false, ... } -> processing
        // - { done: true, response: { videoUrl: ... } } -> completed
        // - { status: "completed", videoUrl: ... } -> completed
        // - { state: "SUCCEEDED", ... } -> completed
        
        let status: VeoJobStatus['status'] = 'pending'
        let videoUrl: string | undefined
        let videoBase64: string | undefined
        let error: string | undefined

        // Check if job is done/completed
        if (data.done === true || data.status === 'completed' || data.status === 'SUCCEEDED' || data.state === 'SUCCEEDED') {
          status = 'completed'
          
          // Extract video URL or base64
          if (data.response?.videoUrl) {
            videoUrl = data.response.videoUrl
          } else if (data.response?.video?.url) {
            videoUrl = data.response.video.url
          } else if (data.videoUrl) {
            videoUrl = data.videoUrl
          } else if (data.video?.url) {
            videoUrl = data.video.url
          } else if (data.response?.videoBase64) {
            videoBase64 = data.response.videoBase64
          } else if (data.videoBase64) {
            videoBase64 = data.videoBase64
          } else if (data.response?.video?.base64) {
            videoBase64 = data.response.video.base64
          }
        } else if (data.done === false || data.status === 'processing' || data.status === 'RUNNING' || data.state === 'RUNNING') {
          status = 'processing'
        } else if (data.status === 'failed' || data.status === 'FAILED' || data.state === 'FAILED' || data.error) {
          status = 'failed'
          error = data.error?.message || data.error || 'Video generation failed'
        } else if (data.status === 'pending' || data.state === 'PENDING') {
          status = 'pending'
        } else {
          // Default to processing if we can't determine
          status = 'processing'
        }

        return {
          jobId,
          status,
          videoUrl,
          videoBase64,
          error,
        }
      } catch (err: any) {
        lastError = err
        // If this isn't the last endpoint, try the next one
        if (possibleEndpoints.indexOf(endpoint) < possibleEndpoints.length - 1) {
          continue
        }
        throw err
      }
    }

    throw lastError || new Error('Failed to poll Veo job status: all endpoint formats failed')
  } catch (error: any) {
    console.error('[Video Generator] ❌ Error polling Veo job:', {
      jobId,
      error: error?.message || error,
      stack: error?.stack,
      attemptedEndpoints: possibleEndpoints.map(e => e.replace(VEO_API_KEY || '', 'HIDDEN')),
    })
    throw new Error(`Failed to poll Veo job status: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Generate video clip using Veo API (legacy synchronous function - now creates async job)
 * @deprecated Use createVeoJob and pollVeoJobStatus instead
 */
async function generateVeoClip(
  prompt: string,
  style: VideoStyle
): Promise<Buffer> {
  // Legacy function - now throws error to force async usage
  throw new Error('generateVeoClip is deprecated. Use createVeoJob and pollVeoJobStatus for async video generation.')
}

/**
 * Create Veo API jobs for all scenes in storyboard
 * Returns job IDs that need to be polled
 */
export async function createVeoJobsForStoryboard(
  storyboard: VideoStoryboard,
  style: VideoStyle = {}
): Promise<Array<{ jobId: string; sceneNumber: number; duration: number }>> {
  if (MOCK_MODE || !VIDEO_GENERATION_ENABLED) {
    console.log('[MOCK MODE] Skipping Veo job creation')
    return []
  }

  const jobs: Array<{ jobId: string; sceneNumber: number; duration: number }> = []

  for (const scene of storyboard.scenes) {
    try {
      const prompt = `${scene.description}\n\nAudio/Narration: ${scene.audioText}`
      
      const jobId = await createVeoJob(prompt, {
        ...style,
        duration: scene.duration,
      })

      jobs.push({
        jobId,
        sceneNumber: scene.sceneNumber,
        duration: scene.duration,
      })
      
      console.log(`[Video Generator] Created Veo job ${jobId} for scene ${scene.sceneNumber}`)
    } catch (error) {
      console.error(`Failed to create Veo job for scene ${scene.sceneNumber}:`, error)
      // Continue with other scenes even if one fails
    }
  }

  return jobs.sort((a, b) => a.sceneNumber - b.sceneNumber)
}

/**
 * Generate video clips from storyboard (legacy - now uses async jobs)
 * @deprecated Use createVeoJobsForStoryboard and poll jobs separately
 */
export async function generateVideoClips(
  storyboard: VideoStoryboard,
  style: VideoStyle = {}
): Promise<VideoClip[]> {
  // This function is deprecated - async jobs should be used instead
  // Return empty array to indicate async jobs are needed
  console.warn('[Video Generator] generateVideoClips is deprecated. Use createVeoJobsForStoryboard for async job creation.')
  return []
}

/**
 * Stitch multiple video clips together
 */
export async function stitchVideoClips(clips: VideoClip[]): Promise<Buffer> {
  if (MOCK_MODE || !VIDEO_GENERATION_ENABLED || clips.length === 0) {
    // Return empty buffer for mock mode
    return Buffer.from('')
  }

  if (clips.length === 1) {
    // No stitching needed
    return clips[0].buffer
  }

  if (!ffmpeg) {
    // If ffmpeg is not available, just return the first clip
    console.warn('[Video] ffmpeg not available, returning first clip only')
    return clips[0].buffer
  }

  return new Promise((resolve, reject) => {
    if (clips.length === 0) {
      reject(new Error('No clips to stitch'))
      return
    }

    // Simple approach: for now, just concatenate buffers
    // Full video stitching would require writing temp files and using ffmpeg concat
    // This is a simplified version for MVP
    try {
      // In a production implementation, you would:
      // 1. Write each clip to a temporary file
      // 2. Create a concat file listing all clips
      // 3. Use ffmpeg to concatenate with transitions
      // 4. Read the result back into a buffer
      
      // For now, return the first clip as a placeholder
      // TODO: Implement full video stitching with temp files
      console.log('[Video] Stitching clips (simplified - using first clip)')
      resolve(clips[0].buffer)
    } catch (err) {
      console.error('[Video] Stitching error:', err)
      // Fallback to first clip
      resolve(clips[0].buffer)
    }
  })
}

/**
 * Main function to generate video from response text
 */
export async function generateVideoFromResponse(
  responseText: string,
  studentName: string,
  context: EscalationContext,
  style: VideoStyle = {}
): Promise<Buffer> {
  // Early exit if video generation is not available
  if (MOCK_MODE || !VIDEO_GENERATION_ENABLED || !VEO_API_AVAILABLE) {
    console.log('[Video Generator] Video generation disabled or not available - returning empty buffer')
    // In mock/disabled mode, return empty buffer
    // The worker will handle setting a placeholder URL or skipping
    return Buffer.from('')
  }

  console.log('[Video Generator] Starting video generation with Veo API')
  
  // Step 1: Generate storyboard (this part works)
  const storyboard = await generateVideoPrompt(responseText, studentName, context)

  // Step 2: Generate video clips using Veo API
  const clips = await generateVideoClips(storyboard, style)

  if (clips.length === 0) {
    throw new Error('No video clips generated - check Veo API access and configuration')
  }

  // Step 3: Stitch clips together
  const finalVideo = await stitchVideoClips(clips)

  return finalVideo
}

