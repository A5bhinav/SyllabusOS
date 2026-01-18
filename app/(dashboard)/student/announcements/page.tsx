'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { getAnnouncements } from '@/lib/api/announcements'
import type { Announcement } from '@/types/api'
import type { Course } from '@/types/api'
import { Calendar, Megaphone, ArrowLeft, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { StudentNav } from '@/components/student/StudentNav'

type SortBy = 'course' | 'date'

interface AnnouncementWithCourse extends Announcement {
  courseName?: string
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<AnnouncementWithCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasEnrollments, setHasEnrollments] = useState<boolean>(false)
  const [checkingEnrollments, setCheckingEnrollments] = useState(true)
  const [sortBy, setSortBy] = useState<SortBy>('course')
  const [courseMap, setCourseMap] = useState<Record<string, string>>({})

  useEffect(() => {
    async function checkEnrollmentsAndLoadData() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setHasEnrollments(false)
          setCheckingEnrollments(false)
          setLoading(false)
          return
        }

        // Check if student has any enrollments and get courses
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

        if (enrollmentsError && enrollmentsError.code !== 'PGRST116') {
          // PGRST116 is "no rows found" which is fine
          console.error('Error checking enrollments:', enrollmentsError)
        }

        const hasEnrolls = (enrollments && enrollments.length > 0) || false
        setHasEnrollments(hasEnrolls)

        // Store courses for mapping
        if (enrollments && enrollments.length > 0) {
          const courseMapping: Record<string, string> = {}
          enrollments.forEach((e: any) => {
            const course = Array.isArray(e.courses) ? e.courses[0] : e.courses
            if (course) {
              courseMapping[course.id] = course.name
            }
          })
          setCourseMap(courseMapping)
        }
      } catch (err) {
        console.error('Error checking enrollments:', err)
        setHasEnrollments(false)
      } finally {
        setCheckingEnrollments(false)
      }
    }

    checkEnrollmentsAndLoadData()
  }, [])

  useEffect(() => {
    // Only load announcements if student is enrolled
    if (!hasEnrollments || checkingEnrollments) {
      setLoading(false)
      return
    }

    async function loadAnnouncements() {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/announcements?status=published')
        
        if (!response.ok) {
          throw new Error('Failed to load announcements')
        }
        
        const data = await response.json()
        // Students only see published announcements (API filters this, but double-check)
        // Filter to only show weeks 1-6
        const published = data.filter((a: Announcement) => 
          a.status === 'published' && a.weekNumber <= 6
        )
        
        // Add course names to announcements
        const announcementsWithCourses: AnnouncementWithCourse[] = published.map((a: Announcement) => {
          return {
            ...a,
            courseName: courseMap[a.courseId] || 'Unknown Course'
          }
        })
        
        setAnnouncements(announcementsWithCourses)
      } catch (err) {
        console.error('Error loading announcements:', err)
        setError('Failed to load announcements')
      } finally {
        setLoading(false)
      }
    }

    loadAnnouncements()
  }, [hasEnrollments, checkingEnrollments, courseMap])

  if (checkingEnrollments || loading) {
    return (
      <>
        <StudentNav />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto py-8 px-4 max-w-5xl">
            <Card className="border-2 shadow-lg">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-3xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Megaphone className="h-5 w-5 text-primary" />
                  </div>
                Announcements
              </CardTitle>
                <CardDescription className="text-base">
                  Important updates from your professors
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-center py-16">
                <LoadingSpinner size="lg" />
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </>
    )
  }

  if (!hasEnrollments) {
    return (
      <>
        <StudentNav />
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto py-8 px-4 max-w-5xl">
            <Card className="border-2 shadow-lg">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-3xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Megaphone className="h-5 w-5 text-primary" />
                  </div>
                Announcements
              </CardTitle>
                <CardDescription className="text-base">
                  Important updates from your professors
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
                    <Megaphone className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">No Enrolled Courses</h3>
                  <p className="text-base text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                  You need to be enrolled in at least one course to view announcements.
                </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild variant="outline" size="lg">
                    <Link href="/student/browse">
                      Browse Courses
                    </Link>
                  </Button>
                    <Button asChild size="lg" className="shadow-sm hover:shadow-md transition-shadow">
                    <Link href="/student">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to My Classes
                    </Link>
                  </Button>
                </div>
              </div>
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
        <div className="container mx-auto py-8 px-4 max-w-5xl">
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-3 text-3xl">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Megaphone className="h-5 w-5 text-primary" />
                    </div>
                Announcements
              </CardTitle>
                  <CardDescription className="text-base">
                    Important updates from your professors
                  </CardDescription>
            </div>
            {announcements.length > 0 && (
                  <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant={sortBy === 'course' ? 'default' : 'outline'}
                      size="default"
                  onClick={() => setSortBy('course')}
                      className="shadow-sm"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  By Course
                </Button>
                <Button
                  variant={sortBy === 'date' ? 'default' : 'outline'}
                      size="default"
                  onClick={() => setSortBy('date')}
                      className="shadow-sm"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  By Date
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
            <CardContent className="space-y-6">
          {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-start gap-2">
                  <svg
                    className="w-5 h-5 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{error}</span>
            </div>
          )}

          {announcements.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
                    <Megaphone className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No announcements yet</h3>
              <p className="text-sm text-muted-foreground">
                    Your professors haven&apos;t published any announcements yet.
              </p>
            </div>
          ) : (
                <div className="space-y-8">
              {(() => {
                // Sort and group announcements
                let sorted = [...announcements]
                
                if (sortBy === 'date') {
                  sorted.sort((a, b) => {
                    const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
                    const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
                    if (dateB !== dateA) return dateB - dateA
                    return b.weekNumber - a.weekNumber
                  })
                } else {
                  // Sort by course, then by week number
                  sorted.sort((a, b) => {
                    if (a.courseName !== b.courseName) {
                      return (a.courseName || '').localeCompare(b.courseName || '')
                    }
                    return b.weekNumber - a.weekNumber
                  })
                }

                // Group by course or date
                if (sortBy === 'course') {
                  const grouped = sorted.reduce((acc, announcement) => {
                    const courseName = announcement.courseName || 'Unknown Course'
                    if (!acc[courseName]) {
                      acc[courseName] = []
                    }
                    acc[courseName].push(announcement)
                    return acc
                  }, {} as Record<string, AnnouncementWithCourse[]>)

                  return Object.entries(grouped).map(([courseName, courseAnnouncements]) => (
                    <div key={courseName} className="space-y-5">
                      <div className="flex items-center gap-3 pb-2 border-b">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold">{courseName}</h3>
                      </div>
                      <div className="space-y-4 pl-11">
                        {courseAnnouncements.map((announcement) => (
                          <div
                            key={announcement.id}
                            className="rounded-xl border-2 bg-card p-6 space-y-4 hover:shadow-lg transition-all duration-200 hover:border-primary/30"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    <span className="font-medium">Week {announcement.weekNumber}</span>
                                  </div>
                                  {announcement.publishedAt && (
                                    <>
                                      <span>•</span>
                                      <span>{format(new Date(announcement.publishedAt), 'MMM d, yyyy')}</span>
                                    </>
                                  )}
                                </div>
                                <h4 className="font-semibold text-xl text-foreground leading-tight">
                                  {announcement.title}
                                </h4>
                                <p className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                  {announcement.content}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                } else {
                  // Sort by date - group by date, then show all
                  return sorted.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="rounded-xl border-2 bg-card p-6 space-y-4 hover:shadow-lg transition-all duration-200 hover:border-primary/30"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="h-4 w-4" />
                              <span className="font-medium">{announcement.courseName || 'Unknown Course'}</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              <span className="font-medium">Week {announcement.weekNumber}</span>
                            </div>
                            {announcement.publishedAt && (
                              <>
                                <span>•</span>
                                <span>{format(new Date(announcement.publishedAt), 'MMM d, yyyy')}</span>
                              </>
                            )}
                          </div>
                          <h4 className="font-semibold text-xl text-foreground leading-tight">
                            {announcement.title}
                          </h4>
                          <p className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {announcement.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                }
              })()}
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </>
  )
}
