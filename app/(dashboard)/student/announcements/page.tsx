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
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Announcements
              </CardTitle>
              <CardDescription>Important updates from your professor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  if (!hasEnrollments) {
    return (
      <>
        <StudentNav />
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Announcements
              </CardTitle>
              <CardDescription>Important updates from your professor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Megaphone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Enrolled Courses</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  You need to be enrolled in at least one course to view announcements.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button asChild variant="outline">
                    <Link href="/student/browse">
                      Browse Courses
                    </Link>
                  </Button>
                  <Button asChild>
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
      </>
    )
  }

  return (
    <>
      <StudentNav />
      <div className="container mx-auto py-8 px-4 max-w-4xl">

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Announcements
              </CardTitle>
              <CardDescription>Important updates from your professor</CardDescription>
            </div>
            {announcements.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'course' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('course')}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  By Course
                </Button>
                <Button
                  variant={sortBy === 'date' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('date')}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  By Date
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {announcements.length === 0 ? (
            <div className="text-center py-8">
              <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No announcements
              </p>
            </div>
          ) : (
            <div className="space-y-6">
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
                    <div key={courseName} className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        {courseName}
                      </h3>
                      <div className="space-y-4 pl-7">
                        {courseAnnouncements.map((announcement) => (
                          <div
                            key={announcement.id}
                            className="rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Week {announcement.weekNumber}
                                  </span>
                                  {announcement.publishedAt && (
                                    <span className="text-xs text-muted-foreground">
                                      • {format(new Date(announcement.publishedAt), 'MMM d, yyyy')}
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-semibold text-lg mb-2">{announcement.title}</h4>
                                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
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
                      className="rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {announcement.courseName || 'Unknown Course'}
                            </span>
                            <span className="text-sm font-medium text-muted-foreground">
                              • Week {announcement.weekNumber}
                            </span>
                            {announcement.publishedAt && (
                              <span className="text-xs text-muted-foreground">
                                • {format(new Date(announcement.publishedAt), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-lg mb-2">{announcement.title}</h4>
                          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
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
    </>
  )
}
