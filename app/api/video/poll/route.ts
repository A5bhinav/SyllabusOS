/**
 * API route to poll pending Veo video generation jobs
 * 
 * OPTIMIZED FOR SPEED:
 * - Uses single-scene videos (5-8 seconds) instead of multiple scenes
 * - Polls immediately after job creation
 * - Recommended polling interval: 15-30 seconds (faster detection)
 * 
 * Can be triggered by:
 * - Cron job (Vercel Cron, Supabase Edge Functions, etc.)
 * - Manual API call
 * - Client-side polling
 */

import { NextRequest, NextResponse } from 'next/server'
import { processPendingVideoGenerations } from '@/lib/video/worker'
import { createErrorResponse } from '@/lib/utils/api-errors'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds max for polling multiple jobs

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log(`\n${'='.repeat(60)}`)
    console.log('[Video Poll API] 🔄 Starting video job polling at', new Date().toISOString())
    console.log(`${'='.repeat(60)}`)
    
    const result = await processPendingVideoGenerations()
    
    const duration = Date.now() - startTime
    console.log('[Video Poll API] ✓ Polling complete:', {
      ...result,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
    
    if (result.failed > 0) {
      console.warn('[Video Poll API] ⚠️ Some jobs failed:', {
        failed: result.failed,
        completed: result.completed,
        created: result.created,
        polled: result.polled,
      })
    }
    
    console.log('[Video Poll API] 📊 Summary:', {
      created: result.created,
      polled: result.polled,
      completed: result.completed,
      failed: result.failed,
      duration: `${duration}ms`,
    })
    console.log(`${'='.repeat(60)}\n`)
    
    return NextResponse.json({
      success: true,
      ...result,
      duration,
      message: `Created ${result.created} jobs, polled ${result.polled} jobs, completed ${result.completed}, failed ${result.failed}`,
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error('[Video Poll API] ❌ Error polling video jobs:', {
      error: error?.message || error,
      stack: error?.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
    return createErrorResponse(error, 'Failed to poll video jobs')
  }
}

export async function GET(request: NextRequest) {
  // Allow GET for easy testing
  return POST(request)
}
