import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processPDF } from '@/lib/rag/chunking'
import { storeDocumentsWithEmbeddings } from '@/lib/rag/vector-store'
import { parseScheduleFile } from '@/lib/utils/schedule-parser'
import type { UploadResponse } from '@/types/api'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds for file processing

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Only professors can upload
    if (profile.role !== 'professor') {
      return NextResponse.json(
        { success: false, error: 'Only professors can upload course materials' },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const syllabusFile = formData.get('syllabus') as File | null
    const scheduleFile = formData.get('schedule') as File | null
    const courseIdParam = formData.get('courseId') as string | null

    if (!syllabusFile) {
      return NextResponse.json(
        { success: false, error: 'Syllabus file is required' },
        { status: 400 }
      )
    }

    if (!scheduleFile) {
      return NextResponse.json(
        { success: false, error: 'Schedule file is required' },
        { status: 400 }
      )
    }

    // Validate file types
    if (syllabusFile.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Syllabus must be a PDF file' },
        { status: 400 }
      )
    }

    // Create or get course
    let courseId: string = courseIdParam || ''

    if (!courseId) {
      // Create new course
      const courseName = (formData.get('courseName') as string) || 'New Course'
      
      const { data: newCourse, error: courseError } = await supabase
        .from('courses')
        .insert({
          name: courseName,
          professor_id: user.id,
        })
        .select('id')
        .single()

      if (courseError || !newCourse) {
        return NextResponse.json(
          { success: false, error: `Failed to create course: ${courseError?.message}` },
          { status: 500 }
        )
      }

      courseId = newCourse.id
    } else {
      // Verify course belongs to professor
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, professor_id')
        .eq('id', courseId)
        .single()

      if (courseError || !course) {
        return NextResponse.json(
          { success: false, error: 'Course not found' },
          { status: 404 }
        )
      }

      if (course.professor_id !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized to modify this course' },
          { status: 403 }
        )
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
      console.warn('Schedule parsing errors:', scheduleResult.errors)
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
        console.error('Failed to store schedule:', scheduleError)
        // Continue even if schedule storage fails
      } else {
        scheduleEntriesCount = scheduleResult.entries.length
      }
    }

    const response: UploadResponse = {
      success: true,
      courseId,
      chunksCreated: chunks.length,
      scheduleEntries: scheduleEntriesCount,
    }

    if (scheduleResult.errors.length > 0) {
      // Include warnings in response
      return NextResponse.json({
        ...response,
        warnings: scheduleResult.errors,
      })
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Upload error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    
    // Provide more specific error messages
    let errorMessage = 'Failed to process upload'
    if (error instanceof Error) {
      errorMessage = error.message
      // Check for common issues
      if (error.message.includes('GOOGLE_GENAI_API_KEY')) {
        errorMessage = 'Google Gemini API key is not configured. Please set GOOGLE_GENAI_API_KEY in your .env file, or enable MOCK_MODE=true for development.'
      } else if (error.message.includes('embedding')) {
        errorMessage = `Failed to generate embeddings: ${error.message}. Check your API key or enable MOCK_MODE=true for development.`
      } else if (error.message.includes('database') || error.message.includes('relation')) {
        errorMessage = `Database error: ${error.message}. Please ensure all migrations have been run.`
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}

