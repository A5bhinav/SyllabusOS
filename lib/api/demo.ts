// API client for demo course loading

export interface LoadDemoResponse {
  success: boolean
  courseId?: string
  courseName?: string
  chunksCreated?: number
  scheduleEntries?: number
  announcementsCreated?: number
  message?: string
  error?: string
}

/**
 * Load demo course data into the database
 * This creates a complete UCSC CMPS 5J course with syllabus, schedule, and announcements
 */
export async function loadDemoCourse(): Promise<LoadDemoResponse> {
  try {
    const response = await fetch('/api/demo/load', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to load demo course')
    }

    return data
  } catch (error) {
    console.error('Error loading demo course:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load demo course',
    }
  }
}

