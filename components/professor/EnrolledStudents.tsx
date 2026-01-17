'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Users, Mail, Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface EnrolledStudent {
  id: string
  courseId: string
  courseName: string
  studentId: string
  studentName: string | null
  studentEmail: string | null
  enrolledAt: string
}

export function EnrolledStudents({ courseId }: { courseId?: string }) {
  const [students, setStudents] = useState<EnrolledStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEnrollments()
  }, [courseId])

  async function loadEnrollments() {
    try {
      setLoading(true)
      setError(null)
      
      const url = courseId 
        ? `/api/enrollments?courseId=${courseId}`
        : '/api/enrollments'
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to load enrollments')
      }
      
      const data = await response.json()
      setStudents(data || [])
    } catch (err) {
      console.error('Error loading enrollments:', err)
      setError('Failed to load enrolled students')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enrolled Students</CardTitle>
          <CardDescription>Students enrolled in your courses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrolled Students</CardTitle>
        <CardDescription>Students enrolled in your courses</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {students.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No students enrolled yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {students.map((student) => (
              <div
                key={student.id}
                className="rounded-lg border p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {student.studentName || 'Unknown Student'}
                      </span>
                    </div>
                    
                    {student.studentEmail && (
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {student.studentEmail}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Enrolled {format(new Date(student.enrolledAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    
                    {student.courseName && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          Course: {student.courseName}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
