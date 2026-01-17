'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Plus, MessageSquare, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface Course {
  id: string
  name: string
  professor_id: string
  created_at: string
}

export default function StudentHomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCourses() {
      try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push('/login')
          return
        }

        // Check if user is a student
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'student') {
          router.push('/dashboard')
          return
        }

        // Get courses that the student has interacted with (via chat_logs)
        // This gives us a list of courses the student is enrolled in
        const { data: chatLogs } = await supabase
          .from('chat_logs')
          .select('course_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        // Get unique course IDs
        const courseIds = [...new Set(chatLogs?.map(log => log.course_id) || [])]

        if (courseIds.length > 0) {
          // Fetch course details for courses the student has interacted with
          const { data: enrolledCourses, error: coursesError } = await supabase
            .from('courses')
            .select('id, name, professor_id, created_at')
            .in('id', courseIds)
            .order('created_at', { ascending: false })

          if (coursesError) {
            throw coursesError
          }

          setCourses(enrolledCourses || [])
        } else {
          // No courses found - student hasn't interacted with any courses yet
          setCourses([])
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load courses. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [router])

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Classes</h1>
        <p className="text-muted-foreground">
          Access your course materials and chat with your course assistant
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {courses.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 px-4">
            <BookOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No classes yet</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              You&apos;re not enrolled in any classes. Start a conversation in a course chat to join a class,
              or contact your professor to be added to a course.
            </p>
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link href="/student/chat">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Go to Course Chat
                </Link>
              </Button>
              <Button asChild>
                <Link href="/student/chat">
                  <Plus className="h-4 w-4 mr-2" />
                  Browse Courses
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link key={course.id} href={`/student/chat?courseId=${course.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-xl mb-1 line-clamp-2">{course.name}</CardTitle>
                  <CardDescription>
                    Course Assistant
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  <Button variant="ghost" className="w-full justify-start" asChild>
                    <div>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Open Chat
                    </div>
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
