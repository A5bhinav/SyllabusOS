'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { BookOpen, CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { StudentNav } from '@/components/student/StudentNav'
import type { Course } from '@/types/api'

// UCSC fake courses (for demo courses not in database)
const FAKE_UCSC_COURSES: Course[] = [
  {
    id: 'fake-course-1',
    name: 'CMPS 101 - Algorithms and Abstract Data Types',
    professorId: 'prof-1',
    professorName: 'Dr. Patrick Tantalo',
    professorEmail: 'tantalo@ucsc.edu',
    joinCode: 'CMPS10',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-2',
    name: 'CMPS 12B - Data Structures',
    professorId: 'prof-2',
    professorName: 'Prof. Darrell Long',
    professorEmail: 'darrell@ucsc.edu',
    joinCode: 'CMPS12',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-3',
    name: 'MATH 19A - Calculus for Science, Engineering, and Mathematics',
    professorId: 'prof-3',
    professorName: 'Dr. Francois Ziegler',
    professorEmail: 'ziegler@ucsc.edu',
    joinCode: 'MATH19',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-4',
    name: 'CSE 101 - Algorithms and Complexity',
    professorId: 'prof-4',
    professorName: 'Prof. Dustin Long',
    professorEmail: 'dlong@ucsc.edu',
    joinCode: 'CSE101',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-5',
    name: 'ECON 1 - Introductory Microeconomics',
    professorId: 'prof-5',
    professorName: 'Dr. Mark Traugott',
    professorEmail: 'traugott@ucsc.edu',
    joinCode: 'ECON01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-6',
    name: 'CHEM 1B - General Chemistry',
    professorId: 'prof-6',
    professorName: 'Dr. Glenn Millhauser',
    professorEmail: 'glenn@ucsc.edu',
    joinCode: 'CHEM1B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-7',
    name: 'PHYS 5A - Introduction to Physics I',
    professorId: 'prof-7',
    professorName: 'Dr. Michael Dine',
    professorEmail: 'mdine@ucsc.edu',
    joinCode: 'PHYS5A',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-8',
    name: 'BIOL 20A - Cell and Molecular Biology',
    professorId: 'prof-8',
    professorName: 'Dr. William Saxton',
    professorEmail: 'saxton@ucsc.edu',
    joinCode: 'BIOL20',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-9',
    name: 'STAT 5 - Statistics',
    professorId: 'prof-9',
    professorName: 'Prof. Bruno Sanso',
    professorEmail: 'sanso@ucsc.edu',
    joinCode: 'STAT05',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-10',
    name: 'LIT 1 - Introduction to Literature',
    professorId: 'prof-10',
    professorName: 'Prof. Micah Perks',
    professorEmail: 'mperks@ucsc.edu',
    joinCode: 'LIT001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-11',
    name: 'PSYC 1 - Introduction to Psychology',
    professorId: 'prof-11',
    professorName: 'Dr. Karen Page',
    professorEmail: 'kpage@ucsc.edu',
    joinCode: 'PSYC01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEnrolled: false,
  },
  {
    id: 'fake-course-12',
    name: 'CSE 12 - Computer Systems and Assembly Language',
    professorId: 'prof-12',
    professorName: 'Prof. Charlie McDowell',
    professorEmail: 'mcdowell@ucsc.edu',
    joinCode: 'CSE012',
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

  useEffect(() => {
    loadCourse()
  }, [courseId])

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
      
      // Try loading from API
      const response = await fetch(`/api/courses/${courseId}`)
      if (!response.ok) {
        throw new Error('Course not found')
      }
      
      const foundCourse = await response.json()
      
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
      if (courseId.startsWith('fake-course-')) {
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
      <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-6">
        <Button asChild variant="ghost" className="mb-4">
          <Link href="/student/browse">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Browse
          </Link>
        </Button>
        <h1 className="text-3xl font-bold mb-2">Enroll in Course</h1>
        <p className="text-muted-foreground">
          Enter the join code provided by your professor to enroll
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{course?.name}</CardTitle>
              {course?.professorName && (
                <CardDescription>
                  {course.professorName}
                  {course.professorEmail && ` • ${course.professorEmail}`}
                </CardDescription>
              )}
            </div>
          </div>
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
