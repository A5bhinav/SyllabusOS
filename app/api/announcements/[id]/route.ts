import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Announcement, UpdateAnnouncementRequest } from '@/types/api'

/**
 * PUT /api/announcements/[id]
 * Update an announcement (professors only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: announcementId } = await params
    const supabase = await createClient()

    // Authenticate user
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
        { error: 'Forbidden - only professors can update announcements' },
        { status: 403 }
      )
    }

    if (!announcementId) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
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
      return NextResponse.json(
        { error: 'Forbidden - cannot update announcement for this course' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: UpdateAnnouncementRequest = await request.json()
    const { title, content, status } = body

    // Build update object
    const updateData: any = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json(
          { error: 'title must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.title = title.trim()
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json(
          { error: 'content must be a non-empty string' },
          { status: 400 }
        )
      }
      updateData.content = content.trim()
    }

    if (status !== undefined) {
      if (!['draft', 'published'].includes(status)) {
        return NextResponse.json(
          { error: 'status must be "draft" or "published"' },
          { status: 400 }
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
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
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

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Announcements API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to update announcement',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
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
  try {
    const { id: announcementId } = await params
    const supabase = await createClient()

    // Authenticate user
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
        { error: 'Forbidden - only professors can delete announcements' },
        { status: 403 }
      )
    }

    if (!announcementId) {
      return NextResponse.json(
        { error: 'Announcement ID is required' },
        { status: 400 }
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
    const courseForDelete = Array.isArray(existingAnnouncement.courses) 
      ? existingAnnouncement.courses[0] 
      : existingAnnouncement.courses
    
    if (!courseForDelete || courseForDelete.professor_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden - cannot delete announcement for this course' },
        { status: 403 }
      )
    }

    // Delete announcement
    const { error: deleteError } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Announcements API] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to delete announcement',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

