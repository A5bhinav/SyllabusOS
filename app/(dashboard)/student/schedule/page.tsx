'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { StudentNav } from '@/components/student/StudentNav'
import { getCurrentWeek } from '@/lib/utils/demo-mode'
import { Calendar, BookOpen, AlertCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'
import type { Schedule } from '@/types/database'

interface Course {
  id: string
  name: string
}

export default function SchedulePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<Course | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [error, setError] = useState<string | null>(null)
  const currentWeek = getCurrentWeek()

  useEffect(() => {
    async function loadSchedule() {
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
          setError('You are not enrolled in any courses')
          setLoading(false)
          return
        }

        const courseData = Array.isArray(enrollments.courses) 
          ? enrollments.courses[0] 
          : enrollments.courses

        if (!courseData) {
          setError('Course not found')
          setLoading(false)
          return
        }

        const enrolledCourse: Course = {
          id: courseData.id,
          name: courseData.name,
        }
        setCourse(enrolledCourse)

        // Load all schedules for the course
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('schedules')
          .select('*')
          .eq('course_id', enrolledCourse.id)
          .order('week_number', { ascending: true })

        if (scheduleError) {
          throw new Error('Failed to load schedule')
        }

        setSchedules(scheduleData || [])

      } catch (err: any) {
        console.error('Error loading schedule:', err)
        setError(err.message || 'Failed to load schedule data')
      } finally {
        setLoading(false)
      }
    }

    loadSchedule()
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
                  You&apos;re not enrolled in any courses yet.
                </p>
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
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-10 space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Course Schedule</h1>
            <p className="text-lg text-muted-foreground">
              Complete schedule for {course.name}
            </p>
          </div>

          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Weekly Schedule</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {schedules.length > 0 
                      ? `Showing ${schedules.length} weeks of course content`
                      : 'No schedule data available'
                    }
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <div className="text-center py-16">
                  <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">No schedule available</p>
                  <p className="text-sm text-muted-foreground">
                    The course schedule hasn&apos;t been uploaded yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {schedules.map((schedule) => {
                    const isCurrentWeek = schedule.week_number === currentWeek
                    const isPastWeek = schedule.week_number < currentWeek
                    const isFutureWeek = schedule.week_number > currentWeek

                    return (
                      <div
                        key={schedule.id}
                        className={`rounded-xl border-2 p-6 transition-all ${
                          isCurrentWeek
                            ? 'border-primary bg-primary/5 shadow-lg'
                            : isPastWeek
                            ? 'border-border bg-card/50 opacity-75'
                            : 'border-border bg-card hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                isCurrentWeek
                                  ? 'bg-primary/20'
                                  : isPastWeek
                                  ? 'bg-muted'
                                  : 'bg-primary/10'
                              }`}
                            >
                              <BookOpen
                                className={`h-6 w-6 ${
                                  isCurrentWeek
                                    ? 'text-primary'
                                    : isPastWeek
                                    ? 'text-muted-foreground'
                                    : 'text-primary'
                                }`}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-xl font-bold">Week {schedule.week_number}</h3>
                                {isCurrentWeek && (
                                  <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                                    Current Week
                                  </span>
                                )}
                                {isPastWeek && (
                                  <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                                    Past
                                  </span>
                                )}
                              </div>
                              <p className="text-base font-medium text-foreground">
                                {schedule.topic || 'No topic specified'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 mt-4 pl-16">
                          {schedule.assignments && (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                Assignments
                              </p>
                              <p className="text-base text-foreground leading-relaxed">
                                {schedule.assignments}
                              </p>
                            </div>
                          )}

                          {schedule.readings && (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                Readings
                              </p>
                              <p className="text-base text-foreground leading-relaxed">
                                {schedule.readings}
                              </p>
                            </div>
                          )}

                          {schedule.due_date && (
                            <div className="space-y-1 flex items-center gap-2 pt-2 border-t border-border/50">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                  Due Date
                                </p>
                                <p className="text-base text-foreground font-medium">
                                  {format(new Date(schedule.due_date), 'MMMM d, yyyy')}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
