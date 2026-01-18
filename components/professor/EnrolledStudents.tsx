'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Users, Mail, Calendar, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { getEnrollments, removeEnrollment, type EnrolledStudent } from '@/lib/api/enrollments'

export function EnrolledStudents({ courseId }: { courseId?: string }) {
  const [students, setStudents] = useState<EnrolledStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  const loadEnrollments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await getEnrollments(courseId)
      setStudents(data || [])
    } catch (err) {
      console.error('Error loading enrollments:', err)
      setError('Failed to load enrolled students')
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    loadEnrollments()
  }, [loadEnrollments])

  const handleRemoveStudent = useCallback(async (student: EnrolledStudent) => {
    const studentName = student.studentName || student.studentEmail || 'this student'
    const confirmed = window.confirm(
      `Are you sure you want to remove ${studentName} from ${student.courseName || 'the course'}? This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    try {
      setRemovingIds((prev) => new Set(prev).add(student.id))
      setError(null)

      await removeEnrollment(student.id)

      // Remove the student from the list
      setStudents((prev) => prev.filter((s) => s.id !== student.id))
    } catch (err) {
      console.error('Error removing student:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove student')
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(student.id)
        return next
      })
    }
  }, [])

  if (loading) {
    return (
      <Card className="h-full flex flex-col border-2 hover:border-green-500/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Enrolled Students</CardTitle>
              <CardDescription className="mt-1">Students enrolled in your courses</CardDescription>
            </div>
          </div>
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
    <Card className="h-full flex flex-col hover:shadow-lg transition-all duration-200 border-2 hover:border-green-500/20">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Enrolled Students</CardTitle>
            <CardDescription className="mt-1">Students enrolled in your courses</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-muted-foreground font-medium mb-1">
              No students enrolled yet
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Students will appear here once they enroll using your join code
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {students.map((student) => (
              <div
                key={student.id}
                className="rounded-lg border-2 p-4 space-y-2 hover:border-green-500/30 hover:shadow-md transition-all duration-200 bg-card"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {student.studentName || student.studentEmail?.split('@')[0] || 'Unknown Student'}
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
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveStudent(student)}
                    disabled={removingIds.has(student.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    title="Remove student from course"
                  >
                    {removingIds.has(student.id) ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
