'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { BookOpen, CheckCircle, PlusCircle, XCircle, BarChart3, TrendingUp, TrendingDown, ThumbsUp, ThumbsDown, Star, ExternalLink } from 'lucide-react'
import type { CourseFeedback } from '@/app/api/courses/feedback/[courseCode]/route'
import Link from 'next/link'
import type { Course } from '@/types/api'
import { StudentNav } from '@/components/student/StudentNav'

// UCSC courses data with feedback support
const FAKE_COURSES: Course[] = [
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

export default function BrowseCoursesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [courseFeedback, setCourseFeedback] = useState<CourseFeedback | null>(null)
  const [loadingFeedback, setLoadingFeedback] = useState(false)

  useEffect(() => {
    async function loadCourses() {
      try {
        const response = await fetch('/api/courses')
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to load courses')
        }

        const data = await response.json()
        const apiCourses = data || []
        
        // Combine API courses with fake courses
        // Filter out any duplicates if a fake course ID matches a real one
        const fakeCoursesFiltered = FAKE_COURSES.filter(
          fake => !apiCourses.some((api: Course) => api.id === fake.id)
        )
        
        // Merge: real courses first, then fake courses
        setCourses([...apiCourses, ...fakeCoursesFiltered])
      } catch (err: any) {
        // If API fails, still show fake courses
        console.error('Error loading courses:', err)
        setCourses(FAKE_COURSES)
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [])

  // Generate slug from course name (e.g., "CMPS 101" -> "cmps-101")
  function getCourseSlug(course: Course): string {
    const courseCode = course.name.split(' - ')[0] // e.g., "CMPS 101"
    return courseCode.toLowerCase().replace(/\s+/g, '-') // e.g., "cmps-101"
  }

  function handleCourseClick(course: Course) {
    if (course.isEnrolled) {
      // If already enrolled, go directly to chat
      router.push(`/student/chat?courseId=${course.id}`)
      return
    }
    
    // Navigate to course detail page using slug (e.g., /student/courses/cmps-101)
    const slug = getCourseSlug(course)
    router.push(`/student/courses/${slug}`)
  }

  // Extract course code from course name (e.g., "CSE 101" from "CSE 101 - Introduction to Data Structures")
  function getCourseCode(courseName: string): string | null {
    const match = courseName.match(/^([A-Z]+ \d+[A-Z]?)/)
    return match ? match[1] : null
  }

  // Load course feedback when dialog opens
  useEffect(() => {
    async function loadFeedback() {
      if (!selectedCourse || !enrollDialogOpen) {
        setCourseFeedback(null)
        return
      }

      const courseCode = getCourseCode(selectedCourse.name)
      if (!courseCode) {
        console.log('No course code extracted from:', selectedCourse.name)
        setCourseFeedback(null)
        return
      }

      try {
        setLoadingFeedback(true)
        const url = `/api/courses/feedback/${encodeURIComponent(courseCode)}`
        console.log('Loading feedback for course:', courseCode, 'URL:', url)
        const response = await fetch(url)
        
        if (response.ok) {
          const data = await response.json()
          console.log('Feedback loaded successfully:', data)
          setCourseFeedback(data)
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error('Feedback API error:', response.status, errorData)
          setCourseFeedback(null)
        }
      } catch (err) {
        console.error('Error loading feedback:', err)
        setCourseFeedback(null)
      } finally {
        setLoadingFeedback(false)
      }
    }

    loadFeedback()
  }, [selectedCourse, enrollDialogOpen])

  async function handleEnroll() {
    if (!selectedCourse) return

    // If course has a join code, require it
    if (selectedCourse.joinCode && !joinCode.trim()) {
      setEnrollError('Please enter a join code')
      return
    }

    try {
      setEnrolling(true)
      setEnrollError(null)

      // For courses without join codes, we can try direct enrollment by course ID
      // For now, we'll use the join code endpoint if code exists, otherwise redirect to enroll page
      if (selectedCourse.joinCode) {
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
          setEnrollError(data.error || 'Failed to enroll in course')
          return
        }

        // Success - close dialog and redirect
        setEnrollDialogOpen(false)
        router.replace(`/student/chat?courseId=${selectedCourse.id}&enrolled=true`)
      } else {
        // No join code - redirect to enroll page which handles enrollment differently
        setEnrollDialogOpen(false)
        router.push(`/student/enroll/${selectedCourse.id}`)
      }
    } catch (err: any) {
      console.error('Error enrolling:', err)
      setEnrollError(err.message || 'Failed to enroll in course')
    } finally {
      setEnrolling(false)
    }
  }

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
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card 
                key={course.id} 
                onClick={() => handleCourseClick(course)}
                className={`hover:shadow-lg transition-shadow h-full flex flex-col cursor-pointer ${
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
                <div className="flex flex-col gap-2">
                  {getCourseCode(course.name) && (
                    <Button
                      variant="outline"
                      className="w-full"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/student/browse/${encodeURIComponent(getCourseCode(course.name)!)}/feedback`}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Course Feedback
                      </Link>
                    </Button>
                  )}
                  {course.isEnrolled ? (
                    <Button variant="default" className="w-full" asChild onClick={(e) => e.stopPropagation()}>
                      <Link href={`/student/chat?courseId=${course.id}`}>
                        Open Chat
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCourseClick(course)
                      }}
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Enroll in Course
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
            ))}
          </div>

          {/* Enrollment Dialog */}
          <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl">{selectedCourse?.name}</DialogTitle>
                    {selectedCourse?.professorName && (
                      <DialogDescription>
                        {selectedCourse.professorName}
                        {selectedCourse.professorEmail && ` • ${selectedCourse.professorEmail}`}
                      </DialogDescription>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Course Feedback Section */}
                {loadingFeedback && (
                  <div className="flex items-center justify-center py-8 border-t pt-4">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading course feedback...</span>
                  </div>
                )}
                {!loadingFeedback && courseFeedback && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold">Course Feedback</h3>
                    
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground mb-1">Difficulty</div>
                        <div className={`font-semibold ${
                          courseFeedback.difficulty === 'Easy' ? 'text-green-600' :
                          courseFeedback.difficulty === 'Moderate' ? 'text-yellow-600' :
                          courseFeedback.difficulty === 'Hard' ? 'text-orange-600' :
                          'text-red-600'
                        }`}>
                          {courseFeedback.difficulty}
                        </div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <div className="text-xs text-muted-foreground mb-1">Average Grade</div>
                        <div className="font-semibold">{courseFeedback.averageGrade}</div>
                      </div>
                      {courseFeedback.professorRating && (
                        <div className="text-center p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground mb-1">Professor Rating</div>
                          <div className="flex items-center justify-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{courseFeedback.professorRating}/5.0</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Grade Distribution */}
                    {courseFeedback.gradeDistribution && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Grade Distribution</div>
                        {Object.entries(courseFeedback.gradeDistribution).map(([grade, percentage]) => (
                          <div key={grade} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>Grade {grade}</span>
                              <span className="text-muted-foreground">{percentage}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
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
                    )}

                    {/* Positive Feedback */}
                    {courseFeedback.positiveFeedback.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                          <div className="text-sm font-medium">What Students Like</div>
                        </div>
                        <ul className="space-y-2 ml-6">
                          {courseFeedback.positiveFeedback.map((item, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground list-disc">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Negative Feedback */}
                    {courseFeedback.negativeFeedback.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <ThumbsDown className="h-4 w-4 text-red-600" />
                          <div className="text-sm font-medium">Common Challenges</div>
                        </div>
                        <ul className="space-y-2 ml-6">
                          {courseFeedback.negativeFeedback.map((item, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground list-disc">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Reddit Review Links */}
                    {courseFeedback.redditPosts && courseFeedback.redditPosts.length > 0 && (
                      <div className="border-t pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <ExternalLink className="h-4 w-4 text-primary" />
                          <div className="text-sm font-medium">Based on Reddit Reviews</div>
                        </div>
                        <div className="space-y-2">
                          {courseFeedback.redditPosts.map((post, idx) => (
                            <a
                              key={idx}
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
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
                      </div>
                    )}
                  </div>
                )}

                {/* Enrollment Section */}
                <div className="border-t pt-4 space-y-4">
                  {enrollError && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      {enrollError}
                    </div>
                  )}

                  {selectedCourse?.joinCode ? (
                    <div className="space-y-2">
                      <Label htmlFor="joinCode">Join Code</Label>
                      <Input
                        id="joinCode"
                        type="text"
                        placeholder="Enter 6-character code"
                        value={joinCode}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
                          setJoinCode(value)
                          setEnrollError(null)
                        }}
                        className="text-center text-2xl font-mono tracking-widest"
                        maxLength={6}
                        disabled={enrolling}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the join code provided by your professor
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                      This course does not require a join code. Click enroll to join.
                    </div>
                  )}

                  <Button
                    onClick={handleEnroll}
                    disabled={enrolling || (selectedCourse?.joinCode ? !joinCode.trim() || joinCode.length !== 6 : false)}
                    className="w-full"
                    size="lg"
                  >
                    {enrolling ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Enrolling...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Enroll in Course
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
      </div>
    </>
  )
}

