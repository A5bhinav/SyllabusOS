import { createServiceClient } from '@/lib/supabase/server'
import { generateChatCompletion } from '@/lib/ai/client'
import type { Schedule, Announcement } from '@/types/database'

export interface ConductorResult {
  announcementId: string
  weekNumber: number
  title: string
  content: string
  status: 'draft' | 'published'
}

/**
 * Get current week number
 * Uses DEMO_WEEK if DEMO_MODE is enabled, otherwise calculates from current date
 */
function getCurrentWeek(): number {
  const demoMode = process.env.DEMO_MODE === 'true'
  
  if (demoMode) {
    const demoWeek = parseInt(process.env.DEMO_WEEK || '4', 10)
    console.log(`[Conductor] DEMO_MODE enabled - using week ${demoWeek}`)
    return demoWeek
  }

  // Calculate week number from current date
  // Assuming semester starts around August 20th (adjust as needed)
  const semesterStart = new Date(new Date().getFullYear(), 7, 20) // August 20
  const now = new Date()
  const diffTime = now.getTime() - semesterStart.getTime()
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
  
  // Return at least week 1
  const weekNumber = Math.max(1, diffWeeks + 1)
  console.log(`[Conductor] Calculated week number: ${weekNumber}`)
  
  return weekNumber
}

/**
 * Generate announcement content using LLM in Professor persona
 * Returns mock announcement if MOCK_MODE is enabled
 */
async function generateAnnouncementContent(
  schedule: Schedule,
  courseName: string
): Promise<{ title: string; content: string }> {
  const mockMode = process.env.MOCK_MODE === 'true'

  if (mockMode) {
    // Return template-based mock announcement
    const mockTitle = `Week ${schedule.week_number}: ${schedule.topic}`
    const mockContent = `Welcome to Week ${schedule.week_number}!

This week we'll be focusing on ${schedule.topic}.

${schedule.assignments ? `**Assignments:** ${schedule.assignments}` : ''}
${schedule.readings ? `**Readings:** ${schedule.readings}` : ''}
${schedule.due_date ? `**Due Date:** ${new Date(schedule.due_date).toLocaleDateString()}` : ''}

Please reach out if you have any questions.

Best regards,
Professor`

    return {
      title: mockTitle,
      content: mockContent.trim(),
    }
  }

  // Generate announcement using LLM
  const systemPrompt = `You are a helpful professor writing a weekly course announcement. 
Write in a friendly, professional tone. Keep it concise but informative. 
Include the week number, topic, assignments, readings, and due dates from the schedule.`

  const prompt = `Generate a weekly course announcement for ${courseName}.

Week: ${schedule.week_number}
Topic: ${schedule.topic}
${schedule.assignments ? `Assignments: ${schedule.assignments}` : ''}
${schedule.readings ? `Readings: ${schedule.readings}` : ''}
${schedule.due_date ? `Due Date: ${schedule.due_date}` : ''}

Generate both a title and content for this announcement. The title should be concise (e.g., "Week X: Topic Name"). The content should be a warm, professional message that introduces the week's content and reminds students about assignments and readings.`

  try {
    const response = await generateChatCompletion(prompt, systemPrompt)
    const text = response.text.trim()

    // Parse title and content from response
    // Expected format: Title on first line, then content
    const lines = text.split('\n').filter((line) => line.trim().length > 0)
    let title = `Week ${schedule.week_number}: ${schedule.topic}`
    let content = text

    // Try to extract title if format matches
    if (lines.length > 0) {
      const firstLine = lines[0].trim()
      // If first line looks like a title (short, no punctuation at end, or ends with colon)
      if (firstLine.length < 60 && (firstLine.endsWith(':') || !firstLine.match(/[.!?]$/))) {
        title = firstLine.replace(/^Title:\s*/i, '').trim()
        content = lines.slice(1).join('\n').trim() || text
      }
    }

    return {
      title: title,
      content: content,
    }
  } catch (error) {
    console.error('[Conductor] Error generating announcement with LLM:', error)
    
    // Fallback to template-based announcement if LLM fails
    const fallbackTitle = `Week ${schedule.week_number}: ${schedule.topic}`
    const fallbackContent = `Welcome to Week ${schedule.week_number}!

This week we'll be covering ${schedule.topic}.

${schedule.assignments ? `**Assignments:** ${schedule.assignments}` : ''}
${schedule.readings ? `**Readings:** ${schedule.readings}` : ''}
${schedule.due_date ? `**Due Date:** ${new Date(schedule.due_date).toLocaleDateString()}` : ''}

Best regards,
Professor`

    return {
      title: fallbackTitle,
      content: fallbackContent.trim(),
    }
  }
}

/**
 * Sunday Night Conductor
 * Reads schedule for the current week and generates an announcement draft
 */
export async function runSundayConductor(
  courseId: string,
  weekNumber?: number
): Promise<ConductorResult> {
  const supabase = createServiceClient()

  // Determine week number
  const targetWeek = weekNumber || getCurrentWeek()

  // Verify course exists
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, name')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    throw new Error(`Course not found: ${courseId}`)
  }

  // Check if announcement already exists for this week
  const { data: existingAnnouncement } = await supabase
    .from('announcements')
    .select('id, status')
    .eq('course_id', courseId)
    .eq('week_number', targetWeek)
    .maybeSingle()

  if (existingAnnouncement) {
    console.log(
      `[Conductor] Announcement already exists for week ${targetWeek} (status: ${existingAnnouncement.status})`
    )
    
    // Return existing announcement
    const { data: announcement } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', existingAnnouncement.id)
      .single()

    if (announcement) {
      return {
        announcementId: announcement.id,
        weekNumber: announcement.week_number,
        title: announcement.title,
        content: announcement.content,
        status: announcement.status,
      }
    }
  }

  // Get schedule for the target week
  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select('*')
    .eq('course_id', courseId)
    .eq('week_number', targetWeek)
    .single()

  if (scheduleError || !schedule) {
    throw new Error(
      `No schedule found for course ${courseId} at week ${targetWeek}. Please upload a schedule first.`
    )
  }

  // Generate announcement content
  const { title, content } = await generateAnnouncementContent(
    schedule as Schedule,
    course.name
  )

  // Store draft in announcements table
  const { data: newAnnouncement, error: insertError } = await supabase
    .from('announcements')
    .insert({
      course_id: courseId,
      week_number: targetWeek,
      title,
      content,
      status: 'draft',
    })
    .select()
    .single()

  if (insertError || !newAnnouncement) {
    throw new Error(
      `Failed to create announcement: ${insertError?.message || 'Unknown error'}`
    )
  }

  console.log(
    `[Conductor] Created announcement draft for week ${targetWeek}: ${newAnnouncement.id}`
  )

  return {
    announcementId: newAnnouncement.id,
    weekNumber: newAnnouncement.week_number,
    title: newAnnouncement.title,
    content: newAnnouncement.content,
    status: newAnnouncement.status as 'draft' | 'published',
  }
}

/**
 * Run conductor for all courses
 * Useful for scheduled execution
 */
export async function runConductorForAllCourses(): Promise<ConductorResult[]> {
  const supabase = createServiceClient()
  const weekNumber = getCurrentWeek()

  // Get all courses
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id')

  if (coursesError || !courses) {
    throw new Error(`Failed to fetch courses: ${coursesError?.message || 'Unknown error'}`)
  }

  const results: ConductorResult[] = []

  // Run conductor for each course
  for (const course of courses) {
    try {
      const result = await runSundayConductor(course.id, weekNumber)
      results.push(result)
    } catch (error) {
      console.error(`[Conductor] Error processing course ${course.id}:`, error)
      // Continue with other courses even if one fails
    }
  }

  return results
}

