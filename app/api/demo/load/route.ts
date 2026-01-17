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

    // Get user profile to verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Only professors can create courses, but allow any authenticated user for demo
    // In production, you might want to check: if (profile?.role !== 'professor') { ... }

    // Check if demo course already exists
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id')
      .eq('professor_id', user.id)
      .eq('name', DEMO_COURSE_INFO.name)
      .single()

    let courseId: string
    if (existingCourse) {
      courseId = existingCourse.id
      logger.info('[Demo Load] Using existing demo course', { courseId })
      
      // Clear existing demo data to start fresh
      await supabase.from('course_content').delete().eq('course_id', courseId)
      await supabase.from('schedules').delete().eq('course_id', courseId)
      await supabase.from('announcements').delete().eq('course_id', courseId)
      await supabase.from('chat_logs').delete().eq('course_id', courseId)
      await supabase.from('escalations').delete().eq('course_id', courseId)
    } else {
      // Create new demo course
      let joinCode = DEMO_COURSE_INFO.joinCode
      
      // Ensure join code is unique (retry if collision)
      let attempts = 0
      while (attempts < 10) {
        const { data: existing } = await supabase
          .from('courses')
          .select('id')
          .eq('join_code', joinCode)
          .maybeSingle()
        
        if (!existing) break
        joinCode = generateJoinCode()
        attempts++
      }

      const { data: newCourse, error: courseError } = await supabase
        .from('courses')
        .insert({
          name: DEMO_COURSE_INFO.name,
          professor_id: user.id,
          join_code: joinCode,
        })
        .select('id')
        .single()

      if (courseError || !newCourse) {
        logger.error('[Demo Load] Failed to create course', courseError)
        throw new Error('Failed to create course')
      }
      courseId = newCourse.id
      logger.info('[Demo Load] Created new demo course', { courseId, joinCode })
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

    // 2. Insert schedule entries
    logger.info('[Demo Load] Inserting schedule entries', { count: DEMO_SCHEDULE.length })
    const scheduleRecords = DEMO_SCHEDULE.map(entry => ({
      course_id: courseId,
      week_number: entry.weekNumber,
      topic: entry.topic,
      assignments: entry.assignments || null,
      readings: entry.readings || null,
      due_date: entry.dueDate || null,
    }))
    
    const { error: scheduleError } = await supabase
      .from('schedules')
      .insert(scheduleRecords)
    
    if (scheduleError) {
      logger.error('[Demo Load] Failed to insert schedule', scheduleError)
      throw scheduleError
    }
    logger.info('[Demo Load] Schedule entries inserted successfully')

    // 3. Insert announcements
    logger.info('[Demo Load] Inserting announcements', { count: DEMO_ANNOUNCEMENTS.length })
    const announcementRecords = DEMO_ANNOUNCEMENTS.map(ann => ({
      course_id: courseId,
      week_number: ann.weekNumber,
      title: ann.title,
      content: ann.content,
      status: ann.status,
      published_at: ann.status === 'published' ? new Date().toISOString() : null,
    }))
    
    const { error: announcementError } = await supabase
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

