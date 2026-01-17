// Supabase Edge Function for Sunday Night Conductor
// This function runs on a cron schedule (Sunday nights at 11 PM)
// It can also be triggered manually via HTTP request

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current week number
    const demoMode = Deno.env.get('DEMO_MODE') === 'true'
    let currentWeek: number

    if (demoMode) {
      currentWeek = parseInt(Deno.env.get('DEMO_WEEK') || '4', 10)
    } else {
      // Calculate week from semester start (August 20)
      const semesterStart = new Date(new Date().getFullYear(), 7, 20)
      const now = new Date()
      const diffTime = now.getTime() - semesterStart.getTime()
      const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
      currentWeek = Math.max(1, diffWeeks + 1)
    }

    // Get all courses
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id')

    if (coursesError || !courses) {
      throw new Error(`Failed to fetch courses: ${coursesError?.message}`)
    }

    const results = []

    // Process each course
    for (const course of courses) {
      try {
        // Check if announcement already exists
        const { data: existing } = await supabase
          .from('announcements')
          .select('id')
          .eq('course_id', course.id)
          .eq('week_number', currentWeek)
          .maybeSingle()

        if (existing) {
          console.log(`Announcement already exists for course ${course.id}, week ${currentWeek}`)
          continue
        }

        // Get schedule for this week
        const { data: schedule, error: scheduleError } = await supabase
          .from('schedules')
          .select('*')
          .eq('course_id', course.id)
          .eq('week_number', currentWeek)
          .single()

        if (scheduleError || !schedule) {
          console.log(`No schedule found for course ${course.id}, week ${currentWeek}`)
          continue
        }

        // Get course name
        const { data: courseData } = await supabase
          .from('courses')
          .select('name')
          .eq('id', course.id)
          .single()

        // Generate announcement (using mock mode if enabled, or simple template)
        const mockMode = Deno.env.get('MOCK_MODE') === 'true'
        let title = `Week ${currentWeek}: ${schedule.topic}`
        let content = `Welcome to Week ${currentWeek}!

This week we'll be focusing on ${schedule.topic}.

${schedule.assignments ? `**Assignments:** ${schedule.assignments}` : ''}
${schedule.readings ? `**Readings:** ${schedule.readings}` : ''}
${schedule.due_date ? `**Due Date:** ${new Date(schedule.due_date).toLocaleDateString()}` : ''}

Please reach out if you have any questions.

Best regards,
Professor`

        // Store announcement draft
        const { data: announcement, error: insertError } = await supabase
          .from('announcements')
          .insert({
            course_id: course.id,
            week_number: currentWeek,
            title,
            content,
            status: 'draft',
          })
          .select()
          .single()

        if (insertError || !announcement) {
          console.error(`Failed to create announcement for course ${course.id}:`, insertError)
          continue
        }

        results.push({
          courseId: course.id,
          announcementId: announcement.id,
          weekNumber: currentWeek,
        })
      } catch (error) {
        console.error(`Error processing course ${course.id}:`, error)
        // Continue with other courses
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Conductor completed for ${results.length} course(s)`,
        weekNumber: currentWeek,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in Sunday Night Conductor:', error)

    return new Response(
      JSON.stringify({
        error: 'Failed to run conductor',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

