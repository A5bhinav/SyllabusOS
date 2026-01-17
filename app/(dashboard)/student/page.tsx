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
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          {/* Header Section */}
          <div className="mb-10 space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">My Classes</h1>
            <p className="text-lg text-muted-foreground">
              Access your course materials and chat with your AI course assistant
            </p>
          </div>

          {/* Announcements Section - Only show if student is enrolled in courses */}
          {courses.length > 0 && (
            <div className="mb-10">
              <Announcements showOnlyLatest={true} />
            </div>
          )}

          {error && (
            <Card className="mb-6 border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0"
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
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {courses.length === 0 ? (
            <Card className="border-2 border-dashed border-muted-foreground/25 bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-20 px-4">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <BookOpen className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-3">No classes yet</h2>
                <p className="text-muted-foreground text-center mb-8 max-w-md leading-relaxed">
                  You&apos;re not enrolled in any classes yet. Browse available courses to get started, 
                  or contact your professor to be added to a course.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild size="lg" className="shadow-sm hover:shadow-md transition-shadow">
                    <Link href="/student/browse">
                      <Plus className="h-4 w-4 mr-2" />
                      Browse Courses
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/student/chat">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Go to Chat
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Courses Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Your Courses</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {courses.length} {courses.length === 1 ? 'course' : 'courses'} enrolled
                  </p>
                </div>
                <Button asChild variant="outline" size="lg">
                  <Link href="/student/browse">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Class
                  </Link>
                </Button>
              </div>

              {/* Courses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Link key={course.id} href={`/student/chat?courseId=${course.id}`}>
                    <Card className="group hover:shadow-xl transition-all duration-200 cursor-pointer h-full flex flex-col border-2 hover:border-primary/50">
                      <CardHeader className="pb-4">
                        <div className="w-14 h-14 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors flex items-center justify-center mb-4">
                          <BookOpen className="h-7 w-7 text-primary" />
                        </div>
                        <CardTitle className="text-xl mb-2 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {course.name}
                        </CardTitle>
                        <CardDescription className="text-base">
                          AI Course Assistant
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 mt-auto">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start group-hover:bg-primary/5 transition-colors" 
                          asChild
                        >
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
      </div>
    </>
  )
}
