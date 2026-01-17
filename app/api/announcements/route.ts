import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createUnauthorizedError, createNotFoundError, validateRequired, validateType } from '@/lib/utils/api-errors'
import { logger } from '@/lib/utils/logger'
import type { Announcement, CreateAnnouncementRequest } from '@/types/api'

/**
 * GET /api/announcements
 * Get announcements for the authenticated user
 * - Professors see all announcements (drafts + published)
 * - Students see only published announcements
 * 
 * Query params (optional):
 * - courseId: Filter by course ID
 * - status: Filter by status ('draft' | 'published')
 * - weekNumber: Filter by week number
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    logger.apiRequest('GET', '/api/announcements')
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = Date.now() - startTime
      logger.apiResponse('GET', '/api/announcements', 401, duration)
      return createUnauthorizedError()
    }

    // Get user profile to determine role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      const duration = Date.now() - startTime
      logger.apiResponse('GET', '/api/announcements', 404, duration)
      return createNotFoundError('User profile')
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const courseId = searchParams.get('courseId')
    const status = searchParams.get('status') as 'draft' | 'published' | null
    const weekNumber = searchParams.get('weekNumber')
      ? parseInt(searchParams.get('weekNumber')!, 10)
      : null

    // Build query
    let query = supabase
      .from('announcements')
      .select('*')
      .order('week_number', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply filters based on role
    if (profile.role === 'professor') {
      // Professors see all announcements for their courses
      if (courseId) {
        // Verify the course belongs to this professor
        const { data: course } = await supabase
          .from('courses')
          .select('id')
          .eq('id', courseId)
          .eq('professor_id', user.id)
          .single()

        if (course) {
          query = query.eq('course_id', courseId)
        } else {
          return NextResponse.json(
            { error: 'Course not found or access denied' },
            { status: 404 }
          )
        }
      } else {
        // Get all courses for this professor
        const { data: courses } = await supabase
          .from('courses')
          .select('id')
          .eq('professor_id', user.id)

        if (courses && courses.length > 0) {
          const courseIds = courses.map((c) => c.id)
          query = query.in('course_id', courseIds)
        } else {
          // No courses, return empty array
          return NextResponse.json([])
        }
      }
    } else {
      // Students see only published announcements
      query = query.eq('status', 'published')
      if (courseId) {
        query = query.eq('course_id', courseId)
      }
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (weekNumber !== null) {
      query = query.eq('week_number', weekNumber)
    }

    const { data: announcements, error: announcementsError } = await query

    if (announcementsError) {
      throw announcementsError
    }

    // Transform response to match API contract
    const response: Announcement[] = (announcements || []).map((a: any) => ({
      id: a.id,
      courseId: a.course_id,
      weekNumber: a.week_number,
      title: a.title,
      content: a.content,
      status: a.status,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      publishedAt: a.published_at || null,
    }))

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/announcements', 200, duration, { count: response.length })
    return NextResponse.json(response)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('GET', '/api/announcements', error, 500)
    return createErrorResponse(error, 'Failed to fetch announcements')
  }
}

/**
 * POST /api/announcements
 * Create a new announcement (professors only)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    logger.apiRequest('POST', '/api/announcements')
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = Date.now() - startTime
      logger.apiResponse('POST', '/api/announcements', 401, duration)
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
      logger.apiResponse('POST', '/api/announcements', 403, duration)
      return createErrorResponse(
        new Error('Forbidden - only professors can create announcements'),
        'Forbidden'
      )
    }

    // Parse request body
    let body: CreateAnnouncementRequest & { courseId?: string }
    try {
      body = await request.json()
    } catch (error) {
      return createErrorResponse(
        new Error('Invalid JSON in request body'),
        'Invalid request body'
      )
    }

    let { weekNumber, title, content, courseId } = body

    // Validate required fields
    const requiredValidation = validateRequired(body, ['weekNumber', 'title', 'content'])
    if (!requiredValidation.isValid) {
      const errorMsg = requiredValidation.errors.map(e => e.message).join(', ')
      return createErrorResponse(
        new Error(errorMsg),
        'Validation error'
      )
    }

    // Validate types
    const weekNumberTypeCheck = validateType({ weekNumber }, 'weekNumber', 'number')
    if (!weekNumberTypeCheck.isValid || weekNumber < 1) {
      return createErrorResponse(
        new Error('weekNumber must be a positive number'),
        'Validation error'
      )
    }

    const titleTypeCheck = validateType({ title }, 'title', 'string')
    if (!titleTypeCheck.isValid || title.trim().length === 0) {
      return createErrorResponse(
        new Error('title must be a non-empty string'),
        'Validation error'
      )
    }

    const contentTypeCheck = validateType({ content }, 'content', 'string')
    if (!contentTypeCheck.isValid || content.trim().length === 0) {
      return createErrorResponse(
        new Error('content must be a non-empty string'),
        'Validation error'
      )
    }

    // If courseId not provided, use professor's first course
    if (!courseId || typeof courseId !== 'string') {
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('professor_id', user.id)
        .limit(1)

      if (!courses || courses.length === 0) {
        return NextResponse.json(
          { error: 'No courses found. Please create a course first.' },
          { status: 400 }
        )
      }

      courseId = courses[0].id
    }

    // Verify course exists and belongs to this professor
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('professor_id', user.id)
      .single()

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found or access denied' },
        { status: 404 }
      )
    }

    // Create announcement
    const { data: announcement, error: insertError } = await supabase
      .from('announcements')
      .insert({
        course_id: courseId,
        week_number: weekNumber,
        title: title.trim(),
        content: content.trim(),
        status: 'draft',
      })
      .select()
      .single()

    if (insertError || !announcement) {
      throw insertError || new Error('Failed to create announcement')
    }

    const response: Announcement = {
      id: announcement.id,
      courseId: announcement.course_id,
      weekNumber: announcement.week_number,
      title: announcement.title,
      content: announcement.content,
      status: announcement.status,
      createdAt: announcement.created_at,
      updatedAt: announcement.updated_at,
      publishedAt: announcement.published_at || null,
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/announcements', 201, duration)
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('POST', '/api/announcements', error, 500)
    return createErrorResponse(error, 'Failed to create announcement')
  }
}

