'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Plus, MessageSquare, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { Announcements } from '@/components/student/Announcements'
import { StudentNav } from '@/components/student/StudentNav'

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
          window.location.href = '/login'
          return
        }

        // Get user profile
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        // If profile doesn't exist, try to create it
        if (!profile) {
          try {
            const response = await fetch('/api/auth/create-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: user.id,
                email: user.email || '',
                name: user.user_metadata?.name || '',
                role: user.user_metadata?.role || 'student',
              }),
            })
            
            if (response.ok) {
              // Wait a moment for profile to be available
              await new Promise(resolve => setTimeout(resolve, 500))
              
              // Retry profile query
              const retryResult = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .maybeSingle()
              
              if (retryResult.data) {
                profile = retryResult.data
              }
            }
          } catch (err) {
            console.error('Error creating profile:', err)
          }
        }

        // If still no profile, show error
        if (!profile) {
          setError('Profile not found. Please log out and sign up again, or contact support.')
          setLoading(false)
          return
        }

        // Check role and redirect if needed
        if (profile.role !== 'student') {
          router.push('/dashboard')
          return
        }

        // Get courses from enrollments table
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select(`
            course_id,
            courses!inner (
              id,
              name,
              professor_id,
              created_at
            )
          `)
          .eq('student_id', user.id)

        // Handle enrollments query
        if (enrollmentsError) {
          // If it's "no rows found", that's fine - student has no enrollments
          if (enrollmentsError.code === 'PGRST116') {
            setCourses([])
          } else {
            // Other errors - log but don't break the page
            console.error('Error loading enrollments:', enrollmentsError)
            setError(enrollmentsError.message || 'Failed to load courses. Please try again.')
          }
        } else if (enrollments && enrollments.length > 0) {
          // Transform enrollment data to course format
          // Handle case where courses might be an array
          const enrolledCourses = enrollments
            .map((e: any) => {
              const course = Array.isArray(e.courses) ? e.courses[0] : e.courses
              if (!course) return null
              return {
                id: course.id,
                name: course.name,
                professor_id: course.professor_id,
                created_at: course.created_at,
              }
            })
            .filter((c: any) => c !== null) as Course[]
          
          setCourses(enrolledCourses)
        } else {
          // No enrollments found
          setCourses([])
        }
      } catch (err: any) {
        console.error('Error loading student courses:', err)
        setError(err.message || 'Failed to load courses. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [router])

  if (loading) {
    return (
      <>
        <StudentNav />
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <StudentNav />
      <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Classes</h1>
        <p className="text-muted-foreground">
          Access your course materials and chat with your course assistant
        </p>
      </div>

      {/* Announcements Section - Only show if student is enrolled in courses */}
      {courses.length > 0 && (
        <div className="mb-8">
          <Announcements showOnlyLatest={true} />
        </div>
      )}

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
                <Link href="/student/browse">
                  <Plus className="h-4 w-4 mr-2" />
                  Browse Courses
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Courses Grid with Add Class Button */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Enrolled Courses</h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/student/browse">
                <Plus className="h-4 w-4 mr-2" />
                Add Class
              </Link>
            </Button>
          </div>
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
        </>
      )}
      </div>
    </>
  )
}
