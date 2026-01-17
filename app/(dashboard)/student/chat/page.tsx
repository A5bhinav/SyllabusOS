'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChatInterface } from '@/components/student/ChatInterface'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function StudentChatPage() {
  const router = useRouter()
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

        // Get course ID - for students, we might need to get it from enrollments
        // For now, we'll try to get a course from the database
        // In production, you'd have an enrollments table
        const { data: courses, error: courseError } = await supabase
          .from('courses')
          .select('id')
          .limit(1)
          .single()

        if (courseError || !courses) {
          setError('No course found. Please contact your professor to set up a course.')
          setLoading(false)
          return
        }

        setCourseId(courses.id)
      } catch (err: any) {
        setError(err.message || 'Failed to load chat. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

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
