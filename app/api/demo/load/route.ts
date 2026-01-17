import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { storeDocumentsWithEmbeddings } from '@/lib/rag/vector-store'
import { 
  DEMO_COURSE_INFO,
  DEMO_SYLLABUS_CHUNKS, 
  DEMO_SCHEDULE, 
  DEMO_ANNOUNCEMENTS,
  DEMO_CHAT_LOGS,
  DEMO_ESCALATIONS 
} from '@/lib/utils/demo-data'
import { generateJoinCode } from '@/lib/utils/join-code'
import { logger } from '@/lib/utils/logger'

/**
 * Demo course loader endpoint
 * POST /api/demo/load
 * 
 * Seeds the database with a complete demo course setup for UCSC CMPS 5J
 * This allows instant demo setup without file uploads
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('[Demo Load] Starting demo course creation', { userId: user.id })

    // Get user profile to verify role and ensure they're a professor
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, email, name')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile) {
      logger.error('[Demo Load] Profile error or not found', {
        error: profileError,
        userId: user.id,
      })
      return NextResponse.json(
        {
          success: false,
          error: 'User profile not found. Please ensure your account is set up correctly.',
        },
        { status: 404 }
      )
    }

    // Only professors can create courses - ensure role is set correctly
    if (profile.role !== 'professor') {
      logger.warn('[Demo Load] User is not a professor, updating role', {
        userId: user.id,
        currentRole: profile.role,
      })
      
      // Update the profile to professor role for demo purposes
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'professor' })
        .eq('id', user.id)
      
      if (updateError) {
        logger.error('[Demo Load] Failed to update role', updateError)
        return NextResponse.json(
          {
            success: false,
            error: 'Could not set user role to professor. Please update your profile in Supabase.',
            details: updateError.message,
          },
          { status: 500 }
        )
      }
      
      logger.info('[Demo Load] Updated user role to professor', { userId: user.id })
    }

    // Use service role client to bypass RLS for course creation
    // This ensures the demo data can be loaded regardless of RLS policies
    const supabaseAdmin = createServiceClient()

    // Check if demo course already exists (use admin client to bypass RLS)
    const { data: existingCourse } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('professor_id', user.id)
      .eq('name', DEMO_COURSE_INFO.name)
      .maybeSingle()

    let courseId: string
    if (existingCourse) {
      courseId = existingCourse.id
      logger.info('[Demo Load] Using existing demo course', { courseId })
      
      // Clear existing demo data to start fresh (use admin client)
      await supabaseAdmin.from('course_content').delete().eq('course_id', courseId)
      await supabaseAdmin.from('schedules').delete().eq('course_id', courseId)
      await supabaseAdmin.from('announcements').delete().eq('course_id', courseId)
      await supabaseAdmin.from('chat_logs').delete().eq('course_id', courseId)
      await supabaseAdmin.from('escalations').delete().eq('course_id', courseId)
    } else {
      // Create new demo course using admin client to bypass RLS
      // Check if the demo join code already exists
      const { data: existingWithCode } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('join_code', DEMO_COURSE_INFO.joinCode)
        .maybeSingle()
      
      // If demo code exists, generate a unique one
      let joinCode = existingWithCode ? generateJoinCode() : DEMO_COURSE_INFO.joinCode
      
      // Ensure uniqueness (retry if collision)
      let attempts = 0
      while (attempts < 10) {
        const { data: existing } = await supabaseAdmin
          .from('courses')
          .select('id')
          .eq('join_code', joinCode)
          .maybeSingle()
        
        if (!existing) break
        joinCode = generateJoinCode()
        attempts++
      }

      logger.info('[Demo Load] Attempting to create course', {
        name: DEMO_COURSE_INFO.name,
        professor_id: user.id,
        join_code: joinCode,
      })

      // Use admin client to create course (bypasses RLS)
      const { data: newCourse, error: courseError } = await supabaseAdmin
        .from('courses')
        .insert({
          name: DEMO_COURSE_INFO.name,
          professor_id: user.id,
          join_code: joinCode,
        })
        .select('id, join_code')
        .single()

      if (courseError || !newCourse) {
        logger.error('[Demo Load] Failed to create course', {
          error: courseError,
          errorMessage: courseError?.message,
          errorCode: courseError?.code,
          errorDetails: courseError?.details,
          errorHint: courseError?.hint,
          userId: user.id,
          userName: user.email,
          attemptedJoinCode: joinCode,
        })
        
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to create course',
            details: courseError?.message || 'Unknown error',
            errorCode: courseError?.code,
          },
          { status: 500 }
        )
      }
      courseId = newCourse.id
      logger.info('[Demo Load] Created new demo course', { 
        courseId, 
        join_code: newCourse.join_code,
      })
    }

    // 1. Store syllabus chunks with embeddings
    logger.info('[Demo Load] Storing syllabus chunks', { count: DEMO_SYLLABUS_CHUNKS.length })
    const documents = DEMO_SYLLABUS_CHUNKS.map(chunk => ({
      content: chunk.content,
      metadata: {
        courseId,
        pageNumber: chunk.pageNumber,
        weekNumber: chunk.weekNumber,
        topic: chunk.topic,
        contentType: chunk.contentType,
      },
    }))
    
    await storeDocumentsWithEmbeddings(documents)
    logger.info('[Demo Load] Syllabus chunks stored successfully')

    // 2. Insert schedule entries (use admin client to bypass RLS)
    logger.info('[Demo Load] Inserting schedule entries', { count: DEMO_SCHEDULE.length })
    const scheduleRecords = DEMO_SCHEDULE.map(entry => ({
      course_id: courseId,
      week_number: entry.weekNumber,
      topic: entry.topic,
      assignments: entry.assignments || null,
      readings: entry.readings || null,
      due_date: entry.dueDate || null,
    }))
    
    const { error: scheduleError } = await supabaseAdmin
      .from('schedules')
      .insert(scheduleRecords)
    
    if (scheduleError) {
      logger.error('[Demo Load] Failed to insert schedule', scheduleError)
      throw scheduleError
    }
    logger.info('[Demo Load] Schedule entries inserted successfully')

    // 3. Insert announcements (use admin client to bypass RLS)
    logger.info('[Demo Load] Inserting announcements', { count: DEMO_ANNOUNCEMENTS.length })
    const announcementRecords = DEMO_ANNOUNCEMENTS.map(ann => ({
      course_id: courseId,
      week_number: ann.weekNumber,
      title: ann.title,
      content: ann.content,
      status: ann.status,
      published_at: ann.status === 'published' ? new Date().toISOString() : null,
    }))
    
    const { error: announcementError } = await supabaseAdmin
      .from('announcements')
      .insert(announcementRecords)
    
    if (announcementError) {
      logger.error('[Demo Load] Failed to insert announcements', announcementError)
      // Don't throw - announcements are optional
    } else {
      logger.info('[Demo Load] Announcements inserted successfully')
    }

    // 4. Note: Chat logs and escalations are typically created during actual usage
    // For demo purposes, we could create sample ones, but it's optional
    // They'll be generated naturally as users interact with the system

    logger.info('[Demo Load] Demo course loaded successfully', {
      courseId,
      chunksCreated: DEMO_SYLLABUS_CHUNKS.length,
      scheduleEntries: DEMO_SCHEDULE.length,
      announcementsCreated: DEMO_ANNOUNCEMENTS.length,
    })

    return NextResponse.json({ 
      success: true, 
      courseId,
      courseName: DEMO_COURSE_INFO.name,
      chunksCreated: DEMO_SYLLABUS_CHUNKS.length,
      scheduleEntries: DEMO_SCHEDULE.length,
      announcementsCreated: DEMO_ANNOUNCEMENTS.length,
      message: 'Demo course loaded successfully!',
    })
  } catch (error) {
    logger.error('[Demo Load] Demo load error', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load demo course',
      },
      { status: 500 }
    )
  }
}

