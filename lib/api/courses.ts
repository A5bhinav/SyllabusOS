import apiClient from './client'
import type { Course } from '@/types/api'

/**
 * Get all courses
 * - Students see all courses with enrollment status
 * - Professors see their own courses
 */
export async function getCourses(): Promise<Course[]> {
  const response = await apiClient.get<Course[]>('/courses')
  return response.data
}

