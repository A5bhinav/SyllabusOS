'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChatInterface } from '@/components/student/ChatInterface'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!courseId || !userId) {
    return (
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
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Course Assistant</CardTitle>
          <CardDescription>
            Ask questions about your course policies, concepts, and schedules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChatInterface courseId={courseId} userId={userId} />
        </CardContent>
      </Card>
    </div>
  )
}
