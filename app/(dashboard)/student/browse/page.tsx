'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { BookOpen, CheckCircle, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import type { Course } from '@/types/api'

export default function BrowseCoursesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCourses() {
      try {
        const response = await fetch('/api/courses')
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to load courses')
        }

        const data = await response.json()
        setCourses(data || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load courses. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [])

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
        <h1 className="text-3xl font-bold mb-2">Browse Courses</h1>
        <p className="text-muted-foreground">
          Explore available courses and join the ones you&apos;re interested in
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
            <h2 className="text-xl font-semibold mb-2">No courses available</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              There are no courses available at the moment. Please check back later or contact your professor.
            </p>
            <Button asChild variant="outline">
              <Link href="/student">
                Go Back
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card 
              key={course.id} 
              className={`hover:shadow-lg transition-shadow h-full flex flex-col ${
                course.isEnrolled ? 'border-green-500' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  {course.isEnrolled && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <CardTitle className="text-xl mb-1 line-clamp-2">{course.name}</CardTitle>
                <CardDescription>
                  {course.professorName || 'Professor'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 mt-auto space-y-2">
                {course.professorEmail && (
                  <p className="text-sm text-muted-foreground">
                    {course.professorEmail}
                  </p>
                )}
                {course.isEnrolled ? (
                  <Button variant="default" className="w-full" asChild>
                    <Link href={`/student/chat?courseId=${course.id}`}>
                      Open Chat
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    asChild
                  >
                    <Link href={`/student/enroll/${course.id}`}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Enroll in Course
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

