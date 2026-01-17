import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createUnauthorizedError, createForbiddenError, createNotFoundError, validateType } from '@/lib/utils/api-errors'
import { logger } from '@/lib/utils/logger'
import type { Announcement, UpdateAnnouncementRequest } from '@/types/api'

/**
 * PUT /api/announcements/[id]
 * Update an announcement (professors only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  
  try {
    const { id: announcementId } = await params
    logger.apiRequest('PUT', `/api/announcements/${announcementId}`)
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = Date.now() - startTime
      logger.apiResponse('PUT', `/api/announcements/${announcementId}`, 401, duration)
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
      logger.apiResponse('PUT', `/api/announcements/${announcementId}`, 403, duration)
      return createForbiddenError('Only professors can update announcements')
    }

    if (!announcementId) {
      return createErrorResponse(
        new Error('Announcement ID is required'),
        'Validation error'
      )
    }

    // Verify announcement exists and belongs to professor's course
    const { data: existingAnnouncement, error: fetchError } = await supabase
      .from('announcements')
      .select(`
        id,
        course_id,
        courses!inner (
          professor_id
        )
      `)
      .eq('id', announcementId)
      .single()

    if (fetchError || !existingAnnouncement) {
      return NextResponse.json(
        { error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Verify course belongs to this professor
    const course = Array.isArray(existingAnnouncement.courses) 
      ? existingAnnouncement.courses[0] 
      : existingAnnouncement.courses
    
    if (!course || course.professor_id !== user.id) {
      const duration = Date.now() - startTime
      logger.apiResponse('PUT', `/api/announcements/${announcementId}`, 403, duration)
      return createForbiddenError('Cannot update announcement for this course')
    }

    // Parse request body
    let body: UpdateAnnouncementRequest
    try {
      body = await request.json()
    } catch (error) {
      return createErrorResponse(
        new Error('Invalid JSON in request body'),
        'Invalid request body'
      )
    }

    const { title, content, status } = body

    // Build update object
    const updateData: any = {}

    if (title !== undefined) {
      const titleTypeCheck = validateType({ title }, 'title', 'string')
      if (!titleTypeCheck.isValid || title.trim().length === 0) {
        return createErrorResponse(
          new Error('title must be a non-empty string'),
          'Validation error'
        )
      }
      updateData.title = title.trim()
    }

    if (content !== undefined) {
      const contentTypeCheck = validateType({ content }, 'content', 'string')
      if (!contentTypeCheck.isValid || content.trim().length === 0) {
        return createErrorResponse(
          new Error('content must be a non-empty string'),
          'Validation error'
        )
      }
      updateData.content = content.trim()
    }

    if (status !== undefined) {
      if (!['draft', 'published'].includes(status)) {
        return createErrorResponse(
          new Error('status must be "draft" or "published"'),
          'Validation error'
        )
      }
      updateData.status = status

      // Set published_at timestamp when publishing
      if (status === 'published') {
        updateData.published_at = new Date().toISOString()
      }
    }

    // If no updates provided, return error
    if (Object.keys(updateData).length === 0) {
      return createErrorResponse(
        new Error('No update fields provided'),
        'Validation error'
      )
    }

    // Update announcement
    const { data: updatedAnnouncement, error: updateError } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', announcementId)
      .select()
      .single()

    if (updateError || !updatedAnnouncement) {
      throw updateError || new Error('Failed to update announcement')
    }

    const response: Announcement = {
      id: updatedAnnouncement.id,
      courseId: updatedAnnouncement.course_id,
      weekNumber: updatedAnnouncement.week_number,
      title: updatedAnnouncement.title,
      content: updatedAnnouncement.content,
      status: updatedAnnouncement.status,
      createdAt: updatedAnnouncement.created_at,
      updatedAt: updatedAnnouncement.updated_at,
      publishedAt: updatedAnnouncement.published_at || null,
    }

    const duration = Date.now() - startTime
    logger.apiResponse('PUT', `/api/announcements/${announcementId}`, 200, duration)
    return NextResponse.json(response)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('PUT', '/api/announcements/[id]', error, 500)
    return createErrorResponse(error, 'Failed to update announcement')
  }
}

/**
 * DELETE /api/announcements/[id]
 * Delete an announcement (professors only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  
  try {
    const { id: announcementId } = await params
    logger.apiRequest('DELETE', `/api/announcements/${announcementId}`)
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = Date.now() - startTime
      logger.apiResponse('DELETE', `/api/announcements/${announcementId}`, 401, duration)
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
      logger.apiResponse('DELETE', `/api/announcements/${announcementId}`, 403, duration)
      return createForbiddenError('Only professors can delete announcements')
    }

    if (!announcementId) {
      return createErrorResponse(
        new Error('Announcement ID is required'),
        'Validation error'
      )
    }

    // Verify announcement exists and belongs to professor's course
    const { data: existingAnnouncement, error: fetchError } = await supabase
      .from('announcements')
      .select(`
        id,
        course_id,
        courses!inner (
          professor_id
        )
      `)
      .eq('id', announcementId)
      .single()

    if (fetchError || !existingAnnouncement) {
      const duration = Date.now() - startTime
      logger.apiResponse('DELETE', `/api/announcements/${announcementId}`, 404, duration)
      return createNotFoundError('Announcement')
    }

    // Verify course belongs to this professor
    const courseForDelete = Array.isArray(existingAnnouncement.courses) 
      ? existingAnnouncement.courses[0] 
      : existingAnnouncement.courses
    
    if (!courseForDelete || courseForDelete.professor_id !== user.id) {
      const duration = Date.now() - startTime
      logger.apiResponse('DELETE', `/api/announcements/${announcementId}`, 403, duration)
      return createForbiddenError('Cannot delete announcement for this course')
    }

    // Delete announcement
    const { error: deleteError } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId)

    if (deleteError) {
      throw deleteError
    }

    const duration = Date.now() - startTime
    logger.apiResponse('DELETE', `/api/announcements/${announcementId}`, 200, duration)
    return NextResponse.json({ success: true })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('DELETE', '/api/announcements/[id]', error, 500)
    return createErrorResponse(error, 'Failed to delete announcement')
  }
}

