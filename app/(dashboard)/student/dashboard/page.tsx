'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { StudentNav } from '@/components/student/StudentNav'
import { QuestionHistory, type RecentQuestion } from '@/components/student/QuestionHistory'
import { UpcomingDeadlines, type UpcomingDeadline } from '@/components/student/UpcomingDeadlines'
import { WeekSchedule, type WeekScheduleData } from '@/components/student/WeekSchedule'
import { getChatHistory } from '@/lib/api/chat'
import { getAnnouncements } from '@/lib/api/announcements'
import { getCurrentWeek } from '@/lib/utils/demo-mode'
import { MessageSquare, BookOpen, AlertCircle, ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Message } from '@/components/student/MessageBubble'

interface Course {
  id: string
  name: string
}

export default function StudentDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<Course | null>(null)
  const [recentQuestions, setRecentQuestions] = useState<RecentQuestion[]>([])
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([])
  const [currentWeekSchedule, setCurrentWeekSchedule] = useState<WeekScheduleData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)
        setError(null)
        const supabase = createClient()
        
        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.push('/login')
          return
        }

        // Get student's first enrolled course
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select(`
            course_id,
            courses!inner (
              id,
              name
            )
          `)
          .eq('student_id', user.id)
          .limit(1)
          .maybeSingle()

        if (enrollmentsError && enrollmentsError.code !== 'PGRST116') {
          throw new Error('Failed to load enrollment information')
        }

        if (!enrollments) {
          // No enrollments - that's fine, just show empty dashboard
          setLoading(false)
          return
        }

        const courseData = Array.isArray(enrollments.courses) 
          ? enrollments.courses[0] 
          : enrollments.courses

        if (!courseData) {
          setLoading(false)
          return
        }

        const enrolledCourse: Course = {
          id: courseData.id,
          name: courseData.name,
        }
        setCourse(enrolledCourse)

        // Load recent questions from chat history
        try {
          const history = await getChatHistory(enrolledCourse.id, user.id, 20)
          const questions: RecentQuestion[] = []
          
          // Process messages to extract questions (user messages)
          history.messages.forEach((msg: Message, index: number) => {
            if (msg.role === 'user') {
              // Find corresponding assistant response
              const nextMsg = history.messages[index + 1]
              let status: 'answered' | 'escalated' | 'pending' = 'answered'
              
              if (msg.escalated || (nextMsg && nextMsg.escalated)) {
                status = 'escalated'
              } else if (!nextMsg) {
                status = 'pending'
              }

              questions.push({
                id: msg.id,
                question: msg.text,
                timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
                status,
                escalationId: msg.escalationId || nextMsg?.escalationId,
              })
            }
          })

          // Get most recent questions (last 5)
          setRecentQuestions(questions.slice(-5).reverse())
        } catch (err) {
          console.error('Error loading chat history:', err)
          // Don't fail the whole page if chat history fails
        }

        // Load announcements to extract deadlines
        try {
          const announcements = await getAnnouncements()
          const published = announcements.filter(a => a.status === 'published')
          const deadlines: UpcomingDeadline[] = []
          
          // Extract dates from announcements (simplified - look for dates in content)
          published.forEach(announcement => {
            if (announcement.publishedAt) {
              const pubDate = new Date(announcement.publishedAt)
              // Add to deadlines if it's in the future or recent
              const daysFromNow = (pubDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              if (daysFromNow >= -7 && daysFromNow <= 30) { // Within next month or last week
                deadlines.push({
                  title: announcement.title,
                  date: pubDate,
                  source: 'announcement',
                  weekNumber: announcement.weekNumber,
                })
              }
            }
          })

          // Sort by date
          deadlines.sort((a, b) => a.date.getTime() - b.date.getTime())
          setUpcomingDeadlines(deadlines.slice(0, 5)) // Top 5
        } catch (err) {
          console.error('Error loading announcements:', err)
        }

        // Load current week schedule
        try {
          const currentWeek = getCurrentWeek()
          const { data: schedule, error: scheduleError } = await supabase
            .from('schedules')
            .select('*')
            .eq('course_id', enrolledCourse.id)
            .eq('week_number', currentWeek)
            .maybeSingle()

          if (!scheduleError && schedule) {
            setCurrentWeekSchedule({
              weekNumber: schedule.week_number,
              topic: schedule.topic,
              assignments: schedule.assignments,
              readings: schedule.readings,
              dueDate: schedule.due_date,
            })
          }
        } catch (err) {
          console.error('Error loading schedule:', err)
        }

      } catch (err: any) {
        console.error('Error loading dashboard:', err)
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [router])

  if (loading) {
    return (
      <>
        <StudentNav />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <StudentNav />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto py-8 px-4 max-w-7xl">
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    )
  }

  if (!course) {
    return (
      <>
        <StudentNav />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto py-8 px-4 max-w-7xl">
            <Card className="border-2 border-dashed border-muted-foreground/25 bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-20 px-4">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <BookOpen className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-3">No enrolled courses</h2>
                <p className="text-muted-foreground text-center mb-8 max-w-md leading-relaxed">
                  You&apos;re not enrolled in any courses yet. Browse available courses to get started.
                </p>
                <Button asChild size="lg" className="shadow-sm hover:shadow-md transition-shadow">
                  <Link href="/student/browse">
                    <Plus className="h-4 w-4 mr-2" />
                    Browse Courses
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <StudentNav />
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-10 space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-lg text-muted-foreground">
              Overview of your course activity and upcoming deadlines
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mb-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="shadow-sm hover:shadow-md transition-shadow">
              <Link href={`/student/chat?courseId=${course.id}`}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Ask a Question
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/student/announcements">
                View All Announcements
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          {/* Main Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recent Questions */}
            <QuestionHistory questions={recentQuestions} courseId={course.id} />

            {/* Upcoming Deadlines */}
            <UpcomingDeadlines deadlines={upcomingDeadlines} />

            {/* Current Week Schedule */}
            <WeekSchedule schedule={currentWeekSchedule} />
          </div>
        </div>
      </div>
    </>
  )
}
