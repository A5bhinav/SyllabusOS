import { NextRequest, NextResponse } from 'next/server'
import { runSundayConductor, runConductorForAllCourses } from '@/lib/conductor/sunday-conductor'
import { createClient } from '@/lib/supabase/server'

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
  try {
    // Parse request body (optional)
    let body: {
      courseId?: string
      weekNumber?: number
      manual?: boolean
    } = {}

    try {
      body = await request.json()
    } catch {
      // Body is optional, continue with defaults
    }

    const { courseId, weekNumber } = body

    // Authenticate user (verify they are a professor)
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    // Verify user is a professor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'professor') {
      return NextResponse.json(
        { error: 'Forbidden - only professors can trigger the conductor' },
        { status: 403 }
      )
    }

    // Run conductor
    let result
    if (courseId) {
      // Run for specific course
      result = await runSundayConductor(courseId, weekNumber)
    } else {
      // Run for all courses (requires professor access)
      const results = await runConductorForAllCourses()
      return NextResponse.json({
        success: true,
        message: `Conductor completed for ${results.length} course(s)`,
        results: results.map((r) => ({
          announcementId: r.announcementId,
          weekNumber: r.weekNumber,
          title: r.title,
          status: r.status,
        })),
      })
    }

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
    })
  } catch (error) {
    console.error('[Conductor API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to run conductor',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/conductor
 * Get conductor status/info (optional endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - please log in' },
        { status: 401 }
      )
    }

    // Get current week info
    const demoMode = process.env.DEMO_MODE === 'true'
    const currentWeek = demoMode
      ? parseInt(process.env.DEMO_WEEK || '4', 10)
      : Math.max(1, Math.floor((Date.now() - new Date(new Date().getFullYear(), 7, 20).getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1)

    return NextResponse.json({
      currentWeek,
      demoMode,
      mockMode: process.env.MOCK_MODE === 'true',
    })
  } catch (error) {
    console.error('[Conductor API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to get conductor status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

