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
      
      const response = await fetch('/api/courses')
      if (!response.ok) {
        throw new Error('Failed to load course')
      }
      
      const courses = await response.json()
      const foundCourse = courses.find((c: any) => c.id === courseId)
      
      if (!foundCourse) {
        setError('Course not found')
        return
      }
      
      setCourse({
        id: foundCourse.id,
        name: foundCourse.name,
        professorName: foundCourse.professorName,
        professorEmail: foundCourse.professorEmail,
      })
    } catch (err: any) {
      console.error('Error loading course:', err)
      setError(err.message || 'Failed to load course')
    } finally {
      setLoading(false)
    }
  }

  async function handleEnroll() {
    if (!joinCode.trim()) {
      setError('Please enter a join code')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      
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
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error && !course) {
    return (
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
    )
  }

  if (success) {
    // Show success message briefly, then redirect happens automatically
    return (
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
    )
  }

  return (
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
                setError(null)
              }}
              className="text-center text-2xl font-mono tracking-widest"
              maxLength={6}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-character join code provided by your professor
            </p>
          </div>

          <Button
            onClick={handleEnroll}
            disabled={submitting || !joinCode.trim() || joinCode.length !== 6}
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
  )
}
