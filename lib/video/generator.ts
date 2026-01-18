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

/**
 * Check if video generation is enabled
 */
export function isVideoGenerationEnabled(): boolean {
  return !MOCK_MODE && VIDEO_GENERATION_ENABLED && !!VEO_API_KEY
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

Create 2-4 video scenes (4-8 seconds each) that:
1. Are professional, empathetic, and clear
2. Visualize key points from the response
3. Use appropriate imagery:
   - Calendars for deadline extensions
   - Checkmarks for confirmations/approvals
   - Supportive icons for empathy
   - Question marks for clarifications
   - Academic settings for course context
4. Match the tone of the response (supportive, informative, etc.)

Return ONLY valid JSON with this structure:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "description": "Detailed visual description for Veo (be specific about colors, lighting, objects, text overlays)",
      "audioText": "Exact text to be narrated (should match response content)",
      "duration": 5
    }
  ]
}

Keep total duration under ${MAX_VIDEO_DURATION} seconds. Each scene should be 4-8 seconds.
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
  } catch (error) {
    console.error('Failed to generate video storyboard:', error)
    // Fallback to simple storyboard
    return {
      scenes: [
        {
          sceneNumber: 1,
          description: 'Professional academic setting with warm lighting. Text overlay with response summary.',
          audioText: responseText.substring(0, 150),
          duration: 8,
        },
      ],
    }
  }
}

/**
 * Generate video clip using Veo API
 * Note: This is a placeholder - actual Veo API integration would go here
 */
async function generateVeoClip(
  prompt: string,
  style: VideoStyle
): Promise<Buffer> {
  if (MOCK_MODE || !VIDEO_GENERATION_ENABLED || !VEO_API_KEY) {
    // Return mock video buffer (empty MP4)
    // In real implementation, this would be a placeholder video
    return Buffer.from('')
  }

  // TODO: Implement actual Veo API call
  // Veo API would be called here using Google AI Studio or Vertex AI
  // For now, this is a placeholder structure

  const veoPrompt = `
${prompt}

Style: ${style.tone || 'professional'}, academic setting, warm lighting
Aspect Ratio: ${style.aspectRatio || '16:9'}
Duration: ${style.duration || 5} seconds
Quality: High definition, smooth motion
`

  // Example API call structure (would need actual Veo API implementation):
  /*
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/veo-3.1:generateVideo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VEO_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: veoPrompt,
      aspectRatio: style.aspectRatio || '16:9',
      duration: style.duration || 5,
    }),
  })

  const data = await response.json()
  // Download video from data.videoUrl or data.videoBuffer
  // Return as Buffer
  */

  throw new Error('Veo API integration not yet implemented. Enable MOCK_MODE for development.')
}

/**
 * Generate video clips from storyboard
 */
export async function generateVideoClips(
  storyboard: VideoStoryboard,
  style: VideoStyle = {}
): Promise<VideoClip[]> {
  if (MOCK_MODE || !VIDEO_GENERATION_ENABLED) {
    // Return empty clips array - will be handled by mock mode
    console.log('[MOCK MODE] Skipping video clip generation')
    return []
  }

  const clips: VideoClip[] = []

  for (const scene of storyboard.scenes) {
    try {
      const prompt = `${scene.description}\n\nAudio/Narration: ${scene.audioText}`
      
      const clipBuffer = await generateVeoClip(prompt, {
        ...style,
        duration: scene.duration,
      })

      clips.push({
        buffer: clipBuffer,
        duration: scene.duration,
        order: scene.sceneNumber,
      })
    } catch (error) {
      console.error(`Failed to generate clip for scene ${scene.sceneNumber}:`, error)
      // Continue with other clips even if one fails
    }
  }

  return clips.sort((a, b) => a.order - b.order)
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
  if (MOCK_MODE || !VIDEO_GENERATION_ENABLED) {
    console.log('[MOCK MODE] Video generation skipped - returning empty buffer')
    // In mock mode, return empty buffer
    // The worker will handle setting a placeholder URL
    return Buffer.from('')
  }

  // Step 1: Generate storyboard
  const storyboard = await generateVideoPrompt(responseText, studentName, context)

  // Step 2: Generate video clips
  const clips = await generateVideoClips(storyboard, style)

  if (clips.length === 0) {
    throw new Error('No video clips generated')
  }

  // Step 3: Stitch clips together
  const finalVideo = await stitchVideoClips(clips)

  return finalVideo
}

