'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { BookOpen, CheckCircle2, XCircle, ArrowLeft, Star, BarChart3, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { StudentNav } from '@/components/student/StudentNav'
import type { Course } from '@/types/api'
import type { CourseFeedback } from '@/app/api/courses/feedback/[courseCode]/route'

// UCSC courses - match IDs from browse page
const FAKE_UCSC_COURSES: Course[] = [
  {
    id: 'ucsc-cse-101',
    name: 'CSE 101 - Introduction to Data Structures and Algorithms',
    professorId: 'prof-1',
    professorName: 'Various Professors',
    professorEmail: 'cse-advising@ucsc.edu',
    joinCode: 'CSE101',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'ucsc-cse-13s',
    name: 'CSE 13S - Computer Systems and C Programming',
    professorId: 'prof-2',
    professorName: 'Various Professors',
    professorEmail: 'cse-advising@ucsc.edu',
    joinCode: 'CSE13S',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'ucsc-cse-102',
    name: 'CSE 102 - Analysis of Algorithms',
    professorId: 'prof-3',
    professorName: 'Various Professors',
    professorEmail: 'cse-advising@ucsc.edu',
    joinCode: 'CSE102',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'ucsc-cse-115a',
    name: 'CSE 115A - Software Engineering',
    professorId: 'prof-4',
    professorName: 'Various Professors',
    professorEmail: 'cse-advising@ucsc.edu',
    joinCode: 'CSE115',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'ucsc-cse-130',
    name: 'CSE 130 - Programming Languages',
    professorId: 'prof-5',
    professorName: 'Various Professors',
    professorEmail: 'cse-advising@ucsc.edu',
    joinCode: 'CSE130',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'ucsc-cse-12',
    name: 'CSE 12 - Computer Systems and Assembly Language',
    professorId: 'prof-6',
    professorName: 'Various Professors',
    professorEmail: 'cse-advising@ucsc.edu',
    joinCode: 'CSE12',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'ucsc-math-19a',
    name: 'MATH 19A - Calculus for Science, Engineering, and Mathematics',
    professorId: 'prof-7',
    professorName: 'Various Professors',
    professorEmail: 'math-advising@ucsc.edu',
    joinCode: 'MATH19A',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'ucsc-math-19b',
    name: 'MATH 19B - Calculus for Science, Engineering, and Mathematics',
    professorId: 'prof-8',
    professorName: 'Various Professors',
    professorEmail: 'math-advising@ucsc.edu',
    joinCode: 'MATH19B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'ucsc-ams-10',
    name: 'AMS 10 - Mathematical Methods for Engineers I',
    professorId: 'prof-9',
    professorName: 'Various Professors',
    professorEmail: 'ams-advising@ucsc.edu',
    joinCode: 'AMS10',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'ucsc-phys-5a',
    name: 'PHYS 5A - Introductory Physics I',
    professorId: 'prof-10',
    professorName: 'Various Professors',
    professorEmail: 'physics-advising@ucsc.edu',
    joinCode: 'PHYS5A',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
]

export default function EnrollCoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [course, setCourse] = useState<{
    id: string
    name: string
    professorName: string | null
    professorEmail: string | null
    joinCode: string | null
  } | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [courseFeedback, setCourseFeedback] = useState<CourseFeedback | null>(null)
  const [loadingFeedback, setLoadingFeedback] = useState(false)

  // Extract course code from course name
  function getCourseCode(courseName: string): string | null {
    const match = courseName.match(/^([A-Z]+ \d+[A-Z]?)/)
    return match ? match[1] : null
  }

  useEffect(() => {
    loadCourse()
  }, [courseId])

  useEffect(() => {
    async function loadFeedback() {
      if (!course) return

      const courseCode = getCourseCode(course.name)
      if (!courseCode) return

      try {
        setLoadingFeedback(true)
        const response = await fetch(`/api/courses/feedback/${encodeURIComponent(courseCode)}`)
        
        if (response.ok) {
          const data = await response.json()
          setCourseFeedback(data)
        }
      } catch (err) {
        console.error('Error loading feedback:', err)
      } finally {
        setLoadingFeedback(false)
      }
    }

    if (course) {
      loadFeedback()
    }
  }, [course])

  async function loadCourse() {
    try {
      setLoading(true)
      setError(null)
      
      // Check if it's a fake course first
      const fakeCourse = FAKE_UCSC_COURSES.find(c => c.id === courseId)
      if (fakeCourse) {
        setCourse({
          id: fakeCourse.id,
          name: fakeCourse.name,
          professorName: fakeCourse.professorName,
          professorEmail: fakeCourse.professorEmail,
          joinCode: fakeCourse.joinCode,
        })
        setLoading(false)
        return
      }
      
      // Try loading from courses API (which returns all courses)
      const response = await fetch('/api/courses')
      if (!response.ok) {
        throw new Error('Failed to load courses')
      }
      
      const allCourses = await response.json()
      const foundCourse = allCourses.find((c: Course) => c.id === courseId)
      
      if (!foundCourse) {
        throw new Error('Course not found')
      }
      
      setCourse({
        id: foundCourse.id,
        name: foundCourse.name,
        professorName: foundCourse.professorName,
        professorEmail: foundCourse.professorEmail,
        joinCode: foundCourse.joinCode,
      })
    } catch (err: any) {
      console.error('Error loading course:', err)
      setError(err.message || 'Failed to load course')
    } finally {
      setLoading(false)
    }
  }

  async function handleEnroll() {
    // If course requires join code, validate it
    if (course?.joinCode && !joinCode.trim()) {
      setError('Please enter a join code')
      return
    }

    // For fake courses, verify join code matches
    if (course?.joinCode) {
      const normalizedCode = joinCode.trim().toUpperCase()
      const expectedCode = course.joinCode.toUpperCase()
      
      if (normalizedCode !== expectedCode) {
        setError(`Invalid join code. The join code for this course is "${expectedCode}". Please enter the correct code and try again.`)
        return
      }
    }

    try {
      setSubmitting(true)
      setError(null)
      
      // For fake courses, we can't actually enroll (they're not in the database)
      // But we can simulate success and redirect
      if (courseId.startsWith('ucsc-') || courseId.startsWith('fake-course-')) {
        // Simulate enrollment success for demo
        setSuccess(true)
        setTimeout(() => {
          router.replace(`/student/chat?courseId=${courseId}&enrolled=true`)
        }, 500)
        return
      }
      
      // For real courses, use the join API
      const response = await fetch('/api/enrollments/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          joinCode: joinCode.trim().toUpperCase(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to enroll in course')
        return
      }

      setSuccess(true)
      
      // Redirect to course chat immediately
      // Use replace to avoid adding to history (so back button doesn't go back to enroll page)
      router.replace(`/student/chat?courseId=${courseId}&enrolled=true`)
    } catch (err: any) {
      console.error('Error enrolling:', err)
      setError(err.message || 'Failed to enroll in course')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <StudentNav />
        <div className="container mx-auto py-8 px-4 max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </>
    )
  }

  if (error && !course) {
    return (
      <>
        <StudentNav />
        <div className="container mx-auto py-8 px-4 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/student/browse">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Browse
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  if (success) {
    // Show success message briefly, then redirect happens automatically
    return (
      <>
        <StudentNav />
        <div className="container mx-auto py-8 px-4 max-w-2xl">
          <Card className="border-green-500">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <CardTitle>Successfully Enrolled!</CardTitle>
              </div>
              <CardDescription>
                You have been enrolled in {course?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-4">
                <LoadingSpinner size="lg" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Redirecting to course chat...
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <StudentNav />
      <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/student/browse">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Browse
          </Link>
        </Button>
        <h1 className="text-3xl font-bold mb-2">{course?.name}</h1>
        <p className="text-muted-foreground">
          Course feedback and enrollment
        </p>
      </div>

      {/* Course Feedback Section */}
      {loadingFeedback ? (
        <Card className="mb-6">
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <LoadingSpinner size="sm" />
              <span className="ml-2 text-sm text-muted-foreground">Loading course feedback...</span>
            </div>
          </CardContent>
        </Card>
      ) : courseFeedback ? (
        <div className="space-y-6 mb-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Difficulty</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                  courseFeedback.difficulty === 'Easy' ? 'text-green-600 bg-green-50' :
                  courseFeedback.difficulty === 'Moderate' ? 'text-yellow-600 bg-yellow-50' :
                  courseFeedback.difficulty === 'Hard' ? 'text-orange-600 bg-orange-50' :
                  'text-red-600 bg-red-50'
                }`}>
                  {courseFeedback.difficulty}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Grade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{courseFeedback.averageGrade}</div>
              </CardContent>
            </Card>
            {courseFeedback.professorRating && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">Professor Rating</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-2xl font-bold">{courseFeedback.professorRating}/5.0</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Grade Distribution */}
          {courseFeedback.gradeDistribution && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <CardTitle>Grade Distribution</CardTitle>
                </div>
                <CardDescription>Historical grade distribution for this course</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(courseFeedback.gradeDistribution).map(([grade, percentage]) => (
                    <div key={grade} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Grade {grade}</span>
                        <span className="text-muted-foreground">{percentage}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full ${
                            grade === 'A' ? 'bg-green-500' :
                            grade === 'B' ? 'bg-blue-500' :
                            grade === 'C' ? 'bg-yellow-500' :
                            grade === 'D' ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Positive and Negative Feedback */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {courseFeedback.positiveFeedback && courseFeedback.positiveFeedback.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-5 w-5 text-green-600" />
                    <CardTitle>What Students Like</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {courseFeedback.positiveFeedback.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{item}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {courseFeedback.negativeFeedback && courseFeedback.negativeFeedback.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="h-5 w-5 text-red-600" />
                    <CardTitle>Common Challenges</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {courseFeedback.negativeFeedback.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <TrendingDown className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{item}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Reddit Review Links */}
          {courseFeedback.redditPosts && courseFeedback.redditPosts.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-primary" />
                  <CardTitle>Based on Reddit Reviews</CardTitle>
                </div>
                <CardDescription>Student discussions about this course from r/UCSC</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {courseFeedback.redditPosts.map((post, idx) => (
                    <a
                      key={idx}
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-medium line-clamp-2 flex-1">{post.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                          <span>↑ {post.score}</span>
                          <span>•</span>
                          <span>{post.date}</span>
                        </div>
                      </div>
                      {post.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-primary mt-2">
                        <span>View on Reddit</span>
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* Enrollment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Enroll in Course</CardTitle>
          <CardDescription>
            Enter the join code provided by your professor to enroll
            {course?.professorName && ` • Taught by ${course.professorName}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {course?.joinCode ? (
            <div className="space-y-2">
              <Label htmlFor="joinCode">Join Code</Label>
              <Input
                id="joinCode"
                type="text"
                placeholder="Enter join code"
                value={joinCode}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
                  setJoinCode(value)
                  setError(null)
                }}
                className="text-center text-2xl font-mono tracking-widest"
                maxLength={10}
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Enter the join code provided by your professor
              </p>
            </div>
          ) : (
            <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
              This course does not require a join code. Click enroll to join directly.
            </div>
          )}

          <Button
            onClick={handleEnroll}
            disabled={submitting || (course?.joinCode ? !joinCode.trim() : false)}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <LoadingSpinner size="sm" />
                Enrolling...
              </>
            ) : (
              'Enroll in Course'
            )}
          </Button>
        </CardContent>
      </Card>
      </div>
    </>
  )
}
