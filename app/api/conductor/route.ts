import { NextRequest, NextResponse } from 'next/server'
import { runSundayConductor, runConductorForAllCourses } from '@/lib/conductor/sunday-conductor'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createUnauthorizedError, createForbiddenError, validateRequired, validateType } from '@/lib/utils/api-errors'
import { getDemoModeInfo } from '@/lib/utils/demo-mode'
import { logger } from '@/lib/utils/logger'

/**
 * POST /api/conductor
 * Manually trigger the Sunday Night Conductor
 * 
 * Request body (optional):
 * {
 *   courseId?: string,      // Specific course ID (optional, runs for all if not provided)
 *   weekNumber?: number,    // Override week number (optional, uses current/demo week if not provided)
 *   manual?: boolean        // Always true for manual trigger
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    logger.apiRequest('POST', '/api/conductor')

    // Parse request body (optional)
    let body: {
      courseId?: string
      weekNumber?: number
      manual?: boolean
    } = {}

    try {
      const rawBody = await request.json()
      body = rawBody || {}
    } catch {
      // Body is optional, continue with defaults
    }

    const { courseId, weekNumber } = body

    // Validate weekNumber if provided
    if (weekNumber !== undefined) {
      const typeCheck = validateType({ weekNumber }, 'weekNumber', 'number')
      if (!typeCheck.isValid) {
        return createErrorResponse(
          new Error(typeCheck.error || 'Invalid weekNumber'),
          'Validation error'
        )
      }
      if (weekNumber < 1) {
        return createErrorResponse(
          new Error('weekNumber must be a positive number'),
          'Validation error'
        )
      }
    }

    // Validate courseId if provided
    if (courseId !== undefined) {
      const typeCheck = validateType({ courseId }, 'courseId', 'string')
      if (!typeCheck.isValid) {
        return createErrorResponse(
          new Error(typeCheck.error || 'Invalid courseId'),
          'Validation error'
        )
      }
    }

    // Authenticate user (verify they are a professor)
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = Date.now() - startTime
      logger.apiResponse('POST', '/api/conductor', 401, duration)
      return createUnauthorizedError()
    }

    // Verify user is a professor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'professor') {
      const duration = Date.now() - startTime
      logger.apiResponse('POST', '/api/conductor', 403, duration)
      return createForbiddenError('Only professors can trigger the conductor')
    }

    // Run conductor
    let result
    if (courseId) {
      // Run for specific course
      result = await runSundayConductor(courseId, weekNumber)
    } else {
      // Run for all courses (requires professor access)
      const results = await runConductorForAllCourses()
      const duration = Date.now() - startTime
      logger.apiResponse('POST', '/api/conductor', 200, duration, { coursesProcessed: results.length })
      
      const demoInfo = getDemoModeInfo()
      return NextResponse.json({
        success: true,
        message: `Conductor completed for ${results.length} course(s)`,
        results: results.map((r) => ({
          announcementId: r.announcementId,
          weekNumber: r.weekNumber,
          title: r.title,
          status: r.status,
        })),
        demoMode: {
          enabled: demoInfo.enabled,
          currentWeek: demoInfo.currentWeek,
        },
      })
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/conductor', 200, duration)
    
    const demoInfo = getDemoModeInfo()
    return NextResponse.json({
      success: true,
      message: 'Announcement draft created successfully',
      announcement: {
        id: result.announcementId,
        weekNumber: result.weekNumber,
        title: result.title,
        content: result.content,
        status: result.status,
      },
      demoMode: {
        enabled: demoInfo.enabled,
        currentWeek: demoInfo.currentWeek,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('POST', '/api/conductor', error, 500)
    return createErrorResponse(error, 'Failed to run conductor', true)
  }
}

/**
 * GET /api/conductor
 * Get conductor status/info (optional endpoint)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    logger.apiRequest('GET', '/api/conductor')

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = Date.now() - startTime
      logger.apiResponse('GET', '/api/conductor', 401, duration)
      return createUnauthorizedError()
    }

    // Get current week info using centralized demo mode utility
    const demoInfo = getDemoModeInfo()

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/conductor', 200, duration)

    return NextResponse.json({
      currentWeek: demoInfo.currentWeek,
      demoMode: demoInfo.enabled,
      demoWeek: demoInfo.demoWeek,
      mockMode: process.env.MOCK_MODE === 'true',
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('GET', '/api/conductor', error, 500)
    return createErrorResponse(error, 'Failed to get conductor status', true)
  }
}

