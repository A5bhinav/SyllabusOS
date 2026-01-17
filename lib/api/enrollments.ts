/**
 * API client for enrollment operations
 */

export interface EnrolledStudent {
  id: string
  courseId: string
  courseName: string
  studentId: string
  studentName: string | null
  studentEmail: string | null
  enrolledAt: string
}

/**
 * Get enrollments
 * - Professors see enrollments for their courses
 * - Students see only their own enrollments
 */
export async function getEnrollments(courseId?: string): Promise<EnrolledStudent[]> {
  const url = courseId 
    ? `/api/enrollments?courseId=${courseId}`
    : '/api/enrollments'
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error('Failed to fetch enrollments')
  }
  
  const data = await response.json()
  return data
}

/**
 * Remove a student from a course (professors only)
 */
export async function removeEnrollment(enrollmentId: string): Promise<void> {
  const response = await fetch(`/api/enrollments/${enrollmentId}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to remove enrollment' }))
    throw new Error(error.error || 'Failed to remove enrollment')
  }
}

