import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processPDF } from '@/lib/rag/chunking'
import { storeDocumentsWithEmbeddings } from '@/lib/rag/vector-store'
import { parseScheduleFile } from '@/lib/utils/schedule-parser'
import { createErrorResponse, createUnauthorizedError, createForbiddenError, createNotFoundError } from '@/lib/utils/api-errors'
import { getDemoModeInfo } from '@/lib/utils/demo-mode'
import { logger } from '@/lib/utils/logger'
import type { UploadResponse } from '@/types/api'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for file processing

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    logger.apiRequest('POST', '/api/upload')

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const duration = Date.now() - startTime
      logger.apiResponse('POST', '/api/upload', 401, duration)
      return createUnauthorizedError()
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      const duration = Date.now() - startTime
      logger.apiResponse('POST', '/api/upload', 404, duration)
      return createNotFoundError('User profile')
    }

    // Only professors can upload
    if (profile.role !== 'professor') {
      const duration = Date.now() - startTime
      logger.apiResponse('POST', '/api/upload', 403, duration)
      return createForbiddenError('Only professors can upload course materials')
    }

    // Parse form data
    const formData = await request.formData()
    const syllabusFile = formData.get('syllabus') as File | null
    const scheduleFile = formData.get('schedule') as File | null
    const courseIdParam = formData.get('courseId') as string | null

    if (!syllabusFile) {
      return createErrorResponse(
        new Error('Syllabus file is required'),
        'Validation error'
      )
    }

    if (!scheduleFile) {
      return createErrorResponse(
        new Error('Schedule file is required'),
        'Validation error'
      )
    }

    // Validate file types
    if (syllabusFile.type !== 'application/pdf') {
      return createErrorResponse(
        new Error('Syllabus must be a PDF file'),
        'Validation error'
      )
    }

    // Validate file sizes (e.g., max 10MB for syllabus, 5MB for schedule)
    const maxSyllabusSize = 10 * 1024 * 1024 // 10MB
    const maxScheduleSize = 5 * 1024 * 1024 // 5MB

    if (syllabusFile.size > maxSyllabusSize) {
      return createErrorResponse(
        new Error(`Syllabus file size exceeds maximum allowed size of ${maxSyllabusSize / (1024 * 1024)}MB`),
        'Validation error'
      )
    }

    if (scheduleFile.size > maxScheduleSize) {
      return createErrorResponse(
        new Error(`Schedule file size exceeds maximum allowed size of ${maxScheduleSize / (1024 * 1024)}MB`),
        'Validation error'
      )
    }

    // Create or get course
    let courseId: string = courseIdParam || ''

    if (!courseId) {
      // Create new course
      const courseName = (formData.get('courseName') as string) || 'New Course'
      
      // Generate join code
      const { generateJoinCode } = await import('@/lib/utils/join-code')
      let joinCode = generateJoinCode()
      
      // Ensure uniqueness (retry if collision)
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
          name: courseName,
          professor_id: user.id,
          join_code: joinCode,
        })
        .select('id, join_code')
        .single()

      if (courseError || !newCourse) {
        logger.error('[Upload API] Failed to create course', courseError)
        return createErrorResponse(
          courseError || new Error('Failed to create course'),
          'Failed to create course'
        )
      }

      courseId = newCourse.id
    } else {
      // Verify course belongs to professor
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, professor_id, join_code')
        .eq('id', courseId)
        .single()

      if (courseError || !course) {
        const duration = Date.now() - startTime
        logger.apiResponse('POST', '/api/upload', 404, duration)
        return createNotFoundError('Course')
      }

      if (course.professor_id !== user.id) {
        const duration = Date.now() - startTime
        logger.apiResponse('POST', '/api/upload', 403, duration)
        return createForbiddenError('Unauthorized to modify this course')
      }

      // If course exists but has no join code, generate one
      if (!course.join_code) {
        const { generateJoinCode } = await import('@/lib/utils/join-code')
        let joinCode = generateJoinCode()
        
        // Ensure uniqueness
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
        
        const { error: updateError } = await supabase
          .from('courses')
          .update({ join_code: joinCode })
          .eq('id', courseId)
        
        if (updateError) {
          logger.warn('[Upload API] Failed to generate join code for existing course', updateError)
        }
      }
    }

    // Process PDF syllabus
    const syllabusBuffer = Buffer.from(await syllabusFile.arrayBuffer())
    const chunks = await processPDF(syllabusBuffer, courseId)

    // Store chunks with embeddings
    const documents = chunks.map(chunk => ({
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

    // Parse schedule file
    const scheduleResult = await parseScheduleFile(scheduleFile)

    if (scheduleResult.errors.length > 0) {
      logger.warn('[Upload API] Schedule parsing errors', { errors: scheduleResult.errors })
    }

    // Store schedule entries
    let scheduleEntriesCount = 0
    if (scheduleResult.entries.length > 0) {
      const scheduleRecords = scheduleResult.entries.map(entry => ({
        course_id: courseId,
        week_number: entry.weekNumber,
        topic: entry.topic || '',
        assignments: entry.assignments || null,
        readings: entry.readings || null,
        due_date: entry.dueDate ? new Date(entry.dueDate).toISOString().split('T')[0] : null,
      }))

      // Insert schedule entries (upsert to handle duplicates)
      const { error: scheduleError } = await supabase
        .from('schedules')
        .upsert(scheduleRecords, {
          onConflict: 'course_id,week_number',
        })

      if (scheduleError) {
        logger.error('[Upload API] Failed to store schedule', scheduleError)
        // Continue even if schedule storage fails
      } else {
        scheduleEntriesCount = scheduleResult.entries.length
      }
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/upload', 200, duration, {
      courseId,
      chunksCreated: chunks.length,
      scheduleEntries: scheduleEntriesCount,
    })

    // Get join code for response
    const { data: courseWithCode } = await supabase
      .from('courses')
      .select('join_code')
      .eq('id', courseId)
      .single()

    const demoInfo = getDemoModeInfo()
    const response: UploadResponse & { 
      joinCode?: string
      demoMode?: { enabled: boolean; currentWeek?: number } 
    } = {
      success: true,
      courseId,
      chunksCreated: chunks.length,
      scheduleEntries: scheduleEntriesCount,
      ...(courseWithCode?.join_code && { joinCode: courseWithCode.join_code }),
      ...(scheduleResult.errors.length > 0 && { warnings: scheduleResult.errors }),
      ...(demoInfo.enabled && {
        demoMode: {
          enabled: demoInfo.enabled,
          currentWeek: demoInfo.currentWeek,
        },
      }),
    }

    return NextResponse.json(response)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.apiError('POST', '/api/upload', error, 500)
    
    // Provide more specific error messages for common issues
    if (error instanceof Error) {
      if (error.message.includes('GOOGLE_GENAI_API_KEY') || error.message.includes('MOCK_MODE')) {
        // Embedding/API related errors
        return createErrorResponse(
          error,
          'Failed to process upload',
          true
        )
      } else if (error.message.includes('embedding') || error.message.includes('Failed to generate embeddings')) {
        const enhancedError = new Error(
          `${error.message} Enable MOCK_MODE=true in your .env file to skip API calls during development.`
        )
        return createErrorResponse(enhancedError, 'Failed to process upload', true)
      } else if (error.message.includes('database') || error.message.includes('relation')) {
        const enhancedError = new Error(
          `Database error: ${error.message}. Please ensure all migrations have been run.`
        )
        return createErrorResponse(enhancedError, 'Failed to process upload', true)
      }
    }
    
    return createErrorResponse(error, 'Failed to process upload', true)
  }
}

