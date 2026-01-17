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

        // Check if user is a student
        // Use maybeSingle() instead of single() to avoid throwing errors when no rows found
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()

        // Handle profile query - log detailed info for debugging
        if (profileError) {
          console.error('Profile query error:', {
            message: profileError.message,
            code: profileError.code,
            details: profileError.details,
            hint: profileError.hint,
            userId: user.id,
            error: profileError
          })
        }

        // If there was an error querying
        if (profileError && !profile) {
          // Check if it's a recursion error (policy issue)
          if (profileError.message?.includes('infinite recursion') || profileError.message?.includes('recursion detected')) {
            console.error('RLS Policy recursion error detected. This indicates a database policy issue.')
            setError('Database configuration error. Please contact support.')
            setLoading(false)
            return
          }
          
          // If profile not found, try to create it (might be a timing issue)
          if (profileError.code === 'PGRST116' || !profileError.code) {
            console.log('Profile not found, attempting to create via API...')
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
              
              if (response.ok || response.status === 409) {
                // Wait a moment for the profile to be available, then retry
                await new Promise(resolve => setTimeout(resolve, 500))
                
                // Retry profile query after creation
                const retryResult = await supabase
                  .from('profiles')
                  .select('role')
                  .eq('id', user.id)
                  .maybeSingle()
                
                if (retryResult.data) {
                  profile = retryResult.data
                  profileError = retryResult.error
                } else if (retryResult.error) {
                  profileError = retryResult.error
                }
              }
            } catch (err) {
              console.error('Error creating profile:', err)
            }
          }
          
          // If still have an error and no profile after retry
          if (profileError && !profile) {
            // Only show error if it's not "no rows found" (PGRST116)
            if (profileError.code !== 'PGRST116') {
              setError(`Failed to load profile: ${profileError.message || 'Unknown error'}. Please try again.`)
              setLoading(false)
              return
            }
          }
        }

        // If still no profile after all attempts
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

        // Handle enrollments query - don't throw if it's just empty or a minor error
        if (enrollmentsError) {
          // If it's a policy error or table doesn't exist, that's okay - student has no enrollments
          if (enrollmentsError.code === 'PGRST116' || enrollmentsError.message?.includes('permission denied')) {
            // No rows found or permission issue - just set empty courses
            console.log('No enrollments found or permission denied:', enrollmentsError.message)
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
        // Log error for debugging but don't prevent page from rendering
        console.error('Error loading student courses:', err)
        // Only set error if it's not a "no enrollments" case
        if (err.code !== 'PGRST116' && !err.message?.includes('permission denied')) {
          setError(err.message || 'Failed to load courses. Please try again.')
        } else {
          // No enrollments is fine - just show empty state
          setCourses([])
        }
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
          {/* Announcements Section - Show all announcements from enrolled courses */}
          <div className="mb-8">
            <Announcements />
          </div>

          {/* Courses Grid */}
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
  )
}
