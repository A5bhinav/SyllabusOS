'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { BookOpen, CheckCircle, PlusCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import type { Course } from '@/types/api'
import { StudentNav } from '@/components/student/StudentNav'

// Fake courses data for demonstration
const FAKE_COURSES: Course[] = [
  {
    id: 'fake-course-1',
    name: 'CS 101 - Introduction to Computer Science',
    professorId: 'prof-1',
    professorName: 'Dr. Sarah Chen',
    professorEmail: 'sarah.chen@university.edu',
    joinCode: 'CS101A',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-2',
    name: 'MATH 210 - Linear Algebra',
    professorId: 'prof-2',
    professorName: 'Prof. James Rodriguez',
    professorEmail: 'j.rodriguez@university.edu',
    joinCode: 'MATH2X',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-3',
    name: 'PHYS 150 - Mechanics and Waves',
    professorId: 'prof-3',
    professorName: 'Dr. Emily Watson',
    professorEmail: 'e.watson@university.edu',
    joinCode: 'PHY15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-4',
    name: 'CHEM 120 - General Chemistry',
    professorId: 'prof-4',
    professorName: 'Dr. Michael Park',
    professorEmail: 'm.park@university.edu',
    joinCode: 'CHEM1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-5',
    name: 'ENGL 200 - Creative Writing Workshop',
    professorId: 'prof-5',
    professorName: 'Prof. Lisa Thompson',
    professorEmail: 'l.thompson@university.edu',
    joinCode: 'ENG20',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-6',
    name: 'HIST 105 - World History: Modern Era',
    professorId: 'prof-6',
    professorName: 'Dr. Robert Kim',
    professorEmail: 'r.kim@university.edu',
    joinCode: 'HIST5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-7',
    name: 'PSYC 201 - Introduction to Psychology',
    professorId: 'prof-7',
    professorName: 'Dr. Amanda Johnson',
    professorEmail: 'a.johnson@university.edu',
    joinCode: 'PSY20',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-8',
    name: 'ECON 101 - Principles of Microeconomics',
    professorId: 'prof-8',
    professorName: 'Prof. David Lee',
    professorEmail: 'd.lee@university.edu',
    joinCode: 'ECON1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-9',
    name: 'BIO 150 - Cell Biology',
    professorId: 'prof-9',
    professorName: 'Dr. Jennifer Martinez',
    professorEmail: 'j.martinez@university.edu',
    joinCode: 'BIO15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-10',
    name: 'ART 110 - Introduction to Digital Design',
    professorId: 'prof-10',
    professorName: 'Prof. Christopher Brown',
    professorEmail: 'c.brown@university.edu',
    joinCode: 'ART11',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-11',
    name: 'STAT 200 - Introduction to Statistics',
    professorId: 'prof-11',
    professorName: 'Dr. Patricia Williams',
    professorEmail: 'p.williams@university.edu',
    joinCode: null, // No join code for this course
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

  function handleCourseClick(course: Course) {
    if (course.isEnrolled) {
      // If already enrolled, go directly to chat
      router.push(`/student/chat?courseId=${course.id}`)
      return
    }
    
    // Open enrollment dialog
    setSelectedCourse(course)
    setJoinCode('') // Don't pre-fill join code
    setEnrollDialogOpen(true)
    setEnrollError(null)
  }

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
              </CardContent>
            </Card>
            ))}
          </div>

          {/* Enrollment Dialog */}
          <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
            <DialogContent>
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

              <div className="space-y-4">
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
            </DialogContent>
          </Dialog>
        </>
      )}
      </div>
    </>
  )
}

