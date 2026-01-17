'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChatInterface } from '@/components/student/ChatInterface'
import { Announcements } from '@/components/student/Announcements'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StudentNav } from '@/components/student/StudentNav'

export default function StudentChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadUserData() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push('/login')
          return
        }

        setUserId(user.id)

        // Check if courseId is provided in query params
        const courseIdFromParams = searchParams.get('courseId')

        // Get user's course (for now, get the first course they're enrolled in)
        // In a real app, you might want to let students select a course
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'student') {
          // Redirect if not a student
          router.push('/dashboard')
          return
        }

        // If courseId is provided in query params, use it and verify enrollment
        if (courseIdFromParams) {
          // Check if we just enrolled (from query param)
          const justEnrolled = searchParams.get('enrolled') === 'true'
          
          // Verify student is enrolled in this course
          // If just enrolled, retry a few times in case of race condition
          let enrollment = null
          let enrollmentError = null
          let retries = justEnrolled ? 3 : 1
          let retryDelay = 500 // 500ms between retries
          
          for (let attempt = 0; attempt < retries; attempt++) {
            if (attempt > 0) {
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, retryDelay))
            }
            
            const result = await supabase
              .from('enrollments')
              .select('course_id')
              .eq('student_id', user.id)
              .eq('course_id', courseIdFromParams)
              .maybeSingle()
            
            enrollment = result.data
            enrollmentError = result.error
            
            // If we found enrollment or it's not a race condition error, break
            if (enrollment || (!enrollmentError && !justEnrolled)) {
              break
            }
          }

          if (enrollmentError && !justEnrolled) {
            setError('Failed to verify enrollment. Please try again.')
            setLoading(false)
            return
          }

          if (!enrollment) {
            setError('You are not enrolled in this course. Please contact your professor to be enrolled.')
            setLoading(false)
            return
          }

          setCourseId(courseIdFromParams)
          
          // Clean up the enrolled query param from URL
          if (justEnrolled) {
            router.replace(`/student/chat?courseId=${courseIdFromParams}`, { scroll: false })
          }
        } else {
          // Get course ID from enrollments table
          // Get the first course the student is enrolled in
          // In the future, you might want to let students select from multiple courses
          const { data: enrollment, error: enrollmentError } = await supabase
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

          if (enrollmentError) {
            setError('Failed to load enrollment information. Please try again.')
            setLoading(false)
            return
          }

          if (!enrollment) {
            setError('You are not enrolled in any courses. Please contact your professor to be enrolled.')
            setLoading(false)
            return
          }

          setCourseId(enrollment.course_id)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load chat. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router, searchParams])

  if (loading) {
    return (
      <>
        <StudentNav />
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <StudentNav />
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    )
  }

  if (!courseId || !userId) {
    return (
      <>
        <StudentNav />
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardHeader>
              <CardTitle>Unable to Load Chat</CardTitle>
              <CardDescription>
                Unable to determine your course. Please contact your professor.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <StudentNav />
      <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Chat Interface - Takes up 2/3 of the width */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Course Assistant</CardTitle>
              <CardDescription>
                Ask questions about your course policies, concepts, and schedules
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ChatInterface courseId={courseId} userId={userId} />
            </CardContent>
          </Card>
        </div>

        {/* Announcements Sidebar - Takes up 1/3 of the width */}
        <div className="md:col-span-1">
          <Announcements courseId={courseId} />
        </div>
      </div>
      </div>
    </>
  )
}
